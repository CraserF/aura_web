import { describe, it, expect } from 'vitest';
import { buildChartTheme, buildSeriesColors } from '@/services/charts';

describe('chart theme', () => {
  it('builds deterministic series colors', () => {
    const colors = buildSeriesColors('#111111', '#222222', 5);
    expect(colors).toEqual(['#111111', '#222222', '#2563eb', '#0ea5e9', '#14b8a6']);
  });

  it('builds dark mode theme tokens', () => {
    const theme = buildChartTheme({ mode: 'dark', text: '#f8fafc' });
    expect(theme.mode).toBe('dark');
    expect(theme.textColor).toBe('#f8fafc');
    expect(theme.gridColor).toBe('rgba(148,163,184,0.28)');
  });
});
