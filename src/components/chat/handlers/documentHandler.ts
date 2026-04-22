/**
 * Document workflow handler — all document-specific chat logic.
 *
 * Extracted from ChatBar so that document logic is identifiable,
 * testable, and does not mix with spreadsheet or presentation workflows.
 */

import type { ProjectDocument } from '@/types/project';
import type { ChatMessage as ChatMessageType, GenerationStatus, WorkflowStep, ProviderId, ProviderConfig } from '@/types';
import type { AIMessage } from '@/services/ai/types';
import type { LLMConfig } from '@/services/ai/workflow/types';
import type { WorkflowEvent } from '@/services/ai/workflow';
import { commitVersion } from '@/services/storage/versionHistory';
import { extractChartSpecsFromHtml } from '@/services/charts';
import { useProjectStore } from '@/stores/projectStore';

export interface DocumentHandlerContext {
  prompt: string;
  promptWithContext: string;
  chatHistory: AIMessage[];
  imageParts: { type: 'image'; image: string; mimeType: string }[];
  isEdit: boolean;
  activeDocument: ProjectDocument | null;
  project: { id: string; documents: ProjectDocument[] };
  scopedDocumentId: string | undefined;
  messageScope: 'project' | 'document';
  providerId: ProviderId;
  documentStylePreset: string;
  workflowStepsRef: React.MutableRefObject<WorkflowStep[]>;
  abortControllerRef: React.MutableRefObject<AbortController | null>;
  // Store callbacks
  addMessage: (msg: ChatMessageType) => void;
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
  buildWorkflowMemoryContext: (prompt: string) => Promise<string>;
  getActiveProvider: () => ProviderConfig;
}

export async function handleDocumentWorkflow(ctx: DocumentHandlerContext): Promise<void> {
  const {
    prompt, promptWithContext, chatHistory, imageParts, isEdit, activeDocument,
    project, scopedDocumentId, messageScope, providerId, documentStylePreset,
    workflowStepsRef, abortControllerRef,
    addMessage, addDocument, updateDocument, setStatus, setStreamingContent, appendStreamingContent,
    updateStepStatus, queueMemoryExtraction, buildWorkflowMemoryContext, getActiveProvider,
  } = ctx;

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
    const config = getActiveProvider();
    const [{ getProviderEntry }, { runDocumentWorkflow }] = await Promise.all([
      import('@/services/ai/registry'),
      import('@/services/ai/workflow/document'),
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
    const projectLinks: import('@/services/ai/workflow').DocumentProjectLink[] = project.documents
      .filter((d) => d.id !== activeDocument?.id && d.contentHtml && d.type !== 'spreadsheet')
      .map((d) => ({ id: d.id, title: d.title, type: d.type as 'document' | 'presentation' }));

    const memoryContext = await buildWorkflowMemoryContext(promptWithContext);

    const result = await runDocumentWorkflow({
      input: {
        prompt: promptWithContext,
        existingHtml: existingDoc,
        existingMarkdown: activeDocument?.type === 'document' ? activeDocument.sourceMarkdown : undefined,
        chatHistory,
        memoryContext,
        styleHint: documentStylePreset,
        projectLinks: projectLinks.length > 0 ? projectLinks : undefined,
        imageParts: imageParts.length > 0 ? imageParts : undefined,
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
      ? `Generated document "${result.title}".`
      : 'Generated document.';

    if (result.html) {
      if (activeDocument?.type === 'document') {
        const chartSpecs = extractChartSpecsFromHtml(result.html);
        updateDocument(activeDocument.id, {
          contentHtml: result.html,
          sourceMarkdown: result.markdown,
          title: result.title || activeDocument.title,
          chartSpecs,
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
          order: project.documents.length,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        addDocument(newDoc);
        memorySourceRefs = [...memorySourceRefs, `document:${newDoc.id}`];
      }

      memoryArtifactSummary = result.title
        ? `Generated document "${result.title}" with ${result.markdown.length} markdown characters.`
        : `Generated document with ${result.markdown.length} markdown characters.`;
    }

    addMessage({
      id: crypto.randomUUID(),
      role: 'assistant',
      content: result.html ? `✅ Created document: "${result.title}"` : 'Document created.',
      timestamp: Date.now(),
      documentId: scopedDocumentId,
      scope: messageScope,
    });

    const docAction = existingDoc ? 'Edited' : 'Created';
    const commitMsg = `${docAction} document: ${prompt.slice(0, 60)}`;
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
