import type { DocumentType, ProjectMediaAsset } from '@/types/project';

export type ArtifactType = DocumentType;

export type BuiltinArtifactDesignDirectionId =
  | 'editorial-magazine'
  | 'modern-minimal'
  | 'data-utility'
  | 'warm-narrative'
  | 'bold-editorial';

export type ArtifactDesignDirectionId = BuiltinArtifactDesignDirectionId | (string & {});

export type ArtifactOutputMode =
  | 'html'
  | 'pdf'
  | 'editable-pptx'
  | 'docx'
  | 'xlsx'
  | 'markdown'
  | 'csv';

export type ArtifactPackStatus = 'internal' | 'draft' | 'shippable' | 'deprecated';

export interface ArtifactColorTokens {
  canvas: string;
  surface: string;
  raisedSurface: string;
  text: string;
  mutedText: string;
  accent: string;
  accentText: string;
  border: string;
  subtleFill: string;
  positive: string;
  warning: string;
  negative: string;
}

export interface ArtifactDesignTokens {
  colors: ArtifactColorTokens;
  chartPalette: readonly string[];
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    xxl: string;
  };
  radius: {
    none: string;
    sm: string;
    md: string;
    lg: string;
  };
  elevation: {
    none: string;
    low: string;
    medium: string;
  };
  table: {
    headerFill: string;
    gridLine: string;
    emphasisFill: string;
  };
  motion: {
    intensity: 'none' | 'subtle' | 'moderate';
    maxDurationMs: number;
  };
}

export interface TypographyTokens {
  families: {
    display: string;
    body: string;
    mono: string;
  };
  scale: {
    eyebrow: string;
    title: string;
    subtitle: string;
    heading: string;
    body: string;
    caption: string;
    metric: string;
  };
  weights: {
    regular: number;
    medium: number;
    semibold: number;
    bold: number;
  };
}

export interface ArtifactDesignDirection {
  id: ArtifactDesignDirectionId;
  label: string;
  bestFor: readonly string[];
  mood: string;
  palette: ArtifactDesignTokens;
  typography: TypographyTokens;
  layoutPosture: readonly string[];
  artifactPosture: {
    presentation: readonly string[];
    document: readonly string[];
    spreadsheet: readonly string[];
  };
  do: readonly string[];
  dont: readonly string[];
  examplePackIds: readonly string[];
}

export type ArtifactAssetRequirementKind =
  | 'brand'
  | 'image'
  | 'video'
  | 'document'
  | 'spreadsheet'
  | 'dataset'
  | 'font';

export interface ArtifactAssetRequirement {
  id: string;
  label: string;
  kind: ArtifactAssetRequirementKind;
  purpose: string;
  required: boolean;
  allowedMimeTypes?: readonly string[];
}

export interface ArtifactContentLimits {
  minSlides?: number;
  maxSlides?: number;
  minModules?: number;
  maxModules?: number;
  minSheets?: number;
  maxSheets?: number;
  maxWordsPerModule?: number;
  maxRowsPerSheet?: number;
}

export type ArtifactEditSurfaceKind =
  | 'create'
  | 'text-edit'
  | 'add-slide'
  | 'add-module'
  | 'add-sheet'
  | 'restyle'
  | 'restructure'
  | 'data-refresh'
  | 'formula-edit'
  | 'full-regeneration'
  | 'unsupported';

export interface ArtifactEditSurface {
  id: string;
  label: string;
  kind: ArtifactEditSurfaceKind;
  targetKinds: readonly ('artifact' | 'slide' | 'module' | 'sheet' | 'table' | 'chart' | 'slot')[];
  allowedOperations: readonly string[];
  lockedFields: readonly string[];
  guidance: string;
}

export interface ArtifactExampleRef {
  id: string;
  label: string;
  sourcePath: string;
  compiledPath: string;
  previewPath?: string;
}

export interface ArtifactPackManifest {
  id: string;
  version: string;
  label: string;
  description: string;
  status: ArtifactPackStatus;
  artifactType: ArtifactType;
  bestFor: readonly string[];
  supportedOutputModes: readonly ArtifactOutputMode[];
  supportedDirections: readonly ArtifactDesignDirectionId[];
  requiredSourceAssets: readonly ArtifactAssetRequirement[];
  optionalSourceAssets: readonly ArtifactAssetRequirement[];
  layoutFamilies: readonly string[];
  contentLimits: ArtifactContentLimits;
  editSurfaces: readonly ArtifactEditSurface[];
  exportCaveats: readonly string[];
  examples: readonly ArtifactExampleRef[];
}

export type ArtifactValidationSeverity = 'blocking' | 'advisory';

export interface ArtifactValidationFinding {
  id: string;
  severity: ArtifactValidationSeverity;
  message: string;
  artifactType?: ArtifactType;
  path?: readonly (string | number)[];
  packId?: string;
  directionId?: ArtifactDesignDirectionId;
}

export interface ArtifactValidationReport {
  passed: boolean;
  blockingCount: number;
  advisoryCount: number;
  findings: readonly ArtifactValidationFinding[];
}

export interface ArtifactStructureNode {
  id: string;
  orderIndex: number;
  role: string;
  label: string;
  layoutFamily: string;
  requiredSlots: readonly string[];
  optionalSlots: readonly string[];
  mediaSlots?: readonly string[];
  dataSlots?: readonly string[];
}

