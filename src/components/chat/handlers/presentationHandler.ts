/**
 * Presentation workflow handler — all presentation-specific chat logic.
 *
 * Extracted from ChatBar so that presentation logic is identifiable,
 * testable, and does not mix with spreadsheet or document workflows.
 *
 * Two sub-paths (dispatched by runPresentationWorkflow):
 *   1. Edit flow  — modify existing slides
 *   2. Create flow — generate new slides from scratch
 */

import type { ProjectDocument } from '@/types/project';
import type { ClarifyOption, GenerationStatus, WorkflowStep } from '@/types';
import type { AIMessage } from '@/services/ai/types';
import type { LLMConfig, PresentationRuntimeTelemetry } from '@/services/ai/workflow/types';
import type { WorkflowEvent } from '@/services/ai/workflow';
import { logContextMetrics } from '@/services/ai/debug';
import { getCompressionBudget } from '@/services/context/compressionBudget';
import { commitVersion } from '@/services/storage/versionHistory';
import { extractChartSpecsFromHtml } from '@/services/charts';
import { useProjectStore } from '@/stores/projectStore';
import type { RunRequest } from '@/services/runs/types';
import type { RunResult } from '@/services/contracts/runResult';
import { publishRunEvent } from '@/services/events/eventBus';
import { createRunEventSource } from '@/services/events/provenance';
import { recordRunEvent } from '@/services/runs/registry';
import { resolveTargets } from '@/services/editing/resolveTargets';
import {
  countRunPlanParts,
  parseWorkflowItemProgress,
  publicWorkflowProgressLabel,
  resolveWorkflowStepProgress,
  workflowStepUpdateFromRuntimeEvent,
} from '@/services/chat/workflowProgress';
import { validateArtifactAgainstProfile } from '@/services/validation';
import { createValidationIssue, summarizeValidationResult } from '@/services/validation/profiles';
import type { ValidationResult } from '@/services/validation/types';
import { deriveLifecycleFromValidation } from '@/services/lifecycle/state';
import { formatRuntimeQualityDiagnostics } from '@/services/artifactRuntime';
import { qualityOutcomeLabel } from '@/services/chat/renderRunResult';
import {
  createPresentationArtifactPreview,
  upsertProjectArtifactPreview,
} from '@/services/artifactPreview/presentationPreview';

export interface PresentationHandlerContext {
  runRequest: RunRequest;
  workflowStepsRef: { current: WorkflowStep[] };
  abortControllerRef: { current: AbortController | null };
  // Store callbacks
  addDocument: (doc: ProjectDocument) => void;
  updateDocument: (id: string, updates: Partial<ProjectDocument>) => void;
  setStatus: (s: GenerationStatus) => void;
  setStreamingContent: (content: string) => void;
  appendStreamingContent: (chunk: string) => void;
  setSlides: (html: string) => void;
  setTitle: (title: string) => void;
  updateStepStatus: (stepId: string, stepStatus: WorkflowStep['status'], label?: string) => void;
  queueMemoryExtraction: (
    llmConfig: LLMConfig,
    conversation: AIMessage[],
    artifactSummary: string,
    sourceRefs: string[],
  ) => Promise<void>;
}

type GeneratingStatusPatch = Partial<Omit<Extract<GenerationStatus, { state: 'generating' }>, 'state' | 'startedAt' | 'steps'>>;

function runtimeQualitySafetyPassed(runtime: PresentationRuntimeTelemetry | undefined, reviewPassed: boolean): boolean {
  if (runtime?.qualityDecision === 'blocked-by-safety') return false;
  if ((runtime?.qualityBlockingCount ?? 0) > 0) return false;
  return runtime?.validationPassed ?? reviewPassed;
}

function addQualitySafetyIssue(
  validation: ValidationResult,
  documentId: string,
  message: string,
): ValidationResult {
  const issue = createValidationIssue('blocking', 'quality-safety-blocked', message, {
    targetDocumentId: documentId,
    source: 'presentation-runtime',
  });
  return {
    ...validation,
    passed: false,
    blockingIssues: [...validation.blockingIssues, issue],
    score: Math.min(validation.score, Math.max(0, validation.score - 20)),
  };
}

