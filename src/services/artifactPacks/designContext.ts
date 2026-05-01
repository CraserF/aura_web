import type { DocumentType, ProjectData } from '@/types/project';
import {
  getArtifactDesignDirection,
  resolveArtifactDesignDirectionId,
} from '@/services/artifactPacks/directions/auraDirections';
import type {
  ArtifactDesignDirection,
  ArtifactDesignDirectionId,
  DataBindingPlan,
  DesignContextSource,
  DesignContextSpec,
  MediaBindingPlan,
} from '@/services/artifactPacks/types';
import {
  applyProjectDesignSystemTokens,
  resolveProjectDesignSystemSpec,
} from './projectDesignSystem';

export interface BuildDesignContextSpecInput {
  artifactType: DocumentType;
  source?: DesignContextSource;
  project?: Partial<Pick<ProjectData, 'media' | 'projectRules' | 'colorTheme'>> | null;
  packId?: string;
  packVersion?: string;
  directionId?: string;
  audience?: string;
  briefSummary?: string;
  constraints?: string[];
  mediaBindingPlan?: MediaBindingPlan;
  dataBindingPlan?: DataBindingPlan;
}

function cloneDirection(direction: ArtifactDesignDirection): ArtifactDesignDirection {
  return {
    ...direction,
    palette: {
      ...direction.palette,
      colors: { ...direction.palette.colors },
      chartPalette: [...direction.palette.chartPalette],
      spacing: { ...direction.palette.spacing },
      radius: { ...direction.palette.radius },
      elevation: { ...direction.palette.elevation },
      table: { ...direction.palette.table },
      motion: { ...direction.palette.motion },
    },
    typography: {
      ...direction.typography,
      families: { ...direction.typography.families },
      scale: { ...direction.typography.scale },
      weights: { ...direction.typography.weights },
    },
    layoutPosture: [...direction.layoutPosture],
    artifactPosture: {
      presentation: [...direction.artifactPosture.presentation],
      document: [...direction.artifactPosture.document],
      spreadsheet: [...direction.artifactPosture.spreadsheet],
    },
    do: [...direction.do],
    dont: [...direction.dont],
    examplePackIds: [...direction.examplePackIds],
  };
}

const VISUAL_VARIANT_DIRECTION_ALIASES: Record<string, ArtifactDesignDirectionId> = {
  executive: 'modern-minimal',
  launch: 'bold-editorial',
  editorial: 'editorial-magazine',
  research: 'data-utility',
  teaching: 'warm-narrative',
};

function resolveDirectionHint(value: string | undefined): ArtifactDesignDirectionId {
  const normalized = value?.trim().toLowerCase();
  if (normalized && normalized in VISUAL_VARIANT_DIRECTION_ALIASES) {
    return VISUAL_VARIANT_DIRECTION_ALIASES[normalized]!;
  }
  return resolveArtifactDesignDirectionId(value);
}

export function extractDesignDirectionFromRules(markdown: string | undefined): ArtifactDesignDirectionId | undefined {
  if (!markdown) return undefined;
  const match =
    markdown.match(/(?:^|\n)\s*(?:Design direction|Visual direction|Direction)\s*:\s*([^\n]+)/i)
    ?? markdown.match(/(?:^|\n)\s*-\s*(?:Design direction|Visual direction|Direction)\s*:\s*([^\n]+)/i);
  if (!match?.[1]) return undefined;
  return resolveDirectionHint(match[1]);
}

export function defaultAudienceForArtifactType(artifactType: DocumentType): string {
  switch (artifactType) {
    case 'presentation':
      return 'viewers who need a clear decision path';
    case 'document':
      return 'readers who need a useful, well-structured artifact';
    case 'spreadsheet':
      return 'operators who need trusted data and traceable calculations';
  }
}

export function buildDefaultMediaBindingPlan(project?: Partial<Pick<ProjectData, 'media'>> | null): MediaBindingPlan {
  return {
    availableAssetIds: (project?.media ?? []).map((asset) => asset.id),
    requiredSlots: [],
    optionalSlots: [],
    bindings: [],
    missingAssetPolicy: 'use-placeholder',
  };
}

export function buildDefaultDataBindingPlan(): DataBindingPlan {
  return {
    sources: [],
    requiredTables: [],
    requiredMetrics: [],
    formulaPolicy: {
      allowGeneratedFormulas: true,
      requireSourceCellRefs: true,
    },
    inventedMetricPolicy: 'flag',
  };
}

export function resolveDesignDirectionForArtifact(input: BuildDesignContextSpecInput): ArtifactDesignDirection {
  const rulesDirection = extractDesignDirectionFromRules(input.project?.projectRules?.markdown);
  const directionId =
    input.directionId
    ?? rulesDirection
    ?? (input.artifactType === 'spreadsheet' ? 'data-utility' : undefined)
    ?? (input.artifactType === 'document' ? 'modern-minimal' : undefined)
    ?? 'editorial-magazine';
  const direction = getArtifactDesignDirection(resolveArtifactDesignDirectionId(directionId))
    ?? getArtifactDesignDirection('editorial-magazine');
  if (!direction) {
    throw new Error('Aura design direction registry is empty.');
  }
  return cloneDirection(direction);
}

export function buildDesignContextSpec(input: BuildDesignContextSpecInput): DesignContextSpec {
  const direction = resolveDesignDirectionForArtifact(input);
  const projectDesignSystem = resolveProjectDesignSystemSpec(
    input.project?.projectRules?.markdown,
    input.project?.colorTheme,
  );
  const artifactPosture = direction.artifactPosture[input.artifactType];
  const constraints = [
    ...(input.constraints ?? []),
    ...direction.dont.map((rule) => `Avoid: ${rule}`),
    ...(projectDesignSystem?.preview.ignoredColorLines.length
      ? ['Use only validated project design token roles; ignore raw CSS color syntax from project rules.']
      : []),
  ];
  const tokens = projectDesignSystem
    ? applyProjectDesignSystemTokens(direction.palette, projectDesignSystem.colorOverrides)
    : direction.palette;

  return {
    id: `${input.artifactType}:${input.packId ?? 'unpacked'}:${direction.id}`,
    version: 1,
    source: input.source ?? (
      projectDesignSystem?.colorOverrides.some((override) => override.source === 'project-design-md')
        ? 'project-design-md'
        : input.project?.projectRules?.markdown
          ? 'project-rules'
          : projectDesignSystem?.source === 'project-color-theme'
            ? 'user-selection'
            : 'runtime-defaults'
    ),
    artifactType: input.artifactType,
    ...(input.packId ? { packId: input.packId } : {}),
    ...(input.packVersion ? { packVersion: input.packVersion } : {}),
    directionId: direction.id,
    directionLabel: direction.label,
    mood: direction.mood,
    audience: input.audience ?? defaultAudienceForArtifactType(input.artifactType),
    ...(input.briefSummary ? { briefSummary: input.briefSummary } : {}),
    tokens,
    typography: direction.typography,
    layoutPosture: direction.layoutPosture,
    artifactPosture,
    do: direction.do,
    dont: direction.dont,
    constraints,
    ...(projectDesignSystem ? { projectDesignSystem } : {}),
    mediaBindingPlan: input.mediaBindingPlan ?? buildDefaultMediaBindingPlan(input.project),
    dataBindingPlan: input.dataBindingPlan ?? buildDefaultDataBindingPlan(),
  };
}
