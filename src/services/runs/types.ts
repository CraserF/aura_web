import type { ProviderConfig } from '@/types';
import type { ProjectDocument } from '@/types/project';

import type { ResolvedIntent } from '@/services/ai/intent/types';
import type { ContextBundle } from '@/services/context/types';
import type { ResolvedProjectRulesSnapshot } from '@/services/projectRules/types';
import type { RunStatus } from '@/services/runs/status';
import type { RunEventType } from '@/services/events/types';

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
  projectSnapshot: RunProjectSnapshot;
  createdAt: number;
}

export interface RunRecord {
  runId: string;
  status: RunStatus;
  intent: ResolvedIntent;
  latestEventId?: string;
  latestEventType?: RunEventType;
  touchedDocumentIds: string[];
  dependencyWarnings: string[];
  createdAt: number;
  updatedAt: number;
}

// TODO(phase-1): Extend RunRequest with stable run metadata once the submit
// pipeline and parity harness are both reading from the same contract.
