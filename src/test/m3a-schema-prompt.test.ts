/**
 * M3-A — Schema extensions + prompt guardrails tests
 *
 * Covers:
 * - ChartSpec type extensions: DataSource, ExtractPlan, DataProvenance fields
 * - Zod schema validation for new optional fields
 * - buildChartDataGuardrailsSection() prompt policy content
 */

import { describe, it, expect } from 'vitest';
import { ChartSpecSchema } from '@/services/ai/schemas/chart';
import {
  buildChartGuidanceSection,
  buildChartDataGuardrailsSection,
} from '@/services/ai/prompts/sections/charts';

// ── Schema tests ───────────────────────────────────────────────────────────────

describe('M3-A — ChartSpec Zod schema: inline (legacy) spec still valid', () => {
  it('validates a minimal inline spec without dataSource', () => {
    const result = ChartSpecSchema.safeParse({
      id: 'chart-1',
      labels: ['A', 'B', 'C'],
      datasets: [{ label: 'Series 1', values: [1, 2, 3] }],
    });
    expect(result.success).toBe(true);
  });

  it('validates a full inline spec with all optional render fields', () => {
    const result = ChartSpecSchema.safeParse({
      id: 'chart-2',
      type: 'line',
      title: 'Growth',
      subtitle: 'Year over year',
      labels: ['Jan', 'Feb', 'Mar'],
      datasets: [{ label: 'Revenue', values: [100, 120, 140], color: '#2563eb' }],
      unit: '$K',
      illustrative: true,
      showLegend: true,
      showGrid: true,
      showDataLabels: false,
      beginAtZero: true,
      aspectRatio: 2,
      stacked: false,
    });
    expect(result.success).toBe(true);
  });
});

