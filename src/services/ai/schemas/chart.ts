import { z } from 'zod';

export const ChartDatasetSchema = z.object({
  label: z.string().min(1).max(60).describe('Series name'),
  values: z.array(z.number()).min(1).max(50).describe('Numeric data points'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().describe('Hex color override'),
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
});

export type ChartSpecZ = z.infer<typeof ChartSpecSchema>;
