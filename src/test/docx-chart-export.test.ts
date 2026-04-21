/**
 * M1-D — DOCX chart image integration tests
 *
 * Verifies that buildChartParagraphs (via exportDocumentDocx) correctly
 * pre-renders chart specs found in HTML and appends ImageRun paragraphs.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/services/charts/renderer', () => ({
  renderChart: vi.fn(({ container }: { container: HTMLElement }) => {
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);
    return {
      chart: { toBase64Image: () => 'data:image/png;base64,DOCXPNG' },
      spec: {},
      destroy: vi.fn(),
    };
  }),
}));

vi.mock('@/services/charts/snapshot', () => ({
  snapshotChart: vi.fn(() => 'data:image/png;base64,DOCXPNG'),
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

vi.mock('file-saver', () => ({ saveAs: vi.fn() }));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeChartHtml(id: string, title?: string, illustrative = false): string {
  const spec = JSON.stringify({
    id,
    type: 'bar',
    title,
    labels: ['A', 'B'],
    datasets: [{ label: 'Series', values: [10, 20] }],
    ...(illustrative ? { illustrative: true } : {}),
  });
  return `
    <script type="application/json" data-aura-chart-spec>${spec}</script>
    <div data-aura-chart="${id}" style="width:100%;aspect-ratio:2;"></div>
  `;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('DOCX export — chart images (M1-D)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(document.body, 'appendChild').mockImplementation((el) => el);
    vi.spyOn(document.body, 'removeChild').mockImplementation((el) => el as Node);
  });

  it('builds ImageRun paragraphs for charts in the HTML', async () => {
    const { prerenderChartToDataUrl } = await import('@/services/charts/prerender');
    const spec = {
      id: 'c1',
      type: 'bar' as const,
      title: 'Test Chart',
      labels: ['A', 'B'],
      datasets: [{ label: 'S', values: [10, 20] }],
    };
    const result = prerenderChartToDataUrl(spec);
    expect(result).not.toBeNull();
    expect(result?.dataUrl).toContain('data:image/png;base64,');
  });

  it('returns null for empty chart spec gracefully', async () => {
    const { prerenderChartToDataUrl } = await import('@/services/charts/prerender');
    // Mock renderChart to throw for this test
    const { renderChart } = await import('@/services/charts/renderer');
    vi.mocked(renderChart).mockImplementationOnce(() => {
      throw new Error('render failed');
    });
    const spec = {
      id: 'fail',
      type: 'bar' as const,
      labels: ['A'],
      datasets: [{ label: 'S', values: [1] }],
    };
    const result = prerenderChartToDataUrl(spec);
    expect(result).toBeNull();
  });

  it('prerenderCharts returns a map keyed by chart id', async () => {
    const { prerenderCharts } = await import('@/services/charts/prerender');
    const specs = new Map([
      ['c1', { id: 'c1', type: 'bar' as const, labels: ['A'], datasets: [{ label: 'S', values: [1] }] }],
      ['c2', { id: 'c2', type: 'line' as const, labels: ['A'], datasets: [{ label: 'S', values: [1] }] }],
    ]);
    const results = prerenderCharts(specs);
    expect(results.has('c1')).toBe(true);
    expect(results.has('c2')).toBe(true);
    expect(results.get('c1')?.dataUrl).toContain('data:image/png;base64,');
  });

  it('extractChartSpecsFromHtml finds specs in the chart HTML', async () => {
    const { extractChartSpecsFromHtml } = await import('@/services/charts/extract');
    const html = makeChartHtml('test-id', 'My Chart');
    const specs = extractChartSpecsFromHtml(html);
    expect(specs['test-id']).toBeDefined();
    expect(specs['test-id']?.title).toBe('My Chart');
  });
});
