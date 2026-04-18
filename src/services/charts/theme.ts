import type { ChartTheme } from './types';

interface ChartThemeInput {
  mode?: 'light' | 'dark';
  primary?: string;
  accent?: string;
  text?: string;
  muted?: string;
  border?: string;
  background?: string;
}

const DEFAULTS: Required<ChartThemeInput> = {
  mode: 'light',
  primary: '#2563eb',
  accent: '#0ea5e9',
  text: '#0f172a',
  muted: '#64748b',
  border: 'rgba(100,116,139,0.35)',
  background: '#ffffff',
};

const FALLBACK_SERIES = ['#2563eb', '#0ea5e9', '#14b8a6', '#22c55e', '#f59e0b', '#f97316', '#ef4444', '#a855f7'];

function normalizeHexColor(value: string): string {
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed;
  return trimmed;
}

export function buildSeriesColors(primary: string, accent: string, count: number): string[] {
  const seed = [normalizeHexColor(primary), normalizeHexColor(accent), ...FALLBACK_SERIES];
  const colors: string[] = [];
  for (let i = 0; i < count; i += 1) {
    colors.push(seed[i % seed.length] ?? seed[0] ?? '#2563eb');
  }
  return colors;
}

export function buildChartTheme(input?: ChartThemeInput): ChartTheme {
  const resolved = {
    ...DEFAULTS,
    ...input,
  };

  return {
    mode: resolved.mode,
    textColor: normalizeHexColor(resolved.text),
    mutedTextColor: normalizeHexColor(resolved.muted),
    gridColor: resolved.mode === 'dark' ? 'rgba(148,163,184,0.28)' : 'rgba(100,116,139,0.18)',
    borderColor: resolved.border,
    backgroundColor: normalizeHexColor(resolved.background),
    seriesColors: buildSeriesColors(resolved.primary, resolved.accent, 8),
  };
}
