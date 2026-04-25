import type { ProjectData, ProjectDocument } from '@/types/project';
import { sanitizeFilename } from '@/lib/sanitizeFilename';
import { sanitizeSlideHtml } from '@/services/ai/utils/sanitizeHtml';
import {
  buildStandaloneHtmlDocument,
  resolveStandaloneHtml,
  type StandaloneArtifactExport,
} from '@/services/export/standalone';

export interface PresentationStandaloneHtmlInput {
  project: ProjectData;
  document: ProjectDocument;
}

export async function exportPresentationStandaloneHtml(input: PresentationStandaloneHtmlInput): Promise<StandaloneArtifactExport> {
  const sanitized = sanitizeSlideHtml(input.document.contentHtml);
  const resolved = resolveStandaloneHtml(sanitized, input.project.media ?? [], 'relative');
  const hasInlineStyles = /<style[\s>]/i.test(input.document.contentHtml);
  const legacyCss = hasInlineStyles ? '' : (input.document.themeCss ?? '');
  const head = `
<style>
  html, body {
    margin: 0;
    padding: 0;
    background: #0b1020;
    color: #f8fafc;
    font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  }

  .aura-standalone-presentation {
    padding: 32px 16px 64px;
  }

  .aura-standalone-presentation .reveal {
    width: 100%;
  }

  .aura-standalone-presentation .slides {
    display: grid;
    gap: 40px;
    justify-items: center;
  }

  .aura-standalone-presentation .slides > section {
    width: min(100%, 1280px);
    aspect-ratio: 16 / 9;
    overflow: hidden;
    border-radius: 24px;
    box-shadow: 0 24px 80px rgba(15, 23, 42, 0.45);
  }
</style>
${legacyCss ? `<style>${legacyCss}</style>` : ''}`.trim();

  return {
    kind: 'presentation-html',
    title: input.document.title,
    filename: `${sanitizeFilename(input.document.title || 'presentation')}.html`,
    html: buildStandaloneHtmlDocument(
      input.document.title,
      head,
      `<div class="aura-standalone-presentation"><div class="reveal"><div class="slides">${resolved.html}</div></div></div>`,
    ),
    assets: resolved.assets,
  };
}
