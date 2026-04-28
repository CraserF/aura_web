import type {
  ArtifactQualityBar,
  ArtifactQualityDecisionStatus,
  ArtifactQualityPolishAction,
} from '@/services/artifactRuntime/types';

export interface ArtifactQualityPolishDecision {
  status: ArtifactQualityDecisionStatus;
  action: ArtifactQualityPolishAction;
  shouldPolish: boolean;
  reason: string;
  remainingDeterministicPasses: number;
  remainingLlmPasses: number;
}

export interface DecideArtifactQualityPolishInput {
  qualityBar?: ArtifactQualityBar;
  validationPassed: boolean;
  validationBlockingCount: number;
  qualityPassed?: boolean;
  qualityScore?: number;
  qualityBlockingCount?: number;
  deterministicPolishCount?: number;
  llmPolishCount?: number;
  deterministicPolishAvailable?: boolean;
  llmPolishAvailable?: boolean;
}

function countRemaining(total: number, used = 0): number {
  return Math.max(0, total - used);
}

function buildScoreLabel(input: DecideArtifactQualityPolishInput, qualityBar: ArtifactQualityBar): string {
  return typeof input.qualityScore === 'number'
    ? `Quality score ${input.qualityScore} against ${qualityBar.tier} threshold ${qualityBar.acceptanceThresholds.minimumScore}`
    : `Quality score unavailable against ${qualityBar.tier} threshold ${qualityBar.acceptanceThresholds.minimumScore}`;
}

export function decideArtifactQualityPolish(
  input: DecideArtifactQualityPolishInput,
): ArtifactQualityPolishDecision {
  if (!input.qualityBar) {
    return {
      status: 'safe-and-excellent',
      action: 'skipped-no-quality-bar',
      shouldPolish: false,
      reason: 'No runtime quality bar is attached; safety validation controls finalization.',
      remainingDeterministicPasses: 0,
      remainingLlmPasses: 0,
    };
  }

  const { qualityBar } = input;
  const remainingDeterministicPasses = countRemaining(
    qualityBar.polishingBudget.deterministicPasses,
    input.deterministicPolishCount,
  );
  const remainingLlmPasses = countRemaining(
    qualityBar.polishingBudget.llmPasses,
    input.llmPolishCount,
  );

  if (!input.validationPassed || input.validationBlockingCount > 0 || (input.qualityBlockingCount ?? 0) > 0) {
    return {
      status: 'blocked-by-safety',
      action: 'safety-blocked',
      shouldPolish: false,
      reason: 'Safety validation has blocking issues; excellence polishing cannot replace safety repair.',
      remainingDeterministicPasses,
      remainingLlmPasses,
    };
  }

  const scoreMeetsThreshold = typeof input.qualityScore === 'number' &&
    input.qualityScore >= qualityBar.acceptanceThresholds.minimumScore;
  if (input.qualityPassed || scoreMeetsThreshold) {
    return {
      status: 'safe-and-excellent',
      action: 'skipped-excellent',
      shouldPolish: false,
      reason: `${buildScoreLabel(input, qualityBar)}; no excellence polish needed.`,
      remainingDeterministicPasses,
      remainingLlmPasses,
    };
  }

  if (input.deterministicPolishAvailable !== false && remainingDeterministicPasses > 0) {
    return {
      status: 'safe-needs-polish',
      action: 'deterministic-polish',
      shouldPolish: true,
      reason: `${buildScoreLabel(input, qualityBar)}; deterministic polish budget is available.`,
      remainingDeterministicPasses,
      remainingLlmPasses,
    };
  }

  if (input.llmPolishAvailable && remainingLlmPasses > 0) {
    return {
      status: 'safe-needs-polish',
      action: 'llm-polish',
      shouldPolish: true,
      reason: `${buildScoreLabel(input, qualityBar)}; bounded LLM polish budget is available.`,
      remainingDeterministicPasses,
      remainingLlmPasses,
    };
  }

  return {
    status: 'safe-budget-exhausted',
    action: 'skipped-no-budget',
    shouldPolish: false,
    reason: `${buildScoreLabel(input, qualityBar)}; no compatible excellence polish budget remains.`,
    remainingDeterministicPasses,
    remainingLlmPasses,
  };
}
