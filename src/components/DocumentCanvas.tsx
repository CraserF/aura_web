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

const WRAPPER_STYLES = `
  body {
    margin: 0;
    padding: 0;
    background: #ffffff;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    color: #1a1a1a;
    line-height: 1.6;
  }
  * {
    box-sizing: border-box;
  }
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

  /* A4: 210mm x 297mm at 96 dpi ~= 794px x 1123px */
  body > * {
    display: block;
    width: 794px;
    min-height: 1123px;
    margin: 24px auto;
    padding: 72px 80px;
    background: #ffffff;
    box-shadow: 0 4px 24px rgba(0,0,0,0.12);
    border-radius: 2px;
    position: relative;
    page-break-after: always;
    counter-increment: page;
  }

  /* Page number badge at bottom of each page */
  body > *::after {
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

  @media print {
    html, body {
      background: white;
    }
    body > * {
      width: 100%;
      min-height: auto;
      margin: 0;
      padding: 20mm 25mm;
      box-shadow: none;
      border-radius: 0;
      page-break-after: always;
    }
    body > *::after {
      content: counter(page);
      position: fixed;
      bottom: 10mm;
      left: 50%;
      transform: translateX(-50%);
    }
    @page {
      size: A4;
      margin: 0;
    }
  }
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
  }
`;

/** Build the full HTML document for the iframe */
function buildIframeDocument(bodyHtml: string, pagesEnabled: boolean): string {
  const styles = pagesEnabled ? PAGES_STYLES : WRAPPER_STYLES + PRINT_STYLES;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>${styles}</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

export function DocumentCanvas({ html, pagesEnabled = false, onNavigate }: DocumentCanvasProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const updateContent = useCallback((bodyHtml: string) => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const fullDoc = buildIframeDocument(bodyHtml, pagesEnabled);
    const blob = new Blob([fullDoc], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    // Clean up old blob URL on load
    const prevSrc = iframe.src;
    iframe.onload = () => {
      if (prevSrc.startsWith('blob:')) {
        URL.revokeObjectURL(prevSrc);
      }

      // Intercept relative anchor clicks for doc navigation
      try {
        const iframeDoc = iframe.contentDocument;
        if (!iframeDoc) return;

        iframeDoc.querySelectorAll('a[href]').forEach((anchor) => {
          const href = (anchor as HTMLAnchorElement).href;
          const attrHref = anchor.getAttribute('href') ?? '';
          // Relative doc links like #docId or ./docId
          if (attrHref.startsWith('#') || attrHref.startsWith('./')) {
            anchor.addEventListener('click', (e) => {
              e.preventDefault();
              const docId = attrHref.replace(/^[#./]+/, '');
              if (docId && onNavigate) {
                onNavigate(docId);
              }
            });
          } else if (!href.startsWith('blob:')) {
            // External links: open in new tab (already sanitized, so this is safe)
            (anchor as HTMLAnchorElement).target = '_blank';
            (anchor as HTMLAnchorElement).rel = 'noopener noreferrer';
          }
        });
      } catch {
        // Cross-origin iframe access may fail — silently ignore
      }
    };

    iframe.src = url;
  }, [onNavigate, pagesEnabled]);

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
      // allow-same-origin is required so we can access iframe.contentDocument
      // to intercept relative anchor clicks for in-project document navigation.
      // Scripts are NOT allowed (no allow-scripts), so XSS risk is minimal
      // given the content is already sanitized.
      sandbox="allow-same-origin"
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
