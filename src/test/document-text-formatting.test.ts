import { describe, expect, it } from 'vitest';
import { deriveDocumentTextSource, renderDocumentTextEdits } from '@/services/ai/workflow/document';

const EXISTING_HTML = `
<style>
  .doc-shell { --doc-primary: #1d4ed8; --doc-text: #0f172a; }
</style>
<div class="doc-shell">
  <h1>Underline Test</h1>
  <p>Original copy.</p>
</div>
`;

describe('document text formatting', () => {
  it('preserves underline markup when rendering text edits into document HTML', () => {
    const result = renderDocumentTextEdits({
      existingHtml: EXISTING_HTML,
      text: '# Underline Test\n\nThis sentence has <u>underlined text</u>.',
      titleHint: 'Underline Test',
      prompt: 'Underline Test',
    });

    expect(result.html).toContain('<u>underlined text</u>');
    expect(result.html).not.toContain('&lt;u&gt;underlined text&lt;/u&gt;');
  });

  it('keeps underline markup when deriving markdown from existing document HTML', () => {
    const markdown = deriveDocumentTextSource(`
      <div class="doc-shell">
        <h1>Underline Test</h1>
        <p>This sentence has <u>underlined text</u>.</p>
      </div>
    `);

    expect(markdown).toContain('<u>underlined text</u>');
  });
});
