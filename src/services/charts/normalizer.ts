import { resolveChartType } from './typeSelector';
import { buildChartTheme } from './theme';
import type { ChartSpec, ChartTheme, NormalizedChartSpec } from './types';

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function assertSpecShape(spec: ChartSpec): void {
  if (!spec.id || spec.id.trim().length === 0) {
    throw new Error('Chart spec id is required.');
  }

  if (spec.labels.length < 2 || spec.labels.length > 30) {
    throw new Error('Chart spec labels must contain between 2 and 30 labels.');
  }

  if (spec.datasets.length < 1 || spec.datasets.length > 8) {
    throw new Error('Chart spec must contain between 1 and 8 datasets.');
  }
}

function normalizeDatasetValues(values: number[], targetSize: number): number[] {
  const clean = values
    .filter((value) => Number.isFinite(value))
    .slice(0, targetSize);

  while (clean.length < targetSize) {
    clean.push(0);
  }

  return clean;
}

function clampAspectRatio(value: number | undefined, chartType: NormalizedChartSpec['type']): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return chartType === 'sparkline' ? 4 : 2;
  }
  return Math.min(6, Math.max(0.5, value));
}

function deriveDatasetColor(explicitColor: string | undefined, index: number, theme: ChartTheme): string {
  if (explicitColor && HEX_COLOR.test(explicitColor)) {
    return explicitColor;
  }
  return theme.seriesColors[index % theme.seriesColors.length] ?? theme.seriesColors[0] ?? '#2563eb';
}

export function normalizeSpec(spec: ChartSpec, themeInput?: ChartTheme): NormalizedChartSpec {
  assertSpecShape(spec);

  const theme = themeInput ?? buildChartTheme();
  const type = resolveChartType(spec);
  const indexAxis: 'x' | 'y' = type === 'horizontal-bar' ? 'y' : (spec.indexAxis ?? 'x');
  const stacked = type === 'stacked-bar' ? true : (spec.stacked ?? false);

  const normalized: NormalizedChartSpec = {
    ...spec,
    type,
    indexAxis,
    stacked,
    beginAtZero: spec.beginAtZero ?? true,
    showLegend: spec.showLegend ?? spec.datasets.length > 1,
    showGrid: spec.showGrid ?? (type !== 'doughnut' && type !== 'sparkline'),
    showDataLabels: spec.showDataLabels ?? false,
    aspectRatio: clampAspectRatio(spec.aspectRatio, type),
    datasets: spec.datasets.map((dataset, index) => ({
      ...dataset,
      values: normalizeDatasetValues(dataset.values, spec.labels.length),
      color: deriveDatasetColor(dataset.color, index, theme),
    })),
  };

  return normalized;
}
