import type { ProviderConfig } from '@/types';
import type { FileAttachment } from '@/types';
import type { ProjectData, ProjectDocument } from '@/types/project';
import type { MemoryContextBuildResult, MemoryContextDetailMode } from '@/services/memory';

import { resolveIntent } from '@/services/ai/intent/resolveIntent';
import { assembleContext } from '@/services/context/assemble';
import { loadContextPolicy } from '@/services/projectRules/load';
import { resolveProjectRulesSnapshot } from '@/services/projectRules/resolve';
import type { RunRequest } from '@/services/runs/types';
import type { ContextSelectionState } from '@/services/context/types';

export interface BuildRunRequestInput {
  prompt: string;
  attachments: FileAttachment[];
  messages: ProjectData['chatHistory'];
  project: ProjectData;
  activeDocument: ProjectDocument | null;
  showAllMessages: boolean;
  applyToAllDocuments: boolean;
  providerConfig: ProviderConfig;
  selectionState: ContextSelectionState;
  buildMemoryContext: (
    prompt: string,
    options?: {
      detailMode?: MemoryContextDetailMode;
      pinnedPaths?: string[];
      maxTokens?: number;
    },
  ) => Promise<MemoryContextBuildResult>;
  allowClarification?: boolean;
}

export interface BuildRunRequestResult {
  runRequest: RunRequest;
  messageScope: 'document' | 'project';
  scopedDocumentId: string | undefined;
}

export async function buildRunRequest(input: BuildRunRequestInput): Promise<BuildRunRequestResult> {
  const {
    prompt,
    attachments,
    messages,
    project,
    activeDocument,
    showAllMessages,
    applyToAllDocuments,
    providerConfig,
    selectionState,
    buildMemoryContext,
    allowClarification = true,
  } = input;

  const initialAssembly = assembleContext({
    prompt,
    attachments,
    messages,
    activeDocument,
    project,
    showAllMessages,
    applyToAllDocuments,
    memoryContext: '',
    memoryContextResult: undefined,
    contextPolicy: loadContextPolicy(project.contextPolicy),
    selectionState,
  });

  const initialMemoryContext = await buildMemoryContext(initialAssembly.context.conversation.promptWithContext, {
    detailMode: selectionState.pinnedMemoryPaths.length > 0 ? 'full' : 'overview',
    pinnedPaths: selectionState.pinnedMemoryPaths,
    maxTokens: loadContextPolicy(project.contextPolicy).maxMemoryTokens ?? 1200,
  });
  const assembled = assembleContext({
    prompt,
    attachments,
    messages,
    activeDocument,
    project,
    showAllMessages,
    applyToAllDocuments,
    memoryContext: initialMemoryContext.text,
    memoryContextResult: initialMemoryContext,
    contextPolicy: loadContextPolicy(project.contextPolicy),
    selectionState,
  });
  const intent = resolveIntent({
    prompt: assembled.context.conversation.promptWithContext,
    activeDocument,
    project,
    scope: assembled.messageScope,
    allowClarification,
  });
  const projectRulesSnapshot = resolveProjectRulesSnapshot(project, intent.artifactType);
  const assembledWithPolicy = assembleContext({
    prompt,
    attachments,
    messages,
    activeDocument,
    project,
    showAllMessages,
    applyToAllDocuments,
    memoryContext: initialMemoryContext.text,
    memoryContextResult: initialMemoryContext,
    contextPolicy: projectRulesSnapshot.contextPolicy,
    selectionState,
  });

  return {
    runRequest: {
      runId: crypto.randomUUID(),
      intent,
      context: assembledWithPolicy.context,
      providerConfig,
      activeArtifacts: {
        activeDocument,
      },
      projectRulesSnapshot,
      createdAt: Date.now(),
    },
    messageScope: assembledWithPolicy.messageScope,
    scopedDocumentId: assembledWithPolicy.scopedDocumentId,
  };
}
