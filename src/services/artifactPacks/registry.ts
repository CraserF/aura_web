import type { DocumentType } from '@/types/project';
import { EDITORIAL_STAGE_PACK } from '@/services/artifactPacks/packs/presentation/editorial-stage-v1/manifest';
import type {
  ArtifactDesignDirectionId,
  ArtifactOutputMode,
  ArtifactPackManifest,
} from '@/services/artifactPacks/types';

type RegisteredArtifactPack = typeof EDITORIAL_STAGE_PACK;

export interface ArtifactPackSelectionInput {
  artifactType: DocumentType;
  directionId?: ArtifactDesignDirectionId;
  outputMode?: ArtifactOutputMode;
  prompt?: string;
}

const BUILTIN_PACKS: RegisteredArtifactPack[] = [
  EDITORIAL_STAGE_PACK,
];

function cloneManifest(manifest: ArtifactPackManifest): ArtifactPackManifest {
  return {
    ...manifest,
    bestFor: [...manifest.bestFor],
    supportedOutputModes: [...manifest.supportedOutputModes],
    supportedDirections: [...manifest.supportedDirections],
    requiredSourceAssets: manifest.requiredSourceAssets.map((asset) => ({
      ...asset,
      ...(asset.allowedMimeTypes ? { allowedMimeTypes: [...asset.allowedMimeTypes] } : {}),
    })),
    optionalSourceAssets: manifest.optionalSourceAssets.map((asset) => ({
      ...asset,
      ...(asset.allowedMimeTypes ? { allowedMimeTypes: [...asset.allowedMimeTypes] } : {}),
    })),
    layoutFamilies: [...manifest.layoutFamilies],
    contentLimits: { ...manifest.contentLimits },
    editSurfaces: manifest.editSurfaces.map((surface) => ({
      ...surface,
      targetKinds: [...surface.targetKinds],
      allowedOperations: [...surface.allowedOperations],
      lockedFields: [...surface.lockedFields],
    })),
    exportCaveats: [...manifest.exportCaveats],
    examples: manifest.examples.map((example) => ({ ...example })),
  };
}

export function listArtifactPacks(): RegisteredArtifactPack[] {
  return BUILTIN_PACKS.map((pack) => ({
    ...pack,
    manifest: cloneManifest(pack.manifest),
  }));
}

export function listArtifactPackManifests(): ArtifactPackManifest[] {
  return BUILTIN_PACKS.map((pack) => cloneManifest(pack.manifest));
}

export function getArtifactPack(id: string | undefined): RegisteredArtifactPack | undefined {
  return BUILTIN_PACKS.find((pack) => pack.manifest.id === id);
}

export function listArtifactPacksByType(artifactType: DocumentType): RegisteredArtifactPack[] {
  return listArtifactPacks().filter((pack) => pack.manifest.artifactType === artifactType);
}

export function resolveArtifactPackForSelection(input: ArtifactPackSelectionInput): RegisteredArtifactPack | undefined {
  const candidates = BUILTIN_PACKS.filter((pack) => pack.manifest.artifactType === input.artifactType);
  if (candidates.length === 0) return undefined;

  const outputMatches = input.outputMode
    ? candidates.filter((pack) => pack.manifest.supportedOutputModes.includes(input.outputMode!))
    : candidates;
  const outputCandidates = outputMatches.length > 0 ? outputMatches : candidates;

  const directionMatches = input.directionId
    ? outputCandidates.filter((pack) => pack.manifest.supportedDirections.includes(input.directionId!))
    : outputCandidates;
  const directionCandidates = directionMatches.length > 0 ? directionMatches : outputCandidates;

  const prompt = input.prompt?.toLowerCase() ?? '';
  const promptMatch = directionCandidates.find((pack) =>
    pack.manifest.bestFor.some((phrase) => prompt.includes(phrase.toLowerCase())));
  return promptMatch ?? directionCandidates[0];
}

export function validateArtifactPackManifest(manifest: ArtifactPackManifest): string[] {
  const errors: string[] = [];
  if (!manifest.id.trim()) errors.push('Pack id is required.');
  if (!manifest.label.trim()) errors.push(`Pack ${manifest.id} label is required.`);
  if (!manifest.version.trim()) errors.push(`Pack ${manifest.id} version is required.`);
  if (manifest.bestFor.length === 0) errors.push(`Pack ${manifest.id} must declare bestFor.`);
  if (manifest.supportedOutputModes.length === 0) errors.push(`Pack ${manifest.id} must declare output modes.`);
  if (manifest.supportedDirections.length === 0) errors.push(`Pack ${manifest.id} must declare supported directions.`);
  if (manifest.layoutFamilies.length === 0) errors.push(`Pack ${manifest.id} must declare layout families.`);
  if (manifest.editSurfaces.length === 0) errors.push(`Pack ${manifest.id} must declare edit surfaces.`);
  if (manifest.examples.length === 0 && manifest.status === 'shippable') {
    errors.push(`Shippable pack ${manifest.id} must include examples.`);
  }
  return errors;
}
