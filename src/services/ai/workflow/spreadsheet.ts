/**
 * Spreadsheet workflow orchestrator — pure business logic with no React deps.
 *
 * Given typed inputs, runs one of three sub-paths and returns a typed result.
 * The handler (spreadsheetHandler.ts) applies the result to the React store.
 *
 * Three sub-paths (tried in order):
 *   1. Chart-from-spreadsheet  — user asks to visualize existing sheet data
 *   2. Sheet action             — deterministic operations (sort, filter, add col, etc.)
 *   3. Spreadsheet creation     — create/populate a sheet from a natural-language prompt
 */

import type { SheetMeta, WorkbookMeta } from '@/types/project';
import { canCreateSpreadsheetFromPrompt, planSpreadsheetStarter } from '@/services/spreadsheet/starter';
import { createDefaultSheet, replaceSheetData } from '@/services/spreadsheet/workbook';
import { detectSheetAction, executeSheetAction } from '@/services/spreadsheet/actions';

const CHART_INTENT_RE = /\b(chart|graph|visuali[sz]e|plot|diagram)\b/i;

export interface SpreadsheetInput {
  prompt: string;
  activeWorkbook: WorkbookMeta | null;
  activeDocumentId: string | null;
  projectDocumentCount: number;
  isDefaultSheet: boolean;
}

export type SpreadsheetOutput =
  | { kind: 'chart-created'; chartHtml: string; chartType: string; rowCount: number; message: string }
  | { kind: 'action-executed'; updatedSheets: SheetMeta[]; message: string }
  | { kind: 'spreadsheet-created'; workbookTitle: string; sheetName: string; updatedSheets: SheetMeta[]; newActiveSheetIndex: number; shouldRenameDocument: boolean; summary: string }
  | { kind: 'no-intent'; message: string };

export async function runSpreadsheetWorkflow(input: SpreadsheetInput): Promise<SpreadsheetOutput> {
  const { prompt, activeWorkbook, isDefaultSheet } = input;
  const isChartIntent = CHART_INTENT_RE.test(prompt);
  const activeSheetIsPopulated = !!activeWorkbook && !isDefaultSheet;

  // ─── 1. Chart-from-spreadsheet ──────────────────────────────────────────────
  if (isChartIntent && activeSheetIsPopulated && activeWorkbook) {
    const sheet = activeWorkbook.sheets[activeWorkbook.activeSheetIndex];
    if (!sheet) throw new Error('No active sheet found.');

    const { describeTable, buildChartSpecFromTable, suggestChartConfig } = await import('@/services/data');
    const tableDesc = await describeTable(sheet.tableName);

    if (tableDesc.rowCount === 0) {
      return {
        kind: 'no-intent',
        message: 'The sheet has no rows yet. Add some data first, then ask me to create a chart.',
      };
    }

    const chartConfig = suggestChartConfig(tableDesc);
    if (!chartConfig) {
      return {
        kind: 'no-intent',
        message: 'I couldn\'t auto-detect chartable columns in this sheet. Ensure you have at least one text column (for labels) and one numeric column (for values).',
      };
    }

    const { spec } = await buildChartSpecFromTable({
      tableName: sheet.tableName,
      sqlFragment: chartConfig.sqlFragment,
      labelColumn: chartConfig.labelColumn,
      valueColumns: chartConfig.valueColumns,
      title: `${sheet.name} Chart`,
      sourceDocumentId: input.activeDocumentId ?? '',
    });

    const chartHtml = `<script type="application/json" data-aura-chart-spec>${JSON.stringify(spec)}<\/script>\n<div data-aura-chart="${spec.id}" style="width:100%; max-width:720px; aspect-ratio:2; margin:24px auto;"></div>`;
    return {
      kind: 'chart-created',
      chartHtml,
      chartType: spec.type ?? 'chart',
      rowCount: tableDesc.rowCount,
      message: `Created a ${spec.type ?? 'chart'} from "${sheet.name}" with ${tableDesc.rowCount} rows.`,
    };
  }

  // ─── 2. Sheet action (sort / filter / add-col / rename / remove) ─────────────
  if (activeSheetIsPopulated && activeWorkbook) {
    const sheet = activeWorkbook.sheets[activeWorkbook.activeSheetIndex];
    if (sheet) {
      const detectedAction = detectSheetAction(prompt, sheet.schema);
      if (detectedAction) {
        const result = await executeSheetAction(detectedAction, sheet);
        const updatedSheets = activeWorkbook.sheets.map((s, i) => {
          if (i !== activeWorkbook.activeSheetIndex) return s;
          return {
            ...s,
            ...(result.updatedSchema ? { schema: result.updatedSchema } : {}),
            ...(Object.prototype.hasOwnProperty.call(result, 'sortState') ? { sortState: result.sortState } : {}),
            ...(Object.prototype.hasOwnProperty.call(result, 'filterState') ? { filterState: result.filterState } : {}),
          };
        });
        return { kind: 'action-executed', updatedSheets, message: result.userMessage };
      }
    }
  }

  // ─── 3. Spreadsheet creation ──────────────────────────────────────────────────
  if (!canCreateSpreadsheetFromPrompt(prompt)) {
    return {
      kind: 'no-intent',
      message: 'I can create new sheets and seed them with data. Try: "create a budget tracker", "make a sales table with sample data", or "design a table with columns name, amount, status". To chart existing data, try "graph this" or "create a chart". Or try editing your active sheet: "sort by Amount", "add a column called Notes", "rename Status to Stage", "remove the Notes column", "filter where country = France".',
    };
  }

  const plan = planSpreadsheetStarter(prompt);
  const existingWorkbook = activeWorkbook;

  const targetSheet = (existingWorkbook && isDefaultSheet)
    ? existingWorkbook.sheets[existingWorkbook.activeSheetIndex] ?? createDefaultSheet(plan.sheetName)
    : createDefaultSheet(plan.sheetName);

  if (!targetSheet) throw new Error('Spreadsheet sheet is unavailable.');

  const appliedSchema = await replaceSheetData(targetSheet, plan.schema, plan.rows);
  const nextSheet: SheetMeta = { ...targetSheet, name: plan.sheetName, schema: appliedSchema };

  let updatedSheets: SheetMeta[];
  let newActiveSheetIndex: number;

  if (existingWorkbook && isDefaultSheet) {
    // Reuse the existing default sheet
    updatedSheets = existingWorkbook.sheets.map((s, i) =>
      i === existingWorkbook.activeSheetIndex ? nextSheet : s,
    );
    newActiveSheetIndex = existingWorkbook.activeSheetIndex;
  } else if (existingWorkbook) {
    // Append a new sheet to the existing workbook
    updatedSheets = [...existingWorkbook.sheets, nextSheet];
    newActiveSheetIndex = updatedSheets.length - 1;
  } else {
    // Brand new workbook
    updatedSheets = [nextSheet];
    newActiveSheetIndex = 0;
  }

  return {
    kind: 'spreadsheet-created',
    workbookTitle: plan.workbookTitle,
    sheetName: plan.sheetName,
    updatedSheets,
    newActiveSheetIndex,
    shouldRenameDocument: true,
    summary: plan.chartHint ? `${plan.summary} ${plan.chartHint}` : plan.summary,
  };
}
