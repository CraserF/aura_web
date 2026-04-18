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
