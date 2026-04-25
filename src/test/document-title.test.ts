import { describe, expect, it } from 'vitest';

import {
  enforceRequestedDocumentTitle,
  extractRequestedDocumentTitle,
} from '@/services/ai/workflow/document';

describe('document title enforcement', () => {
  it('extracts explicit requested titles from create prompts', () => {
    expect(
      extractRequestedDocumentTitle('Create a long-form strategy memo called North Star Expansion Plan with a sharp title and three sections.'),
    ).toBe('North Star Expansion Plan');
  });

  it('replaces a generated heading with the explicit requested title', () => {
    const html = '<div class="doc-shell"><h1>Charting Tomorrow’s Value</h1><p>Body</p></div>';
    const next = enforceRequestedDocumentTitle(html, 'North Star Expansion Plan');

    expect(next).toContain('<h1>North Star Expansion Plan</h1>');
    expect(next).not.toContain('Charting Tomorrow’s Value');
  });
});
