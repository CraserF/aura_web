import type { BenchmarkRunResult, BenchmarkSummary } from './types';

function resultLabel(result: BenchmarkRunResult['result']): string {
  switch (result) {
    case 'pass': return 'PASS';
    case 'fail': return 'FAIL';
    case 'error': return 'ERROR';
    case 'skipped': return 'SKIP';
  }
}

function escapeTableCell(value: string | number): string {
  return String(value)
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, '<br>');
}

/**
 * Generate a repeatable Markdown scorecard from a benchmark summary.
 * No live Ollama connection needed — works entirely from the summary data.
 */
export function generateOllamaBenchmarkScorecard(summary: BenchmarkSummary): string {
  const passRate =
    summary.totalCases > 0
      ? Math.round((summary.passCount / summary.totalCases) * 100)
      : 0;

  const lines: string[] = [
    `# Ollama Benchmark Scorecard`,
    ``,
    `Generated: ${summary.timestamp}`,
    `Model: ${summary.model}`,
    `Base URL: ${summary.baseUrl}`,
    ``,
    `## Summary`,
    ``,
    `| Metric | Value |`,
    `|---|---|`,
    `| Total cases | ${summary.totalCases} |`,
    `| Pass | ${summary.passCount} |`,
    `| Fail | ${summary.failCount} |`,
    `| Error | ${summary.errorCount} |`,
    `| Skipped | ${summary.skippedCount} |`,
    `| Pass rate | ${passRate}% |`,
    `| Average composite score | ${summary.averageCompositeScore} |`,
    ``,
    `## Case Results`,
    ``,
    `| Case | Type | Run | Result | Composite | Quality | Validation | Perf | Consistency | Grade | Classification | Notes |`,
    `|---|---|---|---|---|---|---|---|---|---|---|---|`,
  ];

  for (const r of summary.results) {
    const s = r.score;
    lines.push(
      `| ${escapeTableCell(r.caseId)} | ${escapeTableCell(r.artifactType)} | ${r.runIndex + 1} | ${resultLabel(r.result)} | ${s.compositeScore} | ${s.qualityScore} | ${s.validationScore} | ${s.performanceScore} | ${s.consistencyScore} | ${r.qualityGrade} | ${r.failureClassification} | ${escapeTableCell(r.notes)} |`,
    );
  }

  const failedCases = summary.results.filter((r) => r.result !== 'pass' && r.result !== 'skipped');
  if (failedCases.length > 0) {
    lines.push(``, `## Failed Cases`, ``);
    for (const r of failedCases) {
      lines.push(`### ${r.caseId}`, ``);
      lines.push(`- Result: ${resultLabel(r.result)}`);
      lines.push(`- Classification: ${r.failureClassification}`);
      if (r.failedSignals.length > 0) {
        lines.push(`- Failed signals: ${r.failedSignals.join(', ')}`);
      }
      if (r.notes) lines.push(`- Notes: ${r.notes}`);
      lines.push(``);
    }
  }

  return lines.join('\n');
}

/**
 * Build a BenchmarkSummary from a list of run results.
 */
export function buildBenchmarkSummary(
  results: BenchmarkRunResult[],
  options: { model: string; baseUrl: string; timestamp?: string },
): BenchmarkSummary {
  const passCount = results.filter((r) => r.result === 'pass').length;
  const failCount = results.filter((r) => r.result === 'fail').length;
  const errorCount = results.filter((r) => r.result === 'error').length;
  const skippedCount = results.filter((r) => r.result === 'skipped').length;

  const scored = results.filter((r) => r.result !== 'skipped');
  const averageCompositeScore =
    scored.length > 0
      ? Math.round(
          scored.reduce((sum, r) => sum + r.score.compositeScore, 0) / scored.length,
        )
      : 0;

  return {
    timestamp: options.timestamp ?? new Date().toISOString(),
    model: options.model,
    baseUrl: options.baseUrl,
    totalCases: results.length,
    passCount,
    failCount,
    errorCount,
    skippedCount,
    averageCompositeScore,
    results,
  };
}
