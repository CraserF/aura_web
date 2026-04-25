import type { RunRecord } from '@/services/runs/types';

export function shouldRetryRun(record: RunRecord): boolean {
  return record.status === 'failed' && record.retryCount < 1;
}

export function resolveRetryChainRoot(run: RunRecord): string {
  return run.retryChainRootId ?? run.runId;
}

// TODO(phase-8): Add richer recovery decisions once policy evaluation is wired in.
