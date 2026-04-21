/**
 * documentChartHydration.ts — Pre-renders chart specs found in document HTML
 * to static PNG images, replacing the placeholder <div data-aura-chart="...">
 * elements before the HTML is injected into the sandboxed document iframe.
 *
 * This runs in the parent window (where Chart.js is available) and avoids
 * the need to bundle Chart.js inside the iframe itself.
 */

import { prerenderCharts } from './prerender';
import { extractChartSpecsFromHtml } from './extract';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Replace all `<div data-aura-chart="id">` placeholders in `html` with
 * static `<img>` snapshots rendered from the corresponding chart specs.
 *
 * Chart specs are extracted from `<script data-aura-chart-spec>` blocks.
 * Specs with `illustrative: true` receive an overlay badge.
 *
 * Returns the transformed HTML string. If no charts are present, returns
 * the original HTML unchanged.
 */
export async function hydrateDocumentCharts(html: string): Promise<string> {
  if (!html.includes('data-aura-chart')) return html;

  const specsRecord = extractChartSpecsFromHtml(html);
  const specs = new Map(Object.entries(specsRecord));
  if (specs.size === 0) return html;

  const rendered = prerenderCharts(specs);
  if (rendered.size === 0) return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<body>${html}</body>`, 'text/html');

  doc.querySelectorAll<HTMLElement>('[data-aura-chart]').forEach((container) => {
    const chartId = (container.getAttribute('data-aura-chart') ?? '').trim();
    const prerendered = rendered.get(chartId);
    if (!prerendered) return;

    const specForId = specs.get(chartId);
    const isIllustrative = specForId?.illustrative === true;
    const title = specForId?.title ?? '';

    const img = doc.createElement('img');
    img.src = prerendered.dataUrl;
    img.alt = title ? escapeHtml(title) : 'Chart';
    img.style.cssText = `width:100%;max-width:${container.style.maxWidth || '720px'};display:block;margin:${container.style.margin || '24px auto'};border-radius:8px;`;

    if (isIllustrative) {
      const wrapper = doc.createElement('div');
      wrapper.style.cssText = 'position:relative;display:inline-block;width:100%;';
      wrapper.appendChild(img);

      const badge = doc.createElement('span');
      badge.textContent = 'Illustrative data';
      badge.setAttribute('data-aura-illustrative-badge', '');
      badge.style.cssText =
        'position:absolute;top:8px;right:8px;background:rgba(0,0,0,0.55);color:#fff;font-size:10px;'
        + 'font-family:system-ui,sans-serif;padding:2px 7px;border-radius:9999px;pointer-events:none;'
        + 'letter-spacing:0.03em;backdrop-filter:blur(4px);';
      wrapper.appendChild(badge);
      container.replaceWith(wrapper);
    } else {
      container.replaceWith(img);
    }
  });

  return doc.body.innerHTML;
}
