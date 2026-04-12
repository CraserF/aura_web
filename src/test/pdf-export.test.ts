import { afterEach, describe, expect, it, vi } from 'vitest';
import { openDocumentPrintPreview, prepareDocumentPdfMarkup } from '@/services/export/pdf';

describe('pdf export helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('normalizes inline markdown into shared PDF markup', () => {
    const prepared = prepareDocumentPdfMarkup(
      '<div class="doc-shell"><p>See **bold** text, `code`, and [Aura](https://example.com).</p></div>',
      'Quarterly <Review>',
    );

    expect(prepared.normalizedHtml).toContain('<strong>bold</strong>');
    expect(prepared.normalizedHtml).toContain('<code>code</code>');
    expect(prepared.normalizedHtml).toContain('<a href="https://example.com">Aura</a>');
    expect(prepared.pageMarkup).toContain('class="aura-pdf-page"');
    expect(prepared.documentMarkup).toContain('<title>Quarterly &lt;Review&gt;</title>');
  });

  it('forces readable infographic and KPI contrast in export markup styles', () => {
    const prepared = prepareDocumentPdfMarkup(
      '<section class="doc-infographic-band" style="color:white;background:#123456"><div class="doc-kpi"><div class="doc-kpi-value">91%</div><div class="doc-kpi-label">Retention</div></div></section>',
      'Contrast Probe',
    );

    expect(prepared.documentMarkup).toContain('.aura-pdf-root .doc-infographic-band .doc-kpi');
    expect(prepared.documentMarkup).toContain('background: #ffffff !important;');
    expect(prepared.documentMarkup).toContain('.aura-pdf-root .doc-kpi-value');
    expect(prepared.documentMarkup).toContain('-webkit-text-fill-color: currentColor !important;');
    expect(prepared.documentMarkup).toContain('.aura-pdf-root .doc-kpi-label');
    expect(prepared.documentMarkup).toContain('color: #475569 !important;');
  });

  it('writes the shared document markup into the print preview window', () => {
    const write = vi.fn();
    const open = vi.fn();
    const close = vi.fn();
    const mockWindow = {
      document: {
        open,
        write,
        close,
      },
    };

    vi.spyOn(window, 'open').mockReturnValue(mockWindow as unknown as Window);

    openDocumentPrintPreview({
      title: 'Print Candidate',
      html: '<div class="doc-shell"><p>*Italic* content</p></div>',
    });

    expect(open).toHaveBeenCalledOnce();
    expect(write).toHaveBeenCalledOnce();

    const writtenHtml = write.mock.calls[0]?.[0];
    expect(writtenHtml).toContain('<title>Print Candidate</title>');
    expect(writtenHtml).toContain('<em>Italic</em> content');
    expect(writtenHtml).toContain('window.print()');
    expect(close).toHaveBeenCalledOnce();
  });

  it('throws a clear error when the browser blocks the print preview window', () => {
    vi.spyOn(window, 'open').mockReturnValue(null);

    expect(() =>
      openDocumentPrintPreview({
        title: 'Blocked Preview',
        html: '<p>Body</p>',
      }),
    ).toThrow('Browser blocked the print preview window. Please allow pop-ups for Aura.');
  });
});