import { createInitialMemoryTree } from '@/services/memory';
import {
  defaultContextPolicy,
  defaultProjectRules,
  defaultWorkflowPresets,
} from '@/services/projectRules/defaults';
import type { ChartSpec } from '@/services/charts';
import { extractChartSpecsFromHtml } from '@/services/charts';
import type {
  ProjectArtifactManifest,
  ProjectData,
  ProjectDocument,
  ProjectMediaAsset,
  WorkbookMeta,
} from '@/types/project';
import {
  compileExecutiveMemoPack,
  EXECUTIVE_MEMO_MANIFEST,
} from './packs/document/executive-memo-v1';
import type { ExecutiveMemoSource } from './packs/document/executive-memo-v1';
import {
  compileOperatingModelPack,
  OPERATING_MODEL_MANIFEST,
} from './packs/spreadsheet/operating-model-v1';
import type { OperatingModelSource } from './packs/spreadsheet/operating-model-v1';
import { createProjectMediaResolver } from './mediaResolver';
import { compileEditorialStagePack } from './packs/presentation/editorial-stage-v1/compiler';
import { EDITORIAL_STAGE_MANIFEST } from './packs/presentation/editorial-stage-v1/manifest';
import type { EditorialStageSource } from './packs/presentation/editorial-stage-v1/schemas';
import executiveMemoSourceRaw from './packs/document/executive-memo-v1/examples/source.json?raw';
import operatingModelSourceRaw from './packs/spreadsheet/operating-model-v1/examples/source.json?raw';
import editorialStageMediaRaw from './packs/presentation/editorial-stage-v1/examples/media.json?raw';
import editorialStageSourceRaw from './packs/presentation/editorial-stage-v1/examples/source.json?raw';
import type { ArtifactPackCompileResult, ArtifactPackManifest } from './types';

export type ShippedArtifactPackExampleId =
  | 'presentation/editorial-stage-v1:decision-brief-example'
  | 'document/executive-memo-v1:executive-memo-example'
  | 'spreadsheet/operating-model-v1:operating-model-example';

export interface CreateArtifactPackExampleDocumentOptions {
  exampleId: ShippedArtifactPackExampleId;
  documentId?: string;
  title?: string;
  order?: number;
  now?: number;
  createId?: () => string;
}

export interface CreateArtifactPackExampleProjectOptions extends CreateArtifactPackExampleDocumentOptions {
  projectId?: string;
  projectTitle?: string;
}

interface CompiledOperatingModelExample {
  title: string;
  workbook: WorkbookMeta;
  data: Record<string, Array<Record<string, unknown>>>;
  charts?: Array<{
    id: string;
    title?: string;
    type?: ChartSpec['type'];
    sourceSheetId: string;
    xColumn: string;
    yColumns: string[];
  }>;
}

interface ExampleDefinition<TSource, TCompiled = unknown> {
  exampleId: ShippedArtifactPackExampleId;
  manifest: ArtifactPackManifest;
  sourceRaw: string;
  mediaRaw?: string;
  compile: (source: TSource, media: readonly ProjectMediaAsset[]) => ArtifactPackCompileResult;
  parseCompiled: (content: string) => TCompiled;
  defaultTitle: (source: TSource, compiled: TCompiled) => string;
  toDocumentFields: (source: TSource, compiledContent: string, compiled: TCompiled) => Pick<
    ProjectDocument,
    'type' | 'contentHtml' | 'themeCss' | 'slideCount' | 'workbook' | 'chartSpecs'
  >;
}

const parseJson = <T>(raw: string): T => JSON.parse(raw) as T;

const defaultCreateId = (): string => crypto.randomUUID();

const sourcePayloadVersion = (source: unknown): number | undefined => {
  const version = (source as { schemaVersion?: unknown }).schemaVersion;
  return typeof version === 'number' ? version : undefined;
};

const buildManifest = (
  manifest: ArtifactPackManifest,
  source: unknown,
  updatedAt: number,
  validationStatus: ProjectArtifactManifest['validationStatus'],
): ProjectArtifactManifest => ({
  packId: manifest.id,
  packVersion: manifest.version,
  designDirectionId: (source as { directionId?: string }).directionId,
  sourcePayloadVersion: sourcePayloadVersion(source),
  renderer: manifest.artifactType,
  exports: [...manifest.supportedOutputModes],
  editSurfaces: manifest.editSurfaces.map((surface) => surface.id),
  validationStatus,
  updatedAt,
});

