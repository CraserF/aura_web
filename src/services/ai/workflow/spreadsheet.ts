/**
 * Spreadsheet workflow orchestrator — pure business logic with no React deps.
 *
 * Phase 9 keeps spreadsheet execution deterministic, but routes every request
 * through explicit planning and validation before mutating workbook state.
 */

import type { FormulaEntry, QueryViewDefinition, SheetMeta, WorkbookMeta } from '@/types/project';

import { describeTable } from '@/services/data';
import { createDefaultSheet, materializeQueryViewSheet, refreshQueryViewSheets, replaceSheetData } from '@/services/spreadsheet/workbook';
import { executeSheetAction } from '@/services/spreadsheet/actions';
import type {
  SpreadsheetExecutionSummary,
  SpreadsheetPlan,
  SpreadsheetValidationResult,
} from '@/services/spreadsheet/plans';
import { planSpreadsheetWorkflow } from '@/services/ai/workflow/agents/spreadsheet-planner';
import { validateSpreadsheetPlan } from '@/services/ai/workflow/agents/spreadsheet-validator';
import { applySpreadsheetCraftMetadata, attachSpreadsheetRuntimeParts } from '@/services/artifactRuntime/spreadsheetRuntime';
import type { ArtifactRunPlan } from '@/services/artifactRuntime/types';

export interface SpreadsheetInput {
  prompt: string;
  activeWorkbook: WorkbookMeta | null;
  activeDocumentId: string | null;
  projectDocumentCount: number;
  isDefaultSheet: boolean;
  artifactRunPlan?: ArtifactRunPlan;
}

type SpreadsheetBaseResult = {
  plan?: SpreadsheetPlan;
  planSummary?: SpreadsheetExecutionSummary;
  planValidation?: SpreadsheetValidationResult;
};

export type SpreadsheetOutput =
  | (SpreadsheetBaseResult & { kind: 'chart-created'; chartHtml: string; chartType: string; rowCount: number; message: string })
  | (SpreadsheetBaseResult & { kind: 'action-executed'; updatedSheets: SheetMeta[]; refreshedSheetIds?: string[]; message: string })
  | (SpreadsheetBaseResult & { kind: 'formula-column-created'; updatedSheets: SheetMeta[]; refreshedSheetIds?: string[]; message: string })
  | (SpreadsheetBaseResult & { kind: 'query-view-created'; updatedSheets: SheetMeta[]; targetSheetId: string; message: string })
  | (SpreadsheetBaseResult & { kind: 'spreadsheet-created'; workbookTitle: string; sheetName: string; updatedSheets: SheetMeta[]; newActiveSheetIndex: number; shouldRenameDocument: boolean; summary: string })
  | (SpreadsheetBaseResult & { kind: 'sheet-summarized'; message: string })
  | (SpreadsheetBaseResult & { kind: 'clarification-needed'; message: string })
  | (SpreadsheetBaseResult & { kind: 'blocked'; message: string })
  | (SpreadsheetBaseResult & { kind: 'no-intent'; message: string });

function buildPlanSummary(
  plan: SpreadsheetPlan,
  downstreamAugmentationImpact: string[],
  refreshedSheetIds?: string[],
): SpreadsheetExecutionSummary {
  return {
    planKind: plan.kind,
    targetSummary: plan.targets.map((target) => [target.sheetName, target.columnName].filter(Boolean).join(' → ')).filter(Boolean),
    downstreamAugmentationImpact,
    ...(refreshedSheetIds?.length ? { refreshedSheetIds } : {}),
  };
}

function getActiveSheet(workbook: WorkbookMeta | null): SheetMeta | null {
  if (!workbook) return null;
  return workbook.sheets[workbook.activeSheetIndex] ?? null;
}

function applySheetAtIndex(
  workbook: WorkbookMeta,
  sheetIndex: number,
  sheet: SheetMeta,
): SheetMeta[] {
  return workbook.sheets.map((entry, index) => (index === sheetIndex ? sheet : entry));
}

function computeAugmentationImpact(plan: SpreadsheetPlan, refreshedSheetIds?: string[]): string[] {
  const impacts = [];
  if (plan.canAugmentProject) {
    impacts.push('Spreadsheet changes can refresh linked tables, chart sources, and project summaries.');
  } else {
    impacts.push('This spreadsheet request does not change project dependencies.');
  }
  if (refreshedSheetIds?.length) {
    impacts.push(`Refreshed ${refreshedSheetIds.length} derived query view sheet(s).`);
  }
  return impacts;
}

