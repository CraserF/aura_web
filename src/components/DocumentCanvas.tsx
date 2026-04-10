/**
 * DocumentCanvas — Renders a standard HTML document in a sandboxed iframe.
 *
 * The document HTML (from the AI) is displayed as a beautiful standalone
 * article, with full styling preserved but external resources and JS stripped
 * by the sanitizer.
 *
 * Document-to-document links (relative hrefs like #doc-id) are intercepted
 * and handled by the project navigation system.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useProjectStore } from '@/stores/projectStore';

interface DocumentCanvasProps {
  html: string;
  pagesEnabled?: boolean;
  onNavigate?: (docId: string) => void;
}

const FALLBACK_DOCUMENT_STYLES = `
  .doc-shell {
    max-width: 980px;
    margin: 0 auto;
    padding: clamp(22px, 3.2vw, 38px) clamp(18px, 3vw, 30px) clamp(30px, 4vw, 46px);
    border-radius: 22px;
    color: var(--doc-text, #162235);
    font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  }

  .doc-shell * {
    box-sizing: border-box;
  }

  .doc-shell img,
  .doc-shell svg {
    max-width: 100%;
    height: auto;
  }

  @media (prefers-reduced-motion: reduce), print {
    .doc-shell,
    .doc-shell *,
    .doc-shell *::before,
    .doc-shell *::after {
      animation: none !important;
      transition: none !important;
    }
  }
`;

const WRAPPER_STYLES = `
  html, body {
    margin: 0;
    min-height: 100%;
    background:
      radial-gradient(circle at top left, rgba(99, 102, 241, 0.11), transparent 0, transparent 34%),
      radial-gradient(circle at top right, rgba(14, 165, 233, 0.08), transparent 0, transparent 30%),
      linear-gradient(180deg, #f5f7fb 0%, #eef3f9 100%);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    color: #1a1a1a;
    line-height: 1.6;
  }
  body {
    padding: 30px 20px 46px;
  }
  * {
    box-sizing: border-box;
  }
  .aura-document-frame {
    max-width: 1180px;
    margin: 0 auto;
    padding: 6px 0 20px;
  }
  .aura-document-frame > :not(style) {
    margin-left: auto;
    margin-right: auto;
  }
  .aura-document-frame > .doc-shell {
    position: relative;
  }

  ${FALLBACK_DOCUMENT_STYLES}
`;

/** Styles injected when pages mode is ON -- A4 page-flow view */
const PAGES_STYLES = `
  html, body {
    margin: 0;
    padding: 0;
    background: #e5e7eb;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    color: #1a1a1a;
    line-height: 1.6;
    counter-reset: page;
  }
  * {
    box-sizing: border-box;
  }
  .aura-document-frame {
    max-width: 794px;
    margin: 0 auto;
    padding: 24px 0 40px;
  }

  /* A4: 210mm x 297mm at 96 dpi ~= 794px x 1123px */
  .aura-document-frame > :not(style) {
    display: block;
    width: 794px;
    min-height: 1123px;
    margin: 0 auto 24px;
    padding: 72px 80px;
    background: #ffffff;
    box-shadow: 0 4px 24px rgba(0,0,0,0.12);
    border-radius: 2px;
    position: relative;
    page-break-after: always;
    counter-increment: page;
    overflow: hidden;
  }

  .aura-document-frame > .doc-shell {
    max-width: none !important;
    margin: 0 !important;
    padding: 0 !important;
    border: none !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    background: transparent !important;
  }

  /* Page number badge at bottom of each page */
  .aura-document-frame > :not(style)::after {
    content: counter(page);
    position: absolute;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 11px;
    color: #9ca3af;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    letter-spacing: 0.05em;
  }

  @media (max-width: 900px) {
    .aura-document-frame {
      max-width: 100%;
      padding: 12px;
    }
    .aura-document-frame > :not(style) {
      width: 100%;
      min-height: auto;
      padding: 32px 28px 42px;
    }
  }

  @media print {
    html, body {
      background: white;
    }
    .aura-document-frame {
      max-width: none;
      padding: 0;
    }
    .aura-document-frame > :not(style) {
      width: 100%;
      min-height: auto;
      margin: 0;
      padding: 18mm 20mm 22mm;
      box-shadow: none;
      border-radius: 0;
      page-break-after: auto;
    }
    .aura-document-frame > :not(style)::after {
      bottom: 8mm;
    }
    @page {
      size: A4;
      margin: 0;
    }
  }

  ${FALLBACK_DOCUMENT_STYLES}
`;