const validationStatusFromCompile = (
  result: ArtifactPackCompileResult,
): ProjectArtifactManifest['validationStatus'] => {
  if (result.validation.blockingCount > 0) return 'failed';
  if (result.validation.advisoryCount > 0) return 'warnings';
  return 'passed';
};

const assertCompiledExampleIsUsable = (
  definition: ExampleDefinition<unknown>,
  compileResult: ArtifactPackCompileResult,
): void => {
  if (compileResult.validation.blockingCount === 0) return;
  const firstFinding = compileResult.validation.findings[0];
  throw new Error(
    `Artifact pack example ${definition.exampleId} failed validation: ${firstFinding?.message ?? 'blocking validation finding'}`,
  );
};

const parseMediaAssets = (raw: string | undefined): ProjectMediaAsset[] =>
  raw ? parseJson<ProjectMediaAsset[]>(raw) : [];

const chartSpecsFromOperatingModel = (
  compiled: CompiledOperatingModelExample,
): Record<string, ChartSpec> | undefined => {
  const specs = (compiled.charts ?? []).map((chart): [string, ChartSpec] => {
    const rows = compiled.data[chart.sourceSheetId] ?? [];
    const labels = rows.map((row) => String(row[chart.xColumn] ?? ''));
    const datasets = chart.yColumns.map((column) => ({
      label: column,
      values: rows.map((row) => {
        const value = row[column];
        return typeof value === 'number' && Number.isFinite(value) ? value : 0;
      }),
    }));

    return [chart.id, {
      id: chart.id,
      type: chart.type === 'line' || chart.type === 'area' ? chart.type : 'bar',
      title: chart.title,
      labels,
      datasets,
      dataSource: {
        kind: 'table-ref',
        refId: chart.sourceSheetId,
      },
    }];
  });

  return specs.length > 0 ? Object.fromEntries(specs) : undefined;
};

const EXAMPLES: Record<ShippedArtifactPackExampleId, ExampleDefinition<unknown>> = {
  'presentation/editorial-stage-v1:decision-brief-example': {
    exampleId: 'presentation/editorial-stage-v1:decision-brief-example',
    manifest: EDITORIAL_STAGE_MANIFEST,
    sourceRaw: editorialStageSourceRaw,
    mediaRaw: editorialStageMediaRaw,
    compile: (source, media) => compileEditorialStagePack({
      source: source as EditorialStageSource,
      outputMode: (source as EditorialStageSource).outputMode,
      mediaResolver: createProjectMediaResolver(media),
    }),
    parseCompiled: () => undefined,
    defaultTitle: (source) => (source as EditorialStageSource).title,
    toDocumentFields: (source, compiledContent) => ({
      type: 'presentation',
      contentHtml: compiledContent,
      themeCss: '',
      slideCount: (source as EditorialStageSource).slides.length,
      workbook: undefined,
      chartSpecs: extractChartSpecsFromHtml(compiledContent),
    }),
  },
  'document/executive-memo-v1:executive-memo-example': {
    exampleId: 'document/executive-memo-v1:executive-memo-example',
    manifest: EXECUTIVE_MEMO_MANIFEST,
    sourceRaw: executiveMemoSourceRaw,
    compile: (source) => compileExecutiveMemoPack({
      source: source as ExecutiveMemoSource,
      outputMode: (source as ExecutiveMemoSource).outputMode,
    }),
    parseCompiled: () => undefined,
    defaultTitle: (source) => (source as ExecutiveMemoSource).title,
    toDocumentFields: (_source, compiledContent) => ({
      type: 'document',
      contentHtml: compiledContent,
      themeCss: '',
      slideCount: 0,
      workbook: undefined,
      chartSpecs: extractChartSpecsFromHtml(compiledContent),
    }),
  },
  'spreadsheet/operating-model-v1:operating-model-example': {
    exampleId: 'spreadsheet/operating-model-v1:operating-model-example',
    manifest: OPERATING_MODEL_MANIFEST,
    sourceRaw: operatingModelSourceRaw,
    compile: (source) => compileOperatingModelPack({
      source: source as OperatingModelSource,
      outputMode: (source as OperatingModelSource).outputMode,
    }),
    parseCompiled: parseJson<CompiledOperatingModelExample>,
    defaultTitle: (source, compiled) =>
      (source as OperatingModelSource).title || (compiled as CompiledOperatingModelExample).title,
    toDocumentFields: (_source, compiledContent, compiled) => {
      const operatingModel = compiled as CompiledOperatingModelExample;
      return {
        type: 'spreadsheet',
        contentHtml: compiledContent,
        themeCss: '',
        slideCount: 0,
        workbook: operatingModel.workbook,
        chartSpecs: chartSpecsFromOperatingModel(operatingModel),
      };
    },
  },
};

