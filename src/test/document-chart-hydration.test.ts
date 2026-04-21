/**
 * M1-A — document chart hydration tests
 *
 * Covers:
 * - M1.1: hydrateDocumentCharts replaces chart placeholders with <img> elements
 * - M1.2: renderChart + snapshotChart instances are destroyed (no leaks)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockDestroy = vi.fn();
const mockChart = {
  toBase64Image: vi.fn(() => 'data:image/png;base64,MOCKPNG'),
};

vi.mock('@/services/charts/renderer', () => ({
  renderChart: vi.fn(({ container }: { container: HTMLElement }) => {
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);
    return {
      chart: mockChart,
      spec: {},
      destroy: mockDestroy,
    };
  }),
}));

vi.mock('@/services/charts/snapshot', () => ({
  snapshotChart: vi.fn(() => 'data:image/png;base64,MOCKPNG'),
}));

vi.mock('@/services/charts/theme', () => ({
  buildChartTheme: vi.fn(() => ({
    mode: 'light',
    textColor: '#0f172a',
    mutedTextColor: '#64748b',
    gridColor: 'rgba(0,0,0,0.08)',
    borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: '#ffffff',
    seriesColors: ['#2563eb', '#7c3aed', '#db2777', '#ea580c'],
  })),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeChartHtml(id: string, illustrative = false): string {
  const spec = JSON.stringify({
    id,
    type: 'bar',
    title: `Test Chart ${id}`,
    labels: ['A', 'B'],
    datasets: [{ label: 'Series', values: [10, 20] }],
    illustrative,
  });

  return `
    <script type="application/json" data-aura-chart-spec>${spec}</script>
    <div data-aura-chart="${id}" style="width:100%;max-width:720px;aspect-ratio:2;margin:24px auto;"></div>
  `.trim();
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('hydrateDocumentCharts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Stub document.body.appendChild / removeChild to avoid JSDOM issues with offscreen div
    vi.spyOn(document.body, 'appendChild').mockImplementation((el) => el);
    vi.spyOn(document.body, 'removeChild').mockImplementation((_el) => _el as Node);
  });

  it('is a no-op when the html has no data-aura-chart attributes', async () => {
    const { hydrateDocumentCharts } = await import('@/services/charts/documentChartHydration');
    const html = '<p>No charts here</p>';
    const result = await hydrateDocumentCharts(html);
    expect(result).toBe(html);
  });

  it('replaces a chart placeholder div with an <img> element', async () => {
    const { hydrateDocumentCharts } = await import('@/services/charts/documentChartHydration');
    const html = makeChartHtml('c1');
    const result = await hydrateDocumentCharts(html);

    // The div placeholder must be gone
    expect(result).not.toContain('data-aura-chart="c1"');
    // An img tag must appear
    expect(result).toContain('<img');
    expect(result).toContain('data:image/png;base64,MOCKPNG');
  });

  it('sets img alt to the chart title', async () => {
    const { hydrateDocumentCharts } = await import('@/services/charts/documentChartHydration');
    const html = makeChartHtml('c2');
    const result = await hydrateDocumentCharts(html);
    expect(result).toContain('alt="Test Chart c2"');
  });

  it('destroys the Chart.js instance after snapshotting', async () => {
    const { hydrateDocumentCharts } = await import('@/services/charts/documentChartHydration');
    const html = makeChartHtml('c3');
    await hydrateDocumentCharts(html);
    expect(mockDestroy).toHaveBeenCalled();
  });

  it('wraps illustrative charts in a relative-positioned div with a badge', async () => {
    const { hydrateDocumentCharts } = await import('@/services/charts/documentChartHydration');
    const html = makeChartHtml('c4', true);
    const result = await hydrateDocumentCharts(html);
    expect(result).toContain('data-aura-illustrative-badge');
    expect(result).toContain('Illustrative data');
  });

  it('does not add an illustrative badge when illustrative is false', async () => {
    const { hydrateDocumentCharts } = await import('@/services/charts/documentChartHydration');
    const html = makeChartHtml('c5', false);
    const result = await hydrateDocumentCharts(html);
    expect(result).not.toContain('data-aura-illustrative-badge');
  });

  it('handles multiple charts in the same document', async () => {
    const { hydrateDocumentCharts } = await import('@/services/charts/documentChartHydration');
    const html = makeChartHtml('ca') + makeChartHtml('cb');
    const result = await hydrateDocumentCharts(html);
    expect(result).not.toContain('data-aura-chart="ca"');
    expect(result).not.toContain('data-aura-chart="cb"');
    // Two img tags should appear
    const imgCount = (result.match(/<img/g) ?? []).length;
    expect(imgCount).toBe(2);
    expect(mockDestroy).toHaveBeenCalledTimes(2);
  });

  it('leaves chart placeholder untouched if no matching spec is found', async () => {
    const { hydrateDocumentCharts } = await import('@/services/charts/documentChartHydration');
    // spec id is "spec-exists" but placeholder references "no-match"
    const specHtml = `
      <script type="application/json" data-aura-chart-spec>
        ${JSON.stringify({ id: 'spec-exists', labels: ['A'], datasets: [{ label: 'S', values: [1] }] })}
      </script>
      <div data-aura-chart="no-match"></div>
    `.trim();
    const result = await hydrateDocumentCharts(specHtml);
    // The placeholder for "no-match" must remain
    expect(result).toContain('data-aura-chart="no-match"');
  });
});
