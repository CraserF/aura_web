import type { ProjectMediaAsset } from '@/types/project';
import type { ArtifactMediaResolver, ResolvedArtifactMediaAsset } from '@/services/artifactPacks/types';

function normalizeMediaPath(relativePath: string): string | null {
  const normalized = relativePath.trim().replace(/^\.\/+/, '').replace(/\\/g, '/');
  if (!normalized.startsWith('media/')) return null;
  if (normalized.includes('..')) return null;
  return normalized;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasSafeImageDataUrl(asset: ProjectMediaAsset): boolean {
  const mimeType = asset.mimeType.trim().toLowerCase();
  if (!mimeType.startsWith('image/')) return false;
  const dataUrl = asset.dataUrl.trim();
  return new RegExp(`^data:${escapeRegex(mimeType)};base64,`, 'i').test(dataUrl);
}

function resolveAsset(asset: ProjectMediaAsset): ResolvedArtifactMediaAsset | null {
  const relativePath = normalizeMediaPath(asset.relativePath);
  if (!relativePath) return null;
  if (!hasSafeImageDataUrl(asset)) return null;
  return {
    id: asset.id,
    filename: asset.filename,
    mimeType: asset.mimeType,
    relativePath,
    url: asset.dataUrl,
  };
}

export function createProjectMediaResolver(
  media: readonly ProjectMediaAsset[] = [],
): ArtifactMediaResolver {
  const resolvedAssets = media
    .map(resolveAsset)
    .filter((asset): asset is ResolvedArtifactMediaAsset => asset !== null);
  const byId = new Map(resolvedAssets.map((asset) => [asset.id, asset]));
  const byRelativePath = new Map(resolvedAssets.map((asset) => [asset.relativePath, asset]));

  return {
    resolveById(assetId) {
      return byId.get(assetId) ?? null;
    },
    resolveByRelativePath(relativePath) {
      const normalized = normalizeMediaPath(relativePath);
      return normalized ? byRelativePath.get(normalized) ?? null : null;
    },
    list() {
      return resolvedAssets;
    },
  };
}
