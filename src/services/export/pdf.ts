import { sanitizeFilename } from '@/lib/sanitizeFilename';
import { flattenChartsForExport } from './chartExport';

export interface DocumentPdfJob {
  html: string;
  title: string;
}

export interface PreparedDocumentPdfMarkup {
  normalizedHtml: string;
  pageMarkup: string;
  documentMarkup: string;
}

const EXPORT_BASE_STYLES = `
  html, body {
    margin: 0;
    padding: 0;
    background: #eef2f7;
  }

  .aura-pdf-page {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    padding: 14mm 16mm 16mm;
    background: #ffffff;
    box-sizing: border-box;
  }

  .aura-pdf-root {
    width: 100%;
    margin: 0 auto;
    background: #ffffff;
    color: #0f172a;
  }

  .aura-pdf-root {
    font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    line-height: 1.6;
  }

  .aura-pdf-root .doc-shell {
    --doc-text: #0f172a !important;
    --doc-muted: #475569 !important;
    --doc-border: rgba(100, 116, 139, 0.4) !important;
    --doc-surface: #ffffff !important;
    --doc-surface-alt: #f8fafc !important;
    --doc-shell-bg: #ffffff !important;
    --doc-glow: rgba(148, 163, 184, 0.12) !important;
    max-width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    border: none !important;
    box-shadow: none !important;
    background: #ffffff !important;
    border-radius: 0 !important;
    color: #0f172a !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .aura-pdf-root .doc-prose,
  .aura-pdf-root .aura-doc {
    display: grid;
    gap: 14px !important;
  }

  .aura-pdf-root h1,
  .aura-pdf-root h2,
  .aura-pdf-root h3 {
    margin: 0 0 8px;
    color: #0f172a;
    line-height: 1.2;
  }

  .aura-pdf-root h1 { font-size: 22pt; }
  .aura-pdf-root h2 { font-size: 14pt; margin-top: 10px; }
  .aura-pdf-root h3 { font-size: 11pt; margin-top: 8px; }

  .aura-pdf-root p,
  .aura-pdf-root li,
  .aura-pdf-root blockquote,
  .aura-pdf-root td,
  .aura-pdf-root th {
    font-size: 10.5pt;
    line-height: 1.58;
    color: #243447;
    overflow-wrap: anywhere;
    word-break: normal;
    orphans: 2;
    widows: 2;
  }

  .aura-pdf-root .doc-header,
  .aura-pdf-root .doc-section,
  .aura-pdf-root .section-card,
  .aura-pdf-root .module-card,
  .aura-pdf-root .benefit-item,
  .aura-pdf-root .callout,
  .aura-pdf-root .doc-kpi,
  .aura-pdf-root .doc-story-card,
  .aura-pdf-root .doc-compare-card,
  .aura-pdf-root .doc-timeline-item,
  .aura-pdf-root .doc-proof-strip,
  .aura-pdf-root .doc-infographic-band,
  .aura-pdf-root table,
  .aura-pdf-root blockquote,
  .aura-pdf-root pre {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .aura-pdf-root .doc-header,
  .aura-pdf-root .doc-section,
  .aura-pdf-root .section-card,
  .aura-pdf-root .module-card,
  .aura-pdf-root .benefit-item,
  .aura-pdf-root .callout,
  .aura-pdf-root .doc-aside {
    padding: 10px 12px;
    border-radius: 6px;
    border: none;
    border-top: 1px solid rgba(148, 163, 184, 0.28);
    background: transparent;
    box-shadow: none;
  }

  .aura-pdf-root .doc-kpi,
  .aura-pdf-root .doc-story-card,
  .aura-pdf-root .doc-compare-card,
  .aura-pdf-root .doc-timeline-item,
  .aura-pdf-root .doc-proof-strip,
  .aura-pdf-root .doc-infographic-band {
    padding: 8px 10px;
    border-radius: 4px;
    border: 1px solid rgba(148, 163, 184, 0.34);
    background: #f8fafc;
    box-shadow: none;
  }

  .aura-pdf-root .doc-kpi,
  .aura-pdf-root .doc-kpi *,
  .aura-pdf-root .doc-story-card,
  .aura-pdf-root .doc-story-card *,
  .aura-pdf-root .doc-compare-card,
  .aura-pdf-root .doc-compare-card *,
  .aura-pdf-root .doc-proof-strip,
  .aura-pdf-root .doc-proof-strip * {
    color: #0f172a !important;
    text-shadow: none !important;
  }

  .aura-pdf-root .doc-infographic-band,
  .aura-pdf-root .doc-infographic-band * {
    color: #0f172a !important;
    text-shadow: none !important;
  }

  .aura-pdf-root .doc-infographic-band {
    background: #f8fafc !important;
    border-color: rgba(148, 163, 184, 0.34) !important;
  }

  .aura-pdf-root .doc-infographic-band .doc-kpi {
    background: #ffffff !important;
    border-color: rgba(148, 163, 184, 0.4) !important;
  }

  .aura-pdf-root .doc-kpi-value,
  .aura-pdf-root .doc-title-gradient {
    color: #0f172a !important;
    -webkit-text-fill-color: currentColor !important;
  }

  .aura-pdf-root .doc-kpi-label,
  .aura-pdf-root .doc-eyebrow {
    color: #475569 !important;
  }

  .aura-pdf-root .doc-header {
    padding-top: 0;
    border-top: none;
    border-bottom: 2px solid rgba(31, 75, 153, 0.3);
    margin-bottom: 8px;
    background: transparent;
  }

  .aura-pdf-root .doc-header::after {
    display: none !important;
  }

  .aura-pdf-root .module-grid,
  .aura-pdf-root .grid-benefits,
  .aura-pdf-root .stats-grid,
  .aura-pdf-root .doc-kpi-grid,
  .aura-pdf-root .doc-story-grid,
  .aura-pdf-root .doc-comparison {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .aura-pdf-root .doc-sidebar-layout {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .aura-pdf-root .benefit-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }

  /* Disable all animations for print */
  .aura-pdf-root *,
  .aura-pdf-root *::before,
  .aura-pdf-root *::after {
    animation: none !important;
    transition: none !important;
  }

  /* Hide internal navigation arrows on links */
  .aura-pdf-root a[href^="#"]::before,
  .aura-pdf-root a[href^="./"]::before {
    display: none;
  }

  .aura-pdf-root img,
  .aura-pdf-root svg {
    max-width: 100%;
    height: auto;
  }

  @media print {
    html, body {
      background: #ffffff;
    }

    .aura-pdf-page {
      margin: 0;
      padding: 14mm 16mm 16mm;
      box-shadow: none;
    }

    .aura-pdf-root .doc-sidebar-layout {
      grid-template-columns: 1fr !important;
    }

    .aura-pdf-root .doc-title-gradient {
      background: none !important;
      -webkit-text-fill-color: currentColor !important;
      color: #0f172a !important;
    }
  }
`;

function escapeInlineHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function hasInlineMarkdownSyntax(value: string): boolean {
  return /(?:\*\*[\s\S]+?\*\*|(^|[^*])\*[^*\n]+\*(?!\*)|`[^`]+`|\[[^\]]+\]\([^)]+\)|<\/?(?:u|ins)>)/m.test(value);
}

function renderInlineMarkdownText(text: string): string {
  const escaped = escapeInlineHtml(text);
  return escaped
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/&lt;(?:u|ins)&gt;([\s\S]+?)&lt;\/(?:u|ins)&gt;/gi, '<u>$1</u>')
    .replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n][\s\S]*?)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/(^|[^_])_([^_\n][\s\S]*?)_(?!_)/g, '$1<em>$2</em>');
}

function normalizeInlineMarkdownHtml(html: string): string {
  if (!html.trim() || !hasInlineMarkdownSyntax(html)) return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<body>${html}</body>`, 'text/html');
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];

  while (walker.nextNode()) {
    const textNode = walker.currentNode as Text;
    const parentName = textNode.parentElement?.tagName.toLowerCase();
    const value = textNode.textContent ?? '';

    if (!value.trim() || !hasInlineMarkdownSyntax(value)) continue;
    if (!parentName || ['style', 'script', 'pre', 'code', 'textarea', 'a'].includes(parentName)) continue;

    textNodes.push(textNode);
  }

  for (const textNode of textNodes) {
    const rawValue = textNode.textContent ?? '';
    const rendered = renderInlineMarkdownText(rawValue);
    if (!rendered || rendered === escapeInlineHtml(rawValue)) continue;

    const template = doc.createElement('template');
    template.innerHTML = rendered;
    const replacementNodes = Array.from(template.content.childNodes);
    if (replacementNodes.length > 0) {
      textNode.replaceWith(...replacementNodes);
    }
  }

  return doc.body.innerHTML.trim() || html;
}

export function prepareDocumentPdfMarkup(html: string, title: string): PreparedDocumentPdfMarkup {
  const normalizedHtml = normalizeInlineMarkdownHtml(html);
  const pageMarkup = `<div class="aura-pdf-page"><div class="aura-pdf-root">${normalizedHtml}</div></div>`;
  const documentMarkup = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeInlineHtml(title)}</title>
  <style>${EXPORT_BASE_STYLES}</style>
</head>
<body>
  ${pageMarkup}
