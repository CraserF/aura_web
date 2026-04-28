import type {
  ArtifactQualityBar,
  ArtifactQualityGrade,
  ArtifactQualitySignalId,
  ArtifactQualitySignalScore,
} from '@/services/artifactRuntime/types';

export interface ArtifactQualityScoreSummary {
  score: number;
  grade: ArtifactQualityGrade;
  passed: boolean;
  failedSignalCount: number;
  polishingSkippedReason?: string;
}

export function clampQualityScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function scoreAgainstTarget(value: number, target: number): number {
  if (target <= 0) return value > 0 ? 100 : 0;
  return clampQualityScore((value / target) * 100);
}

export function qualityGradeFromScore(score: number): ArtifactQualityGrade {
  if (score >= 90) return 'excellent';
  if (score >= 82) return 'strong';
  if (score >= 72) return 'adequate';
  return 'needs-polish';
}

export function scoreQualitySignal(input: {
  id: ArtifactQualitySignalId;
  label: string;
  score: number;
  target: number;
  detail: string;
}): ArtifactQualitySignalScore {
  const score = clampQualityScore(input.score);
  return {
    id: input.id,
    label: input.label,
    score,
    target: input.target,
    passed: score >= input.target,
    detail: input.detail,
  };
}

export function summarizeQualitySignals(
  qualityBar: ArtifactQualityBar,
  signals: ArtifactQualitySignalScore[],
): ArtifactQualityScoreSummary {
  const signalById = new Map(signals.map((signal) => [signal.id, signal]));
  let weightedScore = 0;
  let weightTotal = 0;

  for (const target of qualityBar.signals) {
    const signal = signalById.get(target.id);
    if (!signal) continue;
    weightedScore += signal.score * target.weight;
    weightTotal += target.weight;
  }

  const score = clampQualityScore(
    weightTotal > 0
      ? weightedScore / weightTotal
      : signals.reduce((sum, signal) => sum + signal.score, 0) / Math.max(1, signals.length),
  );
  const failedSignalCount = signals.filter((signal) => !signal.passed).length;
  const passed = score >= qualityBar.acceptanceThresholds.minimumScore;
  const grade = qualityGradeFromScore(score);

  return {
    score,
    grade,
    passed,
    failedSignalCount,
    ...(passed
      ? {
          polishingSkippedReason: `Quality score ${score} met ${qualityBar.tier} threshold ${qualityBar.acceptanceThresholds.minimumScore}.`,
        }
      : qualityBar.polishingBudget.deterministicPasses + qualityBar.polishingBudget.llmPasses <= 0
        ? {
            polishingSkippedReason: `Quality score ${score} missed ${qualityBar.tier} threshold ${qualityBar.acceptanceThresholds.minimumScore}, but no polishing budget is available.`,
          }
        : {
            polishingSkippedReason: `Quality score ${score} needs polishing against ${qualityBar.tier} threshold ${qualityBar.acceptanceThresholds.minimumScore}.`,
          }),
  };
}
