import type { EditFallbackDecision, EditStrategy, PatchAttempt } from '@/services/editing/types';

export interface EditingTelemetry {
  strategyUsed: EditStrategy;
  fallbackUsed: boolean;
  targetSummary: string[];
  dryRunFailures: string[];
}

export function buildEditingTelemetry(
  strategyUsed: EditStrategy,
  targetSummary: string[],
  attempts: PatchAttempt[],
  fallbackDecision?: EditFallbackDecision,
): EditingTelemetry {
  const dryRunFailures = attempts.flatMap((attempt) => attempt.dryRunFailures);

  return {
    strategyUsed,
    fallbackUsed: fallbackDecision?.fallbackUsed ?? false,
    targetSummary,
    dryRunFailures,
  };
}