async function persistPresentationArtifactPreview(input: {
  documentId: string;
  html: string;
  sourceContentHtml: string;
  commitMessage?: string;
  waitForCommit?: Promise<unknown>;
}): Promise<void> {
  try {
    const preview = await createPresentationArtifactPreview({
      documentId: input.documentId,
      html: input.html,
    });
    if (!preview) return;

    const latestProject = useProjectStore.getState().project;
    const latestDocument = latestProject.documents.find((candidate) => candidate.id === input.documentId);
    if (
      !latestDocument ||
      latestDocument.contentHtml !== input.sourceContentHtml
    ) {
      return;
    }

    preview.artifactPreview.sourceUpdatedAt = latestDocument.updatedAt;
    preview.artifactPreview.validationProfileId = latestDocument.lastValidationProfileId;

    useProjectStore.getState().setProject(
      upsertProjectArtifactPreview(latestProject, input.documentId, preview),
    );

    if (input.commitMessage) {
      await input.waitForCommit;
      const projectAfterPrimaryCommit = useProjectStore.getState().project;
      const documentAfterPrimaryCommit = projectAfterPrimaryCommit.documents.find(
        (candidate) => candidate.id === input.documentId,
      );
      if (
        !documentAfterPrimaryCommit ||
        documentAfterPrimaryCommit.contentHtml !== input.sourceContentHtml ||
        documentAfterPrimaryCommit.artifactPreview?.assetId !== preview.artifactPreview.assetId ||
        documentAfterPrimaryCommit.artifactPreview?.sourceUpdatedAt !== preview.artifactPreview.sourceUpdatedAt ||
        documentAfterPrimaryCommit.artifactPreview?.generatedAt !== preview.artifactPreview.generatedAt
      ) {
        return;
      }

      await commitVersion(projectAfterPrimaryCommit, input.commitMessage);
    }
  } catch (error) {
    console.warn('[Presentation] failed to generate artifact preview:', error);
  }
}