export function listShippedArtifactPackExamples(): ShippedArtifactPackExampleId[] {
  return Object.keys(EXAMPLES) as ShippedArtifactPackExampleId[];
}

export function toShippedArtifactPackExampleId(
  packId: string,
  exampleId: string,
): ShippedArtifactPackExampleId | null {
  const id = `${packId}:${exampleId}` as ShippedArtifactPackExampleId;
  return id in EXAMPLES ? id : null;
}

export function isShippedArtifactPackExampleId(
  packId: string,
  exampleId: string,
): boolean {
  return toShippedArtifactPackExampleId(packId, exampleId) !== null;
}

interface BuiltExampleDocument {
  document: ProjectDocument;
  media: ProjectMediaAsset[];
  spreadsheetRows?: Record<string, Array<Record<string, unknown>>>;
}

async function materializeSpreadsheetRows(
  document: ProjectDocument,
  rowsBySheetId: Record<string, Array<Record<string, unknown>>> | undefined,
): Promise<ProjectDocument> {
  if (!rowsBySheetId || document.type !== 'spreadsheet' || !document.workbook) {
    return document;
  }

  const { replaceSheetData } = await import('@/services/spreadsheet/workbook');
  const sheets = [];
  for (const sheet of document.workbook.sheets) {
    const rows = rowsBySheetId[sheet.id] ?? [];
    const schema = await replaceSheetData(sheet, sheet.schema, rows);
    sheets.push({ ...sheet, schema });
  }

  return {
    ...document,
    workbook: {
      ...document.workbook,
      sheets,
    },
  };
}

function buildExampleDocument(
  options: CreateArtifactPackExampleDocumentOptions,
): BuiltExampleDocument {
  const definition = EXAMPLES[options.exampleId];
  if (!definition) {
    throw new Error(`Unsupported artifact pack example: ${options.exampleId}`);
  }
  const source = parseJson<unknown>(definition.sourceRaw);
  const media = parseMediaAssets(definition.mediaRaw);
  const compileResult = definition.compile(source, media);
  assertCompiledExampleIsUsable(definition, compileResult);
  const compiled = definition.parseCompiled(compileResult.output.content);
  const validationStatus = validationStatusFromCompile(compileResult);
  const now = options.now ?? Date.now();
  const createId = options.createId ?? defaultCreateId;
  const title = options.title ?? definition.defaultTitle(source, compiled);

  return {
    media,
    spreadsheetRows: definition.manifest.artifactType === 'spreadsheet'
      ? (compiled as CompiledOperatingModelExample).data
      : undefined,
    document: {
      id: options.documentId ?? createId(),
      title,
      description: definition.manifest.description,
      artifactManifest: buildManifest(definition.manifest, source, now, validationStatus),
      artifactSourcePayload: source,
      starterRef: {
        artifactKey: definition.exampleId,
        starterId: definition.manifest.id,
        starterType: definition.manifest.artifactType,
      },
      lifecycleState: 'draft',
      order: options.order ?? 0,
      createdAt: now,
      updatedAt: now,
      ...definition.toDocumentFields(source, compileResult.output.content, compiled),
    },
  };
}

export function createArtifactPackExampleDocument(
  options: CreateArtifactPackExampleDocumentOptions,
): ProjectDocument {
  return buildExampleDocument(options).document;
}

export async function createArtifactPackExampleProject(
  options: CreateArtifactPackExampleProjectOptions,
): Promise<ProjectData> {
  const createId = options.createId ?? defaultCreateId;
  const now = options.now ?? Date.now();
  const built = buildExampleDocument({
    ...options,
    now,
    createId,
  });
  const document = await materializeSpreadsheetRows(built.document, built.spreadsheetRows);
  const { media } = built;

  return {
    id: options.projectId ?? createId(),
    title: options.projectTitle ?? document.title,
    description: document.description,
    visibility: 'private',
    documents: [document],
    activeDocumentId: document.id,
    chatHistory: [],
    memoryTree: createInitialMemoryTree(),
    media,
    projectRules: defaultProjectRules(),
    contextPolicy: defaultContextPolicy(),
    workflowPresets: defaultWorkflowPresets(),
    sections: { drafts: [document.id], main: [], suggestions: [], issues: [] },
    createdAt: now,
    updatedAt: now,
  };
}
