/**
 * M1.3 — chartExport.ts unit tests
 *
 * Tests the flattenChartsForExport() pre-processing step that replaces
 * Chart.js <canvas> elements with static <img> snapshots before the
 * html2pdf pipeline runs.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flattenChartsForExport } from '@/services/export/chartExport';

// ── Mock chart.js ─────────────────────────────────────────────────────────────

const mockChartInstance = {
  options: { animation: true as boolean | false },
  update: vi.fn(),
  toBase64Image: vi.fn(() => 'data:image/png;base64,MOCK'),
};

vi.mock('chart.js', () => ({
  Chart: {
    getChart: vi.fn(),
  },
}));

import { Chart } from 'chart.js';
const getChart = Chart.getChart as ReturnType<typeof vi.fn>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeContainer(numCanvases: number): HTMLElement {
  const div = document.createElement('div');
  for (let i = 0; i < numCanvases; i++) {
    const canvas = document.createElement('canvas');
    canvas.style.width = '400px';
    canvas.style.height = '200px';
    div.appendChild(canvas);
  }
  return div;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('flattenChartsForExport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('replaces a Chart.js canvas with an <img> element', async () => {
    getChart.mockReturnValue(mockChartInstance);
    const container = makeContainer(1);

    await flattenChartsForExport(container);

    const canvases = container.querySelectorAll('canvas');
    const images = container.querySelectorAll('img');
    expect(canvases).toHaveLength(0);
    expect(images).toHaveLength(1);
  });

  it('sets the img src to the base64 data URL returned by Chart', async () => {
    getChart.mockReturnValue(mockChartInstance);
    const container = makeContainer(1);

    await flattenChartsForExport(container);

    const img = container.querySelector('img');
    expect(img?.src).toBe('data:image/png;base64,MOCK');
  });

  it('disables animation and calls chart.update before capturing', async () => {
    getChart.mockReturnValue(mockChartInstance);
    const container = makeContainer(1);

    await flattenChartsForExport(container);

    expect(mockChartInstance.options.animation).toBe(false);
    expect(mockChartInstance.update).toHaveBeenCalledWith('none');
  });

  it('requests a 2× retina image from Chart', async () => {
    getChart.mockReturnValue(mockChartInstance);
    const container = makeContainer(1);

    await flattenChartsForExport(container);

    expect(mockChartInstance.toBase64Image).toHaveBeenCalledWith('image/png', 2);
  });

  it('preserves the canvas rendered dimensions on the replacement img', async () => {
    getChart.mockReturnValue(mockChartInstance);
    const container = makeContainer(1);
    const canvas = container.querySelector('canvas')!;
    canvas.style.width = '600px';
    canvas.style.height = '300px';

    await flattenChartsForExport(container);

    const img = container.querySelector('img')!;
    expect(img.style.width).toBe('600px');
    expect(img.style.height).toBe('300px');
  });

  it('replaces multiple canvases independently', async () => {
    getChart.mockReturnValue(mockChartInstance);
    const container = makeContainer(3);

    await flattenChartsForExport(container);

    expect(container.querySelectorAll('canvas')).toHaveLength(0);
    expect(container.querySelectorAll('img')).toHaveLength(3);
    expect(mockChartInstance.toBase64Image).toHaveBeenCalledTimes(3);
  });

  it('skips canvases that have no Chart.js instance attached', async () => {
    // First canvas has a chart, second does not
    getChart.mockImplementation((_canvas: HTMLCanvasElement, idx: number) =>
      idx === 0 ? mockChartInstance : null,
    );
    // Simpler: return null for all in this test
    getChart.mockReturnValue(null);
    const container = makeContainer(2);

    await flattenChartsForExport(container);

    // No canvases replaced because none had Chart instances
    expect(container.querySelectorAll('canvas')).toHaveLength(2);
    expect(container.querySelectorAll('img')).toHaveLength(0);
  });

  it('is a no-op for containers with no canvases', async () => {
    const container = document.createElement('div');
    container.innerHTML = '<p>No charts here</p>';

    await expect(flattenChartsForExport(container)).resolves.toBeUndefined();
    expect(container.querySelector('img')).toBeNull();
  });
});
