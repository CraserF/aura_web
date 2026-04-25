import { describe, expect, it } from 'vitest';
import type { ProjectData, ProjectDocument } from '@/types/project';

function makeDocument(overrides: Partial<ProjectDocument> = {}): ProjectDocument {
  return {
    id: 'doc-1',
    title: 'Announcement',
    type: 'document',
    contentHtml: '<script>alert(1)</script><div class="doc-shell"><h1>Launch</h1><p>Hello team.</p><img src="media/hero.png" alt="Hero"></div>',
    sourceMarkdown: '# Launch',
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

describe('document email export', () => {
  it('produces sanitized email-friendly HTML with inline styles and embedded media', async () => {
    const document = makeDocument();
    const artifact = await (await import('@/services/export/emailHtml')).exportDocumentEmailHtml({
      project: makeProject(document),
      document,
    });

    expect(artifact.kind).toBe('document-email');
    expect(artifact.assets).toEqual([]);
    expect(artifact.html).toContain('data:image/png;base64,abc');
    expect(artifact.html).toContain('style=');
    expect(artifact.html).not.toContain('<script>');
  });
});