/** Print styles for standard (non-paged) documents */
const PRINT_STYLES = `
  @media print {
    @page {
      size: A4;
      margin: 20mm 25mm;
    }
    body {
      background: white;
    }
    .aura-document-frame {
      max-width: none;
      padding: 0;
    }
    .doc-shell,
    .doc-shell *,
    .doc-shell *::before,
    .doc-shell *::after {
      animation: none !important;
      transition: none !important;
    }
    .doc-shell {
      max-width: none !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      background: #ffffff !important;
    }
    .doc-header,
    .doc-section,
    .section-card,
    .module-card,
    .doc-kpi,
    .doc-story-card,
    .doc-compare-card,
    .doc-timeline-item,
    .doc-proof-strip,
    .doc-infographic-band,
    .doc-aside,
    table,
    blockquote,
    pre {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .module-grid,
    .grid-benefits,
    .stats-grid,
    .doc-kpi-grid,
    .doc-story-grid,
    .doc-comparison,
    .doc-check-grid,
    .doc-sidebar-layout {
      grid-template-columns: 1fr !important;
    }
  }
`;

function escapeInlineHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function hasInlineMarkdownSyntax(value: string): boolean {
  return /(?:\*\*[\s\S]+?\*\*|(^|[^*])\*[^*\n]+\*(?!\*)|`[^`]+`|\[[^\]]+\]\([^)]+\))/m.test(value);
}

function renderInlineMarkdownText(text: string): string {
  const escaped = escapeInlineHtml(text);
  return escaped
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n][\s\S]*?)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/(^|[^_])_([^_\n][\s\S]*?)_(?!_)/g, '$1<em>$2</em>');
}

function normalizeInlineMarkdownHtml(html: string): string {
  if (!html.trim() || !hasInlineMarkdownSyntax(html)) return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<body>${html}</body>`, 'text/html');
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];

  while (walker.nextNode()) {
    const textNode = walker.currentNode as Text;
    const parentName = textNode.parentElement?.tagName.toLowerCase();
    const value = textNode.textContent ?? '';

    if (!value.trim() || !hasInlineMarkdownSyntax(value)) continue;
    if (!parentName || ['style', 'script', 'pre', 'code', 'textarea', 'a'].includes(parentName)) continue;

    textNodes.push(textNode);
  }

  for (const textNode of textNodes) {
    const rawValue = textNode.textContent ?? '';
    const rendered = renderInlineMarkdownText(rawValue);
    if (!rendered || rendered === escapeInlineHtml(rawValue)) continue;

    const template = doc.createElement('template');
    template.innerHTML = rendered;
    const replacementNodes = Array.from(template.content.childNodes);
    if (replacementNodes.length > 0) {
      textNode.replaceWith(...replacementNodes);
    }
  }

  return doc.body.innerHTML.trim() || html;
}

function extractStyleBlocks(html: string): { contentHtml: string; inlineStyles: string } {
  const styleMatches = html.match(/<style[\s\S]*?<\/style>/gi) ?? [];
  return {
    inlineStyles: styleMatches.join('\n'),
    contentHtml: html.replace(/<style[\s\S]*?<\/style>/gi, '').trim(),
  };
}

/**
 * Injected navigation script: intercepts internal document links and
 * notifies the parent via postMessage. Runs inside the sandboxed iframe.
 */
