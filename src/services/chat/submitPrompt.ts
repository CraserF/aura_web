import type { GenerationStatus, WorkflowStep } from '@/types';
import type { AIMessage } from '@/services/ai/types';
import type { ChatMessage as ChatMessageType, FileAttachment } from '@/types';
import type { ProjectData, ProjectDocument } from '@/types/project';
import type { RunResult } from '@/services/contracts/runResult';
import type { ContextSelectionState } from '@/services/context/types';
import type { LLMConfig } from '@/services/ai/workflow/types';
import type { MemoryContextBuildResult, MemoryContextDetailMode } from '@/services/memory';
import type { ProviderConfig } from '@/types';

import { buildRunRequest } from '@/services/chat/buildRunRequest';
import { renderRunResult } from '@/services/chat/renderRunResult';
import {
  createRunRecord,
  markRunTouchedDocuments,
  recordRunEvent,
  setRunDependencyWarnings,
  updateRunRecordStatus,
} from '@/services/runs/registry';
import { publishRunEvent } from '@/services/events/eventBus';
import { createRunEventSource } from '@/services/events/provenance';
import { handleSpreadsheetWorkflow, type SpreadsheetHandlerContext } from '@/components/chat/handlers/spreadsheetHandler';
import { handlePresentationWorkflow, type PresentationHandlerContext } from '@/components/chat/handlers/presentationHandler';
import { handleDocumentWorkflow, type DocumentHandlerContext } from '@/components/chat/handlers/documentHandler';
import { handleProjectWorkflow, type ProjectWorkflowContext } from '@/services/ai/workflow/project';

type WorkflowStepsRef = { current: WorkflowStep[] };
type AbortControllerRef = { current: AbortController | null };

export interface SubmitPromptInput {
  prompt: string;
  attachments: FileAttachment[];
  messages: ProjectData['chatHistory'];
  project: ProjectData;
  activeDocument: ProjectDocument | null;
  showAllMessages: boolean;
  applyToAllDocuments: boolean;
  selectionState: ContextSelectionState;
  providerConfig: ProviderConfig;
  documentStylePreset: string;
  allowClarification: boolean;
}

export interface SubmitPromptServices {
  workflowStepsRef: WorkflowStepsRef;
  abortControllerRef: AbortControllerRef;
  addMessage: (message: ChatMessageType) => void;
  addDocument: (document: ProjectDocument) => void;
  updateDocument: (id: string, updates: Partial<ProjectDocument>) => void;
  setStatus: (status: GenerationStatus) => void;
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
  buildWorkflowMemoryContext: (
    prompt: string,
    options?: {
      detailMode?: MemoryContextDetailMode;
      pinnedPaths?: string[];
      maxTokens?: number;
    },
  ) => Promise<MemoryContextBuildResult>;
  onRunRequestBuilt?: (runRequest: Awaited<ReturnType<typeof buildRunRequest>>['runRequest']) => void;
}

export interface SubmitPromptHandlers {
  document: (context: DocumentHandlerContext) => Promise<RunResult>;
  presentation: (context: PresentationHandlerContext) => Promise<RunResult>;
  spreadsheet: (context: SpreadsheetHandlerContext) => Promise<RunResult>;
  project: (context: ProjectWorkflowContext) => Promise<RunResult>;
}

const defaultHandlers: SubmitPromptHandlers = {
  document: handleDocumentWorkflow,
  presentation: handlePresentationWorkflow,
  spreadsheet: handleSpreadsheetWorkflow,
  project: handleProjectWorkflow,
};

function buildBlockedRunResult(runId: string, runRequest: Awaited<ReturnType<typeof buildRunRequest>>['runRequest']): RunResult {
  const question = runRequest.intent.clarification?.question ?? 'More detail is required before generating.';

  return {
    runId,
    status: 'blocked',
    intent: runRequest.intent,
    outputs: {},
    assistantMessage: {
      content: question,
      clarifyOptions: runRequest.intent.clarification?.options,
    },
    validation: {
      passed: true,
      summary: 'Clarification required before generation.',
    },
    warnings: [],
    changedTargets: [{
      documentId: runRequest.intent.targetDocumentId,
      sheetId: runRequest.intent.targetSheetId,
      action: 'none',
    }],
    structuredStatus: {
      title: 'Clarification required',
      detail: question,
    },
  };
}

function buildAssistantChatMessage(
  result: RunResult,
  scopedDocumentId: string | undefined,
  messageScope: 'document' | 'project',
): ChatMessageType {
  const rendered = renderRunResult(result);

  return {
    id: crypto.randomUUID(),
    role: 'assistant',
    content: rendered.content,
    timestamp: Date.now(),
    documentId: scopedDocumentId,
    scope: messageScope,
    ...(rendered.clarifyOptions ? { clarifyOptions: rendered.clarifyOptions } : {}),
  };
}

