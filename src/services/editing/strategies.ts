import type { EditFallbackDecision, EditStrategy, EditingTelemetry, PatchAttempt } from '@/services/editing/types';

export function buildEditingTelemetry(
  strategyUsed: EditStrategy,
  targetSummary: string[],
  attempts: PatchAttempt[],
  fallbackDecision?: EditFallbackDecision,
): EditingTelemetry {
  const preflightFailures = attempts.flatMap((attempt) => attempt.preflightFailures);

  return {
    strategyUsed,
    fallbackUsed: fallbackDecision?.fallbackUsed ?? false,
    targetSummary,
    preflightFailures,
  };
}
