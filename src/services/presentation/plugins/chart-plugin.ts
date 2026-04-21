import type Reveal from 'reveal.js';
import { renderChart } from '@/services/charts';
import type { ChartSpec } from '@/services/charts';

interface HydratedChart {
  id: string;
  destroy: () => void;
}

function parseChartSpecBlocks(root: ParentNode): Map<string, ChartSpec> {
  const specs = new Map<string, ChartSpec>();

  root.querySelectorAll('script[data-aura-chart-spec]').forEach((node) => {
    const type = (node.getAttribute('type') ?? '').trim().toLowerCase();
    if (type !== 'application/json') return;

    try {
      const parsed = JSON.parse(node.textContent ?? '') as unknown;
      const values = Array.isArray(parsed) ? parsed : [parsed];
      values.forEach((entry) => {
        if (!entry || typeof entry !== 'object') return;
        const candidate = entry as Partial<ChartSpec>;
        if (!candidate.id || !Array.isArray(candidate.labels) || !Array.isArray(candidate.datasets)) return;
        specs.set(candidate.id, candidate as ChartSpec);
      });
    } catch {
      // Ignore malformed chart specs.
    }
  });

  return specs;
}

function hydrateCharts(deckRoot: HTMLElement, mounted: Map<HTMLElement, HydratedChart>): void {
  const specs = parseChartSpecBlocks(deckRoot);
  const containers = Array.from(deckRoot.querySelectorAll<HTMLElement>('[data-aura-chart]'));

  mounted.forEach((entry, container) => {
    if (!containers.includes(container)) {
      entry.destroy();
      mounted.delete(container);
    }
  });

  containers.forEach((container) => {
    const chartId = container.getAttribute('data-aura-chart')?.trim();
    if (!chartId) return;
    const spec = specs.get(chartId);
    if (!spec) return;

    const existing = mounted.get(container);
    if (existing?.id === chartId) return;

    if (existing) {
      existing.destroy();
      mounted.delete(container);
    }

    const rendered = renderChart({ container, spec });
    mounted.set(container, { id: chartId, destroy: rendered.destroy });

    // M1.6 — illustrative data badge on presentations
    if (spec.illustrative) {
      const existing = container.querySelector('[data-aura-illustrative-badge]');
      if (!existing) {
        const badge = document.createElement('span');
        badge.setAttribute('data-aura-illustrative-badge', '');
        badge.textContent = 'Illustrative data';
        badge.style.cssText =
          'position:absolute;top:6px;right:6px;background:rgba(0,0,0,0.55);color:#fff;'
          + 'font-size:10px;font-family:system-ui,sans-serif;padding:2px 7px;border-radius:9999px;'
          + 'pointer-events:none;letter-spacing:0.03em;backdrop-filter:blur(4px);z-index:10;';
        // Ensure the container has relative positioning for the badge
        if (getComputedStyle(container).position === 'static') {
          container.style.position = 'relative';
        }
        container.appendChild(badge);
      }
    }
  });
}

export const ChartPlugin = {
  id: 'aura-chart-plugin',
  init(reveal: InstanceType<typeof Reveal>) {
    const mounted = new Map<HTMLElement, HydratedChart>();

    const runHydration = () => {
      const currentSlide = reveal.getCurrentSlide() as HTMLElement | null;
      const slidesRoot = (currentSlide?.closest('.reveal')?.querySelector('.slides')
        ?? document.querySelector('.reveal .slides')) as HTMLElement | null;
      if (!slidesRoot) return;
      hydrateCharts(slidesRoot, mounted);
    };

    reveal.on('ready', runHydration);
    reveal.on('slidechanged', runHydration);

    return {
      destroy() {
        mounted.forEach((entry) => entry.destroy());
        mounted.clear();
      },
    };
  },
};
