import type { DocumentType } from '@/types/project';

import type { ResolvedIntent } from '@/services/ai/intent/types';
import type { ContextBundle } from '@/services/context/types';
import type { AppliedWorkflowPreset } from '@/services/presets/types';
import type { ResolvedProjectRulesSnapshot } from '@/services/projectRules/types';
import type { RunProjectSnapshot } from '@/services/runs/types';
import type { ValidationProfileId } from '@/services/validation/types';

export type SerializableRunSpecVersion = 1;

export interface SerializableContextSourceSnapshot {
  kind: ContextBundle['sources'][number]['kind'];
  id: string;
  label: string;
  reasonIncluded: string;
  tokenEstimate: number;
  detailLevel: ContextBundle['sources'][number]['detailLevel'];
  pinned: boolean;
  excluded: boolean;
  compacted: boolean;
}

export interface SerializableContextSnapshot {
  metrics: ContextBundle['metrics'];
  compaction: ContextBundle['compaction'];
  sources: SerializableContextSourceSnapshot[];
  selectedSourceIds: string[];
}

export interface ProviderConfigRef {
  providerId: string;
  model?: string;
  baseUrl?: string;
  hasApiKey: boolean;
}

export interface ExecutionTargeting {
  messageScope: 'document' | 'project';
  targetDocumentId?: string;
  targetDocumentIds?: string[];
  targetSheetId?: string;
}

export interface SerializableRulesSnapshot {
  markdown: string;
  promptBlock: string;
  contextPolicy: ResolvedProjectRulesSnapshot['contextPolicy'];
  activePresetId?: string;
  activePresetName?: string;
  appliedPreset?: AppliedWorkflowPreset;
  diagnostics: ResolvedProjectRulesSnapshot['diagnostics'];
}

export interface SerializableRunSpec {
  version: SerializableRunSpecVersion;
  runId: string;
  mode: 'execute' | 'dry-run' | 'explain';
  intent: ResolvedIntent;
  projectSnapshot: RunProjectSnapshot;
  contextSnapshot: SerializableContextSnapshot;
  rulesSnapshot: SerializableRulesSnapshot;
  preset?: AppliedWorkflowPreset;
  providerRef: ProviderConfigRef;
  targeting: ExecutionTargeting;
}

export interface PredictedChange {
  documentId?: string;
  sheetId?: string;
  artifactType: DocumentType | 'project';
  action: 'create' | 'update' | 'none';
  summary: string;
}

export interface RunExplainResult {
  includedSources: SerializableContextSourceSnapshot[];
  projectOperation?: ResolvedIntent['projectOperation'];
  targetSummary: string[];
  validationProfile?: ValidationProfileId;
  appliedPreset?: {
    id: string;
    name: string;
  };
  policyActions: string[];
  predictedChanges: PredictedChange[];
  blockedReasons: string[];
}