describe('M3-A — ChartSpec Zod schema: dataSource field', () => {
  it('accepts inline dataSource kind', () => {
    const result = ChartSpecSchema.safeParse({
      id: 'chart-3',
      labels: ['X', 'Y'],
      datasets: [{ label: 'S', values: [1, 2] }],
      dataSource: { kind: 'inline' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts table-ref dataSource with refId', () => {
    const result = ChartSpecSchema.safeParse({
      id: 'chart-4',
      labels: ['A', 'B'],
      datasets: [{ label: 'S', values: [10, 20] }],
      dataSource: {
        kind: 'table-ref',
        refId: 'sales_data',
        query: 'SELECT category, SUM(amount) FROM sales_data GROUP BY category',
      },
    });
    expect(result.success).toBe(true);
  });

  it('accepts query-ref dataSource', () => {
    const result = ChartSpecSchema.safeParse({
      id: 'chart-5',
      labels: ['P', 'Q'],
      datasets: [{ label: 'S', values: [5, 15] }],
      dataSource: { kind: 'query-ref', query: 'SELECT x, y FROM metrics' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects unknown dataSource kind', () => {
    const result = ChartSpecSchema.safeParse({
      id: 'chart-6',
      labels: ['A', 'B'],
      datasets: [{ label: 'S', values: [1, 2] }],
      dataSource: { kind: 'csv-file' },
    });
    expect(result.success).toBe(false);
  });
});

describe('M3-A — ChartSpec Zod schema: extractPlan field', () => {
  it('accepts a groupBy extract plan', () => {
    const result = ChartSpecSchema.safeParse({
      id: 'chart-7',
      labels: ['A', 'B'],
      datasets: [{ label: 'S', values: [1, 2] }],
      extractPlan: {
        operation: 'groupBy',
        params: { groupCol: 'category', aggCol: 'value', agg: 'sum' },
      },
    });
    expect(result.success).toBe(true);
  });

  it('accepts all valid extract operations', () => {
    const ops = ['groupBy', 'topN', 'window', 'sample', 'timeseries-bucket'] as const;
    for (const operation of ops) {
      const result = ChartSpecSchema.safeParse({
        id: `chart-op-${operation}`,
        labels: ['A', 'B'],
        datasets: [{ label: 'S', values: [1, 2] }],
        extractPlan: { operation, params: {} },
      });
      expect(result.success).toBe(true);
    }
  });

  it('rejects an unknown extract operation', () => {
    const result = ChartSpecSchema.safeParse({
      id: 'chart-8',
      labels: ['A', 'B'],
      datasets: [{ label: 'S', values: [1, 2] }],
      extractPlan: { operation: 'pivot', params: {} },
    });
    expect(result.success).toBe(false);
  });
});

describe('M3-A — ChartSpec Zod schema: provenance field', () => {
  it('accepts a valid provenance object', () => {
    const result = ChartSpecSchema.safeParse({
      id: 'chart-9',
      labels: ['A', 'B'],
      datasets: [{ label: 'S', values: [1, 2] }],
      provenance: {
        rowCount: 10000,
        sampled: true,
        generatedAt: '2026-04-21T12:00:00Z',
        queryHash: 'abc123def456abc123def456abc123def456abc123def456abc123def456abc1',
      },
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative rowCount', () => {
    const result = ChartSpecSchema.safeParse({
      id: 'chart-10',
      labels: ['A', 'B'],
      datasets: [{ label: 'S', values: [1, 2] }],
      provenance: {
        rowCount: -1,
        sampled: false,
        generatedAt: '2026-04-21T12:00:00Z',
        queryHash: 'abc',
      },
    });
    expect(result.success).toBe(false);
  });

  it('spec remains valid without provenance', () => {
    const result = ChartSpecSchema.safeParse({
      id: 'chart-11',
      labels: ['A', 'B'],
      datasets: [{ label: 'S', values: [1, 2] }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.provenance).toBeUndefined();
    }
  });
});

describe('M3-A — ChartSpec Zod schema: combined extension fields', () => {
  it('accepts a spec with all three extension fields together', () => {
    const result = ChartSpecSchema.safeParse({
      id: 'chart-full',
      type: 'bar',
      title: 'Sales by Region',
      labels: ['North', 'South', 'East', 'West'],
      datasets: [{ label: 'Q1 Sales', values: [120, 95, 140, 110] }],
      unit: '$K',
      illustrative: false,
      dataSource: {
        kind: 'table-ref',
        refId: 'sales_2026',
        query: 'SELECT region, SUM(amount) FROM sales_2026 GROUP BY region',
      },
      extractPlan: {
        operation: 'groupBy',
        params: { groupCol: 'region', aggCol: 'amount', agg: 'sum' },
      },
      provenance: {
        rowCount: 48000,
        sampled: false,
        generatedAt: '2026-04-21T09:30:00Z',
        queryHash: 'deadbeef'.repeat(8),
      },
    });
    expect(result.success).toBe(true);
  });
});

// ── Prompt guardrail tests ────────────────────────────────────────────────────

describe('M3-A — buildChartGuidanceSection: baseline unchanged', () => {
  it('still contains the core chart placeholder rules', () => {
    const section = buildChartGuidanceSection();
    expect(section).toContain('data-aura-chart-spec');
    expect(section).toContain('data-aura-chart=');
    expect(section).toContain('illustrative: true');
    expect(section).toContain('2-30 labels');
  });
});

describe('M3-A — buildChartDataGuardrailsSection: token guardrail content', () => {
  it('returns a non-empty string', () => {
    const section = buildChartDataGuardrailsSection();
    expect(typeof section).toBe('string');
    expect(section.length).toBeGreaterThan(100);
  });

  it('mentions the 50-row hard cap', () => {
    const section = buildChartDataGuardrailsSection();
    expect(section).toContain('50');
    expect(section.toLowerCase()).toContain('row');
  });

  it('references describeTable extraction tool', () => {
    const section = buildChartDataGuardrailsSection();
    expect(section).toContain('describeTable');
  });

  it('references sampleRows extraction tool', () => {
    const section = buildChartDataGuardrailsSection();
    expect(section).toContain('sampleRows');
  });

  it('references aggregateQuery extraction tool', () => {
    const section = buildChartDataGuardrailsSection();
    expect(section).toContain('aggregateQuery');
  });

  it('instructs not to request the full table unless user asks', () => {
    const section = buildChartDataGuardrailsSection();
    expect(section.toLowerCase()).toContain('full table');
  });

  it('includes table-ref dataSource example', () => {
    const section = buildChartDataGuardrailsSection();
    expect(section).toContain('table-ref');
  });

  it('mentions extractPlan in the guardrails', () => {
    const section = buildChartDataGuardrailsSection();
    expect(section).toContain('extractPlan');
  });

  it('mentions provenance in the guardrails', () => {
    const section = buildChartDataGuardrailsSection();
    expect(section).toContain('provenance');
  });

  it('includes structured preview policy (schema summary, stats, sampled rows)', () => {
    const section = buildChartDataGuardrailsSection();
    expect(section.toLowerCase()).toContain('schema');
    expect(section.toLowerCase()).toContain('sampl');
  });
});
