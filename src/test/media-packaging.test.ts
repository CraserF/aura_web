import { describe, expect, it, vi, beforeEach } from 'vitest';

let zipLoadResult: any = null;
let writtenFiles: Record<string, { value: unknown; options?: unknown }> = {};

class MockFolder {
  constructor(private readonly prefix: string) {}

  file(path: string, value: unknown, options?: unknown) {
    writtenFiles[`${this.prefix}/${path}`] = { value, options };
    return this;
  }
}

vi.mock('jszip', () => {
  class MockZip {
    static async loadAsync() {
      return zipLoadResult;
    }

    file(path: string, value?: unknown, options?: unknown) {
      if (arguments.length === 1) {
        return zipLoadResult?.file(path);
      }
      writtenFiles[path] = { value, options };
      return this;
    }

    folder(name: string) {
      return new MockFolder(name);
    }

    async generateAsync() {
      return new Blob(['zip']);
    }
  }

  return { default: MockZip };
});

vi.mock('file-saver', () => ({
  saveAs: vi.fn(),
}));

vi.mock('@/services/charts', () => ({
  extractChartSpecsFromHtml: vi.fn(() => ({})),
}));

vi.mock('@/services/spreadsheet/workbook', () => ({
  exportSheetParquet: vi.fn(async () => new Uint8Array([1, 2, 3])),
  importSheetParquet: vi.fn(async () => {}),
}));

describe('media packaging', () => {
  beforeEach(() => {
    writtenFiles = {};
    zipLoadResult = null;
  });

  it('writes media assets and relative document refs into project archives', async () => {
    const { downloadProjectFile } = await import('@/services/storage/projectFormat');

    await downloadProjectFile({
      id: 'project-1',
      title: 'Media Project',
      visibility: 'private',
      documents: [{
        id: 'doc-1',
        title: 'Doc',
        type: 'document',
        contentHtml: '<p><img src="data:image/png;base64,abc" alt="Hero"></p>',
        starterRef: {
          artifactKey: 'brief',
          starterId: 'executive-brief',
          starterType: 'document',
          starterKitId: 'executive-briefing',
        },
        sourceMarkdown: '# Doc',
        themeCss: '',
        slideCount: 0,
        chartSpecs: {},
        order: 0,
        createdAt: 1,
        updatedAt: 1,
      }],
      activeDocumentId: 'doc-1',
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
    });

    expect(String(writtenFiles['documents/doc-1.html']?.value)).toContain('src="media/hero.png"');
    expect(writtenFiles['media/manifest.json']).toBeDefined();
    expect(writtenFiles['media/hero.png']).toBeDefined();
  });

  it('restores media assets and inlines relative refs on project import', async () => {
    zipLoadResult = {
      files: {
        'documents/doc-1.meta.json': {},
        'media/manifest.json': {},
        'media/hero.png': {},
      },
      file(path: string) {
        const files: Record<string, { async: (type: string) => Promise<unknown> }> = {
          'manifest.json': {
            async: async () => JSON.stringify({
              version: '2.4',
              schemaType: 'project',
              id: 'project-1',
              title: 'Media Project',
              documentCount: 1,
              activeDocumentId: 'doc-1',
              visibility: 'private',
              createdAt: 1,
              updatedAt: 2,
            }),
          },
          'chat-history.json': { async: async () => '[]' },
          'project-rules.md': { async: async () => '' },
          'context-policy.json': { async: async () => 'null' },
          'workflow-presets.json': { async: async () => 'null' },
          'media/manifest.json': {
            async: async () => JSON.stringify([{
              id: 'media-1',
              filename: 'hero.png',
              mimeType: 'image/png',
              relativePath: 'media/hero.png',
              dataUrl: '',
            }]),
          },
          'media/hero.png': { async: async () => new Uint8Array([1, 2, 3]) },
          'documents/doc-1.meta.json': {
            async: async () => JSON.stringify({
              id: 'doc-1',
              title: 'Doc',
              type: 'document',
              starterRef: {
                artifactKey: 'brief',
                starterId: 'executive-brief',
                starterType: 'document',
                starterKitId: 'executive-briefing',
              },
              contentHtml: '',
              themeCss: '',
              slideCount: 0,
              order: 0,
              createdAt: 1,
              updatedAt: 2,
            }),
          },
          'documents/doc-1.html': {
            async: async () => '<p><img src="media/hero.png" alt="Hero"></p>',
          },
        };

        return files[path];
      },
      folder(name: string) {
        if (name === 'documents') return {};
        return null;
      },
    };

    const { openProjectFile } = await import('@/services/storage/projectFormat');
    const project = await openProjectFile(new File(['data'], 'project.aura'));

    expect(project.media).toHaveLength(1);
    expect(project.media?.[0]?.relativePath).toBe('media/hero.png');
    expect(project.media?.[0]?.dataUrl).toContain('data:image/png;base64,');
    expect(project.documents[0]?.contentHtml).toContain('data:image/png;base64,');
    expect(project.documents[0]?.starterRef?.artifactKey).toBe('brief');
  });
});
