import type { RunResult } from '@/services/contracts/runResult';
import type { RunEvent } from '@/services/events/types';
import type { SerializableRunSpec } from '@/services/executionSpec/types';
import type { RunStatus } from '@/services/runs/status';

export type ExternalExecutionCaller = 'api' | 'mcp' | 'automation' | 'app';

export interface ExternalExecutionRequest {
  spec: SerializableRunSpec;
  caller: ExternalExecutionCaller;
  requestId: string;
}

export interface ExternalExecutionResponse {
  runId: string;
  status: RunStatus;
  result: RunResult;
  warnings: string[];
  events?: RunEvent[];
}