function buildSummaryRow(
  schema: SheetMeta['schema'],
  rows: Array<Record<string, string | number | boolean>>,
): Record<string, string | number | boolean> | null {
  const numericColumns = schema.filter((column) => column.type === 'number');
  if (numericColumns.length === 0 || rows.length < 2) return null;

  const labelColumn = schema.find((column) => column.type === 'text') ?? schema[0];
  const summaryRow: Record<string, string | number | boolean> = {};
  for (const column of schema) {
    if (column.name === labelColumn?.name) {
      summaryRow[column.name] = 'Total';
    } else if (column.type === 'number') {
      summaryRow[column.name] = rows.reduce((sum, row) => {
        const value = row[column.name];
        return sum + (typeof value === 'number' && Number.isFinite(value) ? value : 0);
      }, 0);
    } else {
      summaryRow[column.name] = '';
    }
  }
  return summaryRow;
}

function withSummaryRowWhenUseful(
  schema: SheetMeta['schema'],
  rows: Array<Record<string, string | number | boolean>>,
): Array<Record<string, string | number | boolean>> {
  const summaryRow = buildSummaryRow(schema, rows);
  return summaryRow ? [...rows, summaryRow] : rows;
}

export async function runSpreadsheetWorkflow(input: SpreadsheetInput): Promise<SpreadsheetOutput> {
  const { prompt, activeWorkbook, activeDocumentId, isDefaultSheet } = input;
  const plan = planSpreadsheetWorkflow(input);

  if (!plan) {
    return {
      kind: 'no-intent',
      message: 'I can create new sheets, add computed columns, build query views, chart existing data, and run deterministic workbook actions. Try: "create a budget tracker", "add a margin column as revenue minus cost", "create a query view by region with total revenue", or "sort by Amount descending".',
    };
  }

  if (input.artifactRunPlan) {
    attachSpreadsheetRuntimeParts({
      runPlan: input.artifactRunPlan,
      plan,
    });
  }

  const planValidation = validateSpreadsheetPlan({
    prompt,
    plan,
    workbook: activeWorkbook,
    activeDocumentId,
  });

  if (plan.requiresClarification || planValidation.clarification) {
    return {
      kind: 'clarification-needed',
      message: planValidation.clarification ?? plan.clarification ?? 'I need a bit more detail before I can change the spreadsheet safely.',
      plan,
      planValidation,
      planSummary: buildPlanSummary(plan, computeAugmentationImpact(plan)),
    };
  }

  if (!planValidation.passed) {
    return {
      kind: 'blocked',
      message: planValidation.issues[0]?.message ?? 'This spreadsheet request is blocked until the workbook issues are fixed.',
      plan,
      planValidation,
      planSummary: buildPlanSummary(plan, computeAugmentationImpact(plan)),
    };
  }

  if (plan.kind === 'create-chart-pack') {
    const activeSheet = getActiveSheet(activeWorkbook);
    if (!activeWorkbook || !activeSheet) {
      return {
        kind: 'blocked',
        message: 'I need an active populated sheet before I can create a chart.',
        plan,
        planValidation,
        planSummary: buildPlanSummary(plan, computeAugmentationImpact(plan)),
      };
    }

    const { buildChartSpecFromTable, suggestChartConfig } = await import('@/services/data');
    const tableDesc = await describeTable(activeSheet.tableName);

    if (tableDesc.rowCount === 0) {
      return {
        kind: 'blocked',
        message: 'The sheet has no rows yet. Add some data first, then ask me to create a chart.',
        plan,
        planValidation,
        planSummary: buildPlanSummary(plan, computeAugmentationImpact(plan)),
      };
    }

    const chartConfig = suggestChartConfig(tableDesc);
    if (!chartConfig) {
      return {
        kind: 'blocked',
        message: 'I could not auto-detect chartable columns in this sheet. Use at least one text column and one numeric column.',
        plan,
        planValidation,
        planSummary: buildPlanSummary(plan, computeAugmentationImpact(plan)),
      };
    }

    const { spec } = await buildChartSpecFromTable({
      tableName: activeSheet.tableName,
      sqlFragment: chartConfig.sqlFragment,
      labelColumn: chartConfig.labelColumn,
      valueColumns: chartConfig.valueColumns,
      title: `${activeSheet.name} Chart`,
      sourceDocumentId: activeDocumentId ?? '',
    });

    return {
      kind: 'chart-created',
      chartHtml: `<script type="application/json" data-aura-chart-spec>${JSON.stringify(spec)}</script>\n<div data-aura-chart="${spec.id}" style="width:100%; max-width:720px; aspect-ratio:2; margin:24px auto;"></div>`,
      chartType: spec.type ?? 'chart',
      rowCount: tableDesc.rowCount,
      message: `Created a ${spec.type ?? 'chart'} from "${activeSheet.name}" with ${tableDesc.rowCount} rows.`,
      plan,
      planValidation,
      planSummary: buildPlanSummary(plan, computeAugmentationImpact(plan)),
    };
  }

  if (plan.kind === 'sheet-action') {
    const workbook = activeWorkbook!;
    const activeSheetIndex = workbook.activeSheetIndex;
    const targetSheet = workbook.sheets[activeSheetIndex];
    if (!targetSheet) {
      return {
        kind: 'blocked',
        message: 'The active sheet is unavailable for this workbook action.',
        plan,
        planValidation,
        planSummary: buildPlanSummary(plan, computeAugmentationImpact(plan)),
      };
    }
    const result = await executeSheetAction(plan.action!, targetSheet);
    let updatedSheets = applySheetAtIndex(workbook, activeSheetIndex, {
      ...targetSheet,
      ...(result.updatedSchema ? { schema: result.updatedSchema } : {}),
      ...(Object.prototype.hasOwnProperty.call(result, 'sortState') ? { sortState: result.sortState } : {}),
      ...(Object.prototype.hasOwnProperty.call(result, 'filterState') ? { filterState: result.filterState } : {}),
    });
    const refreshed = await refreshQueryViewSheets(updatedSheets, [targetSheet.id]);
    updatedSheets = applySpreadsheetCraftMetadata(refreshed.sheets, {
      changedSheetIds: [targetSheet.id, ...refreshed.refreshedSheetIds],
    });
    return {
      kind: 'action-executed',
      updatedSheets,
      refreshedSheetIds: refreshed.refreshedSheetIds,
      message: result.userMessage,
      plan,
      planValidation,
      planSummary: buildPlanSummary(plan, computeAugmentationImpact(plan, refreshed.refreshedSheetIds), refreshed.refreshedSheetIds),
    };
  }

  if (plan.kind === 'summarize-sheet') {
    const workbook = activeWorkbook!;
    const targetSheet = workbook.sheets[workbook.activeSheetIndex];
    if (!targetSheet) {
      return {
        kind: 'blocked',
        message: 'The active sheet is unavailable for this summary request.',
        plan,
        planValidation,
        planSummary: buildPlanSummary(plan, computeAugmentationImpact(plan)),
      };
    }
    const result = await executeSheetAction(plan.action!, targetSheet);
    return {
      kind: 'sheet-summarized',
      message: result.userMessage,
      plan,
      planValidation,
      planSummary: buildPlanSummary(plan, computeAugmentationImpact(plan)),
    };
  }

  if (plan.kind === 'create-formula-column') {
    const workbook = activeWorkbook!;
    const activeSheetIndex = workbook.activeSheetIndex;
    const targetSheet = workbook.sheets[activeSheetIndex];
    if (!targetSheet) {
      return {
        kind: 'blocked',
        message: 'The active sheet is unavailable for this formula request.',
        plan,
        planValidation,
        planSummary: buildPlanSummary(plan, computeAugmentationImpact(plan)),
      };
    }
    const formula = plan.formula!;
    const result = await executeSheetAction({
      type: 'addComputedColumn',
      name: formula.outputColumnName,
      expression: formula.expression,
    }, targetSheet);
    const nextFormula: FormulaEntry = {
      id: crypto.randomUUID(),
      column: formula.outputColumnName,
      expression: formula.expression,
      dependsOn: formula.dependsOn,
    };
    let updatedSheets = applySheetAtIndex(workbook, activeSheetIndex, {
      ...targetSheet,
      schema: result.updatedSchema ?? targetSheet.schema,
      formulas: [...targetSheet.formulas, nextFormula],
    });
    const refreshed = await refreshQueryViewSheets(updatedSheets, [targetSheet.id]);
    updatedSheets = applySpreadsheetCraftMetadata(refreshed.sheets, {
      changedSheetIds: [targetSheet.id, ...refreshed.refreshedSheetIds],
    });
    return {
      kind: 'formula-column-created',
      updatedSheets,
      refreshedSheetIds: refreshed.refreshedSheetIds,
      message: `Added computed column "${formula.outputColumnName}" using ${formula.expressionLabel}.`,
      plan,
      planValidation,
      planSummary: buildPlanSummary(plan, computeAugmentationImpact(plan, refreshed.refreshedSheetIds), refreshed.refreshedSheetIds),
    };
  }

  if (plan.kind === 'create-query-view') {
    const workbook = activeWorkbook!;
    const queryView = plan.queryView!;
    const sourceSheet = workbook.sheets.find((sheet) => sheet.id === queryView.sourceSheetId)!;
    if (!sourceSheet) {
      return {
        kind: 'blocked',
        message: `The source sheet "${queryView.sourceSheetName}" is no longer available.`,
        plan,
        planValidation,
        planSummary: buildPlanSummary(plan, computeAugmentationImpact(plan)),
      };
    }
    const existingTarget = workbook.sheets.find((sheet) => (
      sheet.queryView?.sourceSheetId === queryView.sourceSheetId
      && sheet.queryView?.outputSheetName === queryView.outputSheetName
    ) || sheet.name === queryView.outputSheetName);
    const targetSheet = existingTarget ?? createDefaultSheet(queryView.outputSheetName);
    const nextQueryView: QueryViewDefinition = {
      ...queryView,
      generatedAt: Date.now(),
    };
    const schema = await materializeQueryViewSheet(sourceSheet, targetSheet, nextQueryView);
    const nextSheet: SheetMeta = {
      ...targetSheet,
      name: queryView.outputSheetName,
      schema,
      queryView: nextQueryView,
    };
    const updatedSheets = existingTarget
      ? workbook.sheets.map((sheet) => (sheet.id === existingTarget.id ? nextSheet : sheet))
      : [...workbook.sheets, nextSheet];
    const craftedSheets = applySpreadsheetCraftMetadata(updatedSheets, {
      changedSheetIds: [nextSheet.id],
    });

    return {
      kind: 'query-view-created',
      updatedSheets: craftedSheets,
      targetSheetId: nextSheet.id,
      message: `Created query view "${queryView.outputSheetName}" from "${queryView.sourceSheetName}".`,
      plan,
      planValidation,
      planSummary: buildPlanSummary(plan, computeAugmentationImpact(plan)),
    };
  }

  const starterPlan = plan.starterPlan!;
  const existingWorkbook = activeWorkbook;
  const targetSheet = (existingWorkbook && isDefaultSheet)
    ? existingWorkbook.sheets[existingWorkbook.activeSheetIndex] ?? createDefaultSheet(starterPlan.sheetName)
    : createDefaultSheet(starterPlan.sheetName);

  const starterRows = withSummaryRowWhenUseful(starterPlan.schema, starterPlan.rows);
  const appliedSchema = await replaceSheetData(targetSheet, starterPlan.schema, starterRows);
  const nextSheet: SheetMeta = applySpreadsheetCraftMetadata([{
    ...targetSheet,
    name: starterPlan.sheetName,
    schema: appliedSchema,
  }])[0]!;

  let updatedSheets: SheetMeta[];
  let newActiveSheetIndex: number;

  if (existingWorkbook && isDefaultSheet) {
    updatedSheets = existingWorkbook.sheets.map((sheet, index) => (
      index === existingWorkbook.activeSheetIndex ? nextSheet : sheet
    ));
    newActiveSheetIndex = existingWorkbook.activeSheetIndex;
  } else if (existingWorkbook) {
    updatedSheets = [...existingWorkbook.sheets, nextSheet];
    newActiveSheetIndex = updatedSheets.length - 1;
  } else {
    updatedSheets = [nextSheet];
    newActiveSheetIndex = 0;
  }

  return {
    kind: 'spreadsheet-created',
    workbookTitle: starterPlan.workbookTitle,
    sheetName: starterPlan.sheetName,
    updatedSheets,
    newActiveSheetIndex,
    shouldRenameDocument: true,
    summary: starterPlan.chartHint ? `${starterPlan.summary} ${starterPlan.chartHint}` : starterPlan.summary,
    plan,
    planValidation,
    planSummary: buildPlanSummary(plan, computeAugmentationImpact(plan)),
  };
}
