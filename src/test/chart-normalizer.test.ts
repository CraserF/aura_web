import { describe, it, expect } from 'vitest';
import { normalizeSpec, buildChartTheme } from '@/services/charts';
import type { ChartSpec } from '@/services/charts';

const theme = buildChartTheme({ primary: '#1d4ed8', accent: '#0ea5e9' });

function makeSpec(overrides?: Partial<ChartSpec>): ChartSpec {
  return {
    id: 'chart-1',
    labels: ['Q1', 'Q2', 'Q3'],
    datasets: [{ label: 'Revenue', values: [10, 20] }],
    ...overrides,
  };
}

describe('chart normalizer', () => {
  it('fills defaults and pads dataset values to label length', () => {
    const normalized = normalizeSpec(makeSpec(), theme);
    expect(normalized.beginAtZero).toBe(true);
    expect(normalized.showLegend).toBe(false);
    expect(normalized.datasets[0]?.values).toEqual([10, 20, 0]);
  });

  it('applies stacked defaults for stacked-bar', () => {
    const normalized = normalizeSpec(makeSpec({
      type: 'stacked-bar',
      datasets: [
        { label: 'North', values: [1, 2, 3] },
        { label: 'South', values: [3, 2, 1] },
      ],
    }), theme);

    expect(normalized.type).toBe('stacked-bar');
    expect(normalized.stacked).toBe(true);
    expect(normalized.showLegend).toBe(true);
  });

  it('uses explicit dataset color when valid hex', () => {
    const normalized = normalizeSpec(makeSpec({
      datasets: [{ label: 'Revenue', values: [1, 2, 3], color: '#22c55e' }],
    }), theme);

    expect(normalized.datasets[0]?.color).toBe('#22c55e');
  });

  it('throws on invalid spec shape', () => {
    expect(() => normalizeSpec(makeSpec({ labels: ['only-one'] }), theme)).toThrow();
  });
});
