import type { ProviderConfig } from '@/types';
import type { ProjectDocument } from '@/types/project';

import type { ResolvedIntent } from '@/services/ai/intent/types';
import type { ContextBundle } from '@/services/context/types';
import type { SerializableRunSpec } from '@/services/executionSpec/types';
import type { AppliedWorkflowPreset } from '@/services/presets/types';
import type { ResolvedProjectRulesSnapshot } from '@/services/projectRules/types';
import type { RunStatus } from '@/services/runs/status';
import type { RunEventType } from '@/services/events/types';
import type { ArtifactRunPlan } from '@/services/artifactRuntime/types';

export type ExecutionMode = 'execute' | 'dry-run' | 'explain';

export interface RunProjectSnapshot {
  documentIds: string[];
  activeDocumentId: string | null;
  linkedReferenceCount: number;
  artifactCountsByType: Record<'document' | 'presentation' | 'spreadsheet', number>;
}

export interface RunRequest {
  runId: string;
  intent: ResolvedIntent;
  context: ContextBundle;
  providerConfig: ProviderConfig;
  activeArtifacts: {
    activeDocument: ProjectDocument | null;
  };
  projectRulesSnapshot: ResolvedProjectRulesSnapshot;
  selectedPresetId?: string;
  appliedPreset?: AppliedWorkflowPreset;
  projectSnapshot: RunProjectSnapshot;
  artifactRunPlan: ArtifactRunPlan;
  mode: ExecutionMode;
  /** @deprecated Quarantined legacy external-run contract. Active app runtime no longer writes this. */
  serializableSpec?: SerializableRunSpec;
  createdAt: number;
}

export interface RunRecord {
  runId: string;
  status: RunStatus;
  mode: ExecutionMode;
  intent: ResolvedIntent;
  latestEventId?: string;
  latestEventType?: RunEventType;
  touchedDocumentIds: string[];
  dependencyWarnings: string[];
  blockedReason?: string;
  retryChainRootId?: string;
  retryCount: number;
  policyActions: string[];
  finalOutputSummary?: string;
  outputBufferId?: string;
  serializableSpecId?: string;
  explainSummary?: string;
  createdAt: number;
  updatedAt: number;
}
