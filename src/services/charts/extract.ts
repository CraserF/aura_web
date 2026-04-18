import { normalizeSpec } from './normalizer';
import type { ChartSpec } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function toChartSpec(value: unknown): ChartSpec | null {
  if (!isRecord(value)) return null;

  const candidate = value as Partial<ChartSpec>;
  if (!candidate.id || !Array.isArray(candidate.labels) || !Array.isArray(candidate.datasets)) {
    return null;
  }

  try {
    normalizeSpec(candidate as ChartSpec);
    return candidate as ChartSpec;
  } catch {
    return null;
  }
}

export function extractChartSpecsFromHtml(html: string): Record<string, ChartSpec> {
  if (!html.trim()) return {};

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<body>${html}</body>`, 'text/html');
  const specs: Record<string, ChartSpec> = {};

  doc.querySelectorAll('script[data-aura-chart-spec]').forEach((script) => {
    const type = (script.getAttribute('type') ?? '').trim().toLowerCase();
    if (type !== 'application/json') return;

    const raw = script.textContent ?? '';
    if (!raw.trim()) return;

    try {
      const parsed: unknown = JSON.parse(raw);
      const values = Array.isArray(parsed) ? parsed : [parsed];
      values.forEach((entry) => {
        const spec = toChartSpec(entry);
        if (spec) {
          specs[spec.id] = spec;
        }
      });
    } catch {
      // Ignore malformed chart JSON blocks.
    }
  });

  return specs;
}
