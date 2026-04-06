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

/** Build the full HTML document for the iframe */
function buildIframeDocument(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>${WRAPPER_STYLES}</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

export function DocumentCanvas({ html, onNavigate }: DocumentCanvasProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const updateContent = useCallback((bodyHtml: string) => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const fullDoc = buildIframeDocument(bodyHtml);
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
  }, [onNavigate]);

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
