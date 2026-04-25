import { describe, expect, it } from 'vitest';

import { extractHtmlFromResponse } from '@/services/ai/utils/extractHtml';

describe('extractHtmlFromResponse', () => {
  it('preserves Google Fonts links in returned HTML while exposing them for live injection', () => {
    const response = `\`\`\`html
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&family=Inter:wght@400;600&display=swap" rel="stylesheet">
<style>.slide-wrap { font-family: 'Inter', sans-serif; }</style>
<section data-background-color="#101828" style="padding:0; overflow:hidden;"><div class="slide-wrap"><h1>Deck</h1></div></section>
\`\`\``;

    const result = extractHtmlFromResponse(response);

    expect(result.fontLinks).toEqual([
      'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&family=Inter:wght@400;600&display=swap',
    ]);
    expect(result.html).toContain('fonts.googleapis.com/css2?family=Space+Grotesk');
    expect(result.html).toContain('<section data-background-color="#101828"');
  });
});
