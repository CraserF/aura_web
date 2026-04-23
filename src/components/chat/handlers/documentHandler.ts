/**
 * Document workflow handler — all document-specific chat logic.
 *
 * Extracted from ChatBar so that document logic is identifiable,
 * testable, and does not mix with spreadsheet or presentation workflows.
 */

import type { ProjectDocument } from '@/types/project';
import type { GenerationStatus, WorkflowStep } from '@/types';
import type { AIMessage } from '@/services/ai/types';
import type { LLMConfig } from '@/services/ai/workflow/types';
import type { WorkflowEvent } from '@/services/ai/workflow';
import { logContextMetrics } from '@/services/ai/debug';
import { getCompressionBudget } from '@/services/context/compressionBudget';
import { commitVersion } from '@/services/storage/versionHistory';
import { extractChartSpecsFromHtml } from '@/services/charts';
import { useProjectStore } from '@/stores/projectStore';
import type { RunResult } from '@/services/contracts/runResult';
import type { RunRequest } from '@/services/runs/types';
import { resolveTargets } from '@/services/editing/resolveTargets';
import { validateArtifactAgainstProfile } from '@/services/validation';
import { summarizeValidationResult } from '@/services/validation/profiles';
import { deriveLifecycleFromValidation } from '@/services/lifecycle/state';

export interface DocumentHandlerContext {
  runRequest: RunRequest;
  documentStylePreset: string;
  workflowStepsRef: { current: WorkflowStep[] };
  abortControllerRef: { current: AbortController | null };
  // Store callbacks
  addDocument: (doc: ProjectDocument) => void;
  updateDocument: (id: string, updates: Partial<ProjectDocument>) => void;
  setStatus: (s: GenerationStatus) => void;
  setStreamingContent: (content: string) => void;
  appendStreamingContent: (chunk: string) => void;
  updateStepStatus: (stepId: string, stepStatus: WorkflowStep['status']) => void;
  queueMemoryExtraction: (
    llmConfig: LLMConfig,
    conversation: AIMessage[],
    artifactSummary: string,
    sourceRefs: string[],
  ) => Promise<void>;
}

