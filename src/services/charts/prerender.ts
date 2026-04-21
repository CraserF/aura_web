/**
 * prerender.ts — Renders a ChartSpec to a static PNG base64 string.
 *
 * Used by both the document iframe hydration path and the DOCX export path.
 * Creates a temporary off-screen canvas, renders via Chart.js, snapshots,
 * and immediately destroys the instance.
 */

import { renderChart } from './renderer';
import { snapshotChart } from './snapshot';
import { buildChartTheme } from './theme';
import type { ChartSpec } from './types';

export interface PrerenderResult {
  /** The chart spec that was rendered. */
  spec: ChartSpec;
  /** PNG data URL: `data:image/png;base64,...` */
  dataUrl: string;
}

/**
 * Pre-renders a single chart spec to a PNG data URL.
 * Returns `null` if rendering fails.
 */
export function prerenderChartToDataUrl(spec: ChartSpec): PrerenderResult | null {
  const offscreen = document.createElement('div');
  offscreen.style.cssText = 'position:fixed;left:-99999px;top:0;width:640px;height:320px;pointer-events:none;';
  document.body.appendChild(offscreen);

  try {
    const theme = buildChartTheme();
    const result = renderChart({ container: offscreen, spec, theme });
    const dataUrl = snapshotChart(result.chart);
    result.destroy();
    return { spec, dataUrl };
  } catch {
    return null;
  } finally {
    document.body.removeChild(offscreen);
  }
}

/**
 * Pre-renders all chart specs provided as a map, returning only
 * successfully rendered ones.
 */
export function prerenderCharts(specs: Map<string, ChartSpec>): Map<string, PrerenderResult> {
  const results = new Map<string, PrerenderResult>();
  for (const [id, spec] of specs) {
    const result = prerenderChartToDataUrl(spec);
    if (result) results.set(id, result);
  }
  return results;
}
