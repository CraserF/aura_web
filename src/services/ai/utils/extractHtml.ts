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
  // Try to extract from code block
  const codeBlockMatch = response.match(/```html?\s*\n?([\s\S]*?)```/);
  let html = codeBlockMatch?.[1]?.trim() ?? '';

  if (!html) {
    // If no code block, check if the response starts with <link or <section
    const trimmed = response.trim();
    if (trimmed.startsWith('<section') || trimmed.startsWith('<link')) {
      html = trimmed;
    } else {
      // Last resort: find all <section> elements
      const sectionMatch = trimmed.match(/<section[\s\S]*<\/section>/g);
      html = sectionMatch ? sectionMatch.join('\n') : trimmed;
    }
  }

  // Extract Google Font <link> tags from the HTML
  const fontLinks: string[] = [];
  html = html.replace(/<link[^>]*href="(https:\/\/fonts\.googleapis\.com[^"]*)"[^>]*>/gi, (_match, href: string) => {
    fontLinks.push(href);
    return '';
  });

  return { html: html.trim(), fontLinks };
}

/** Count sections in HTML */
export function countSlides(html: string): number {
  return (html.match(/<section[\s>]/g) || []).length;
}

/** Extract title from the first h1 */
export function extractTitle(html: string): string | undefined {
  const titleMatch = html.match(/<h1[^>]*>(.*?)<\/h1>/is);
  if (titleMatch?.[1]) {
    return titleMatch[1].replace(/<[^>]+>/g, '').trim() || undefined;
  }
  return undefined;
}
