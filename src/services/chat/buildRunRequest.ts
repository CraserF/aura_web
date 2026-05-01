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
import { buildArtifactRunPlan } from '@/services/artifactRuntime';

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
  selectedPresetId?: string;
  allowClarification?: boolean;
}

export interface BuildRunRequestResult {
  runRequest: RunRequest;
  messageScope: 'document' | 'project';
  scopedDocumentId: string | undefined;
}

function buildProjectSnapshot(project: ProjectData): RunRequest['projectSnapshot'] {
  return {
    documentIds: project.documents.map((document) => document.id),
    activeDocumentId: project.activeDocumentId,
    linkedReferenceCount: project.documents.reduce(
      (total, document) => total + (document.linkedTableRefs?.length ?? 0),
      0,
    ),
    artifactCountsByType: project.documents.reduce(
      (counts, document) => ({
        ...counts,
        [document.type]: counts[document.type] + 1,
      }),
      {
        document: 0,
        presentation: 0,
        spreadsheet: 0,
      },
    ),
  };
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
    selectedPresetId,
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

  const initialIntent = resolveIntent({
    prompt,
    activeDocument,
    project,
    scope: initialAssembly.messageScope,
    allowClarification,
  });
  const projectRulesSnapshot = resolveProjectRulesSnapshot(project, initialIntent.artifactType, selectedPresetId);

  const initialMemoryContext = await buildMemoryContext(initialAssembly.context.conversation.promptWithContext, {
    detailMode: selectionState.pinnedMemoryPaths.length > 0 ? 'full' : 'overview',
    pinnedPaths: selectionState.pinnedMemoryPaths,
    maxTokens: projectRulesSnapshot.contextPolicy.maxMemoryTokens ?? 1200,
  });
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
  const intent = resolveIntent({
    prompt,
    activeDocument,
    project,
    scope: assembledWithPolicy.messageScope,
    allowClarification,
  });

  const runId = crypto.randomUUID();
  const artifactRunPlan = buildArtifactRunPlan({
    runId,
    prompt,
    artifactType: intent.artifactType,
    operation: intent.operation,
    activeDocument,
    providerId: providerConfig.id,
    providerModel: providerConfig.model,
    projectRulesBlock: projectRulesSnapshot.promptBlock,
    colorTheme: project.colorTheme,
    editStrategyHint: intent.editStrategyHint,
    allowFullRegeneration: intent.allowFullRegeneration,
  });

  const runRequest: RunRequest = {
    runId,
    intent,
    context: assembledWithPolicy.context,
    providerConfig,
    activeArtifacts: {
      activeDocument,
    },
    projectRulesSnapshot,
    selectedPresetId,
    appliedPreset: projectRulesSnapshot.appliedPreset,
    projectSnapshot: buildProjectSnapshot(project),
    artifactRunPlan,
    createdAt: Date.now(),
  };

  return {
    runRequest,
    messageScope: intent.projectOperation ? 'project' : assembledWithPolicy.messageScope,
    scopedDocumentId: intent.projectOperation ? undefined : assembledWithPolicy.scopedDocumentId,
  };
}
