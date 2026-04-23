import type { ProviderConfig } from '@/types';

import type { ExecutionMode, RunRequest } from '@/services/runs/types';
import type {
  ExecutionTargeting,
  ProviderConfigRef,
  SerializableContextSnapshot,
  SerializableRunSpec,
} from '@/services/executionSpec/types';

function buildProviderConfigRef(providerConfig: ProviderConfig): ProviderConfigRef {
  return {
    providerId: providerConfig.id,
    ...(providerConfig.model ? { model: providerConfig.model } : {}),
    ...(providerConfig.baseUrl ? { baseUrl: providerConfig.baseUrl } : {}),
    hasApiKey: providerConfig.apiKey.trim().length > 0,
  };
}

function buildContextSnapshot(runRequest: RunRequest): SerializableContextSnapshot {
  return {
    metrics: runRequest.context.metrics,
    compaction: runRequest.context.compaction,
    sources: runRequest.context.sources.map((source) => ({
      kind: source.kind,
      id: source.id,
      label: source.label,
      reasonIncluded: source.reasonIncluded,
      tokenEstimate: source.tokenEstimate,
      detailLevel: source.detailLevel,
      pinned: source.pinned,
      excluded: source.excluded,
      compacted: source.compacted,
    })),
    selectedSourceIds: runRequest.context.sources
      .filter((source) => !source.excluded)
      .map((source) => source.id),
  };
}

function buildTargeting(
  runRequest: RunRequest,
  messageScope: 'document' | 'project',
  scopedDocumentId?: string,
): ExecutionTargeting {
  return {
    messageScope,
    targetDocumentId: runRequest.intent.targetDocumentId ?? scopedDocumentId,
    ...(runRequest.intent.targetDocumentIds?.length
      ? { targetDocumentIds: runRequest.intent.targetDocumentIds }
      : {}),
    ...(runRequest.intent.targetSheetId ? { targetSheetId: runRequest.intent.targetSheetId } : {}),
  };
}

export interface BuildSerializableRunSpecInput {
  runRequest: RunRequest;
  messageScope: 'document' | 'project';
  scopedDocumentId?: string;
  mode?: ExecutionMode;
}

export function buildSerializableRunSpec(input: BuildSerializableRunSpecInput): SerializableRunSpec {
  const mode = input.mode ?? input.runRequest.mode;

  return {
    version: 1,
    runId: input.runRequest.runId,
    mode,
    intent: input.runRequest.intent,
    projectSnapshot: input.runRequest.projectSnapshot,
    contextSnapshot: buildContextSnapshot(input.runRequest),
    rulesSnapshot: {
      markdown: input.runRequest.projectRulesSnapshot.markdown,
      promptBlock: input.runRequest.projectRulesSnapshot.promptBlock,
      contextPolicy: input.runRequest.projectRulesSnapshot.contextPolicy,
      activePresetId: input.runRequest.projectRulesSnapshot.activePresetId,
      activePresetName: input.runRequest.projectRulesSnapshot.activePresetName,
      appliedPreset: input.runRequest.projectRulesSnapshot.appliedPreset,
      diagnostics: input.runRequest.projectRulesSnapshot.diagnostics,
    },
    ...(input.runRequest.appliedPreset ? { preset: input.runRequest.appliedPreset } : {}),
    providerRef: buildProviderConfigRef(input.runRequest.providerConfig),
    targeting: buildTargeting(input.runRequest, input.messageScope, input.scopedDocumentId),
  };
}
