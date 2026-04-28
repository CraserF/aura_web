import type { BenchmarkFailureClassification } from './types';

export interface ClassifyBenchmarkFailureInput {
  error?: string;
  routingKind?: string;
  expectedRoutingKind?: string;
  validationPassed: boolean;
  failedSignalIds: string[];
  qualityScore: number;
  qualityThreshold: number;
}

/**
 * Classify a benchmark failure into one of the documented failure modes.
 * Returns 'none' when the case passed.
 *
 * Classification priority:
 *   1. routing-bug — wrong request kind produced
 *   2. provider-capability-mismatch — connectivity/provider errors
 *   3. workflow-bug — runtime errors or validation failures unrelated to quality
 *   4. prompt-tuning-issue — unclear target/action planning signal
 *   5. quality-continuity / quality-visual / quality-depth — specific signal failures
 *   6. model-quality-limitation — generic quality miss
 *   7. none — passed
 */
export function classifyBenchmarkFailure(
  input: ClassifyBenchmarkFailureInput,
): BenchmarkFailureClassification {
  if (
    input.routingKind !== undefined &&
    input.expectedRoutingKind !== undefined &&
    input.routingKind !== input.expectedRoutingKind
  ) {
    return 'routing-bug';
  }

  if (input.error) {
    const msg = input.error.toLowerCase();
    if (
      msg.includes('connect') ||
      msg.includes('econnrefused') ||
      msg.includes('fetch') ||
      msg.includes('network') ||
      msg.includes('ollama') ||
      msg.includes('provider')
    ) {
      return 'provider-capability-mismatch';
    }
    return 'workflow-bug';
  }

  if (!input.validationPassed) {
    return 'workflow-bug';
  }

  if (input.qualityScore < input.qualityThreshold) {
    const failed = new Set(input.failedSignalIds);
    if (failed.has('target-clarity')) return 'prompt-tuning-issue';
    if (failed.has('continuity')) return 'quality-continuity';
    if (
      failed.has('visual-richness') ||
      failed.has('component-variety') ||
      failed.has('reference-style-match')
    ) {
      return 'quality-visual';
    }
    if (failed.has('content-depth') || failed.has('narrative-coherence')) {
      return 'quality-depth';
    }
    return 'model-quality-limitation';
  }

  return 'none';
}
