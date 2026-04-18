import type { ChartDataset } from './types';

export interface ParsedMarkdownTable {
  labels: string[];
  datasets: ChartDataset[];
}

function parseNumericCell(value: string): number | null {
  const normalized = value.trim().replace(/[$,%\s,]/g, '');
  if (!normalized) return null;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function splitRow(row: string): string[] {
  return row
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

export function parseMarkdownTable(markdown: string): ParsedMarkdownTable | null {
  const lines = markdown
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 3) return null;

  const header = splitRow(lines[0] ?? '');
  if (header.length < 2) return null;

  const hasDivider = /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?$/.test(lines[1] ?? '');
  if (!hasDivider) return null;

  const labels: string[] = [];
  const series: number[][] = header.slice(1).map(() => []);

  for (const line of lines.slice(2)) {
    const cells = splitRow(line);
    if (cells.length !== header.length) continue;
    labels.push(cells[0] ?? '');

    for (let index = 1; index < cells.length; index += 1) {
      const parsed = parseNumericCell(cells[index] ?? '');
      series[index - 1]?.push(parsed ?? 0);
    }
  }

  if (labels.length < 2) return null;

  const datasets: ChartDataset[] = header.slice(1).map((name, index) => ({
    label: name,
    values: series[index] ?? [],
  }));

  return {
    labels,
    datasets,
  };
}
