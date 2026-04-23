import type { ProviderConfig } from '@/types';
import type { FileAttachment } from '@/types';
import type { ProjectData, ProjectDocument } from '@/types/project';

import { resolveIntent } from '@/services/ai/intent/resolveIntent';
import { assembleContext } from '@/services/context/assemble';
import type { RunRequest } from '@/services/runs/types';

export interface BuildRunRequestInput {
  prompt: string;
  attachments: FileAttachment[];
  messages: ProjectData['chatHistory'];
  project: ProjectData;
  activeDocument: ProjectDocument | null;
  showAllMessages: boolean;
  applyToAllDocuments: boolean;
  providerConfig: ProviderConfig;
  buildMemoryContext: (prompt: string) => Promise<string>;
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
  });
  const { messageScope, scopedDocumentId } = initialAssembly;

  const memoryContext = await buildMemoryContext(initialAssembly.context.conversation.promptWithContext);
  const assembled = assembleContext({
    prompt,
    attachments,
    messages,
    activeDocument,
    project,
    showAllMessages,
    applyToAllDocuments,
    memoryContext,
  });
  const intent = resolveIntent({
    prompt: assembled.context.conversation.promptWithContext,
    activeDocument,
    project,
    scope: assembled.messageScope,
    allowClarification,
  });

  return {
    runRequest: {
      runId: crypto.randomUUID(),
      intent,
      context: assembled.context,
      providerConfig,
      activeArtifacts: {
        activeDocument,
      },
      projectRulesSnapshot: null,
      createdAt: Date.now(),
    },
    messageScope,
    scopedDocumentId,
  };
}
