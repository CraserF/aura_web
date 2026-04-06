/**
 * HTML Sanitizer — Security layer for AI-generated HTML.
 *
 * Strips:
 * - All <script> tags (inline and external)
 * - All event handler attributes (onclick, onload, onerror, etc.)
 * - External resource URLs in src, href, action, formaction, data
 *   (only relative paths and data: URIs for images are allowed)
 * - <link> tags pointing to external stylesheets
 * - <meta http-equiv> tags (potential redirect/injection)
 * - <base> tags (potential URL hijacking)
 * - <iframe>, <object>, <embed>, <form> tags
 * - javascript: protocol in any attribute
 *
 * Preserves:
 * - Internal (relative) anchor links → document navigation
 * - Inline styles and stylesheets (within the document)
 * - Relative image src paths and data URIs
 * - All structural/semantic HTML
 */

const BLOCKED_TAGS = new Set([
  'script', 'iframe', 'object', 'embed', 'form',
  'base', 'meta',
]);

const BLOCKED_ATTR_PREFIXES = ['on']; // onclick, onload, onerror …

const URL_ATTRS = ['src', 'href', 'action', 'formaction', 'data', 'poster', 'srcset'];

/** Safe data URI MIME type prefixes (images and fonts only) */
const SAFE_DATA_URI_PREFIXES = [
  'data:image/png',
  'data:image/jpeg',
  'data:image/jpg',
  'data:image/gif',
  'data:image/webp',
  'data:image/svg+xml',
  'data:image/avif',
  'data:font/woff',
  'data:font/woff2',
];

/** Returns true if a URL should be stripped (external or dangerous protocol) */
function isExternalOrDangerous(url: string): boolean {
  const trimmed = url.trim().toLowerCase();
  // Block all script-injection protocols
  if (trimmed.startsWith('javascript:')) return true;
  if (trimmed.startsWith('vbscript:')) return true;
  // Allow only safe data URI types (images/fonts); block data:text/html, data:application/*, etc.
  if (trimmed.startsWith('data:')) {
    return !SAFE_DATA_URI_PREFIXES.some((prefix) => trimmed.startsWith(prefix));
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return true;
  if (trimmed.startsWith('//')) return true; // protocol-relative
  if (trimmed.startsWith('ftp:') || trimmed.startsWith('file:')) return true;
  return false;
}

/** Returns true if an attribute value contains a dangerous protocol */
function hasDangerousProtocol(value: string): boolean {
  const trimmed = value.trim().toLowerCase();
  return (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('vbscript:') ||
    // Catch data:text/html injections in non-URL attributes too
    (trimmed.startsWith('data:') &&
      !SAFE_DATA_URI_PREFIXES.some((prefix) => trimmed.startsWith(prefix)))
  );
}

/** Sanitize a single HTML element in place */
function sanitizeElement(el: Element): void {
  // Remove blocked tags entirely (handled at the document level)
  // but strip dangerous attributes on all elements
  const attrsToRemove: string[] = [];

  for (const attr of Array.from(el.attributes)) {
    const name = attr.name.toLowerCase();
    const value = attr.value;

    // Strip event handlers
    if (BLOCKED_ATTR_PREFIXES.some((p) => name.startsWith(p))) {
      attrsToRemove.push(attr.name);
      continue;
    }

    // Strip external / dangerous URLs
    if (URL_ATTRS.includes(name) && isExternalOrDangerous(value)) {
      attrsToRemove.push(attr.name);
      continue;
    }

    // Strip javascript:, vbscript:, or unsafe data: in any attribute value
    if (hasDangerousProtocol(value)) {
      attrsToRemove.push(attr.name);
    }
  }

  attrsToRemove.forEach((a) => el.removeAttribute(a));
}

/**
 * Sanitize a complete HTML document string.
 * Returns the sanitized HTML.
 */
export function sanitizeHtml(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Remove blocked tags
  BLOCKED_TAGS.forEach((tag) => {
    doc.querySelectorAll(tag).forEach((el) => el.remove());
  });

  // Remove <link rel="stylesheet"> pointing externally
  doc.querySelectorAll('link').forEach((link) => {
    const href = link.getAttribute('href') ?? '';
    if (isExternalOrDangerous(href)) {
      link.remove();
    }
  });

  // Sanitize remaining elements
  doc.querySelectorAll('*').forEach(sanitizeElement);

  // Return the body HTML (preserve inner structure)
  return doc.body.innerHTML;
}

/**
 * Sanitize just the body/inner HTML portion (no <html>/<head> wrapper).
 * Used for presentation <section> content.
 */
export function sanitizeInnerHtml(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<body>${html}</body>`, 'text/html');

  BLOCKED_TAGS.forEach((tag) => {
    doc.querySelectorAll(tag).forEach((el) => el.remove());
  });

  doc.querySelectorAll('link').forEach((link) => {
    const href = link.getAttribute('href') ?? '';
    if (isExternalOrDangerous(href)) link.remove();
  });

  doc.querySelectorAll('*').forEach(sanitizeElement);

  return doc.body.innerHTML;
}
