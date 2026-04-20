/**
 * chartExport.ts — Pre-process Chart.js canvases into static PNG images before
 * the html2pdf.js pipeline runs. html2canvas cannot capture <canvas> elements,
 * so charts appear blank in exported PDFs without this step.
 */
import { Chart } from 'chart.js';

/**
 * Replace all Chart.js canvas elements inside `container` with static <img>
 * snapshots. Must be called after the container is mounted in the DOM and
 * before the html2pdf generation pipeline starts.
 */
export async function flattenChartsForExport(container: HTMLElement): Promise<void> {
  const canvases = container.querySelectorAll('canvas');

  for (const canvas of canvases) {
    const chart = Chart.getChart(canvas);
    if (!chart) continue;

    // Disable animations for a clean, fully-rendered snapshot
    chart.options.animation = false;
    chart.update('none');

    // Render to a high-DPI PNG data URL (2× for retina clarity in the PDF)
    const dataUrl = chart.toBase64Image('image/png', 2);

    // Replace the canvas with a static image preserving the rendered dimensions
    const img = document.createElement('img');
    img.src = dataUrl;
    img.style.width = canvas.style.width || `${canvas.offsetWidth}px`;
    img.style.height = canvas.style.height || `${canvas.offsetHeight}px`;
    canvas.replaceWith(img);
  }
}
