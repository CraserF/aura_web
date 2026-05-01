import type {
  ArtifactCompiledOutput,
  ArtifactOutputMode,
  ArtifactPackCompileResult,
  ArtifactStructurePlan,
  DesignContextSpec,
  ProjectDesignTokenAdapter,
} from '@/services/artifactPacks/types';
import type { ColumnSchema, SheetMeta } from '@/types/project';
import {
  OPERATING_MODEL_PACK_ID,
  operatingModelSourceSchema,
  type OperatingModelColumn,
  type OperatingModelSource,
} from './schemas';
import {
  validateOperatingModelCompiledOutput,
  validateOperatingModelSource,
} from './validator';
import { evaluateOperatingModelFormulaExpression } from './formula';

export interface OperatingModelSpreadsheetTheme {
  target: 'spreadsheet-theme';
  roles: {
    workbookBackground: string;
    sheetTab: string;
    headerFill: string;
    headerText: string;
    gridLine: string;
    inputFill: string;
    generatedFill: string;
    outputFill: string;
    positive: string;
    warning: string;
    negative: string;
  };
  chartPalette: readonly string[];
}

export const OPERATING_MODEL_PROJECT_DESIGN_ADAPTER: ProjectDesignTokenAdapter<Partial<OperatingModelSpreadsheetTheme['roles']>> = {
  id: `${OPERATING_MODEL_PACK_ID}/spreadsheet-theme-adapter`,
  artifactType: 'spreadsheet',
  target: 'spreadsheet-theme',
  supportedColorRoles: [
    'canvas',
    'surface',
    'raisedSurface',
    'text',
    'mutedText',
    'border',
    'accent',
    'accentText',
    'subtleFill',
    'positive',
    'warning',
    'negative',
  ],
  mapColorOverrides: (overrides) => {
    const roleByToken: Record<string, keyof OperatingModelSpreadsheetTheme['roles']> = {
      canvas: 'workbookBackground',
      surface: 'headerFill',
      raisedSurface: 'sheetTab',
      text: 'headerText',
      mutedText: 'gridLine',
      border: 'gridLine',
      accent: 'sheetTab',
      accentText: 'headerText',
      subtleFill: 'inputFill',
      positive: 'positive',
      warning: 'warning',
      negative: 'negative',
    };

    return Object.fromEntries(
      overrides
        .filter((override) => OPERATING_MODEL_PROJECT_DESIGN_ADAPTER.supportedColorRoles.includes(override.role))
        .filter((override) => /^#[0-9a-f]{6}$/i.test(override.value))
        .map((override) => [roleByToken[override.role], override.value.toLowerCase()]),
    );
  },
};

export interface OperatingModelCompileInput {
  source: OperatingModelSource;
  structure?: ArtifactStructurePlan;
  designContext?: DesignContextSpec;
  outputMode?: ArtifactOutputMode;
}

const columnToSchema = (column: OperatingModelColumn): ColumnSchema => ({
  name: column.name,
  type: column.type,
  nullable: column.nullable,
});

const columnWidths = (columns: readonly OperatingModelColumn[]): Record<string, number> =>
  Object.fromEntries(columns.map((column) => [column.name, column.width ?? 140]));

const buildTheme = (designContext: DesignContextSpec | undefined): OperatingModelSpreadsheetTheme => {
  const tokens = designContext?.tokens;
  const base: OperatingModelSpreadsheetTheme = {
    target: 'spreadsheet-theme',
    roles: {
      workbookBackground: tokens?.colors.canvas ?? '#f7f9fb',
      sheetTab: tokens?.colors.accent ?? '#0f766e',
      headerFill: tokens?.table.headerFill ?? '#e2eaf2',
      headerText: tokens?.colors.text ?? '#132033',
      gridLine: tokens?.table.gridLine ?? '#cbd7e3',
      inputFill: tokens?.colors.surface ?? '#ffffff',
      generatedFill: tokens?.colors.subtleFill ?? '#eef4f7',
      outputFill: tokens?.table.emphasisFill ?? '#eef4f7',
      positive: tokens?.colors.positive ?? '#15803d',
      warning: tokens?.colors.warning ?? '#b45309',
      negative: tokens?.colors.negative ?? '#b91c1c',
    },
    chartPalette: tokens?.chartPalette ?? ['#0f766e', '#1d4ed8', '#7c2d12', '#6d28d9', '#475569'],
  };
  const projectOverrides = OPERATING_MODEL_PROJECT_DESIGN_ADAPTER.mapColorOverrides(
    designContext?.projectDesignSystem?.colorOverrides ?? [],
  );
  return {
    ...base,
    roles: {
      ...base.roles,
      ...projectOverrides,
    },
  };
};

const toWorkbookSheets = (source: OperatingModelSource): SheetMeta[] =>
  source.sheets.map((sheet): SheetMeta => ({
    id: sheet.sheetId,
    name: sheet.name,
    tableName: sheet.tableName,
    schema: sheet.columns.map(columnToSchema),
    frozenRows: sheet.frozenRows,
    frozenCols: sheet.frozenCols,
    columnWidths: columnWidths(sheet.columns),
    formulas: sheet.formulas.map((formula) => ({
      id: formula.id,
      column: formula.column,
      expression: formula.expression,
      dependsOn: [...formula.dependsOn],
    })),
  }));

const materializeSheetRows = (sheet: OperatingModelSource['sheets'][number]) =>
  sheet.rows.map((row) => {
    const nextRow = { ...row };
    for (const formula of sheet.formulas) {
      const evaluation = evaluateOperatingModelFormulaExpression(formula.expression, nextRow);
      nextRow[formula.column] = evaluation.unsupported ? null : evaluation.value ?? null;
    }
    return nextRow;
  });

export const compileOperatingModelWorkbook = (
  source: OperatingModelSource,
  designContext?: DesignContextSpec,
) => ({
  schemaVersion: 1,
  packId: OPERATING_MODEL_PACK_ID,
  packVersion: source.packVersion,
  title: source.title,
  directionId: source.directionId,
  workbook: {
    activeSheetIndex: 0,
    sheets: toWorkbookSheets(source),
  },
  data: Object.fromEntries(source.sheets.map((sheet) => [sheet.sheetId, materializeSheetRows(sheet)])),
  formatting: Object.fromEntries(source.sheets.map((sheet) => [
    sheet.sheetId,
    {
      role: sheet.role,
      layoutFamily: sheet.layoutFamily,
      sourceNotes: sheet.sourceNotes,
      generatedColumns: sheet.columns
        .filter((column) => column.role === 'generated' || column.role === 'calculation' || column.role === 'output')
        .map((column) => column.name),
    },
  ])),
  charts: source.sheets.flatMap((sheet) => sheet.charts),
  theme: buildTheme(designContext),
});

const mergeReports = (...reports: ArtifactPackCompileResult['validation'][]): ArtifactPackCompileResult['validation'] => {
  const findings = reports.flatMap((report) => [...report.findings]);
  const blockingCount = findings.filter((finding) => finding.severity === 'blocking').length;
  const advisoryCount = findings.filter((finding) => finding.severity === 'advisory').length;
  return {
    passed: blockingCount === 0,
    blockingCount,
    advisoryCount,
    findings,
  };
};

export const compileOperatingModelPack = (
  input: OperatingModelCompileInput,
): ArtifactPackCompileResult => {
  const sourceValidation = validateOperatingModelSource(input.source);
  const parsedSource = operatingModelSourceSchema.safeParse(input.source);
  const source = parsedSource.success ? parsedSource.data : input.source;
  const content = JSON.stringify(compileOperatingModelWorkbook(source, input.designContext), null, 2);
  const output: ArtifactCompiledOutput = {
    mode: input.outputMode ?? source.outputMode,
    content,
    assets: [],
    generatedAt: Date.now(),
  };
  const compiledValidation = validateOperatingModelCompiledOutput(output);
  return {
    output,
    validation: mergeReports(sourceValidation, compiledValidation),
  };
};

export { validateOperatingModelCompiledOutput, validateOperatingModelSource };
