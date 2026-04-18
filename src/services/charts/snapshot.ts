import type { Chart } from 'chart.js';

export function snapshotChart(chart: Chart): string {
  return chart.toBase64Image('image/png', 1);
}
