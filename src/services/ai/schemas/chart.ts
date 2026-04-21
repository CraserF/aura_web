import { z } from 'zod';

export const ChartDatasetSchema = z.object({
  label: z.string().min(1).max(60).describe('Series name'),
  values: z.array(z.number()).min(1).max(50).describe('Numeric data points'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().describe('Hex color override'),
});

export const DataSourceSchema = z.object({
  kind: z.enum(['inline', 'table-ref', 'query-ref']).describe('Data source type'),
  refId: z.string().optional().describe('DuckDB table name (for table-ref)'),
  query: z.string().optional().describe('SQL query to extract chart data'),
});

export const ExtractPlanSchema = z.object({
  operation: z.enum(['groupBy', 'topN', 'window', 'sample', 'timeseries-bucket']),
  params: z.record(z.string(), z.any()),
});

export const DataProvenanceSchema = z.object({
  rowCount: z.number().int().nonnegative(),
  sampled: z.boolean(),
  generatedAt: z.string().describe('ISO 8601 timestamp'),
  queryHash: z.string().describe('SHA-256 hex of query + snapshot'),
});

export const ChartSpecSchema = z.object({
  id: z.string().min(1).max(40).describe('Unique chart identifier'),
  type: z.enum([
    'bar',
    'horizontal-bar',
    'stacked-bar',
    'line',
    'area',
    'doughnut',
    'sparkline',
  ]).optional().describe('Chart type. Omit to auto-detect.'),
  title: z.string().max(100).optional(),
  subtitle: z.string().max(200).optional(),
  labels: z.array(z.string().min(1).max(40)).min(2).max(30).describe('Category labels'),
  datasets: z.array(ChartDatasetSchema).min(1).max(8).describe('Data series'),
  unit: z.string().max(10).optional(),
  illustrative: z.boolean().optional().describe('True if data is synthetic/example'),
  showLegend: z.boolean().optional(),
  showGrid: z.boolean().optional(),
  showDataLabels: z.boolean().optional(),
  beginAtZero: z.boolean().optional().default(true),
  aspectRatio: z.number().min(0.5).max(6).optional(),
  stacked: z.boolean().optional(),
  dataSource: DataSourceSchema.optional(),
  extractPlan: ExtractPlanSchema.optional(),
  provenance: DataProvenanceSchema.optional(),
});

export type ChartSpecZ = z.infer<typeof ChartSpecSchema>;

