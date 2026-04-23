import type { EditFallbackDecision, EditStrategy, EditingTelemetry, PatchAttempt } from '@/services/editing/types';

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
