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
import type { GenerationStatus, WorkflowStep } from '@/types';
import type { AIMessage } from '@/services/ai/types';
import type { LLMConfig } from '@/services/ai/workflow/types';
import type { WorkflowEvent } from '@/services/ai/workflow';
import { logContextMetrics } from '@/services/ai/debug';
import { commitVersion } from '@/services/storage/versionHistory';
import { extractChartSpecsFromHtml } from '@/services/charts';
import { useProjectStore } from '@/stores/projectStore';
import type { RunRequest } from '@/services/runs/types';
import type { RunResult } from '@/services/contracts/runResult';

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
  updateStepStatus: (stepId: string, stepStatus: WorkflowStep['status']) => void;
  queueMemoryExtraction: (
    llmConfig: LLMConfig,
    conversation: AIMessage[],
    artifactSummary: string,
    sourceRefs: string[],
  ) => Promise<void>;
}

export async function handlePresentationWorkflow(ctx: PresentationHandlerContext): Promise<RunResult> {
  const {
    runRequest, workflowStepsRef, abortControllerRef,
    addDocument, updateDocument, setStatus, setStreamingContent, appendStreamingContent,
    setSlides, setTitle, updateStepStatus, queueMemoryExtraction,
  } = ctx;
  const { context, activeArtifacts, providerConfig, intent, runId } = runRequest;
  const prompt = context.conversation.prompt;
  const promptWithContext = context.conversation.promptWithContext;
  const chatHistory = context.conversation.chatHistory;
  const activeDocument = activeArtifacts.activeDocument;

  const isEditFlow = !!activeDocument?.contentHtml && activeDocument.type === 'presentation';

  workflowStepsRef.current = isEditFlow
    ? [
        { id: 'plan', label: 'Plan', status: 'pending' },
        { id: 'targeted-design', label: 'Design', status: 'pending' },
        { id: 'evaluate', label: 'Evaluate', status: 'pending' },
        { id: 'finalize', label: 'Finalize', status: 'pending' },
      ]
    : [
        { id: 'plan', label: 'Plan', status: 'pending' },
        { id: 'design', label: 'Design', status: 'pending' },
        { id: 'evaluate', label: 'Evaluate', status: 'pending' },
        { id: 'finalize', label: 'Finalize', status: 'pending' },
      ];

  setStatus({
    state: 'generating',
    startedAt: Date.now(),
    step: 'Starting…',
    pct: 0,
    steps: workflowStepsRef.current,
  });
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
      switch (event.type) {
        case 'step-start':
          updateStepStatus(event.stepId, 'active');
          setStatus({ state: 'generating', startedAt: Date.now(), step: event.label, steps: [...workflowStepsRef.current] });
          break;
        case 'step-done':
          updateStepStatus(event.stepId, 'done');
          setStatus({ state: 'generating', startedAt: Date.now(), steps: [...workflowStepsRef.current] });
          break;
        case 'step-error':
          updateStepStatus(event.stepId, 'error');
          break;
        case 'step-skipped':
          updateStepStatus(event.stepId, 'skipped');
          setStatus({ state: 'generating', startedAt: Date.now(), steps: [...workflowStepsRef.current] });
          break;
        case 'retry-attempt':
          workflowStepsRef.current = workflowStepsRef.current.map((s) =>
            s.id === event.stepId ? { ...s, retryAttempt: event.attempt } : s,
          );
          setStatus({ state: 'generating', startedAt: Date.now(), step: `Retrying ${event.stepId}`, steps: [...workflowStepsRef.current] });
          break;
        case 'streaming':
          appendStreamingContent(event.chunk);
          break;
        case 'draft-complete':
          if (event.html) setSlides(event.html);
          setStatus({ state: 'generating', startedAt: Date.now(), step: 'Running final QA checks…', pct: 72, steps: [...workflowStepsRef.current] });
          break;
        case 'batch-slide-complete':
          setSlides(event.html);
          setStatus({ state: 'generating', startedAt: Date.now(), step: `Slide ${event.slideIndex} of ${event.totalSlides} complete`, pct: Math.round(20 + (event.slideIndex / event.totalSlides) * 70), steps: [...workflowStepsRef.current] });
          break;
        case 'step-update':
          updateStepStatus(event.stepId, event.status);
          setStatus({ state: 'generating', startedAt: Date.now(), step: event.label, steps: [...workflowStepsRef.current] });
          break;
        case 'progress':
          setStatus({ state: 'generating', startedAt: Date.now(), step: event.message, pct: event.pct, steps: [...workflowStepsRef.current] });
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
    let changedDocumentId = activeDocument?.id;
    let changeAction: 'created' | 'updated' = activeDocument?.type === 'presentation' ? 'updated' : 'created';

    if (result.html) {
      if (activeDocument?.type === 'presentation') {
        const chartSpecs = extractChartSpecsFromHtml(result.html);
        updateDocument(activeDocument.id, {
          contentHtml: result.html,
          title: result.title || activeDocument.title,
          slideCount: result.slideCount,
          chartSpecs,
        });
        memorySourceRefs = [...memorySourceRefs, `document:${activeDocument.id}`];
      } else {
        const chartSpecs = extractChartSpecsFromHtml(result.html);
        const newDoc: ProjectDocument = {
          id: crypto.randomUUID(),
          title: result.title || 'Presentation',
          type: 'presentation',
          contentHtml: result.html,
          themeCss: '',
          slideCount: result.slideCount,
          chartSpecs,
          order: context.data.projectDocumentCount,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        addDocument(newDoc);
        memorySourceRefs = [...memorySourceRefs, `document:${newDoc.id}`];
        changedDocumentId = newDoc.id;
      }

      if (result.title) setTitle(result.title);
      setSlides(result.html);
      memoryArtifactSummary = result.title
        ? `Generated presentation "${result.title}" with ${result.slideCount} slides and ${extractChartSpecsFromHtml(result.html).length} charts.`
        : memoryArtifactSummary;
    }

    const action = isEditFlow ? 'Edited' : 'Created';
    const slideInfo = result.slideCount > 0 ? ` (${result.slideCount} slide${result.slideCount !== 1 ? 's' : ''})` : '';
    const commitMsg = `${action} presentation${slideInfo}: ${prompt.slice(0, 50)}`;
    const updatedProject = useProjectStore.getState().project;
    commitVersion(updatedProject, commitMsg).catch((e) => console.warn('[VersionHistory] commit failed:', e));
    void queueMemoryExtraction(llmConfig, memoryConversation, memoryArtifactSummary, memorySourceRefs);

    const reviewWarning = result.reviewPassed ? [] : [{ code: 'qa-warning', message: 'QA flagged issues on the final presentation output.' }];

    return {
      runId,
      status: 'completed',
      intent,
      outputs: {
        html: result.html,
        title: result.title,
        slideCount: result.slideCount,
        reviewPassed: result.reviewPassed,
      },
      assistantMessage: {
        content: result.html
          ? `Generated ${result.slideCount} slides${result.reviewPassed ? '.' : ' (QA flagged issues).' }`
          : 'Generation completed but no slides were produced.',
      },
      validation: {
        passed: result.reviewPassed,
        summary: result.reviewPassed
          ? 'Presentation QA passed.'
          : 'Presentation QA completed with advisories.',
      },
      warnings: reviewWarning,
      changedTargets: [{
        documentId: changedDocumentId,
        action: changeAction,
      }],
      structuredStatus: {
        title: isEditFlow ? 'Presentation updated' : 'Presentation created',
        detail: result.title
          ? `Presentation "${result.title}" completed successfully.`
          : 'Presentation workflow completed successfully.',
      },
    };
  } catch (err) {
    if (abortControllerRef.current?.signal.aborted) {
      return {
        runId,
        status: 'cancelled',
        intent,
        outputs: {},
        assistantMessage: {
          content: 'Generation cancelled.',
        },
        validation: {
          passed: false,
          summary: 'Run cancelled by user.',
        },
        warnings: [],
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
      outputs: {},
      assistantMessage: {
        content: `Error: ${message}`,
      },
      validation: {
        passed: false,
        summary: 'Presentation workflow failed.',
      },
      warnings: [],
      changedTargets: [],
      structuredStatus: {
        title: 'Presentation workflow failed',
        detail: message,
      },
    };
  }
}
