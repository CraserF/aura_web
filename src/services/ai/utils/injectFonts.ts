/**
 * Font injection — adds Google Font <link> elements to document.head.
 * Deduplicates to avoid loading the same font URL twice.
 */

export function injectFonts(fontUrls: string[]): void {
  for (const href of fontUrls) {
    const existingLink = document.querySelector(`link[href="${CSS.escape(href)}"]`);
    if (!existingLink) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    }
  }
}
