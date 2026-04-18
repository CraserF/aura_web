import type { ChartConfiguration, ChartType } from 'chart.js';
import { ensureChartRegistry } from './registry';
import { normalizeSpec } from './normalizer';
import { buildChartTheme } from './theme';
import type { ChartSpec, ChartTheme, NormalizedChartSpec } from './types';

function toChartJsType(type: NormalizedChartSpec['type']): ChartType {
  switch (type) {
    case 'doughnut':
      return 'doughnut';
    case 'line':
    case 'area':
    case 'sparkline':
      return 'line';
    case 'bar':
    case 'horizontal-bar':
    case 'stacked-bar':
    default:
      return 'bar';
  }
}

function buildConfig(spec: NormalizedChartSpec, theme: ChartTheme): ChartConfiguration {
  const chartType = toChartJsType(spec.type);
  const sparkline = spec.type === 'sparkline';
  const doughnut = spec.type === 'doughnut';

  return {
    type: chartType,
    data: {
      labels: spec.labels,
      datasets: spec.datasets.map((dataset) => ({
        label: dataset.label,
        data: dataset.values,
        borderColor: dataset.color,
        backgroundColor: spec.type === 'area' ? `${dataset.color}44` : dataset.color,
        fill: spec.type === 'area',
        borderWidth: sparkline ? 2 : 1.5,
        pointRadius: sparkline ? 0 : 3,
        tension: chartType === 'line' ? 0.32 : 0,
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: spec.aspectRatio,
      indexAxis: spec.indexAxis,
      scales: doughnut
        ? undefined
        : {
            x: {
              display: !sparkline,
              grid: {
                display: spec.showGrid,
                color: theme.gridColor,
              },
              stacked: spec.stacked,
              ticks: {
                color: theme.mutedTextColor,
              },
            },
            y: {
              display: !sparkline,
              beginAtZero: spec.beginAtZero,
              grid: {
                display: spec.showGrid,
                color: theme.gridColor,
              },
              stacked: spec.stacked,
              ticks: {
                color: theme.mutedTextColor,
              },
            },
          },
      plugins: {
        legend: {
          display: !sparkline && spec.showLegend,
          labels: {
            color: theme.textColor,
          },
        },
        title: {
          display: !sparkline && !!spec.title,
          text: spec.title,
          color: theme.textColor,
        },
        tooltip: {
          enabled: !sparkline,
          callbacks: spec.unit
            ? {
                label: (ctx) => `${ctx.dataset.label ?? ''}: ${ctx.formattedValue}${spec.unit}`,
              }
            : undefined,
        },
      },
      elements: {
        arc: {
          borderColor: theme.backgroundColor,
          borderWidth: 2,
        },
      },
    },
  };
}

export function renderChart(opts: {
  container: HTMLElement;
  spec: ChartSpec;
  theme?: ChartTheme;
}) {
  const ChartJS = ensureChartRegistry();
  const theme = opts.theme ?? buildChartTheme();
  const normalized = normalizeSpec(opts.spec, theme);

  const canvas = document.createElement('canvas');
  const ariaLabel = normalized.title?.trim()
    || `Chart visualization: ${normalized.datasets.map((dataset) => dataset.label).join(', ') || 'data'}`;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', ariaLabel);
  opts.container.innerHTML = '';
  opts.container.appendChild(canvas);

  const chart = new ChartJS(canvas, buildConfig(normalized, theme));
  return {
    chart,
    spec: normalized,
    destroy: () => chart.destroy(),
  };
}
