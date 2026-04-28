import { describe, expect, it } from 'vitest';

import {
  benchmarkCasePassed,
  buildBenchmarkSummary,
  classifyBenchmarkFailure,
  computeConsistencyScore,
  generateOllamaBenchmarkScorecard,
  qualityGradeFromScore,
  scoreBenchmarkCase,
} from '@/services/benchmarkHarness';
import type { BenchmarkRunResult } from '@/services/benchmarkHarness';
import { WORKFLOW_BENCHMARK_CASES } from '@/test/fixtures/workflow-benchmark-cases';

// ---------------------------------------------------------------------------
// scoreBenchmarkCase
// ---------------------------------------------------------------------------

describe('scoreBenchmarkCase', () => {
  it('produces composite score weighted 55/25/10/10', () => {
    const result = scoreBenchmarkCase({
      qualityScore: 80,
      validationPassed: true,
      totalMs: 45_000,
      consistencyScore: 100,
    });

    // qualityScore 80 × 0.55 = 44
    // validationScore 100 × 0.25 = 25
    // performanceScore: 90000/45000 = 2.0 → clamped to 100 × 0.10 = 10
    // consistencyScore 100 × 0.10 = 10
    // total = 89
    expect(result.qualityScore).toBe(80);
    expect(result.validationScore).toBe(100);
    expect(result.performanceScore).toBe(100);
    expect(result.consistencyScore).toBe(100);
    expect(result.compositeScore).toBe(89);
  });

  it('assigns validationScore 0 when validation failed', () => {
    const result = scoreBenchmarkCase({
      qualityScore: 70,
      validationPassed: false,
      totalMs: 30_000,
    });
    expect(result.validationScore).toBe(0);
  });

  it('penalises performance score when run exceeded budget', () => {
    // totalMs = 180_000 (2× the 90s budget) → perfRatio = 0.5 → perfScore = 50
    const result = scoreBenchmarkCase({
      qualityScore: 78,
      validationPassed: true,
      totalMs: 180_000,
    });
    expect(result.performanceScore).toBe(50);
  });

  it('clamps scores to 0–100 range', () => {
    const result = scoreBenchmarkCase({
      qualityScore: 120,
      validationPassed: true,
      totalMs: 1,
      consistencyScore: -10,
    });
    expect(result.qualityScore).toBe(100);
    expect(result.consistencyScore).toBe(0);
    expect(result.compositeScore).toBeGreaterThanOrEqual(0);
    expect(result.compositeScore).toBeLessThanOrEqual(100);
  });

  it('uses 100 as default consistency score for single runs', () => {
    const result = scoreBenchmarkCase({
      qualityScore: 82,
      validationPassed: true,
      totalMs: 60_000,
    });
    expect(result.consistencyScore).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// benchmarkCasePassed
// ---------------------------------------------------------------------------

describe('benchmarkCasePassed', () => {
  it('passes when quality meets local threshold (78) and validation passed', () => {
    expect(benchmarkCasePassed({ qualityScore: 78, validationPassed: true })).toBe(true);
    expect(benchmarkCasePassed({ qualityScore: 85, validationPassed: true })).toBe(true);
  });

  it('fails when quality is below threshold', () => {
    expect(benchmarkCasePassed({ qualityScore: 77, validationPassed: true })).toBe(false);
  });

  it('fails when validation did not pass even if quality is sufficient', () => {
    expect(benchmarkCasePassed({ qualityScore: 90, validationPassed: false })).toBe(false);
  });

  it('respects a custom minimum score', () => {
    expect(benchmarkCasePassed({ qualityScore: 75, validationPassed: true, localMinimumScore: 74 })).toBe(true);
    expect(benchmarkCasePassed({ qualityScore: 75, validationPassed: true, localMinimumScore: 76 })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// computeConsistencyScore
// ---------------------------------------------------------------------------

describe('computeConsistencyScore', () => {
  it('returns 100 for a single run', () => {
    expect(computeConsistencyScore([82])).toBe(100);
  });

  it('returns 100 for perfectly consistent reruns', () => {
    expect(computeConsistencyScore([80, 80, 80])).toBe(100);
  });

  it('returns less than 100 for inconsistent reruns', () => {
    // high variance → should be below 100
    const score = computeConsistencyScore([50, 90]);
    expect(score).toBeLessThan(100);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it('returns 0 for very high variance (stdDev ≥ 20)', () => {
    // scores 0 and 40 → mean 20, variance 400, stdDev 20 → 0
    const score = computeConsistencyScore([0, 40]);
    expect(score).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// qualityGradeFromScore
// ---------------------------------------------------------------------------

describe('qualityGradeFromScore', () => {
  it('assigns correct grades by score band', () => {
    expect(qualityGradeFromScore(95)).toBe('excellent');
    expect(qualityGradeFromScore(82)).toBe('strong');
    expect(qualityGradeFromScore(72)).toBe('adequate');
    expect(qualityGradeFromScore(60)).toBe('needs-polish');
  });
});

// ---------------------------------------------------------------------------
// classifyBenchmarkFailure
// ---------------------------------------------------------------------------

describe('classifyBenchmarkFailure', () => {
  it('returns none when the case passed', () => {
    expect(classifyBenchmarkFailure({
      validationPassed: true,
      failedSignalIds: [],
      qualityScore: 82,
      qualityThreshold: 78,
    })).toBe('none');
  });

  it('classifies routing-bug when actual routing kind differs from expected', () => {
    expect(classifyBenchmarkFailure({
      routingKind: 'create',
      expectedRoutingKind: 'batch',
      validationPassed: true,
      failedSignalIds: [],
      qualityScore: 80,
      qualityThreshold: 78,
    })).toBe('routing-bug');
  });

  it('classifies provider-capability-mismatch for connection errors', () => {
    expect(classifyBenchmarkFailure({
      error: 'ECONNREFUSED connecting to ollama',
      validationPassed: false,
      failedSignalIds: [],
      qualityScore: 0,
      qualityThreshold: 78,
    })).toBe('provider-capability-mismatch');
  });

  it('classifies workflow-bug for validation failures without error message', () => {
    expect(classifyBenchmarkFailure({
      validationPassed: false,
      failedSignalIds: [],
      qualityScore: 60,
      qualityThreshold: 78,
    })).toBe('workflow-bug');
  });

  it('classifies quality-continuity when continuity signal failed', () => {
    expect(classifyBenchmarkFailure({
      validationPassed: true,
      failedSignalIds: ['continuity'],
      qualityScore: 68,
      qualityThreshold: 78,
    })).toBe('quality-continuity');
  });

  it('classifies quality-visual when visual richness or component variety failed', () => {
    expect(classifyBenchmarkFailure({
      validationPassed: true,
      failedSignalIds: ['visual-richness', 'component-variety'],
      qualityScore: 65,
      qualityThreshold: 78,
    })).toBe('quality-visual');

    expect(classifyBenchmarkFailure({
      validationPassed: true,
      failedSignalIds: ['reference-style-match'],
      qualityScore: 70,
      qualityThreshold: 78,
    })).toBe('quality-visual');
  });

  it('classifies quality-depth when narrative or content signals failed', () => {
    expect(classifyBenchmarkFailure({
      validationPassed: true,
      failedSignalIds: ['narrative-coherence', 'content-depth'],
      qualityScore: 72,
      qualityThreshold: 78,
    })).toBe('quality-depth');
  });

  it('classifies prompt-tuning-issue when target clarity failed', () => {
    expect(classifyBenchmarkFailure({
      validationPassed: true,
      failedSignalIds: ['target-clarity'],
      qualityScore: 68,
      qualityThreshold: 78,
    })).toBe('prompt-tuning-issue');
  });

  it('classifies model-quality-limitation for quality miss without named signal failures', () => {
    expect(classifyBenchmarkFailure({
      validationPassed: true,
      failedSignalIds: [],
      qualityScore: 75,
      qualityThreshold: 78,
    })).toBe('model-quality-limitation');
  });

  it('prioritises continuity over visual when both signals fail', () => {
    expect(classifyBenchmarkFailure({
      validationPassed: true,
      failedSignalIds: ['continuity', 'visual-richness'],
      qualityScore: 60,
      qualityThreshold: 78,
    })).toBe('quality-continuity');
  });
});

// ---------------------------------------------------------------------------
// generateOllamaBenchmarkScorecard + buildBenchmarkSummary
// ---------------------------------------------------------------------------

const mockResult: BenchmarkRunResult = {
  caseId: 'presentation-narrative-create',
  artifactType: 'presentation',
  provider: 'ollama',
  model: 'gemma4:e2b',
  runIndex: 0,
  timings: { firstProgressMs: 3000, firstUsableOutputMs: 35000, totalMs: 62000 },
  score: {
    compositeScore: 85,
    qualityScore: 84,
    validationScore: 100,
    performanceScore: 100,
    consistencyScore: 100,
  },
  qualityGrade: 'strong',
  failedSignals: [],
  failureClassification: 'none',
  result: 'pass',
  notes: '',
};

const mockFailResult: BenchmarkRunResult = {
  caseId: 'presentation-metrics-create',
  artifactType: 'presentation',
  provider: 'ollama',
  model: 'gemma4:e2b',
  runIndex: 0,
  timings: { firstProgressMs: null, firstUsableOutputMs: null, totalMs: 15000 },
  score: {
    compositeScore: 52,
    qualityScore: 60,
    validationScore: 0,
    performanceScore: 100,
    consistencyScore: 100,
  },
  qualityGrade: 'needs-polish',
  failedSignals: ['visual-richness'],
  failureClassification: 'quality-visual',
  result: 'fail',
  notes: 'Validation blocking issues detected.',
};

describe('buildBenchmarkSummary', () => {
  it('counts pass/fail/error/skipped correctly', () => {
    const summary = buildBenchmarkSummary([mockResult, mockFailResult], {
      model: 'gemma4:e2b',
      baseUrl: 'http://127.0.0.1:11434',
      timestamp: '2026-04-28T10:00:00.000Z',
    });
    expect(summary.passCount).toBe(1);
    expect(summary.failCount).toBe(1);
    expect(summary.errorCount).toBe(0);
    expect(summary.skippedCount).toBe(0);
    expect(summary.totalCases).toBe(2);
  });

  it('computes average composite score from non-skipped results', () => {
    const summary = buildBenchmarkSummary([mockResult, mockFailResult], {
      model: 'gemma4:e2b',
      baseUrl: 'http://127.0.0.1:11434',
    });
    expect(summary.averageCompositeScore).toBe(Math.round((85 + 52) / 2));
  });
});

describe('generateOllamaBenchmarkScorecard', () => {
  it('generates scorecard without a live Ollama server', () => {
    const summary = buildBenchmarkSummary([mockResult, mockFailResult], {
      model: 'gemma4:e2b',
      baseUrl: 'http://127.0.0.1:11434',
      timestamp: '2026-04-28T10:00:00.000Z',
    });
    const scorecard = generateOllamaBenchmarkScorecard(summary);

    expect(scorecard).toContain('# Ollama Benchmark Scorecard');
    expect(scorecard).toContain('gemma4:e2b');
    expect(scorecard).toContain('2026-04-28T10:00:00.000Z');
    expect(scorecard).toContain('presentation-narrative-create');
    expect(scorecard).toContain('presentation-metrics-create');
    expect(scorecard).toContain('PASS');
    expect(scorecard).toContain('FAIL');
    expect(scorecard).toContain('Pass rate');
    expect(scorecard).toContain('50%');
  });

  it('includes a failed cases section when failures exist', () => {
    const summary = buildBenchmarkSummary([mockResult, mockFailResult], {
      model: 'gemma4:e2b',
      baseUrl: 'http://127.0.0.1:11434',
    });
    const scorecard = generateOllamaBenchmarkScorecard(summary);

    expect(scorecard).toContain('## Failed Cases');
    expect(scorecard).toContain('quality-visual');
    expect(scorecard).toContain('visual-richness');
  });

  it('escapes table-breaking notes in case rows', () => {
    const summary = buildBenchmarkSummary([{
      ...mockFailResult,
      notes: 'bad | table\nnext line',
    }], {
      model: 'gemma4:e2b',
      baseUrl: 'http://127.0.0.1:11434',
    });
    const scorecard = generateOllamaBenchmarkScorecard(summary);

    expect(scorecard).toContain('bad \\| table<br>next line');
  });

  it('omits failed cases section when all cases pass', () => {
    const summary = buildBenchmarkSummary([mockResult], {
      model: 'gemma4:e2b',
      baseUrl: 'http://127.0.0.1:11434',
    });
    const scorecard = generateOllamaBenchmarkScorecard(summary);

    expect(scorecard).not.toContain('## Failed Cases');
    expect(scorecard).toContain('100%');
  });
});

describe('workflow benchmark fixture coverage', () => {
  it('includes the required first benchmark set from the recovery plan', () => {
    const ids = new Set(WORKFLOW_BENCHMARK_CASES.map((benchCase) => benchCase.id));

    expect(ids.has('presentation-title-opening')).toBe(true);
    expect(ids.has('presentation-narrative-create')).toBe(true);
    expect(ids.has('presentation-metrics-create')).toBe(true);
    expect(ids.has('presentation-queued-slides')).toBe(true);
    expect(ids.has('document-long-form-create')).toBe(true);
    expect(ids.has('spreadsheet-create')).toBe(true);
  });
});
