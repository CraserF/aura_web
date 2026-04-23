import type { ProviderConfig } from '@/types';
import type { ProjectDocument } from '@/types/project';

import type { ResolvedIntent } from '@/services/ai/intent/types';
import type { ContextBundle } from '@/services/context/types';
import type { ResolvedProjectRulesSnapshot } from '@/services/projectRules/types';
import type { RunStatus } from '@/services/runs/status';

export interface RunRequest {
  runId: string;
  intent: ResolvedIntent;
  context: ContextBundle;
  providerConfig: ProviderConfig;
  activeArtifacts: {
    activeDocument: ProjectDocument | null;
  };
  projectRulesSnapshot: ResolvedProjectRulesSnapshot;
  createdAt: number;
}

export interface RunRecord {
  runId: string;
  status: RunStatus;
  intent: ResolvedIntent;
  createdAt: number;
  updatedAt: number;
}

// TODO(phase-1): Extend RunRequest with stable run metadata once the submit
// pipeline and parity harness are both reading from the same contract.
