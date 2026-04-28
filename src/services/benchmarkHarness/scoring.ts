import type { BenchmarkCaseScore } from './types';

// Local budget for Ollama (90 seconds)
const LOCAL_PERFORMANCE_BUDGET_MS = 90_000;

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Composite scoring weights:
 *   55% deterministic quality score
 *   25% validation profile score
 *   10% performance score (relative to local budget)
 *   10% consistency score (across reruns; default 100 for single runs)
 */
export function scoreBenchmarkCase(input: {
  qualityScore: number;
  validationPassed: boolean;
  totalMs: number;
  consistencyScore?: number;
}): BenchmarkCaseScore {
  const qualityScore = clamp(input.qualityScore);
  const validationScore = input.validationPassed ? 100 : 0;
  const perfRatio = Math.min(1, LOCAL_PERFORMANCE_BUDGET_MS / Math.max(1, input.totalMs));
  const performanceScore = clamp(perfRatio * 100);
  const consistencyScore = clamp(input.consistencyScore ?? 100);

  const compositeScore = clamp(
    qualityScore * 0.55 +
    validationScore * 0.25 +
    performanceScore * 0.10 +
    consistencyScore * 0.10,
  );

  return { compositeScore, qualityScore, validationScore, performanceScore, consistencyScore };
}

/**
 * Determine whether a case passed based on its quality score against the
 * local minimum threshold (78) and whether validation passed.
 */
export function benchmarkCasePassed(input: {
  qualityScore: number;
  validationPassed: boolean;
  localMinimumScore?: number;
}): boolean {
  const threshold = input.localMinimumScore ?? 78;
  return input.validationPassed && input.qualityScore >= threshold;
}

/**
 * Compute a consistency score across multiple reruns.
 * Returns 100 for a single run. Penalises variance in quality scores.
 */
export function computeConsistencyScore(qualityScores: number[]): number {
  if (qualityScores.length <= 1) return 100;
  const mean = qualityScores.reduce((sum, s) => sum + s, 0) / qualityScores.length;
  const variance = qualityScores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / qualityScores.length;
  const stdDev = Math.sqrt(variance);
  // Penalise by stdDev: a stdDev of 20 points → 0 consistency
  return clamp(100 - (stdDev / 20) * 100);
}

export function qualityGradeFromScore(score: number): 'excellent' | 'strong' | 'adequate' | 'needs-polish' {
  if (score >= 90) return 'excellent';
  if (score >= 82) return 'strong';
  if (score >= 72) return 'adequate';
  return 'needs-polish';
}
