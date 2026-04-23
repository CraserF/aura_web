import { describe, expect, it, vi } from 'vitest';
import type { ProjectData, ProjectDocument } from '@/types/project';

vi.mock('@/services/charts', () => ({
  hydrateDocumentCharts: vi.fn(async (html: string) => html),
}));

vi.mock('@/services/spreadsheet/linkedTable', () => ({
  hydrateLinkedTables: vi.fn(async (html: string) => html),
}));

function makeDocument(overrides: Partial<ProjectDocument> = {}): ProjectDocument {
  return {
    id: 'doc-1',
    title: 'Quarterly Review',
    type: 'document',
    contentHtml: '<div class="doc-shell"><h1>Quarterly Review</h1><img src="data:image/png;base64,abc" alt="Hero"></div>',
    sourceMarkdown: '# Quarterly Review',
    themeCss: '',
    slideCount: 0,
    chartSpecs: {},
    order: 0,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

function makeProject(document: ProjectDocument): ProjectData {
  return {
    id: 'project-1',
    title: 'Project',
    visibility: 'private',
    documents: [document],
    activeDocumentId: document.id,
    chatHistory: [],
    media: [{
      id: 'media-1',
      filename: 'hero.png',
      mimeType: 'image/png',
      relativePath: 'media/hero.png',
      dataUrl: 'data:image/png;base64,abc',
    }],
    sections: { drafts: [], main: [], suggestions: [], issues: [] },
    createdAt: 1,
    updatedAt: 1,
  };
}

describe('document standalone export', () => {
  it('builds read-only standalone HTML and packages matching media assets', async () => {
    const document = makeDocument();
    const artifact = await (await import('@/services/export/documentHtml')).exportDocumentStandaloneHtml({
      project: makeProject(document),
      document,
    });

    expect(artifact.kind).toBe('document-html');
    expect(artifact.filename).toBe('quarterly-review.html');
    expect(artifact.assets).toHaveLength(1);
    expect(artifact.assets[0]?.relativePath).toBe('media/hero.png');
    expect(artifact.html).toContain('aura-standalone-document');
    expect(artifact.html).toContain('src="media/hero.png"');
    expect(artifact.html).not.toContain('Version History');
  });
});
