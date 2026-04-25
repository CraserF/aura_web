import type { ProjectData, ProjectDocument } from '@/types/project';
import { sanitizeFilename } from '@/lib/sanitizeFilename';
import { hydrateDocumentCharts } from '@/services/charts';
import { sanitizeHtml } from '@/services/html/sanitizer';
import { hydrateLinkedTables } from '@/services/spreadsheet/linkedTable';
import {
  buildStandaloneHtmlDocument,
  resolveStandaloneHtml,
  type StandaloneArtifactExport,
} from '@/services/export/standalone';

export interface DocumentStandaloneHtmlInput {
  project: ProjectData;
  document: ProjectDocument;
}

export async function exportDocumentStandaloneHtml(input: DocumentStandaloneHtmlInput): Promise<StandaloneArtifactExport> {
  const hydrated = await hydrateLinkedTables(await hydrateDocumentCharts(input.document.contentHtml));
  const sanitized = sanitizeHtml(hydrated);
  const resolved = resolveStandaloneHtml(sanitized, input.project.media ?? [], 'relative');
  const head = `
<style>
  html, body {
    margin: 0;
    padding: 0;
    background: #eef2f7;
    color: #0f172a;
    font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  }

  .aura-standalone-document {
    min-height: 100vh;
    padding: 32px 16px;
    box-sizing: border-box;
  }

  .aura-standalone-document main {
    max-width: 1120px;
    margin: 0 auto;
  }
</style>`.trim();

  return {
    kind: 'document-html',
    title: input.document.title,
    filename: `${sanitizeFilename(input.document.title || 'document')}.html`,
    html: buildStandaloneHtmlDocument(
      input.document.title,
      head,
      `<div class="aura-standalone-document"><main>${resolved.html}</main></div>`,
    ),
    assets: resolved.assets,
  };
}
