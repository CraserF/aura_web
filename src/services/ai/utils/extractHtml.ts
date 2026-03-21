/**
 * Pure HTML extraction from AI responses.
 * Returns the cleaned HTML and any Google Font URLs found.
 * No DOM side effects.
 */

export interface ExtractedHtml {
  html: string;
  fontLinks: string[];
}

/** Extract HTML slides from an AI response that may contain markdown code fences */
export function extractHtmlFromResponse(response: string): ExtractedHtml {
  // Try to extract from a complete code block first
  const codeBlockMatch = response.match(/```html?\s*\n?([\s\S]*?)```/);
  let html = codeBlockMatch?.[1]?.trim() ?? '';

  if (!html) {
    // Handle truncated code block (opening fence but no closing fence)
    const openFenceMatch = response.match(/```html?\s*\n?([\s\S]*)/);
    if (openFenceMatch?.[1]) {
      html = openFenceMatch[1].trim();
    }
  }

  if (!html) {
    // If no code block, check if the response starts with <link or <section
    const trimmed = response.trim();
    if (trimmed.startsWith('<section') || trimmed.startsWith('<link')) {
      html = trimmed;
    } else {
      // Last resort: find all complete <section> elements
      const sectionMatch = trimmed.match(/<section[\s\S]*<\/section>/g);
      html = sectionMatch ? sectionMatch.join('\n') : trimmed;
    }
  }

  // Strip any incomplete trailing <section> that was never closed (truncated output)
  html = stripIncompleteTrailingSection(html);

  // Extract Google Font <link> tags from the HTML
  const fontLinks: string[] = [];
  html = html.replace(/<link[^>]*href="(https:\/\/fonts\.googleapis\.com[^"]*)"[^>]*>/gi, (_match, href: string) => {
    fontLinks.push(href);
    return '';
  });

  return { html: html.trim(), fontLinks };
}

/** Count only complete (properly closed) sections in HTML */
export function countSlides(html: string): number {
  return (html.match(/<section[\s\S]*?<\/section>/gi) || []).length;
}

/** Extract title from the first h1 */
export function extractTitle(html: string): string | undefined {
  const titleMatch = html.match(/<h1[^>]*>(.*?)<\/h1>/is);
  if (titleMatch?.[1]) {
    return titleMatch[1].replace(/<[^>]+>/g, '').trim() || undefined;
  }
  return undefined;
}

/**
 * If the HTML ends with an incomplete <section> (opened but never closed),
 * strip it so we only keep well-formed slides.
 */
function stripIncompleteTrailingSection(html: string): string {
  // Find the last </section> in the HTML
  const lastClose = html.lastIndexOf('</section>');
  if (lastClose === -1) return html; // no complete sections at all

  const afterLastClose = html.slice(lastClose + '</section>'.length);
  // If there's a <section that opens after the last </section>, it's incomplete
  if (/<section[\s>]/i.test(afterLastClose)) {
    return html.slice(0, lastClose + '</section>'.length).trim();
  }
  return html;
}
