import type { ProjectData, ProjectDocument } from '@/types/project';
import { sanitizeFilename } from '@/lib/sanitizeFilename';
import { sanitizeHtml } from '@/services/html/sanitizer';
import {
  buildStandaloneHtmlDocument,
  resolveStandaloneHtml,
  type StandaloneArtifactExport,
} from '@/services/export/standalone';

export interface DocumentEmailHtmlInput {
  project: ProjectData;
  document: ProjectDocument;
}

const EMAIL_TAG_STYLES: Record<string, string> = {
  body: 'margin:0;padding:0;background:#f5f7fb;color:#243447;font-family:Arial,Helvetica,sans-serif;',
  table: 'border-collapse:collapse;width:100%;',
  h1: 'margin:0 0 16px;font-size:30px;line-height:1.2;color:#162235;',
  h2: 'margin:24px 0 12px;font-size:22px;line-height:1.3;color:#1f4b99;',
  h3: 'margin:20px 0 10px;font-size:18px;line-height:1.4;color:#243447;',
  p: 'margin:0 0 14px;font-size:16px;line-height:1.6;color:#243447;',
  ul: 'margin:0 0 16px;padding-left:22px;',
  ol: 'margin:0 0 16px;padding-left:22px;',
  li: 'margin:0 0 8px;font-size:16px;line-height:1.6;color:#243447;',
  blockquote: 'margin:18px 0;padding:12px 16px;border-left:4px solid #1f4b99;background:#eff6ff;color:#1e293b;',
  img: 'display:block;max-width:100%;height:auto;border:0;',
  a: 'color:#1f4b99;text-decoration:underline;',
  th: 'border:1px solid #cbd5e1;padding:10px 12px;background:#eff6ff;text-align:left;',
  td: 'border:1px solid #cbd5e1;padding:10px 12px;text-align:left;',
};

function simplifyEmailHtml(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<body>${html}</body>`, 'text/html');

  doc.querySelectorAll('style, link, script').forEach((node) => node.remove());

  doc.querySelectorAll<HTMLElement>('*').forEach((element) => {
    const tag = element.tagName.toLowerCase();
    Array.from(element.attributes).forEach((attribute) => {
      const keep = attribute.name === 'href'
        || attribute.name === 'src'
        || attribute.name === 'alt'
        || attribute.name === 'colspan'
        || attribute.name === 'rowspan';
      if (!keep) {
        element.removeAttribute(attribute.name);
      }
    });

    const inlineStyle = EMAIL_TAG_STYLES[tag];
    if (inlineStyle) {
      element.setAttribute('style', inlineStyle);
    }
  });

  return doc.body.innerHTML.trim();
}

export async function exportDocumentEmailHtml(input: DocumentEmailHtmlInput): Promise<StandaloneArtifactExport> {
  const sanitized = sanitizeHtml(input.document.contentHtml);
  const resolved = resolveStandaloneHtml(sanitized, input.project.media ?? [], 'inline');
  const emailBody = simplifyEmailHtml(resolved.html);
  const head = '<meta name="color-scheme" content="light only">';

  return {
    kind: 'document-email',
    title: input.document.title,
    filename: `${sanitizeFilename(input.document.title || 'document')}-email.html`,
    html: buildStandaloneHtmlDocument(
      input.document.title,
      head,
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;background:#f5f7fb;"><tr><td align="center" style="padding:24px 12px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:720px;background:#ffffff;"><tr><td style="padding:32px;">${emailBody}</td></tr></table></td></tr></table>`,
    ),
    assets: [],
  };
}
