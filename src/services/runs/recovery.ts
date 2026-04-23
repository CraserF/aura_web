import type { RunRecord } from '@/services/runs/types';

export function shouldRetryRun(record: RunRecord): boolean {
  return record.status === 'failed';
}

export function resolveRetryChainRoot(run: RunRecord): string {
  return run.runId;
}

// TODO(phase-8): Add richer recovery decisions once policy evaluation is wired in.
