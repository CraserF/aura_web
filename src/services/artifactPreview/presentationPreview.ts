import type { ProjectArtifactPreview, ProjectData, ProjectMediaAsset } from '@/types/project';

const PREVIEW_WIDTH = 1280;
const PREVIEW_HEIGHT = 720;
const PREVIEW_TIMEOUT_MS = 10_000;

type Html2Canvas = (element: HTMLElement, options: {
  scale: number;
  useCORS: boolean;
  backgroundColor: string;
  width: number;
  height: number;
  windowWidth: number;
  windowHeight: number;
}) => Promise<HTMLCanvasElement>;

export interface PresentationArtifactPreviewBuildInput {
  documentId: string;
  dataUrl: string;
  generatedAt?: number;
  sourceUpdatedAt?: number;
  validationProfileId?: string;
}

export interface PresentationArtifactPreviewBuildResult {
  asset: ProjectMediaAsset;
  artifactPreview: ProjectArtifactPreview;
}

function safeDocumentStem(documentId: string): string {
  const trimmed = documentId.trim() || 'document';
  return encodeURIComponent(trimmed).replace(/\./g, '%2E');
}

export function getPresentationArtifactPreviewPath(documentId: string): string {
  return `media/artifacts/${safeDocumentStem(documentId)}/artifact.preview.png`;
}

export function buildPresentationArtifactPreviewAsset(
  input: PresentationArtifactPreviewBuildInput,
): PresentationArtifactPreviewBuildResult {
  const relativePath = getPresentationArtifactPreviewPath(input.documentId);
  const assetId = `artifact-preview-${safeDocumentStem(input.documentId)}`;
  const generatedAt = input.generatedAt ?? Date.now();

  const asset: ProjectMediaAsset = {
    id: assetId,
    filename: 'artifact.preview.png',
    mimeType: 'image/png',
    relativePath,
    dataUrl: input.dataUrl,
  };

  return {
    asset,
    artifactPreview: {
      assetId,
      relativePath,
      mimeType: 'image/png',
      width: PREVIEW_WIDTH,
      height: PREVIEW_HEIGHT,
      generatedAt,
      ...(input.sourceUpdatedAt !== undefined ? { sourceUpdatedAt: input.sourceUpdatedAt } : {}),
      ...(input.validationProfileId ? { validationProfileId: input.validationProfileId } : {}),
    },
  };
}

export function upsertProjectArtifactPreview(
  project: ProjectData,
  documentId: string,
  preview: PresentationArtifactPreviewBuildResult,
): ProjectData {
  const media = project.media ?? [];
  const nextMedia = [
    ...media.filter((asset) =>
      asset.id !== preview.asset.id &&
      asset.relativePath !== preview.asset.relativePath
    ),
    preview.asset,
  ];

  return {
    ...project,
    media: nextMedia,
    documents: project.documents.map((document) =>
      document.id === documentId
        ? { ...document, artifactPreview: preview.artifactPreview }
        : document,
    ),
    updatedAt: Date.now(),
  };
}

async function loadHtml2Canvas(): Promise<Html2Canvas> {
  const mod = await import('html2canvas') as unknown as { default?: Html2Canvas } & Html2Canvas;
  return mod.default ?? mod;
}

function withTimeout<T>(work: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([work, timeout]).finally(() => {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  });
}

function writeFrameDocument(frameDocument: Document, html: string): HTMLElement {
  const template = document.createElement('template');
  template.innerHTML = html;
  template.content.querySelectorAll('script').forEach((script) => script.remove());

  const section = template.content.querySelector('section');
  if (!section) {
    throw new Error('Presentation preview requires at least one slide section.');
  }

  const host = frameDocument.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '0';
  host.style.top = '0';
  host.style.width = `${PREVIEW_WIDTH}px`;
  host.style.height = `${PREVIEW_HEIGHT}px`;
  host.style.overflow = 'hidden';
  host.style.pointerEvents = 'none';
  host.style.background = '#ffffff';
  host.setAttribute('aria-hidden', 'true');

  frameDocument.open();
  frameDocument.write('<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>');
  frameDocument.close();
  frameDocument.documentElement.style.margin = '0';
  frameDocument.body.style.margin = '0';
  frameDocument.body.style.width = `${PREVIEW_WIDTH}px`;
  frameDocument.body.style.height = `${PREVIEW_HEIGHT}px`;
  frameDocument.body.style.overflow = 'hidden';
  frameDocument.body.style.background = '#ffffff';

  for (const style of Array.from(template.content.querySelectorAll('style'))) {
    host.appendChild(frameDocument.importNode(style, true));
  }
  host.appendChild(frameDocument.importNode(section, true));
  frameDocument.body.appendChild(host);

  return host;
}

function createPreviewHost(html: string): { element: HTMLElement; cleanup: () => void } {
  const frame = document.createElement('iframe');
  frame.style.position = 'fixed';
  frame.style.left = '-20000px';
  frame.style.top = '0';
  frame.style.width = `${PREVIEW_WIDTH}px`;
  frame.style.height = `${PREVIEW_HEIGHT}px`;
  frame.style.border = '0';
  frame.style.pointerEvents = 'none';
  frame.setAttribute('aria-hidden', 'true');
  document.body.appendChild(frame);

  const frameDocument = frame.contentDocument;
  if (!frameDocument) {
    frame.remove();
    throw new Error('Presentation preview iframe could not be initialized.');
  }
  const host = writeFrameDocument(frameDocument, html);

  return {
    element: host,
    cleanup: () => frame.remove(),
  };
}

export async function createPresentationArtifactPreview(input: {
  documentId: string;
  html: string;
  sourceUpdatedAt?: number;
  validationProfileId?: string;
}): Promise<PresentationArtifactPreviewBuildResult | null> {
  if (typeof document === 'undefined') return null;

  const { element, cleanup } = createPreviewHost(input.html);
  try {
    const html2canvas = await loadHtml2Canvas();
    const dataUrl = await withTimeout(
      html2canvas(element, {
        scale: 1,
        useCORS: true,
        backgroundColor: '#ffffff',
        width: PREVIEW_WIDTH,
        height: PREVIEW_HEIGHT,
        windowWidth: PREVIEW_WIDTH,
        windowHeight: PREVIEW_HEIGHT,
      }).then((canvas) => canvas.toDataURL('image/png')),
      PREVIEW_TIMEOUT_MS,
      'Presentation preview generation timed out.',
    );
    if (!/^data:image\/png;base64,/i.test(dataUrl)) return null;

    return buildPresentationArtifactPreviewAsset({
      documentId: input.documentId,
      dataUrl,
      sourceUpdatedAt: input.sourceUpdatedAt,
      validationProfileId: input.validationProfileId,
    });
  } finally {
    cleanup();
  }
}
