import type { ExternalExecutionRequest, ExternalExecutionResponse } from '@/services/adapters/types';
import type { RunResult } from '@/services/contracts/runResult';
import type { RunEvent } from '@/services/events/types';

export function mapApiExecutionRequest(spec: ExternalExecutionRequest['spec'], requestId: string): ExternalExecutionRequest {
  return {
    spec,
    caller: 'api',
    requestId,
  };
}

export function mapApiExecutionResponse(
  result: RunResult,
  warnings: string[] = [],
  events?: RunEvent[],
): ExternalExecutionResponse {
  return {
    runId: result.runId,
    status: result.status,
    result,
    warnings,
    ...(events ? { events } : {}),
  };
}
