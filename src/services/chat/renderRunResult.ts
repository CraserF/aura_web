import type { RunResult } from '@/services/contracts/runResult';
import type { ArtifactQualityDecisionStatus } from '@/services/artifactRuntime/types';

export interface RenderedRunResult {
  content: string;
  statusMessage: string;
  clarifyOptions?: RunResult['assistantMessage']['clarifyOptions'];
}

/**
 * Maps a runtime quality decision to a plain, non-technical assistant-facing
 * outcome label. Returns null when no decision is available so the caller can
 * fall back to its own messaging.
 */
export function qualityOutcomeLabel(
  qualityDecision: ArtifactQualityDecisionStatus | undefined,
): string | null {
  switch (qualityDecision) {
    case 'safe-and-excellent': return 'Looks polished.';
    case 'safe-needs-polish': return 'Needs one more pass.';
    case 'safe-budget-exhausted': return 'Could not meet the quality bar in time.';
    case 'blocked-by-safety': return 'Could not produce a safe presentation.';
    default: return null;
  }
}

export function renderRunResult(result: RunResult): RenderedRunResult {
  const content = result.assistantMessage.content || result.structuredStatus.detail;
  const warningSuffix = result.warnings.length > 0
    ? ` Warning: ${result.warnings.map((warning) => warning.message).join(' ')}`
    : '';

  return {
    content: `${content}${warningSuffix}`.trim(),
    statusMessage: result.structuredStatus.detail,
    ...(result.assistantMessage.clarifyOptions
      ? { clarifyOptions: result.assistantMessage.clarifyOptions }
      : {}),
  };
}
