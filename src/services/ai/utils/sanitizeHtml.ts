/**
 * Post-generation HTML sanitizer.
 *
 * Two responsibilities:
 * 1. Strip external image URLs (security / correctness)
 * 2. Scope all <style> blocks so generated CSS cannot spill into the site UI
 *
 * Allowlist: fonts.googleapis.com, fonts.gstatic.com, cdn.jsdelivr.net
 */

const ALLOWED_HOSTS = 'fonts\\.googleapis|fonts\\.gstatic|cdn\\.jsdelivr';

/**
 * Sanitize generated slide HTML:
 * - Strips external image URLs
 * - Scopes <style> blocks to `.reveal .slides` via CSS @scope
 */
export function sanitizeSlideHtml(html: string): string {
  let sanitized = html;

  // 1. Strip <img> tags with external src (keep data: URIs and allowed CDNs)
  sanitized = sanitized.replace(
    /<img[^>]*\ssrc=["'](https?:\/\/(?!(?:fonts\.googleapis|fonts\.gstatic|cdn\.jsdelivr))[^"']*?)["'][^>]*\/?>/gi,
    '<!-- external image removed -->',
  );

  // 2. Strip background-image: url(...) with external URLs
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

  // 4. Scope <style> blocks to .reveal .slides so CSS doesn't spill into the site
  sanitized = sanitized.replace(
    /(<style[^>]*>)([\s\S]*?)(<\/style>)/gi,
    (_match, open: string, content: string, close: string) => {
      return `${open}\n${scopeStyleContent(content)}\n${close}`;
    },
  );

  return sanitized;
}

/**
 * Scope CSS content so selectors only apply within the Reveal.js container.
 *
 * Strategy: extract global at-rules (@import, @keyframes, @font-face) that
 * must remain at the document level, then wrap everything else in
 * `@scope (.reveal .slides) { ... }`.
 *
 * Also converts `:root` → `:scope` so custom properties resolve correctly
 * within the scope context.
 */
function scopeStyleContent(css: string): string {
  const globals: string[] = [];
  let rest = css;

  // 1. Extract @import rules — must be at top level
  rest = rest.replace(/@import\s+[^;]+;/g, (m) => {
    globals.push(m.trim());
    return '';
  });

  // 2. Extract @font-face blocks — must be global
  rest = rest.replace(/@font-face\s*\{[^}]*\}/g, (m) => {
    globals.push(m.trim());
    return '';
  });

  // 3. Extract @keyframes blocks — need to stay global so animations work
  //    Handles one level of nested braces: @keyframes name { 0% { ... } 100% { ... } }
  rest = rest.replace(
    /@keyframes\s+[\w-]+\s*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g,
    (m) => {
      globals.push(m.trim());
      return '';
    },
  );

  // 4. Convert :root to :scope for correct custom-property scoping
  rest = rest.replace(/:root\b/g, ':scope');

  // 5. Assemble: globals first, then scoped remainder
  const parts: string[] = [];
  if (globals.length > 0) parts.push(globals.join('\n\n'));

  const trimmed = rest.trim();
  if (trimmed) {
    // Idempotency: if the remaining content is already wrapped in @scope,
    // keep it as-is instead of double-wrapping.
    if (/^\s*@scope\s*\(\s*\.reveal\s+\.slides\s*\)/i.test(trimmed)) {
      parts.push(trimmed);
    } else {
      parts.push(`@scope (.reveal .slides) {\n${trimmed}\n}`);
    }
  }

  return parts.join('\n\n');
}
