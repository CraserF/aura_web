import { describe, expect, it, vi, beforeEach } from 'vitest';

interface MockZipLoadResult {
  files: Record<string, unknown>;
  file: (path: string) => { async: (type: string) => Promise<unknown> } | undefined;
  folder: (name: string) => unknown;
}

let zipLoadResult: MockZipLoadResult | null = null;
let writtenFiles: Record<string, { value: unknown; options?: unknown }> = {};
const versionHistoryMock = vi.hoisted(() => ({
  gitEntries: [] as Array<{ path: string; content: Uint8Array }>,
  importedGit: [] as Array<{ projectId: string; entries: Array<{ path: string; content: Uint8Array }> }>,
}));

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

vi.mock('@/services/storage/versionHistory', () => ({
  exportProjectGit: vi.fn(async () => versionHistoryMock.gitEntries),
  importProjectGit: vi.fn(async (
    projectId: string,
    entries: Array<{ path: string; content: Uint8Array }>,
  ) => {
    versionHistoryMock.importedGit.push({ projectId, entries });
  }),
  validateGitEntryPath: (entryPath: string) => {
    if (!entryPath) return false;
    if (entryPath.startsWith('/')) return false;
    if (entryPath.includes('\\')) return false;
    if (entryPath.includes('\0')) return false;
    return !entryPath.split('/').some((part) => !part || part === '.' || part === '..');
  },
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
    versionHistoryMock.gitEntries = [];
    versionHistoryMock.importedGit = [];
  });

  it('writes media assets and relative document refs into project archives', async () => {
    const { downloadProjectFile } = await import('@/services/storage/projectFormat');
    const colorTheme = { background: '#0f0f1a', primary: '#ffffff', accent: '#f59e0b' };

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
        artifactManifest: {
          packId: 'presentation/editorial-stage-v1',
          packVersion: '1.0.0',
          designDirectionId: 'editorial-magazine',
          sourcePayloadVersion: 1,
          renderer: 'presentation',
          exports: ['html'],
          editSurfaces: ['text-slot-edits'],
          validationStatus: 'passed',
          updatedAt: 123,
        },
        artifactSourcePayload: {
          schemaVersion: 1,
          packId: 'presentation/editorial-stage-v1',
          slides: [{ id: 'slide-1', layoutId: 'cover', slots: { title: 'Launch' } }],
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
      visualVariantId: 'launch',
      colorTheme,
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
    const docMeta = JSON.parse(String(writtenFiles['documents/doc-1.meta.json']?.value));
    expect(docMeta.artifactManifest).toEqual(expect.objectContaining({
      packId: 'presentation/editorial-stage-v1',
      designDirectionId: 'editorial-magazine',
      renderer: 'presentation',
      validationStatus: 'passed',
    }));
    expect(docMeta.artifactSourcePayload).toEqual(expect.objectContaining({
      schemaVersion: 1,
      packId: 'presentation/editorial-stage-v1',
    }));
    expect(JSON.parse(String(writtenFiles['manifest.json']?.value))).toEqual(expect.objectContaining({
      visualVariantId: 'launch',
      colorTheme,
    }));
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
              visualVariantId: 'research',
              colorTheme: { background: '#f8fafc', primary: '#1e3a5f', accent: '#0891b2' },
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
              artifactManifest: {
                packId: 'presentation/editorial-stage-v1',
                packVersion: '1.0.0',
                designDirectionId: 'editorial-magazine',
                sourcePayloadVersion: 1,
                renderer: 'presentation',
                exports: ['html'],
                editSurfaces: ['text-slot-edits'],
                validationStatus: 'passed',
                updatedAt: 123,
              },
              artifactSourcePayload: {
                schemaVersion: 1,
                packId: 'presentation/editorial-stage-v1',
                slides: [{ id: 'slide-1', layoutId: 'cover', slots: { title: 'Launch' } }],
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

    expect(project.id).not.toBe('project-1');
    expect(project.media).toHaveLength(1);
    expect(project.media?.[0]?.relativePath).toBe('media/hero.png');
    expect(project.media?.[0]?.dataUrl).toContain('data:image/png;base64,');
    expect(project.documents[0]?.contentHtml).toContain('data:image/png;base64,');
    expect(project.documents[0]?.starterRef?.artifactKey).toBe('brief');
    expect(project.documents[0]?.artifactManifest).toEqual(expect.objectContaining({
      packId: 'presentation/editorial-stage-v1',
      designDirectionId: 'editorial-magazine',
    }));
    expect(project.documents[0]?.artifactSourcePayload).toEqual(expect.objectContaining({
      schemaVersion: 1,
      packId: 'presentation/editorial-stage-v1',
    }));
    expect(project.visualVariantId).toBe('research');
    expect(project.colorTheme).toEqual({ background: '#f8fafc', primary: '#1e3a5f', accent: '#0891b2' });
  });

  it('writes optional git history only when history entries are available', async () => {
    const { downloadProjectFileWithHistory } = await import('@/services/storage/projectFormat');
    versionHistoryMock.gitEntries = [{
      path: 'HEAD',
      content: new TextEncoder().encode('ref: refs/heads/main\n'),
    }];

    await downloadProjectFileWithHistory({
      id: 'project-1',
      title: 'History Project',
      visibility: 'private',
      documents: [],
      activeDocumentId: null,
      chatHistory: [],
      sections: { drafts: [], main: [], suggestions: [], issues: [] },
      createdAt: 1,
      updatedAt: 1,
    });

    const manifest = JSON.parse(String(writtenFiles['manifest.json']?.value));
    expect(manifest.hasHistory).toBe(true);
    expect(writtenFiles['version-history/git/HEAD']?.value).toEqual(versionHistoryMock.gitEntries[0]?.content);
  });

  it('does not mark the archive as history-bearing when no git entries are available', async () => {
    const { downloadProjectFileWithHistory } = await import('@/services/storage/projectFormat');

    await downloadProjectFileWithHistory({
      id: 'project-empty-history',
      title: 'No History Project',
      visibility: 'private',
      documents: [],
      activeDocumentId: null,
      chatHistory: [],
      sections: { drafts: [], main: [], suggestions: [], issues: [] },
      createdAt: 1,
      updatedAt: 1,
    });

    const manifest = JSON.parse(String(writtenFiles['manifest.json']?.value));
    expect(manifest).not.toHaveProperty('hasHistory');
    expect(Object.keys(writtenFiles).some((path) => path.startsWith('version-history/git/'))).toBe(false);
  });

  it('restores git history and preserves project id when a history payload is present', async () => {
    zipLoadResult = {
      files: {
        'version-history/git/HEAD': {},
      },
      file(path: string) {
        const files: Record<string, { async: (type: string) => Promise<unknown> }> = {
          'manifest.json': {
            async: async () => JSON.stringify({
              version: '2.4',
              schemaType: 'project',
              id: 'project-with-history',
              title: 'History Project',
              documentCount: 0,
              activeDocumentId: null,
              visibility: 'private',
              createdAt: 1,
              updatedAt: 2,
              hasHistory: true,
            }),
          },
          'version-history/git/HEAD': {
            async: async () => new TextEncoder().encode('ref: refs/heads/main\n'),
          },
        };
        return files[path];
      },
      folder() {
        return null;
      },
    };

    const { openProjectFile } = await import('@/services/storage/projectFormat');
    const project = await openProjectFile(new File(['data'], 'project.aura'));

    expect(project.id).toBe('project-with-history');
    expect(versionHistoryMock.importedGit).toHaveLength(1);
    expect(versionHistoryMock.importedGit[0]?.projectId).toBe('project-with-history');
    expect(versionHistoryMock.importedGit[0]?.entries[0]?.path).toBe('HEAD');
  });

  it('rejects history archives with unsafe git paths', async () => {
    zipLoadResult = {
      files: {
        'version-history/git/../outside': {},
      },
      file(path: string) {
        const files: Record<string, { async: (type: string) => Promise<unknown> }> = {
          'manifest.json': {
            async: async () => JSON.stringify({
              version: '2.4',
              schemaType: 'project',
              id: 'project-with-history',
              title: 'History Project',
              documentCount: 0,
              activeDocumentId: null,
              visibility: 'private',
              createdAt: 1,
              updatedAt: 2,
              hasHistory: true,
            }),
          },
          'version-history/git/../outside': {
            async: async () => new Uint8Array([1]),
          },
        };
        return files[path];
      },
      folder() {
        return null;
      },
    };

    const { openProjectFile } = await import('@/services/storage/projectFormat');
    await expect(openProjectFile(new File(['data'], 'project.aura'))).rejects.toThrow('unsafe git history path');
    expect(versionHistoryMock.importedGit).toHaveLength(0);
  });

  it('rejects archives with unsafe document entry paths', async () => {
    zipLoadResult = {
      files: {
        'documents/../outside.meta.json': {},
      },
      file(path: string) {
        const files: Record<string, { async: (type: string) => Promise<unknown> }> = {
          'manifest.json': {
            async: async () => JSON.stringify({
              version: '2.4',
              schemaType: 'project',
              id: 'project-with-bad-doc',
              title: 'Bad Project',
              documentCount: 1,
              activeDocumentId: null,
              visibility: 'private',
              createdAt: 1,
              updatedAt: 2,
            }),
          },
          'documents/../outside.meta.json': {
            async: async () => JSON.stringify({
              id: '../outside',
              title: 'Bad Doc',
              type: 'document',
              contentHtml: '',
              themeCss: '',
              slideCount: 0,
              order: 0,
              createdAt: 1,
              updatedAt: 2,
            }),
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
    await expect(openProjectFile(new File(['data'], 'project.aura'))).rejects.toThrow('unsafe document archive path');
  });

  it('rejects archives that declare history without any git files', async () => {
    zipLoadResult = {
      files: {},
      file(path: string) {
        if (path !== 'manifest.json') return undefined;
        return {
          async: async () => JSON.stringify({
            version: '2.4',
            schemaType: 'project',
            id: 'project-with-empty-history',
            title: 'History Project',
            documentCount: 0,
            activeDocumentId: null,
            visibility: 'private',
            createdAt: 1,
            updatedAt: 2,
            hasHistory: true,
          }),
        };
      },
      folder() {
        return null;
      },
    };

    const { openProjectFile } = await import('@/services/storage/projectFormat');
    await expect(openProjectFile(new File(['data'], 'project.aura'))).rejects.toThrow('declares history');
  });

  it('rejects unsupported project manifest versions', async () => {
    zipLoadResult = {
      files: {},
      file(path: string) {
        if (path !== 'manifest.json') return undefined;
        return {
          async: async () => JSON.stringify({
            version: '1.0',
            schemaType: 'project',
            id: 'old-project',
            title: 'Old Project',
            documentCount: 0,
            activeDocumentId: null,
            visibility: 'private',
            createdAt: 1,
            updatedAt: 2,
          }),
        };
      },
      folder() {
        return null;
      },
    };

    const { openProjectFile } = await import('@/services/storage/projectFormat');
    await expect(openProjectFile(new File(['data'], 'project.aura'))).rejects.toThrow('Unsupported .aura project format version');
  });
});
