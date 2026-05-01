import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ProjectData, ProjectDocument } from '@/types/project';
import {
  buildPresentationArtifactPreviewAsset,
  getPresentationArtifactPreviewPath,
  upsertProjectArtifactPreview,
} from '@/services/artifactPreview/presentationPreview';

function makeDocument(overrides: Partial<ProjectDocument> = {}): ProjectDocument {
  return {
    id: 'deck-1',
    title: 'Preview Deck',
    type: 'presentation',
    contentHtml: '<section><h1>Preview</h1></section>',
    themeCss: '',
    slideCount: 1,
    chartSpecs: {},
    order: 0,
    createdAt: 1,
    updatedAt: 2,
    ...overrides,
  };
}

function makeProject(document = makeDocument()): ProjectData {
  return {
    id: 'project-1',
    title: 'Project',
    visibility: 'private',
    documents: [document],
    activeDocumentId: document.id,
    chatHistory: [],
    media: [],
    sections: { drafts: [], main: [], suggestions: [], issues: [] },
    createdAt: 1,
    updatedAt: 2,
  };
}

describe('artifact previews', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('builds a stable runtime preview media asset and document pointer', () => {
    const preview = buildPresentationArtifactPreviewAsset({
      documentId: 'deck.1/with spaces',
      dataUrl: 'data:image/png;base64,abc',
      generatedAt: 10,
      sourceUpdatedAt: 9,
      validationProfileId: 'presentation:v1',
    });

    expect(getPresentationArtifactPreviewPath('deck.1/with spaces')).toBe(
      'media/artifacts/deck%2E1%2Fwith%20spaces/artifact.preview.png',
    );
    expect(preview.asset).toEqual(expect.objectContaining({
      id: 'artifact-preview-deck%2E1%2Fwith%20spaces',
      filename: 'artifact.preview.png',
      mimeType: 'image/png',
      relativePath: 'media/artifacts/deck%2E1%2Fwith%20spaces/artifact.preview.png',
      dataUrl: 'data:image/png;base64,abc',
    }));
    expect(preview.artifactPreview).toEqual(expect.objectContaining({
      assetId: preview.asset.id,
      relativePath: preview.asset.relativePath,
      mimeType: 'image/png',
      width: 1280,
      height: 720,
      generatedAt: 10,
      sourceUpdatedAt: 9,
      validationProfileId: 'presentation:v1',
    }));
  });

  it('upserts preview media without mutating document content timestamps', () => {
    vi.useFakeTimers();
    vi.setSystemTime(20);
    const document = makeDocument({ updatedAt: 12 });
    const project = makeProject(document);
    const firstPreview = buildPresentationArtifactPreviewAsset({
      documentId: document.id,
      dataUrl: 'data:image/png;base64,old',
      generatedAt: 13,
      sourceUpdatedAt: 12,
    });
    const secondPreview = buildPresentationArtifactPreviewAsset({
      documentId: document.id,
      dataUrl: 'data:image/png;base64,new',
      generatedAt: 20,
      sourceUpdatedAt: 12,
    });

    const withFirst = upsertProjectArtifactPreview(project, document.id, firstPreview);
    const withSecond = upsertProjectArtifactPreview(withFirst, document.id, secondPreview);

    expect(withSecond.media).toHaveLength(1);
    expect(withSecond.media?.[0]?.dataUrl).toBe('data:image/png;base64,new');
    expect(withSecond.documents[0]?.updatedAt).toBe(12);
    expect(withSecond.documents[0]?.artifactPreview).toEqual(expect.objectContaining({
      assetId: secondPreview.asset.id,
      generatedAt: 20,
      sourceUpdatedAt: 12,
    }));
    expect(withSecond.updatedAt).toBe(20);
  });

  it('isolates preview slide styles inside a temporary iframe', async () => {
    vi.doMock('html2canvas', () => ({
      default: async (source: HTMLElement) => {
        expect(source.ownerDocument).not.toBe(document);
        expect(source.ownerDocument.querySelector('style')?.textContent).toContain('body { background: red; }');
        expect(document.querySelector('style')).toBeNull();
        return {
          toDataURL: () => 'data:image/png;base64,preview',
        };
      },
    }));
    const { createPresentationArtifactPreview } = await import('@/services/artifactPreview/presentationPreview');

    const preview = await createPresentationArtifactPreview({
      documentId: 'deck-iframe',
      html: '<style>body { background: red; }</style><section><h1>Preview</h1></section>',
      sourceUpdatedAt: 2,
    });

    expect(preview?.artifactPreview.relativePath).toBe('media/artifacts/deck-iframe/artifact.preview.png');
    expect(document.querySelector('iframe')).toBeNull();
    vi.doUnmock('html2canvas');
  });
});