const NAVIGATION_SCRIPT = `
(function () {
  function isExternal(href) {
    var lower = String(href || '').trim().toLowerCase();
    return lower.startsWith('http:')
      || lower.startsWith('https:')
      || lower.startsWith('mailto:')
      || lower.startsWith('tel:')
      || lower.startsWith('data:')
      || lower.startsWith('javascript:');
  }

  function cleanRef(value) {
    var ref = String(value || '').trim();
    while (ref.startsWith('./')) ref = ref.slice(2);
    while (ref.startsWith('#') || ref.startsWith('/')) ref = ref.slice(1);
    var queryIndex = ref.indexOf('?');
    if (queryIndex !== -1) ref = ref.slice(0, queryIndex);
    while (ref.endsWith('/')) ref = ref.slice(0, -1);
    return ref.trim();
  }

  function resolveRef(href) {
    if (!href || isExternal(href)) return null;
    if (href.charAt(0) === '#') return cleanRef(href) || null;
    var hashIndex = href.lastIndexOf('#');
    if (hashIndex !== -1) {
      var hashRef = cleanRef(href.slice(hashIndex));
      if (hashRef) return hashRef;
    }
    return cleanRef(href) || null;
  }

  document.addEventListener('click', function (e) {
    var target = e.target;
    var anchor = target && target.closest ? target.closest('a[href]') : null;
    if (!anchor) return;

    var ref = anchor.getAttribute('data-aura-doc-link') || resolveRef(anchor.getAttribute('href') || '');
    if (!ref) return;

    e.preventDefault();
    e.stopPropagation();
    window.parent.postMessage({ type: 'aura-navigate', ref: ref }, '*');
  }, true);
})();
`;

/** Build the full HTML document for the iframe */
function buildIframeDocument(bodyHtml: string, pagesEnabled: boolean): string {
  const styles = pagesEnabled ? PAGES_STYLES : WRAPPER_STYLES + PRINT_STYLES;
  const { contentHtml, inlineStyles } = extractStyleBlocks(bodyHtml);
  const normalizedHtml = normalizeInlineMarkdownHtml(contentHtml || bodyHtml);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>${styles}</style>
  ${inlineStyles}
  <script>${NAVIGATION_SCRIPT}<\/script>
</head>
<body>
  <div class="aura-document-frame">
${normalizedHtml}
  </div>
</body>
</html>`;
}

export function DocumentCanvas({ html, pagesEnabled = false, onNavigate }: DocumentCanvasProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const onNavigateRef = useRef(onNavigate);
  useEffect(() => { onNavigateRef.current = onNavigate; }, [onNavigate]);

  // Handle navigation postMessages from the sandboxed iframe.
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (!iframeRef.current) return;
      if (event.source !== iframeRef.current.contentWindow) return;
      if (!event.data || event.data.type !== 'aura-navigate') return;
      const ref = typeof event.data.ref === 'string' ? event.data.ref : null;
      if (ref && onNavigateRef.current) {
        onNavigateRef.current(ref);
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const updateContent = useCallback((bodyHtml: string) => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const fullDoc = buildIframeDocument(bodyHtml, pagesEnabled);
    const blob = new Blob([fullDoc], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    // Clean up previous blob URL once the new one loads.
    const prevSrc = iframe.src;
    iframe.onload = () => {
      if (prevSrc.startsWith('blob:')) {
        URL.revokeObjectURL(prevSrc);
      }
    };

    iframe.src = url;
  }, [pagesEnabled]);

  useEffect(() => {
    if (html) {
      updateContent(html);
    }
  }, [html, updateContent]);

  if (!html) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <div className="text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 text-white shadow-lg">
            <span className="text-2xl">📄</span>
          </div>
          <p className="text-sm font-medium">No content yet</p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Use the chat to generate content
          </p>
        </div>
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      className="size-full border-0"
      // allow-scripts: lets our injected navigation script intercept link clicks
      //   and postMessage the parent. Content is already sanitised (user scripts stripped).
      // allow-same-origin is intentionally OMITTED so iframe has null origin and
      //   cannot access the parent's cookies or localStorage.
      // allow-modals: lets browser print dialogs open from within the frame.
      sandbox="allow-scripts allow-modals"
      title="Document preview"
      aria-label="Document content"
    />
  );
}

/** Combined canvas that switches between DocumentCanvas and PresentationCanvas */
export function ActiveDocumentView() {
  const activeDocument = useProjectStore((s) => s.activeDocument());

  if (!activeDocument) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center max-w-sm px-4">
          <div className="mx-auto mb-4 flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-600 text-white shadow-xl">
            <span className="text-3xl">✨</span>
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            Welcome to Aura
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Start by describing what you&apos;d like to create in the chat below.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {[
              '📊 Create a presentation',
              '📝 Write a document',
              '🎨 Design a report',
            ].map((hint) => (
              <span
                key={hint}
                className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
              >
                {hint}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null; // Real rendering handled in App.tsx based on type
}
