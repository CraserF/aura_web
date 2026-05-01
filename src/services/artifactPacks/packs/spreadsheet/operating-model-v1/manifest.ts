import type { ArtifactPack, ArtifactPackManifest } from '@/services/artifactPacks/types';
import {
  compileOperatingModelPack,
  validateOperatingModelCompiledOutput,
  validateOperatingModelSource,
} from './compiler';
import type { OperatingModelSource } from './schemas';
import {
  OPERATING_MODEL_PACK_ID,
  OPERATING_MODEL_PACK_VERSION,
  operatingModelLayoutFamilies,
} from './schemas';

export const OPERATING_MODEL_MANIFEST: ArtifactPackManifest = {
  id: OPERATING_MODEL_PACK_ID,
  version: OPERATING_MODEL_PACK_VERSION,
  label: 'Operating Model',
  description: 'A deterministic workbook pack for input assumptions, calculations, summaries, and dashboard-ready operating metrics.',
  artifactType: 'spreadsheet',
  status: 'draft',
  bestFor: [
    'operating model',
    'finance model',
    'planning workbook',
    'metrics dashboard',
    'forecast workbook',
  ],
  supportedOutputModes: ['xlsx', 'csv'],
  supportedDirections: ['data-utility', 'modern-minimal', 'editorial-magazine'],
  requiredSourceAssets: [],
  optionalSourceAssets: [
    {
      id: 'source-dataset',
      label: 'Source dataset',
      kind: 'dataset',
      purpose: 'Use as the trusted source for input rows rather than inventing operating data.',
      required: false,
      allowedMimeTypes: ['text/csv', 'application/json', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    },
  ],
  layoutFamilies: operatingModelLayoutFamilies,
  contentLimits: {
    minSheets: 2,
    maxSheets: 6,
    maxRowsPerSheet: 80,
  },
  editSurfaces: [
    {
      id: 'create-from-workbook-payload',
      label: 'Create from workbook payload',
      kind: 'create',
      targetKinds: ['artifact'],
      allowedOperations: ['plan-sheets', 'fill-rows', 'define-formulas', 'compile'],
      lockedFields: ['arbitraryFormulaFunctions', 'externalReferences', 'themeBypass', 'rawWorkbookXml'],
      guidance: 'Fill typed sheet/table/formula/chart payloads and compile. The model never writes workbook XML or arbitrary formulas.',
    },
    {
      id: 'add-sheet-from-layout-family',
      label: 'Add sheet from layout family',
      kind: 'add-sheet',
      targetKinds: ['artifact', 'sheet'],
      allowedOperations: ['choose-layout', 'append-sheet', 'fill-schema'],
      lockedFields: ['themeBypass', 'externalReferences', 'rawWorkbookXml'],
      guidance: 'Choose one approved sheet family and validate schema, rows, and formulas before compile.',
    },
    {
      id: 'formula-column-edits',
      label: 'Formula column edits',
      kind: 'formula-edit',
      targetKinds: ['sheet', 'table'],
      allowedOperations: ['replace-formula', 'add-formula-column', 'update-dependencies'],
      lockedFields: ['volatileFunctions', 'externalDataFunctions', 'rawWorkbookXml'],
      guidance: 'Use bounded formula expressions that depend only on declared columns.',
    },
    {
      id: 'restyle-spreadsheet-theme',
      label: 'Restyle spreadsheet theme',
      kind: 'restyle',
      targetKinds: ['artifact'],
      allowedOperations: ['swap-direction', 'swap-token-map'],
      lockedFields: ['sheetData', 'formulas', 'schema', 'charts'],
      guidance: 'Swap spreadsheet theme tokens only. Do not rewrite workbook data.',
    },
  ],
  exportCaveats: [
    'XLSX is the reference output target for this foundation pack.',
    'CSV export can only represent one sheet at a time; preserve workbook metadata for full exports.',
    'Formula support is bounded to declared columns and excludes volatile or external-data functions.',
  ],
  examples: [
    {
      id: 'operating-model-example',
      label: 'Operating Model Example',
      sourcePath: 'examples/source.json',
      compiledPath: 'examples/example.json',
    },
  ],
};

export const OPERATING_MODEL_PACK: ArtifactPack<OperatingModelSource> = {
  manifest: OPERATING_MODEL_MANIFEST,
  compile: compileOperatingModelPack,
  validateSource: validateOperatingModelSource,
  validateCompiledOutput: validateOperatingModelCompiledOutput,
};

export default OPERATING_MODEL_MANIFEST;
