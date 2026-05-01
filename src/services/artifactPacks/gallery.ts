import type { DocumentType } from '@/types/project';
import { getArtifactDesignDirection } from './directions/auraDirections';
import { listArtifactPackManifests } from './registry';
import type {
  ArtifactOutputMode,
  ArtifactPackManifest,
  ArtifactPackStatus,
} from './types';

export type ArtifactGalleryPreviewKind = 'image' | 'html' | 'json' | 'unknown';

export interface ArtifactGalleryExample {
  id: string;
  label: string;
  sourcePath: string;
  compiledPath: string;
  previewPath?: string;
  resolvedSourcePath: string;
  resolvedCompiledPath: string;
  resolvedPreviewPath?: string;
  previewKind: ArtifactGalleryPreviewKind;
}

export interface ArtifactPackGalleryItem {
  packId: string;
  version: string;
  label: string;
  description: string;
  artifactType: DocumentType;
  status: ArtifactPackStatus;
  bestFor: readonly string[];
  supportedOutputModes: readonly ArtifactOutputMode[];
  supportedDirectionLabels: readonly string[];
  layoutFamilies: readonly string[];
  examples: readonly ArtifactGalleryExample[];
  primaryExample?: ArtifactGalleryExample;
  saveAsPackAvailable: boolean;
}

export interface ArtifactPackGalleryFilter {
  artifactType?: DocumentType | 'all';
  status?: ArtifactPackStatus | 'all';
}

const packRootForManifest = (manifest: ArtifactPackManifest): string =>
  `src/services/artifactPacks/packs/${manifest.id}`;

const resolvePackPath = (manifest: ArtifactPackManifest, path: string): string =>
  `${packRootForManifest(manifest)}/${path}`;

const previewKindForPath = (path: string | undefined): ArtifactGalleryPreviewKind => {
  if (!path) return 'unknown';
  const lower = path.toLowerCase();
  if (/\.(?:png|jpe?g|webp|gif)$/.test(lower)) return 'image';
  if (/\.html?$/.test(lower)) return 'html';
  if (/\.json$/.test(lower)) return 'json';
  return 'unknown';
};

const compiledKindForPath = (path: string): ArtifactGalleryPreviewKind => {
  const lower = path.toLowerCase();
  if (/\.html?$/.test(lower)) return 'html';
  if (/\.json$/.test(lower)) return 'json';
  return previewKindForPath(path);
};

export const buildArtifactPackGalleryItem = (
  manifest: ArtifactPackManifest,
): ArtifactPackGalleryItem => {
  const examples = manifest.examples.map((example): ArtifactGalleryExample => {
    const previewPath = example.previewPath ?? example.compiledPath;
    return {
      ...example,
      resolvedSourcePath: resolvePackPath(manifest, example.sourcePath),
      resolvedCompiledPath: resolvePackPath(manifest, example.compiledPath),
      resolvedPreviewPath: previewPath ? resolvePackPath(manifest, previewPath) : undefined,
      previewKind: example.previewPath
        ? previewKindForPath(example.previewPath)
        : compiledKindForPath(example.compiledPath),
    };
  });

  return {
    packId: manifest.id,
    version: manifest.version,
    label: manifest.label,
    description: manifest.description,
    artifactType: manifest.artifactType,
    status: manifest.status,
    bestFor: manifest.bestFor,
    supportedOutputModes: manifest.supportedOutputModes,
    supportedDirectionLabels: manifest.supportedDirections.map((directionId) =>
      getArtifactDesignDirection(directionId)?.label ?? directionId),
    layoutFamilies: manifest.layoutFamilies,
    examples,
    primaryExample: examples[0],
    saveAsPackAvailable: false,
  };
};

export const listArtifactPackGalleryItems = (
  filter: ArtifactPackGalleryFilter = {},
): ArtifactPackGalleryItem[] => listArtifactPackManifests()
  .filter((manifest) =>
    !filter.artifactType || filter.artifactType === 'all' || manifest.artifactType === filter.artifactType)
  .filter((manifest) =>
    !filter.status || filter.status === 'all' || manifest.status === filter.status)
  .map(buildArtifactPackGalleryItem);
