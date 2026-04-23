import type { ProviderConfig } from '@/types';
import type { FileAttachment } from '@/types';
import type { ProjectData, ProjectDocument } from '@/types/project';

import { resolveIntent } from '@/services/ai/intent/resolveIntent';
import { assembleContext } from '@/services/context/assemble';
import { loadContextPolicy } from '@/services/projectRules/load';
import { resolveProjectRulesSnapshot } from '@/services/projectRules/resolve';
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
    contextPolicy: loadContextPolicy(project.contextPolicy),
  });

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
    contextPolicy: loadContextPolicy(project.contextPolicy),
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
    memoryContext,
    contextPolicy: projectRulesSnapshot.contextPolicy,
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