</body>
</html>`;

  return {
    normalizedHtml,
    pageMarkup,
    documentMarkup,
  };
}

function createExportContainer(html: string): { element: HTMLDivElement; cleanup: () => void } {
  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-20000px';
  host.style.top = '0';
  host.style.width = '210mm';
  host.style.pointerEvents = 'none';
  host.style.opacity = '1';
  host.style.background = '#ffffff';
  host.style.zIndex = '-1';
  host.setAttribute('aria-hidden', 'true');

  const preparedMarkup = prepareDocumentPdfMarkup(html, 'Document');
  host.innerHTML = `<style>${EXPORT_BASE_STYLES}</style>${preparedMarkup.pageMarkup}`;
  document.body.appendChild(host);

  return {
    element: host,
    cleanup: () => host.remove(),
  };
}

async function loadHtml2Pdf(): Promise<any> {
  const mod = await import('html2pdf.js');
  return mod.default ?? mod;
}

function getPdfOptions(title: string) {
  return {
    margin: 0,
    filename: `${sanitizeFilename(title)}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    },
    pagebreak: {
      mode: ['css', 'legacy'],
      avoid: ['.doc-section', '.doc-kpi', '.doc-story-card', '.doc-compare-card', '.doc-proof-strip', 'table', 'blockquote', 'pre'],
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait',
    },
  };
}

export async function createDocumentPdfBlob(job: DocumentPdfJob): Promise<Blob> {
  const { element, cleanup } = createExportContainer(job.html);

  try {
    await flattenChartsForExport(element);
    const html2pdf = await loadHtml2Pdf();
    const source = element.querySelector('.aura-pdf-page') ?? element;
    const worker = html2pdf().set(getPdfOptions(job.title)).from(source).toPdf();
    const blob = await worker.outputPdf('blob');
    return blob as Blob;
  } finally {
    cleanup();
  }
}

export async function createDocumentPdfRasterPreview(job: DocumentPdfJob): Promise<string> {
  const { element, cleanup } = createExportContainer(job.html);

  try {
    await flattenChartsForExport(element);
    const html2pdf = await loadHtml2Pdf();
    const source = element.querySelector('.aura-pdf-page') ?? element;
    const worker = html2pdf().set(getPdfOptions(job.title)).from(source).toCanvas().toImg();
    const dataUrl = await worker.outputImg('datauristring');
    return dataUrl as string;
  } finally {
    cleanup();
  }
}

export async function exportDocumentPdf(job: DocumentPdfJob): Promise<void> {
  const { element, cleanup } = createExportContainer(job.html);

  try {
    await flattenChartsForExport(element);
    const html2pdf = await loadHtml2Pdf();
    const source = element.querySelector('.aura-pdf-page') ?? element;
    await html2pdf().set(getPdfOptions(job.title)).from(source).save();
  } finally {
    cleanup();
  }
}

export function openDocumentPrintPreview(job: DocumentPdfJob): void {
  const printWindow = window.open('', '_blank', 'noopener,noreferrer');
  if (!printWindow) {
    throw new Error('Browser blocked the print preview window. Please allow pop-ups for Aura.');
  }

  const preparedMarkup = prepareDocumentPdfMarkup(job.html, job.title);

  // Build document markup with mobile viewport meta and responsive overrides
  const mobileStyles = `
@media (max-width: 768px) {
  body { width: 100% !important; }
  .page { width: 100% !important; padding: 1rem !important; box-sizing: border-box !important; }
}`;

  const mobileReadyMarkup = preparedMarkup.documentMarkup
    .replace(
      '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
      '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    )
    .replace('</style>', `${mobileStyles}\n</style>`);

  printWindow.document.open();
  printWindow.document.write(`${mobileReadyMarkup}
  <script>
    window.addEventListener('load', () => {
      setTimeout(() => {
        window.focus();
        window.print();
      }, 120);
    });
  </script>
`);
  printWindow.document.close();
}

export async function exportPresentationPdf(
  slidesHtml: string,
  title: string = 'presentation',
): Promise<void> {
  // Parse shared link tags, style block, and individual sections
  const linkMatches = slidesHtml.match(/<link[^>]*>/gi) ?? [];
  const styleMatch = slidesHtml.match(/<style[\s\S]*?<\/style>/i)?.[0] ?? '';
  const sectionRegex = /<section[\s\S]*?<\/section>/gi;
  const sections: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = sectionRegex.exec(slidesHtml)) !== null) {
    sections.push(m[0]);
  }

  if (sections.length === 0) return;

  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;top:-99999px;left:-99999px;';

  for (const section of sections) {
    const page = document.createElement('div');
    page.style.cssText =
      'width:960px;height:540px;overflow:hidden;page-break-after:always;position:relative;';

    const bgMatch = section.match(/data-background-color=["']([^"']+)["']/);
    if (bgMatch?.[1]) page.style.backgroundColor = bgMatch[1];

    page.innerHTML = linkMatches.join('') + styleMatch + section;
    container.appendChild(page);
  }

  document.body.appendChild(container);

  try {
    const html2pdf = await loadHtml2Pdf();
    await html2pdf()
      .set({
        margin: 0,
        filename: `${sanitizeFilename(title)}.pdf`,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 1, useCORS: true, allowTaint: true },
        jsPDF: { unit: 'px', format: [960, 540], orientation: 'landscape' },
        pagebreak: { mode: 'css' },
      })
      .from(container)
      .save();
  } finally {
    document.body.removeChild(container);
  }
}
