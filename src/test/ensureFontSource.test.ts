import { describe, expect, it } from 'vitest';

import { ensureFontSourceDeclaration } from '@/services/ai/utils/ensureFontSource';

describe('ensureFontSourceDeclaration', () => {
  it('prepends the palette Google Fonts link when custom fonts are used without a source declaration', () => {
    const html = `
      <style>
        .slide-wrap { font-family: 'Inter', sans-serif; }
        h1 { font-family: 'Space Grotesk', sans-serif; }
      </style>
      <section data-background-color="#101828"><div class="slide-wrap"><h1>Deck</h1></div></section>
    `;

    const result = ensureFontSourceDeclaration(
      html,
      'family=Space+Grotesk:wght@400;700&family=Inter:wght@400;600',
    );

    expect(result).toContain('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&family=Inter:wght@400;600&display=swap');
    expect(result.indexOf('<link href="https://fonts.googleapis.com')).toBeLessThan(result.indexOf('<style>'));
  });

  it('does not inject a Google Fonts link for system-font-only slides', () => {
    const html = `
      <style>
        .slide-wrap { font-family: system-ui, sans-serif; }
      </style>
      <section data-background-color="#101828"><div class="slide-wrap"><h1>Deck</h1></div></section>
    `;

    expect(ensureFontSourceDeclaration(html, 'family=Inter:wght@400;600')).not.toContain('fonts.googleapis.com');
  });
});