export async function handlePresentationWorkflow(ctx: PresentationHandlerContext): Promise<RunResult> {
  const {
    runRequest, workflowStepsRef, abortControllerRef,
    addDocument, updateDocument, setStatus, setStreamingContent, appendStreamingContent,
    setSlides, setTitle, updateStepStatus, queueMemoryExtraction,
  } = ctx;
  const { context, activeArtifacts, providerConfig, intent, runId } = runRequest;
  const eventSource = createRunEventSource('presentationHandler');
  const prompt = context.conversation.prompt;
  const promptWithContext = context.conversation.promptWithContext;
  const chatHistory = context.conversation.chatHistory;
  const activeDocument = activeArtifacts.activeDocument;
  const configWarnings = runRequest.projectRulesSnapshot.diagnostics.map((diagnostic) => ({
    code: diagnostic.code,
    message: diagnostic.message,
  }));
  const contextWarnings = [
    ...(context.compaction.compactedSourceIds.length > 0
      ? [{
          code: 'context-compacted',
          message: `Context compaction summarized ${context.compaction.compactedSourceIds.length} source(s) before generation.`,
        }]
      : []),
    ...((context.compaction.afterTokens > getCompressionBudget())
      && context.sources.some((source) => source.kind === 'memory' && source.pinned)
      ? [{
          code: 'pinned-context-over-budget',
          message: 'Pinned memory exceeded the target context budget and was kept in the run.',
        }]
      : []),
  ];

  const isEditFlow = !!activeDocument?.contentHtml && activeDocument.type === 'presentation';
  const resolvedTargets = isEditFlow
    ? resolveTargets({
        prompt,
        intent,
        activeDocument,
      })
    : [];
  const targetSummary = resolvedTargets.length > 0
    ? resolvedTargets.map((target) => target.label)
    : intent.targetSelectors.map((selector) => selector.label ?? selector.type);

  workflowStepsRef.current = isEditFlow
    ? [
        { id: 'plan', label: 'Planning', status: 'pending' },
        { id: 'targeted-design', label: 'Creating slides', status: 'pending' },
        { id: 'evaluate', label: 'Checking quality', status: 'pending' },
        { id: 'finalize', label: 'Finishing', status: 'pending' },
      ]
    : [
        { id: 'plan', label: 'Planning', status: 'pending' },
        { id: 'design', label: 'Creating slides', status: 'pending' },
        { id: 'evaluate', label: 'Checking quality', status: 'pending' },
        { id: 'finalize', label: 'Finishing', status: 'pending' },
      ];

  const generationStartedAt = Date.now();
  const totalSlides = countRunPlanParts(runRequest.artifactRunPlan, ['slide']);
  const currentPublicStepLabel = () => {
    const currentStep = workflowStepsRef.current.find((step) => step.status === 'active')
      ?? workflowStepsRef.current.find((step) => step.status === 'pending')
      ?? workflowStepsRef.current[workflowStepsRef.current.length - 1];
    return currentStep
      ? publicWorkflowProgressLabel({ stepId: currentStep.id, label: currentStep.label })
      : 'Working...';
  };
  const buildGeneratingStatus = (updates: GeneratingStatusPatch = {}): GenerationStatus => ({
    state: 'generating',
    startedAt: generationStartedAt,
    step: currentPublicStepLabel(),
    steps: [...workflowStepsRef.current],
    ...resolveWorkflowStepProgress(workflowStepsRef.current),
    ...updates,
  });

  setStatus(buildGeneratingStatus({
    step: 'Starting…',
    pct: 0,
  }));
  setStreamingContent('');

  const abortController = new AbortController();
  abortControllerRef.current = abortController;

  try {
    const [{ getProviderEntry }, { runPresentationWorkflow }] = await Promise.all([
      import('@/services/ai/registry'),
      import('@/services/ai/workflow/presentation'),
    ]);
    const providerEntry = getProviderEntry(providerConfig.id);

    const onEvent = (event: WorkflowEvent) => {
      const workflowStepUpdate = workflowStepUpdateFromRuntimeEvent(event);
      if (workflowStepUpdate) {
        updateStepStatus(
          workflowStepUpdate.stepId,
          workflowStepUpdate.status,
          workflowStepUpdate.label,
        );
      }

      switch (event.type) {
        case 'step-start':
          setStatus(buildGeneratingStatus({
            step: publicWorkflowProgressLabel({ stepId: event.stepId, label: event.label }),
            ...parseWorkflowItemProgress({
              stepId: event.stepId,
              message: event.label,
              totalItems: totalSlides,
              itemLabel: 'slide',
            }),
          }));
          break;
        case 'step-done':
          setStatus(buildGeneratingStatus());
          break;
        case 'step-error':
          setStatus(buildGeneratingStatus({
            step: publicWorkflowProgressLabel({ stepId: event.stepId, label: event.error }),
            ...parseWorkflowItemProgress({
              stepId: event.stepId,
              message: event.error,
              totalItems: totalSlides,
              itemLabel: 'slide',
            }),
          }));
          break;
        case 'step-skipped':
          setStatus(buildGeneratingStatus());
          break;
        case 'retry-attempt':
          updateStepStatus(event.stepId, 'active', 'Polishing quality');
          workflowStepsRef.current = workflowStepsRef.current.map((s) =>
            s.id === event.stepId
              ? { ...s, retryAttempt: event.attempt, maxRetries: event.maxAttempts }
              : s,
          );
          setStatus(buildGeneratingStatus({
            step: `Polishing quality (attempt ${event.attempt} of ${event.maxAttempts})`,
            ...parseWorkflowItemProgress({
              stepId: event.stepId,
              totalItems: totalSlides,
              itemLabel: 'slide',
            }),
          }));
          break;
        case 'streaming':
          appendStreamingContent(event.chunk);
          break;
        case 'draft-complete':
          if (event.html) setSlides(event.html);
          setStatus(buildGeneratingStatus({ step: 'Checking quality', pct: 72 }));
          break;
        case 'batch-slide-draft':
          setSlides(event.html);
          setStatus(buildGeneratingStatus({
            step: `Previewing slide ${event.slideIndex} of ${event.totalSlides}`,
            pct: Math.round(18 + ((event.slideIndex - 0.35) / event.totalSlides) * 52),
            currentItem: event.slideIndex,
            totalItems: event.totalSlides,
            itemLabel: 'slide',
          }));
          break;
        case 'batch-slide-complete':
          setSlides(event.html);
          setStatus(buildGeneratingStatus({
            step: `Slide ${event.slideIndex} of ${event.totalSlides} ready`,
            pct: Math.round(18 + (event.slideIndex / event.totalSlides) * 52),
            currentItem: event.slideIndex,
            totalItems: event.totalSlides,
            itemLabel: 'slide',
          }));
          break;
        case 'step-update':
          setStatus(buildGeneratingStatus({
            step: publicWorkflowProgressLabel({ stepId: event.stepId, label: event.label }),
            ...parseWorkflowItemProgress({
              stepId: event.stepId,
              message: event.label,
              totalItems: totalSlides,
              itemLabel: 'slide',
            }),
          }));
          break;
        case 'progress':
          recordRunEvent(runId, publishRunEvent({
            type: 'runtime.phase',
            runId,
            source: eventSource,
            payload: {
              message: event.message,
              pct: event.pct,
              partId: event.partId,
            },
          }));
          setStatus(buildGeneratingStatus({
            step: publicWorkflowProgressLabel({ stepId: event.partId, label: event.message }),
            pct: event.pct,
            ...parseWorkflowItemProgress({
              partId: event.partId,
              message: event.message,
              totalItems: totalSlides,
              itemLabel: 'slide',
            }),
          }));
          break;
      }
    };

    const existingSlides = isEditFlow ? activeDocument?.contentHtml : undefined;
    const memoryContext = context.memory.text;

    logContextMetrics('presentation-handler', context.metrics);

    const result = await runPresentationWorkflow({
      input: {
        prompt: promptWithContext,
        existingSlidesHtml: existingSlides,
        chatHistory,
        memoryContext,
        projectRulesBlock: runRequest.projectRulesSnapshot.promptBlock || undefined,
        artifactRunPlan: runRequest.artifactRunPlan,
        ...(isEditFlow && activeDocument?.type === 'presentation' && activeDocument.artifactManifest ? {
          artifactManifest: activeDocument.artifactManifest,
        } : {}),
        ...(isEditFlow && activeDocument?.type === 'presentation' && activeDocument.artifactSourcePayload ? {
          artifactSourcePayload: activeDocument.artifactSourcePayload,
        } : {}),
        projectMedia: useProjectStore.getState().project.media ?? [],
        templateGuidance: runRequest.artifactRunPlan.templateGuidance,
        ...(isEditFlow ? {
          editing: {
            resolvedTargets,
            targetSummary,
            strategyHint: intent.editStrategyHint,
            allowFullRegeneration: intent.allowFullRegeneration,
          },
        } : {}),
      },
      llmConfig: {
        providerEntry,
        apiKey: providerConfig.apiKey,
        baseUrl: providerConfig.baseUrl ?? '',
        model: providerConfig.model ?? '',
      },
      onEvent,
      signal: abortController.signal,
    });

    const llmConfig: LLMConfig = { providerEntry, apiKey: providerConfig.apiKey, baseUrl: providerConfig.baseUrl ?? '', model: providerConfig.model ?? '' };
    const memoryConversation: AIMessage[] = [...chatHistory, { role: 'user', content: promptWithContext }];
    let memorySourceRefs = [`project:${context.data.projectId}`];
    let memoryArtifactSummary = result.title
      ? `Generated presentation "${result.title}" with ${result.slideCount} slides.`
      : `Generated presentation with ${result.slideCount} slides.`;
    let changedDocumentId: string | undefined;
    const changeAction: 'created' | 'updated' = activeDocument?.type === 'presentation' ? 'updated' : 'created';
    const safetyPassed = runtimeQualitySafetyPassed(result.runtime, result.reviewPassed);
    const shouldPersistResult = result.reviewPassed && safetyPassed;

    if (result.html && shouldPersistResult) {
      if (activeDocument?.type === 'presentation') {
        const chartSpecs = extractChartSpecsFromHtml(result.html);
        updateDocument(activeDocument.id, {
          contentHtml: result.html,
          title: result.title || activeDocument.title,
          slideCount: result.slideCount,
          chartSpecs,
          ...(result.artifactManifest ? { artifactManifest: result.artifactManifest } : {}),
          ...(result.artifactSourcePayload ? { artifactSourcePayload: result.artifactSourcePayload } : {}),
        });
        memorySourceRefs = [...memorySourceRefs, `document:${activeDocument.id}`];
        changedDocumentId = activeDocument.id;
      } else {
        const newDocumentId = crypto.randomUUID();
        const chartSpecs = extractChartSpecsFromHtml(result.html);
        const newDoc: ProjectDocument = {
          id: newDocumentId,
          title: result.title || 'Presentation',
          type: 'presentation',
          contentHtml: result.html,
          themeCss: '',
          slideCount: result.slideCount,
          chartSpecs,
          ...(result.artifactManifest ? { artifactManifest: result.artifactManifest } : {}),
          ...(result.artifactSourcePayload ? { artifactSourcePayload: result.artifactSourcePayload } : {}),
          lifecycleState: 'draft',
          order: context.data.projectDocumentCount,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        addDocument(newDoc);
        memorySourceRefs = [...memorySourceRefs, `document:${newDoc.id}`];
        changedDocumentId = newDoc.id;
      }

    }

    if (result.html) {
      if (result.title) setTitle(result.title);
      setSlides(result.html);
      memoryArtifactSummary = result.title
        ? `Generated presentation "${result.title}" with ${result.slideCount} slides and ${extractChartSpecsFromHtml(result.html).length} charts.`
        : memoryArtifactSummary;
    }

    const action = isEditFlow ? 'Edited' : 'Created';
    const slideInfo = result.slideCount > 0 ? ` (${result.slideCount} slide${result.slideCount !== 1 ? 's' : ''})` : '';
    const commitMsg = `${action} presentation${slideInfo}: ${prompt.slice(0, 50)}`;
    void queueMemoryExtraction(llmConfig, memoryConversation, memoryArtifactSummary, memorySourceRefs);
    const persistedDocument = changedDocumentId
      ? useProjectStore.getState().project.documents.find((document) => document.id === changedDocumentId)
      : undefined;
    const rawArtifactValidation = persistedDocument
      ? validateArtifactAgainstProfile(persistedDocument)
      : undefined;
    const artifactValidation = persistedDocument && rawArtifactValidation && !safetyPassed
      ? addQualitySafetyIssue(
          rawArtifactValidation,
          persistedDocument.id,
          result.runtime?.qualityDecision === 'blocked-by-safety'
            ? 'Presentation runtime quality safety blocked approval.'
            : 'Presentation runtime validation did not pass safely.',
        )
      : rawArtifactValidation;
    if (persistedDocument && artifactValidation) {
      updateDocument(persistedDocument.id, {
        ...deriveLifecycleFromValidation(artifactValidation),
        ...(artifactValidation.passed && safetyPassed ? { lastSuccessfulPresetId: runRequest.appliedPreset?.id } : {}),
      });
    }
    let primaryCommit: Promise<unknown> | undefined;
    if (changedDocumentId) {
      primaryCommit = commitVersion(useProjectStore.getState().project, commitMsg)
        .catch((e) => console.warn('[VersionHistory] commit failed:', e));
    }
    const previewDocument = changedDocumentId
      ? useProjectStore.getState().project.documents.find((document) => document.id === changedDocumentId)
      : undefined;
    if (previewDocument && result.html && shouldPersistResult) {
      void persistPresentationArtifactPreview({
        documentId: previewDocument.id,
        html: result.html,
        sourceContentHtml: previewDocument.contentHtml,
        commitMessage: `Updated presentation preview: ${previewDocument.title}`,
        waitForCommit: primaryCommit,
      });
    }
    const validationWarnings = artifactValidation
      ? [...artifactValidation.blockingIssues, ...artifactValidation.warnings].map((issue) => ({
          code: issue.code,
          message: issue.message,
        }))
      : [];

    const reviewWarning = result.reviewPassed && safetyPassed
      ? []
      : [{ code: 'qa-warning', message: 'QA flagged issues on the final presentation output.' }];
    const validation = artifactValidation
      ? {
          passed: artifactValidation.passed,
          summary: summarizeValidationResult(artifactValidation),
          profileId: artifactValidation.profileId,
          score: artifactValidation.score,
          blockingIssues: artifactValidation.blockingIssues,
          warnings: artifactValidation.warnings,
        }
      : {
          passed: result.reviewPassed,
          summary: result.reviewPassed
            ? 'Presentation QA passed.'
            : 'Presentation QA completed with advisories.',
        };
    const changedTargets = changedDocumentId
      ? [{
          documentId: changedDocumentId,
          action: changeAction,
        }]
      : [];
    const publish = artifactValidation
      ? {
          profileId: artifactValidation.profileId,
          artifactValidation,
          exportBlocked: !artifactValidation.passed,
          overrideRequired: !artifactValidation.passed,
        }
      : undefined;
    const advancedDiagnostics = formatRuntimeQualityDiagnostics(result.runtime)
      .map((diagnostic) => diagnostic.message);

    const qualityDecision = result.runtime?.qualityDecision;
    const outcomeLabel = qualityOutcomeLabel(qualityDecision);
    const slideCountText = result.slideCount > 0
      ? `${result.slideCount} slide${result.slideCount !== 1 ? 's' : ''}`
      : null;
    const presentationContent = slideCountText
      ? `Generated ${slideCountText}. ${outcomeLabel ?? (result.reviewPassed && safetyPassed ? 'Looks polished.' : 'QA flagged issues.')}`
      : 'Generation completed but no slides were produced.';
    const improveOptions: ClarifyOption[] | undefined =
      qualityDecision === 'safe-budget-exhausted' && result.html
        ? [{ label: 'Improve', value: 'Please review and improve the quality of the presentation.' }]
        : undefined;

    return {
      runId,
      status: 'completed',
      intent,
      outputs: {
        envelope: {
          artifactType: 'presentation',
          targetSummary,
          changedTargets: [...changedTargets],
          validation,
          runtimePlan: runRequest.artifactRunPlan,
          presentation: {
            artifactType: 'presentation',
            title: result.title,
            html: result.html,
            slideCount: result.slideCount,
            reviewPassed: result.reviewPassed,
            ...(result.runtime ? { runtime: result.runtime } : {}),
            ...(result.editing ? { editing: result.editing } : {}),
            ...(result.artifactManifest ? { artifactManifest: result.artifactManifest } : {}),
            ...(result.artifactSourcePayload ? { artifactSourcePayload: result.artifactSourcePayload } : {}),
            ...(publish ? { publish } : {}),
          },
        },
        html: result.html,
        title: result.title,
        slideCount: result.slideCount,
        reviewPassed: result.reviewPassed,
        ...(result.runtime ? { runtime: result.runtime } : {}),
        ...(result.editing ? { editing: result.editing } : {}),
        ...(result.artifactManifest ? { artifactManifest: result.artifactManifest } : {}),
        ...(result.artifactSourcePayload ? { artifactSourcePayload: result.artifactSourcePayload } : {}),
        ...(publish ? { publish } : {}),
      },
      assistantMessage: {
        content: presentationContent,
        ...(improveOptions ? { clarifyOptions: improveOptions } : {}),
      },
      validation,
      warnings: [
        ...configWarnings,
        ...contextWarnings,
        ...reviewWarning,
        ...validationWarnings,
        ...(result.editing?.preflightFailures.length
          ? [{
              code: 'editing-preflight-fallback',
              message: `Targeted edit fell back after ${result.editing.preflightFailures.length} unmatched target(s).`,
            }]
          : []),
      ],
      changedTargets: [...changedTargets],
      structuredStatus: {
        title: isEditFlow ? 'Presentation updated' : 'Presentation created',
        detail: result.title
          ? `Presentation "${result.title}" completed successfully.`
          : 'Presentation workflow completed successfully.',
        ...(advancedDiagnostics.length > 0 ? { advancedDiagnostics } : {}),
      },
    };
  } catch (err) {
    if (abortControllerRef.current?.signal.aborted) {
      return {
        runId,
        status: 'cancelled',
        intent,
        outputs: {
          envelope: {
            artifactType: 'presentation',
            targetSummary,
            changedTargets: [],
            validation: {
              passed: false,
              summary: 'Run cancelled by user.',
            },
            runtimePlan: runRequest.artifactRunPlan,
            presentation: {
              artifactType: 'presentation',
            },
          },
        },
        assistantMessage: {
          content: 'Generation cancelled.',
        },
        validation: {
          passed: false,
          summary: 'Run cancelled by user.',
        },
        warnings: [...configWarnings, ...contextWarnings],
        changedTargets: [],
        structuredStatus: {
          title: 'Generation cancelled',
          detail: 'Generation was cancelled before completion.',
        },
      };
    }
    const message = err instanceof Error ? err.message : 'Generation failed';
    return {
      runId,
      status: 'failed',
      intent,
      outputs: {
        envelope: {
          artifactType: 'presentation',
          targetSummary,
          changedTargets: [],
            validation: {
              passed: false,
              summary: 'Presentation workflow failed.',
            },
            runtimePlan: runRequest.artifactRunPlan,
          presentation: {
            artifactType: 'presentation',
          },
        },
      },
      assistantMessage: {
        content: `Error: ${message}`,
      },
      validation: {
        passed: false,
        summary: 'Presentation workflow failed.',
      },
      warnings: [...configWarnings, ...contextWarnings],
      changedTargets: [],
      structuredStatus: {
        title: 'Presentation workflow failed',
        detail: message,
      },
    };
  }
}
