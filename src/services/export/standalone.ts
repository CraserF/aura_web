import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { sanitizeFilename } from '@/lib/sanitizeFilename';
import type { ProjectMediaAsset } from '@/types/project';

export type StandaloneArtifactExportKind =
  | 'document-html'
  | 'presentation-html'
  | 'document-email';

export interface StandaloneExportAsset {
  relativePath: string;
  mimeType: string;
  bytesBase64: string;
}

export interface StandaloneArtifactExport {
  kind: StandaloneArtifactExportKind;
  title: string;
  filename: string;
  html: string;
  assets: StandaloneExportAsset[];
}

export interface ResolvedStandaloneHtml {
  html: string;
  assets: StandaloneExportAsset[];
  warnings: string[];
}

function dataUrlToBase64(dataUrl: string): string | null {
  const match = dataUrl.match(/^data:[^;]+;base64,(.+)$/);
  return match?.[1] ?? null;
}

function buildAssetFromMedia(media: ProjectMediaAsset): StandaloneExportAsset | null {
  const bytesBase64 = dataUrlToBase64(media.dataUrl);
  if (!bytesBase64) return null;

  return {
    relativePath: media.relativePath,
    mimeType: media.mimeType,
    bytesBase64,
  };
}

function isSafeRelativeMediaPath(value: string): boolean {
  return value.startsWith('media/') || value.startsWith('./media/');
}

function normalizeRelativeMediaPath(value: string): string {
  return value.startsWith('./') ? value.slice(2) : value;
}

function replaceCssUrlReferences(
  html: string,
  mediaByDataUrl: Map<string, ProjectMediaAsset>,
  mediaByRelativePath: Map<string, ProjectMediaAsset>,
  mode: 'relative' | 'inline',
  warnings: string[],
  assets: Map<string, StandaloneExportAsset>,
): string {
  return html.replace(/url\((['"]?)([^'")]+)\1\)/gi, (_match, quote: string, rawValue: string) => {
    const value = rawValue.trim();

    if (mode === 'relative') {
      const media = mediaByDataUrl.get(value)
        ?? (isSafeRelativeMediaPath(value) ? mediaByRelativePath.get(normalizeRelativeMediaPath(value)) : undefined);
      if (!media) {
        return `url(${quote}${value}${quote})`;
      }

      const asset = buildAssetFromMedia(media);
      if (asset) {
        assets.set(asset.relativePath, asset);
      }
      return `url(${quote}${media.relativePath}${quote})`;
    }

    if (!isSafeRelativeMediaPath(value)) {
      return `url(${quote}${value}${quote})`;
    }

    const media = mediaByRelativePath.get(normalizeRelativeMediaPath(value));
    if (!media) {
      warnings.push(`Missing packaged media for ${value}.`);
      return 'none';
    }

    return `url(${quote}${media.dataUrl}${quote})`;
  });
}

export function resolveStandaloneHtml(
  inputHtml: string,
  media: ProjectMediaAsset[],
  mode: 'relative' | 'inline',
): ResolvedStandaloneHtml {
  const warnings: string[] = [];
  const assets = new Map<string, StandaloneExportAsset>();
  const mediaByDataUrl = new Map(media.map((asset) => [asset.dataUrl, asset]));
  const mediaByRelativePath = new Map(media.map((asset) => [asset.relativePath, asset]));
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<body>${inputHtml}</body>`, 'text/html');

  doc.querySelectorAll<HTMLElement>('[src], [poster], [href]').forEach((element) => {
    for (const attrName of ['src', 'poster', 'href']) {
      const attrValue = element.getAttribute(attrName)?.trim();
      if (!attrValue) continue;

      if (mode === 'relative') {
        const mediaAsset = mediaByDataUrl.get(attrValue)
          ?? (isSafeRelativeMediaPath(attrValue) ? mediaByRelativePath.get(normalizeRelativeMediaPath(attrValue)) : undefined);
        if (!mediaAsset) continue;

        const asset = buildAssetFromMedia(mediaAsset);
        if (asset) {
          assets.set(asset.relativePath, asset);
        }
        element.setAttribute(attrName, mediaAsset.relativePath);
        continue;
      }

      if (!isSafeRelativeMediaPath(attrValue)) continue;

      const mediaAsset = mediaByRelativePath.get(normalizeRelativeMediaPath(attrValue));
      if (!mediaAsset) {
        warnings.push(`Missing packaged media for ${attrValue}.`);
        element.removeAttribute(attrName);
        continue;
      }

      element.setAttribute(attrName, mediaAsset.dataUrl);
    }
  });

  let html = doc.body.innerHTML;
  html = replaceCssUrlReferences(html, mediaByDataUrl, mediaByRelativePath, mode, warnings, assets);

  return {
    html,
    assets: Array.from(assets.values()),
    warnings,
  };
}

export function buildStandaloneHtmlDocument(title: string, headContent: string, bodyContent: string): string {
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${title}</title>`,
    headContent,
    '</head>',
    '<body>',
    bodyContent,
    '</body>',
    '</html>',
  ].join('\n');
}

export async function downloadStandaloneArtifact(artifact: StandaloneArtifactExport): Promise<void> {
  if (artifact.assets.length === 0) {
    const blob = new Blob([artifact.html], { type: 'text/html;charset=utf-8' });
    saveAs(blob, artifact.filename);
    return;
  }

  const zip = new JSZip();
  zip.file('index.html', artifact.html);
  for (const asset of artifact.assets) {
    zip.file(asset.relativePath, asset.bytesBase64, { base64: true });
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  const baseName = artifact.filename.endsWith('.html')
    ? artifact.filename.slice(0, -5)
    : sanitizeFilename(artifact.title || 'artifact');
  saveAs(blob, `${baseName}.zip`);
}