export async function submitPrompt(
  input: SubmitPromptInput,
  services: SubmitPromptServices,
  handlers: SubmitPromptHandlers = defaultHandlers,
): Promise<RunResult> {
  const {
    prompt,
    attachments,
    messages,
    project,
    activeDocument,
    showAllMessages,
    applyToAllDocuments,
    selectionState,
    providerConfig,
    documentStylePreset,
    allowClarification,
  } = input;
  const {
    workflowStepsRef,
    abortControllerRef,
    addMessage,
    addDocument,
    updateDocument,
    setStatus,
    setStreamingContent,
    appendStreamingContent,
    setSlides,
    setTitle,
    updateStepStatus,
    queueMemoryExtraction,
    buildWorkflowMemoryContext,
    onRunRequestBuilt,
  } = services;
  const eventSource = createRunEventSource('submitPrompt');

  const { runRequest, messageScope, scopedDocumentId } = await buildRunRequest({
    prompt,
    attachments,
    messages,
    project,
    activeDocument,
    showAllMessages,
    applyToAllDocuments,
    selectionState,
    providerConfig,
    buildMemoryContext: buildWorkflowMemoryContext,
    allowClarification,
  });
  onRunRequestBuilt?.(runRequest);

  addMessage({
    id: crypto.randomUUID(),
    role: 'user',
    content: prompt,
    timestamp: Date.now(),
    documentId: scopedDocumentId,
    scope: messageScope,
    attachments: attachments.length > 0 ? attachments : undefined,
  });

  createRunRecord(runRequest.runId, runRequest.intent);
  const startedEvent = publishRunEvent({
    type: 'run.started',
    runId: runRequest.runId,
    source: eventSource,
    payload: {
      artifactType: runRequest.intent.artifactType,
      projectOperation: runRequest.intent.projectOperation,
    },
  });
  recordRunEvent(runRequest.runId, startedEvent);
  const contextEvent = publishRunEvent({
    type: 'run.context-assembled',
    runId: runRequest.runId,
    source: eventSource,
    payload: {
      sourceCount: runRequest.context.sources.length,
      promptChars: runRequest.context.metrics.promptChars,
      promptWithContextChars: runRequest.context.metrics.promptWithContextChars,
    },
  });
  recordRunEvent(runRequest.runId, contextEvent);
  const intentEvent = publishRunEvent({
    type: 'run.intent-resolved',
    runId: runRequest.runId,
    source: eventSource,
    payload: {
      artifactType: runRequest.intent.artifactType,
      operation: runRequest.intent.operation,
      projectOperation: runRequest.intent.projectOperation,
      targetDocumentIds: runRequest.intent.targetDocumentIds ?? [],
    },
  });
  recordRunEvent(runRequest.runId, intentEvent);

  if (runRequest.intent.needsClarification) {
    const blockedResult = buildBlockedRunResult(runRequest.runId, runRequest);
    updateRunRecordStatus(runRequest.runId, blockedResult.status);
    const blockedEvent = publishRunEvent({
      type: 'run.blocked',
      runId: runRequest.runId,
      source: eventSource,
      payload: {
        reason: blockedResult.structuredStatus.detail,
      },
    });
    recordRunEvent(runRequest.runId, blockedEvent);
    addMessage(buildAssistantChatMessage(blockedResult, scopedDocumentId, messageScope));
    setStatus({ state: 'idle' });
    setStreamingContent('');
    return blockedResult;
  }

  updateRunRecordStatus(runRequest.runId, 'running');
  const generatingEvent = publishRunEvent({
    type: 'run.generating',
    runId: runRequest.runId,
    source: eventSource,
    payload: {
      artifactType: runRequest.intent.artifactType,
      projectOperation: runRequest.intent.projectOperation,
    },
  });
  recordRunEvent(runRequest.runId, generatingEvent);

  const handlerContextBase = {
    runRequest,
    project,
    workflowStepsRef,
    abortControllerRef,
    addDocument,
    updateDocument,
    setStatus,
    setStreamingContent,
    appendStreamingContent,
    setSlides,
    setTitle,
    updateStepStatus,
    queueMemoryExtraction,
  };

  const result = await (
    runRequest.intent.projectOperation
      ? handlers.project(handlerContextBase)
      : runRequest.intent.artifactType === 'spreadsheet'
      ? handlers.spreadsheet(handlerContextBase)
      : runRequest.intent.artifactType === 'presentation'
        ? handlers.presentation(handlerContextBase)
        : handlers.document({
            ...handlerContextBase,
            documentStylePreset,
          })
  );

  updateRunRecordStatus(runRequest.runId, result.status);
  markRunTouchedDocuments(
    runRequest.runId,
    Array.from(
      new Set([
        ...result.changedTargets.map((target) => target.documentId).filter(Boolean) as string[],
        ...(result.outputs.project?.updatedDocumentIds ?? []),
      ]),
    ),
  );
  setRunDependencyWarnings(
    runRequest.runId,
    result.warnings.map((warning) => warning.message),
  );
  const finalEvent = publishRunEvent({
    type: result.status === 'failed' ? 'run.failed' : 'run.completed',
    runId: runRequest.runId,
    source: eventSource,
    payload: {
      status: result.status,
      updatedDocumentIds: result.outputs.project?.updatedDocumentIds ?? [],
    },
  });
  recordRunEvent(runRequest.runId, finalEvent);
  addMessage(buildAssistantChatMessage(result, scopedDocumentId, messageScope));

  if (result.status === 'failed') {
    const rendered = renderRunResult(result);
    setStatus({ state: 'error', message: rendered.statusMessage });
  } else {
    setStatus({ state: 'idle' });
  }

  setStreamingContent('');
  return result;
}
