import { describe, expect, it } from 'vitest';
import type { ProjectData, ProjectDocument } from '@/types/project';

function makePresentation(overrides: Partial<ProjectDocument> = {}): ProjectDocument {
  return {
    id: 'deck-1',
    title: 'Roadmap Deck',
    type: 'presentation',
    contentHtml: '<section><h1>Roadmap</h1><img src="data:image/png;base64,abc" alt="Hero"></section>',
    themeCss: '.reveal section { background: #123456; }',
    slideCount: 1,
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

describe('presentation standalone export', () => {
  it('builds read-only standalone presentation HTML with packaged media', async () => {
    const document = makePresentation();
    const artifact = await (await import('@/services/export/presentationHtml')).exportPresentationStandaloneHtml({
      project: makeProject(document),
      document,
    });

    expect(artifact.kind).toBe('presentation-html');
    expect(artifact.filename).toBe('roadmap-deck.html');
    expect(artifact.assets).toHaveLength(1);
    expect(artifact.html).toContain('<div class="reveal"><div class="slides">');
    expect(artifact.html).toContain('src="media/hero.png"');
    expect(artifact.html).toContain('.reveal section { background: #123456; }');
  });

  it('does not inject legacy themeCss when contentHtml already contains inline styles', async () => {
    const document = makePresentation({
      contentHtml: '<style>.inline-theme { color: red; }</style><section><h1>Roadmap</h1></section>',
      themeCss: '.legacy-theme { color: blue; }',
    });
    const artifact = await (await import('@/services/export/presentationHtml')).exportPresentationStandaloneHtml({
      project: makeProject(document),
      document,
    });

    expect(artifact.html).toContain('.inline-theme');
    expect(artifact.html).not.toContain('.legacy-theme');
  });

  it('preserves pack-owned style systems instead of applying legacy project colours', async () => {
    const document = makePresentation({
      contentHtml: [
        '<style data-aura-style-system="presentation/editorial-stage-v1">',
        '.es-slide { width: 1280px; height: 720px; background: var(--es-canvas); }',
        '</style>',
        '<section class="es-slide"><h1>Roadmap</h1></section>',
      ].join(''),
      themeCss: '',
      artifactManifest: {
        packId: 'presentation/editorial-stage-v1',
        packVersion: '1.0.0',
        renderer: 'presentation',
        validationStatus: 'passed',
        updatedAt: 10,
      },
    });
    const project = {
      ...makeProject(document),
      colorTheme: { background: '#101010', primary: '#f8fafc', accent: '#38bdf8' },
    };

    const artifact = await (await import('@/services/export/presentationHtml')).exportPresentationStandaloneHtml({
      project,
      document,
    });

    expect(artifact.html).toContain('data-aura-style-system="presentation/editorial-stage-v1"');
    expect(artifact.html).toContain('.es-slide { width: 1280px; height: 720px; background: var(--es-canvas); }');
    expect(artifact.html).not.toContain('.aura-slide');
  });
});
