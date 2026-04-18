export type {
  AuraChartType,
  ChartDataset,
  ChartSpec,
  ChartTheme,
  NormalizedChartSpec,
} from './types';

export { ensureChartRegistry } from './registry';
export { inferChartType, resolveChartType } from './typeSelector';
export { buildChartTheme, buildSeriesColors } from './theme';
export { normalizeSpec } from './normalizer';
export { renderChart } from './renderer';
export { snapshotChart } from './snapshot';
export { parseMarkdownTable, type ParsedMarkdownTable } from './parseMarkdownTable';
export { extractChartSpecsFromHtml } from './extract';
