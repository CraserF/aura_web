/**
 * Post-generation HTML sanitizer — last line of defense against external URLs.
 *
 * Strips external image URLs from generated HTML regardless of what the LLM produced.
 * This runs AFTER HTML extraction and BEFORE the result is returned to the UI.
 *
 * Allowlist: fonts.googleapis.com, fonts.gstatic.com, cdn.jsdelivr.net
 * (Google Fonts + Bootstrap Icons CDN).
 */

const ALLOWED_HOSTS = 'fonts\\.googleapis|fonts\\.gstatic|cdn\\.jsdelivr';

/**
 * Sanitize generated slide HTML by stripping all external URLs.
 * Preserves data: URIs, CSS gradients, inline SVGs, and allowed CDN hosts.
 */
export function sanitizeSlideHtml(html: string): string {
  let sanitized = html;

  // 1. Strip <img> tags with external src (keep data: URIs and allowed CDNs)
  sanitized = sanitized.replace(
    /<img[^>]*\ssrc=["'](https?:\/\/(?!(?:fonts\.googleapis|fonts\.gstatic|cdn\.jsdelivr))[^"']*?)["'][^>]*\/?>/gi,
    '<!-- external image removed -->',
  );

  // 2. Strip background-image: url(...) with external URLs
  //    Replaces the entire property value to avoid broken CSS
  sanitized = sanitized.replace(
    new RegExp(
      `background(?:-image)?\\s*:\\s*[^;]*url\\(\\s*["']?(https?:\\/\\/(?!(?:${ALLOWED_HOSTS}))[^"')]+?)["']?\\s*\\)[^;]*`,
      'gi',
    ),
    '/* external background-image removed */',
  );

  // 3. Strip SVG <image> elements with external xlink:href or href
  sanitized = sanitized.replace(
    /<image[^>]*(?:xlink:)?href=["'](https?:\/\/[^"']+?)["'][^>]*\/?>/gi,
    '<!-- external SVG image removed -->',
  );

  return sanitized;
}
