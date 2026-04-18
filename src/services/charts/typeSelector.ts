import type { AuraChartType, ChartSpec } from './types';

const TIME_PATTERN = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|q[1-4]|20\d{2}|week|day)/i;

function averageLabelLength(labels: string[]): number {
  if (labels.length === 0) return 0;
  return labels.reduce((sum, label) => sum + label.length, 0) / labels.length;
}

export function inferChartType(spec: ChartSpec): AuraChartType {
  const seriesCount = spec.datasets.length;
  const labelCount = spec.labels.length;

  if (seriesCount === 1 && !spec.title && labelCount <= 12 && (spec.aspectRatio ?? 0) >= 3) {
    return 'sparkline';
  }

  const looksLikeTimeSeries = spec.labels.filter((label) => TIME_PATTERN.test(label)).length > labelCount * 0.5;
  if (looksLikeTimeSeries) return 'line';

  if (seriesCount === 1 && labelCount <= 7) {
    const values = spec.datasets[0]?.values ?? [];
    if (values.every((value) => value >= 0)) {
      return 'doughnut';
    }
  }

  if (seriesCount >= 2 && labelCount <= 12) return 'bar';

  if (averageLabelLength(spec.labels) > 15) return 'horizontal-bar';

  return 'bar';
}

export function resolveChartType(spec: ChartSpec): AuraChartType {
  const inferred = inferChartType(spec);
  const selected = spec.type ?? inferred;

  if (selected === 'doughnut') {
    if (spec.datasets.length > 1 || spec.labels.length > 7) {
      return 'bar';
    }
  }

  if (selected === 'sparkline') {
    if (!!spec.title || spec.datasets.length !== 1) {
      return 'line';
    }
  }

  if (selected === 'stacked-bar' && spec.datasets.length < 2) {
    return 'bar';
  }

  if (selected === 'line' && spec.labels.length <= 2) {
    return 'bar';
  }

  return selected;
}
