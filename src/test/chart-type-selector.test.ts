import { describe, it, expect } from 'vitest';
import { inferChartType, resolveChartType } from '@/services/charts';
import type { ChartSpec } from '@/services/charts';

function baseSpec(overrides?: Partial<ChartSpec>): ChartSpec {
  return {
    id: 'chart-1',
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    datasets: [{ label: 'Revenue', values: [1, 2, 3, 4] }],
    ...overrides,
  };
}

describe('chart type selector', () => {
  it('infers sparkline when compact trend shape is detected', () => {
    const type = inferChartType(baseSpec({ aspectRatio: 4 }));
    expect(type).toBe('sparkline');
  });

  it('infers line chart for time labels', () => {
    const type = inferChartType(baseSpec({ labels: ['Jan', 'Feb', 'Mar', 'Apr'] }));
    expect(type).toBe('line');
  });

  it('overrides invalid doughnut choice to bar', () => {
    const type = resolveChartType(baseSpec({ type: 'doughnut', labels: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] }));
    expect(type).toBe('bar');
  });

  it('overrides stacked-bar with single dataset to bar', () => {
    const type = resolveChartType(baseSpec({ type: 'stacked-bar' }));
    expect(type).toBe('bar');
  });
});
