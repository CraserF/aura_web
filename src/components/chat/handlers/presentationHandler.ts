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
import type { ChatMessage as ChatMessageType, GenerationStatus, WorkflowStep, ProviderId, ProviderConfig } from '@/types';
import type { AIMessage } from '@/services/ai/types';
import type { LLMConfig } from '@/services/ai/workflow/types';
import type { WorkflowEvent } from '@/services/ai/workflow';
import { commitVersion } from '@/services/storage/versionHistory';
import { extractChartSpecsFromHtml } from '@/services/charts';
import { useProjectStore } from '@/stores/projectStore';

export interface PresentationHandlerContext {
  prompt: string;
  promptWithContext: string;
  chatHistory: AIMessage[];
  autoPrompt: string | null;
  activeDocument: ProjectDocument | null;
  project: { id: string; documents: ProjectDocument[] };
  projectDocumentCount: number;
  scopedDocumentId: string | undefined;
  messageScope: 'project' | 'document';
  providerId: ProviderId;
  workflowStepsRef: React.MutableRefObject<WorkflowStep[]>;
  abortControllerRef: React.MutableRefObject<AbortController | null>;
  // Store callbacks
  addMessage: (msg: ChatMessageType) => void;
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
  buildWorkflowMemoryContext: (prompt: string) => Promise<string>;
  getActiveProvider: () => ProviderConfig;
}

export async function handlePresentationWorkflow(ctx: PresentationHandlerContext): Promise<void> {
  const {
    prompt, promptWithContext, chatHistory, autoPrompt, activeDocument,
    project, scopedDocumentId, messageScope, providerId, workflowStepsRef, abortControllerRef,
    addMessage, addDocument, updateDocument, setStatus, setStreamingContent, appendStreamingContent,
    setSlides, setTitle, updateStepStatus, queueMemoryExtraction, buildWorkflowMemoryContext,
    getActiveProvider,
  } = ctx;

  const isEditFlow = !!activeDocument?.contentHtml && activeDocument.type === 'presentation';

  // Ambiguity check: for new slides with short/vague prompts, ask for layout intent first
  if (!isEditFlow && !autoPrompt) {
    const { detectAmbiguity } = await import('@/services/ai/validation');
    const clarifyOptions = detectAmbiguity(promptWithContext);
    if (clarifyOptions) {
      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Quick question — which layout style works best for this?',
        timestamp: Date.now(),
        documentId: scopedDocumentId,
        scope: messageScope,
        clarifyOptions,
      });
      return;
    }
  }

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
    const config = getActiveProvider();
    const [{ getProviderEntry }, { runPresentationWorkflow }] = await Promise.all([
      import('@/services/ai/registry'),
      import('@/services/ai/workflow/presentation'),
    ]);
    const providerEntry = getProviderEntry(providerId);

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
    const memoryContext = await buildWorkflowMemoryContext(promptWithContext);

    const result = await runPresentationWorkflow({
      input: {
        prompt: promptWithContext,
        existingSlidesHtml: existingSlides,
        chatHistory,
        memoryContext,
      },
      llmConfig: {
        providerEntry,
        apiKey: config.apiKey,
        baseUrl: config.baseUrl ?? '',
        model: config.model ?? '',
      },
      onEvent,
      signal: abortController.signal,
    });

    const llmConfig: LLMConfig = { providerEntry, apiKey: config.apiKey, baseUrl: config.baseUrl ?? '', model: config.model ?? '' };
    const memoryConversation: AIMessage[] = [...chatHistory, { role: 'user', content: promptWithContext }];
    let memorySourceRefs = [`project:${project.id}`];
    let memoryArtifactSummary = result.title
      ? `Generated presentation "${result.title}" with ${result.slideCount} slides.`
      : `Generated presentation with ${result.slideCount} slides.`;

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
          order: project.documents.length,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        addDocument(newDoc);
        memorySourceRefs = [...memorySourceRefs, `document:${newDoc.id}`];
      }

      if (result.title) setTitle(result.title);
      setSlides(result.html);
      memoryArtifactSummary = result.title
        ? `Generated presentation "${result.title}" with ${result.slideCount} slides and ${extractChartSpecsFromHtml(result.html).length} charts.`
        : memoryArtifactSummary;
    }

    const reviewNote = result.reviewPassed ? '' : ' (QA flagged issues)';
    addMessage({
      id: crypto.randomUUID(),
      role: 'assistant',
      content: result.html
        ? `✅ Generated ${result.slideCount} slides${reviewNote}.`
        : 'Generation completed but no slides were produced.',
      timestamp: Date.now(),
      documentId: scopedDocumentId,
      scope: messageScope,
    });

    const action = isEditFlow ? 'Edited' : 'Created';
    const slideInfo = result.slideCount > 0 ? ` (${result.slideCount} slide${result.slideCount !== 1 ? 's' : ''})` : '';
    const commitMsg = `${action} presentation${slideInfo}: ${prompt.slice(0, 50)}`;
    const updatedProject = useProjectStore.getState().project;
    commitVersion(updatedProject, commitMsg).catch((e) => console.warn('[VersionHistory] commit failed:', e));
    void queueMemoryExtraction(llmConfig, memoryConversation, memoryArtifactSummary, memorySourceRefs);

    setStatus({ state: 'idle' });
    setStreamingContent('');
  } catch (err) {
    if (abortControllerRef.current?.signal.aborted) {
      setStatus({ state: 'idle' });
      setStreamingContent('');
      addMessage({ id: crypto.randomUUID(), role: 'assistant', content: 'Generation cancelled.', timestamp: Date.now(), documentId: scopedDocumentId, scope: messageScope });
      return;
    }
    const message = err instanceof Error ? err.message : 'Generation failed';
    setStatus({ state: 'error', message });
    setStreamingContent('');
    addMessage({ id: crypto.randomUUID(), role: 'assistant', content: `Error: ${message}`, timestamp: Date.now(), documentId: scopedDocumentId, scope: messageScope });
  }
}