export interface ArtifactRhythmBeat {
  nodeId: string;
  purpose: string;
  density: 'calm' | 'balanced' | 'dense';
  visualWeight: 'quiet' | 'standard' | 'proof' | 'hero';
  transitionRole: string;
}

export interface ArtifactStructurePlan {
  artifactType: ArtifactType;
  packId?: string;
  directionId?: ArtifactDesignDirectionId;
  targetLength: {
    unit: 'slides' | 'modules' | 'sheets';
    count: number;
  };
  nodes: readonly ArtifactStructureNode[];
  rhythm: readonly ArtifactRhythmBeat[];
  rules: readonly string[];
}

export interface MediaBinding {
  slotId: string;
  assetId: ProjectMediaAsset['id'];
  purpose: string;
  required: boolean;
  altText: string;
  cropPolicy: 'contain' | 'cover-center' | 'cover-top' | 'no-crop';
}

export interface MediaBindingPlan {
  availableAssetIds: readonly ProjectMediaAsset['id'][];
  requiredSlots: readonly string[];
  optionalSlots: readonly string[];
  bindings: readonly MediaBinding[];
  missingAssetPolicy: 'block' | 'use-placeholder' | 'omit-slot';
}

export interface DataBindingSource {
  id: string;
  label: string;
  kind: 'table' | 'query' | 'spreadsheet' | 'chart' | 'manual';
  freshness?: string;
}

export interface DataBindingPlan {
  sources: readonly DataBindingSource[];
  requiredTables: readonly string[];
  requiredMetrics: readonly string[];
  formulaPolicy: {
    allowGeneratedFormulas: boolean;
    requireSourceCellRefs: boolean;
  };
  inventedMetricPolicy: 'block' | 'flag' | 'allow-with-label';
}

export type DesignContextSource =
  | 'runtime-defaults'
  | 'project-rules'
  | 'user-selection'
  | 'pack-defaults'
  | 'repair';

export interface DesignContextSpec {
  id: string;
  version: 1;
  source: DesignContextSource;
  artifactType: ArtifactType;
  packId?: string;
  packVersion?: string;
  directionId: ArtifactDesignDirectionId;
  directionLabel: string;
  mood: string;
  audience: string;
  briefSummary?: string;
  tokens: ArtifactDesignTokens;
  typography: TypographyTokens;
  layoutPosture: readonly string[];
  artifactPosture: readonly string[];
  do: readonly string[];
  dont: readonly string[];
  constraints: readonly string[];
  mediaBindingPlan?: MediaBindingPlan;
  dataBindingPlan?: DataBindingPlan;
}

export interface ArtifactCompiledOutput {
  mode: ArtifactOutputMode;
  content: string;
  /** Asset ids referenced by compiled output. Packaging resolves ids through project media. */
  assets: readonly string[];
  generatedAt?: number;
}

export interface ResolvedArtifactMediaAsset {
  id: string;
  filename: string;
  mimeType: string;
  relativePath: string;
  /** App-preview URL. For persisted Aura projects this is currently the ProjectMediaAsset data URL. */
  url: string;
}

export interface ArtifactMediaResolver {
  resolveById(assetId: string): ResolvedArtifactMediaAsset | null;
  resolveByRelativePath(relativePath: string): ResolvedArtifactMediaAsset | null;
  list(): readonly ResolvedArtifactMediaAsset[];
}

export interface ArtifactSourcePayload<
  TSlotPayload = Record<string, unknown>,
  TDataModel = Record<string, unknown>,
> {
  schemaVersion: 1;
  artifactType: ArtifactType;
  packId: string;
  packVersion: string;
  directionId: ArtifactDesignDirectionId;
  designContext: DesignContextSpec;
  structure: ArtifactStructurePlan;
  slots?: TSlotPayload;
  modules?: readonly TSlotPayload[];
  workbook?: TDataModel;
  mediaBindings?: MediaBindingPlan;
  dataBindings?: DataBindingPlan;
  compiledOutput?: ArtifactCompiledOutput;
  validationReport?: ArtifactValidationReport;
}

export interface ArtifactPackCompileInput<
  TSource = ArtifactSourcePayload,
  TPlan extends ArtifactStructurePlan = ArtifactStructurePlan,
> {
  source: TSource;
  structure: TPlan;
  designContext: DesignContextSpec;
  outputMode: ArtifactOutputMode;
  mediaResolver?: ArtifactMediaResolver;
}

export interface ArtifactPackCompileResult {
  output: ArtifactCompiledOutput;
  validation: ArtifactValidationReport;
}

export type ArtifactPackCompiler<
  TSource = ArtifactSourcePayload,
  TPlan extends ArtifactStructurePlan = ArtifactStructurePlan,
> = (input: ArtifactPackCompileInput<TSource, TPlan>) => ArtifactPackCompileResult | Promise<ArtifactPackCompileResult>;

export type ArtifactPackValidator<TInput = unknown> = (input: TInput) => ArtifactValidationReport;

export interface ArtifactPack<
  TSource = ArtifactSourcePayload,
  TPlan extends ArtifactStructurePlan = ArtifactStructurePlan,
> {
  manifest: ArtifactPackManifest;
  compile?: ArtifactPackCompiler<TSource, TPlan>;
  validateSource?: ArtifactPackValidator<TSource>;
  validateStructure?: ArtifactPackValidator<TPlan>;
  validateCompiledOutput?: ArtifactPackValidator<ArtifactCompiledOutput>;
}
