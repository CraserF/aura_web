export type AuraChartType =
  | 'bar'
  | 'horizontal-bar'
  | 'stacked-bar'
  | 'line'
  | 'area'
  | 'doughnut'
  | 'sparkline';

export interface ChartDataset {
  label: string;
  values: number[];
  color?: string;
}

// ── Data-source extension (M3.1) ───────────────────────────────────────────────

/**
 * Describes where a chart's data comes from.
 * - `inline`: values are embedded in ChartSpec.datasets[].values (current default)
 * - `table-ref`: data lives in a DuckDB table; use `query` to extract chart rows
 * - `query-ref`: data is produced by a fully-specified SQL query
 */
export interface DataSource {
  kind: 'inline' | 'table-ref' | 'query-ref';
  /** For table-ref: DuckDB table name. For query-ref: not used. */
  refId?: string;
  /** SQL query / fragment to extract chart data from the source table. */
  query?: string;
}

/**
 * Describes an aggregation operation that was used to reduce a large dataset
 * down to the chart's inline values.
 */
export interface ExtractPlan {
  operation: 'groupBy' | 'topN' | 'window' | 'sample' | 'timeseries-bucket';
  params: Record<string, unknown>;
}

/**
 * Audit metadata: when was the chart data extracted and from what snapshot?
 * Used for staleness detection when a project is reopened.
 */
export interface DataProvenance {
  /** Number of rows in the source table at extraction time. */
  rowCount: number;
  /** True if only a sample of the source rows was used. */
  sampled: boolean;
  /** ISO 8601 timestamp of when the extract was run. */
  generatedAt: string;
  /** SHA-256 hex of the source query + table snapshot (for staleness checks). */
  queryHash: string;
}

// ── Core spec ─────────────────────────────────────────────────────────────────

export interface ChartSpec {
  id: string;
  type?: AuraChartType;
  title?: string;
  subtitle?: string;
  labels: string[];
  datasets: ChartDataset[];
  unit?: string;
  illustrative?: boolean;
  showLegend?: boolean;
  showGrid?: boolean;
  showDataLabels?: boolean;
  beginAtZero?: boolean;
  aspectRatio?: number;
  stacked?: boolean;
  indexAxis?: 'x' | 'y';
  /** Data-source metadata. Undefined means inline-only (legacy default). */
  dataSource?: DataSource;
  /** Extract plan used to derive the inline values from a large dataset. */
  extractPlan?: ExtractPlan;
  /** Provenance metadata for staleness detection. */
  provenance?: DataProvenance;
}

export interface ChartTheme {
  mode: 'light' | 'dark';
  textColor: string;
  mutedTextColor: string;
  gridColor: string;
  borderColor: string;
  backgroundColor: string;
  seriesColors: string[];
}

export interface NormalizedChartSpec extends ChartSpec {
  type: AuraChartType;
  showLegend: boolean;
  showGrid: boolean;
  showDataLabels: boolean;
  beginAtZero: boolean;
  aspectRatio: number;
  stacked: boolean;
  indexAxis: 'x' | 'y';
  datasets: Array<ChartDataset & { color: string; values: number[] }>;
}