export async function handleDocumentWorkflow(ctx: DocumentHandlerContext): Promise<RunResult> {
  const {
    runRequest, documentStylePreset,
    workflowStepsRef, abortControllerRef,
    addDocument, updateDocument, setStatus, setStreamingContent, appendStreamingContent,
    updateStepStatus, queueMemoryExtraction,
  } = ctx;
  const { context, activeArtifacts, providerConfig, intent, runId } = runRequest;
  const prompt = context.conversation.prompt;
  const promptWithContext = context.conversation.promptWithContext;
  const chatHistory = context.conversation.chatHistory;
  const imageParts = context.attachments.imageParts;
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
  const isEdit = intent.operation === 'edit' && activeDocument?.type === 'document';
  const resolvedTargets = isEdit
    ? resolveTargets({
        prompt,
        intent,
        activeDocument,
      })
    : [];
  const targetSummary = resolvedTargets.length > 0
    ? resolvedTargets.map((target) => target.label)
    : intent.targetSelectors.map((selector) => selector.label ?? selector.type);

  workflowStepsRef.current = [
    { id: 'plan', label: 'Plan', status: 'pending' },
    { id: 'generate', label: isEdit ? 'Update' : 'Write', status: 'pending' },
    { id: 'qa', label: 'QA', status: 'pending' },
    { id: 'finalize', label: 'Finalize', status: 'pending' },
  ];

  setStatus({ state: 'generating', startedAt: Date.now(), step: 'Starting…', pct: 0, steps: workflowStepsRef.current });
  setStreamingContent('');

  const abortController = new AbortController();
  abortControllerRef.current = abortController;

  try {
    const [{ getProviderEntry }, { runDocumentWorkflow }] = await Promise.all([
      import('@/services/ai/registry'),
      import('@/services/ai/workflow/document'),
    ]);
    const providerEntry = getProviderEntry(providerConfig.id);

    const onEvent = (event: WorkflowEvent) => {
      switch (event.type) {
        case 'step-start':
          updateStepStatus(event.stepId, 'active');
          setStatus({ state: 'generating', startedAt: Date.now(), step: event.label, steps: [...workflowStepsRef.current] });
          break;
        case 'step-done':
          updateStepStatus(event.stepId, 'done');
          setStatus({ state: 'generating', startedAt: Date.now(), steps: [...workflowStepsRef.current] });
          break;
        case 'streaming':
          appendStreamingContent(event.chunk);
          break;
        case 'progress':
          setStatus({ state: 'generating', startedAt: Date.now(), step: event.message, pct: event.pct, steps: [...workflowStepsRef.current] });
          break;
        case 'step-error':
          updateStepStatus(event.stepId, 'error');
          setStatus({ state: 'generating', startedAt: Date.now(), step: `Issue in ${event.stepId}`, steps: [...workflowStepsRef.current] });
          break;
      }
    };

    const existingDoc = isEdit && activeDocument?.type === 'document'
      ? activeDocument.contentHtml
      : undefined;

    // Build project links for cross-document linking
    const projectLinks: import('@/services/ai/workflow').DocumentProjectLink[] = context.artifact.relatedDocuments
      .filter((d) => d.id !== activeDocument?.id && d.type !== 'spreadsheet')
      .map((d) => ({ id: d.id, title: d.title, type: d.type as 'document' | 'presentation' }));
    const memoryContext = context.memory.text;

    logContextMetrics('document-handler', context.metrics);

    const result = await runDocumentWorkflow({
      input: {
        prompt: promptWithContext,
        existingHtml: existingDoc,
        existingMarkdown: activeDocument?.type === 'document' ? activeDocument.sourceMarkdown : undefined,
        chatHistory,
        memoryContext,
        projectRulesBlock: runRequest.projectRulesSnapshot.promptBlock || undefined,
        styleHint: documentStylePreset,
        projectLinks: projectLinks.length > 0 ? projectLinks : undefined,
        imageParts: imageParts.length > 0 ? imageParts : undefined,
        ...(isEdit ? {
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
      ? `Generated document "${result.title}".`
      : 'Generated document.';
    let changedDocumentId = activeDocument?.id;
    let changeAction: 'created' | 'updated' = activeDocument?.type === 'document' ? 'updated' : 'created';

    if (result.html) {
      if (activeDocument?.type === 'document') {
        const chartSpecs = extractChartSpecsFromHtml(result.html);
        updateDocument(activeDocument.id, {
          contentHtml: result.html,
          sourceMarkdown: result.markdown,
          title: result.title || activeDocument.title,
          chartSpecs,
          lastSuccessfulPresetId: runRequest.appliedPreset?.id,
        });
        memorySourceRefs = [...memorySourceRefs, `document:${activeDocument.id}`];
      } else {
        const chartSpecs = extractChartSpecsFromHtml(result.html);
        const newDoc: ProjectDocument = {
          id: crypto.randomUUID(),
          title: result.title || 'Document',
          type: 'document',
          contentHtml: result.html,
          sourceMarkdown: result.markdown,
          themeCss: '',
          slideCount: 0,
          chartSpecs,
          lifecycleState: 'draft',
          lastSuccessfulPresetId: runRequest.appliedPreset?.id,
          order: context.data.projectDocumentCount,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        addDocument(newDoc);
        memorySourceRefs = [...memorySourceRefs, `document:${newDoc.id}`];
        changedDocumentId = newDoc.id;
      }

      memoryArtifactSummary = result.title
        ? `Generated document "${result.title}" with ${result.markdown.length} markdown characters.`
        : `Generated document with ${result.markdown.length} markdown characters.`;
    }

    const docAction = existingDoc ? 'Edited' : 'Created';
    const commitMsg = `${docAction} document: ${prompt.slice(0, 60)}`;
    const updatedProject = useProjectStore.getState().project;
    commitVersion(updatedProject, commitMsg).catch((e) => console.warn('[VersionHistory] commit failed:', e));
    void queueMemoryExtraction(llmConfig, memoryConversation, memoryArtifactSummary, memorySourceRefs);
    const persistedDocument = changedDocumentId
      ? useProjectStore.getState().project.documents.find((document) => document.id === changedDocumentId)
      : undefined;
    const artifactValidation = persistedDocument
      ? validateArtifactAgainstProfile(persistedDocument)
      : undefined;
    if (persistedDocument && artifactValidation) {
      updateDocument(persistedDocument.id, {
        ...deriveLifecycleFromValidation(artifactValidation),
        ...(artifactValidation.passed ? { lastSuccessfulPresetId: runRequest.appliedPreset?.id } : {}),
      });
    }
    const validationWarnings = artifactValidation
      ? [...artifactValidation.blockingIssues, ...artifactValidation.warnings].map((issue) => ({
          code: issue.code,
          message: issue.message,
        }))
      : [];
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
          passed: true,
          summary: 'Document workflow completed and passed document QA.',
        };
    const changedTargets = [{
      documentId: changedDocumentId,
      action: changeAction,
    }] as const;
    const publish = artifactValidation
      ? {
          profileId: artifactValidation.profileId,
          artifactValidation,
          exportBlocked: !artifactValidation.passed,
          overrideRequired: !artifactValidation.passed,
        }
      : undefined;

    return {
      runId,
      status: 'completed',
      intent,
      outputs: {
        envelope: {
          artifactType: 'document',
          mode: runRequest.mode,
          targetSummary,
          changedTargets: [...changedTargets],
          validation,
          document: {
            artifactType: 'document',
            title: result.title,
            html: result.html,
            markdown: result.markdown,
            ...(result.editing ? { editing: result.editing } : {}),
            ...(publish ? { publish } : {}),
          },
        },
        html: result.html,
        markdown: result.markdown,
        title: result.title,
        ...(result.editing ? { editing: result.editing } : {}),
        ...(publish ? { publish } : {}),
      },
      assistantMessage: {
        content: result.html
          ? `${isEdit ? 'Updated' : 'Created'} document: "${result.title}"`
          : 'Document created.',
      },
      validation,
      warnings: [
        ...configWarnings,
        ...contextWarnings,
        ...validationWarnings,
        ...(result.editing?.dryRunFailures.length
          ? [{
              code: 'editing-dry-run-fallback',
              message: `Targeted edit fell back after ${result.editing.dryRunFailures.length} unmatched target(s).`,
            }]
          : []),
      ],
      changedTargets: [...changedTargets],
      structuredStatus: {
        title: isEdit ? 'Document updated' : 'Document created',
        detail: result.title
          ? `Document "${result.title}" completed successfully.`
          : 'Document workflow completed successfully.',
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
            artifactType: 'document',
            mode: runRequest.mode,
            targetSummary,
            changedTargets: [],
            validation: {
              passed: false,
              summary: 'Run cancelled by user.',
            },
            document: {
              artifactType: 'document',
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
          artifactType: 'document',
          mode: runRequest.mode,
          targetSummary,
          changedTargets: [],
          validation: {
            passed: false,
            summary: 'Document workflow failed.',
          },
          document: {
            artifactType: 'document',
          },
        },
      },
      assistantMessage: {
        content: `Error: ${message}`,
      },
      validation: {
        passed: false,
        summary: 'Document workflow failed.',
      },
      warnings: [...configWarnings, ...contextWarnings],
      changedTargets: [],
      structuredStatus: {
        title: 'Document workflow failed',
        detail: message,
      },
    };
  }
}
