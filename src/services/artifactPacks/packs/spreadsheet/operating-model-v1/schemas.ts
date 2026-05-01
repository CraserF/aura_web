import { z } from 'zod';

export const OPERATING_MODEL_PACK_ID = 'spreadsheet/operating-model-v1';
export const OPERATING_MODEL_PACK_VERSION = '1.0.0';

export const operatingModelDirectionIds = [
  'data-utility',
  'modern-minimal',
  'editorial-magazine',
] as const;

export const operatingModelSheetRoles = [
  'inputs',
  'model',
  'summary',
  'dashboard',
  'assumptions',
] as const;

export const operatingModelLayoutFamilies = [
  'input-table',
  'calculation-table',
  'summary-table',
  'dashboard-view',
  'assumptions-register',
] as const;

const plainText = z
  .string()
  .trim()
  .refine((value) => !/[<>]/.test(value), 'Spreadsheet pack text fields must be plain text, not HTML.');

const identifier = plainText.min(1).max(80).refine(
  (value) => /^[A-Za-z][A-Za-z0-9 _-]*$/.test(value),
  'Use readable spreadsheet identifiers without formulas or symbols.',
);

const spreadsheetTextCellSchema = z
  .string()
  .max(280)
  .refine(
    (value) => !/^\s*[=+\-@]/.test(value),
    'Spreadsheet text cells must not begin with formula-control characters.',
  );

const cellValueSchema = z.union([spreadsheetTextCellSchema, z.number(), z.boolean(), z.null()]);

export const operatingModelColumnSchema = z
  .object({
    name: identifier,
    type: z.enum(['text', 'number', 'date', 'boolean']),
    nullable: z.boolean().default(true),
    role: z.enum(['source', 'input', 'generated', 'calculation', 'output']).default('input'),
    width: z.number().int().min(80).max(260).optional(),
  })
  .strict();

export const operatingModelFormulaSchema = z
  .object({
    id: z.string().min(1).max(80),
    column: identifier,
    expression: plainText.min(1).max(260),
    dependsOn: z.array(identifier).min(1).max(8),
    label: plainText.max(120).optional(),
  })
  .strict();

export const operatingModelChartSchema = z
  .object({
    id: z.string().min(1).max(80),
    title: plainText.min(1).max(120),
    type: z.enum(['bar', 'line', 'area', 'column']),
    sourceSheetId: z.string().min(1).max(80),
    xColumn: identifier,
    yColumns: z.array(identifier).min(1).max(4),
  })
  .strict();

export const operatingModelSheetSchema = z
  .object({
    sheetId: z.string().min(1).max(80),
    name: plainText.min(1).max(60),
    role: z.enum(operatingModelSheetRoles),
    layoutFamily: z.enum(operatingModelLayoutFamilies),
    tableName: z.string().min(1).max(80).regex(/^[a-z][a-z0-9_]*$/),
    frozenRows: z.number().int().min(0).max(5).default(1),
    frozenCols: z.number().int().min(0).max(3).default(0),
    columns: z.array(operatingModelColumnSchema).min(2).max(18),
    rows: z.array(z.record(z.string(), cellValueSchema)).min(1).max(80),
    formulas: z.array(operatingModelFormulaSchema).default([]),
    charts: z.array(operatingModelChartSchema).default([]),
    sourceNotes: z.array(plainText.max(220)).max(8).default([]),
  })
  .strict();

export const operatingModelSourceSchema = z
  .object({
    schemaVersion: z.literal(1),
    artifactType: z.literal('spreadsheet'),
    packId: z.literal(OPERATING_MODEL_PACK_ID),
    packVersion: z.literal(OPERATING_MODEL_PACK_VERSION),
    title: plainText.min(1).max(120),
    audience: plainText.min(1).max(140),
    directionId: z.enum(operatingModelDirectionIds),
    outputMode: z.enum(['xlsx', 'csv']),
    brief: plainText.min(1).max(1200),
    sheets: z.array(operatingModelSheetSchema).min(2).max(6),
  })
  .strict();

export type OperatingModelColumn = z.infer<typeof operatingModelColumnSchema>;
export type OperatingModelFormula = z.infer<typeof operatingModelFormulaSchema>;
export type OperatingModelChart = z.infer<typeof operatingModelChartSchema>;
export type OperatingModelSheet = z.infer<typeof operatingModelSheetSchema>;
export type OperatingModelSource = z.infer<typeof operatingModelSourceSchema>;
export type OperatingModelDirectionId = typeof operatingModelDirectionIds[number];
export type OperatingModelSheetRole = typeof operatingModelSheetRoles[number];
export type OperatingModelLayoutFamily = typeof operatingModelLayoutFamilies[number];
