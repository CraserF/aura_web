import { emitArtifactRunEvent } from '@/services/artifactRuntime/events';
import { formatRuntimeQualityDiagnostics } from '@/services/artifactRuntime/qualityDiagnostics';
import {
  scoreQualitySignal,
  summarizeQualitySignals,
} from '@/services/artifactRuntime/qualityScoring';
import { decideArtifactQualityPolish } from '@/services/artifactRuntime/qualityDecision';
import type { ArtifactPart, ArtifactPartKind, ArtifactRunPlan } from '@/services/artifactRuntime/types';
import type { ArtifactQualitySignalScore } from '@/services/artifactRuntime/types';
import type { ArtifactRuntimeTelemetry, EventListener } from '@/services/ai/workflow/types';
import type { SpreadsheetOutput } from '@/services/ai/workflow/spreadsheet';
import type { SpreadsheetPlan } from '@/services/spreadsheet/plans';
import type { ColumnSchema, SheetMeta } from '@/types/project';

export interface AttachSpreadsheetRuntimePartsInput {
  runPlan: ArtifactRunPlan;
  plan: SpreadsheetPlan;
}

export interface AttachSpreadsheetRuntimeResultPartsInput {
  runPlan: ArtifactRunPlan;
  result: SpreadsheetOutput;
}

export interface FinalizeSpreadsheetRuntimeResultInput {
  runPlan: ArtifactRunPlan;
  result: SpreadsheetOutput;
  totalRuntimeMs: number;
  onEvent: EventListener;
}

export interface FinalizeSpreadsheetRuntimeResultOutput {
  parts: ArtifactPart[];
  runtime: ArtifactRuntimeTelemetry;
  advancedDiagnostics: string[];
}

export interface SpreadsheetCraftSheetOptions {
  changedSheetIds?: string[];
}

function inferColumnFormat(column: ColumnSchema): string | undefined {
  if (column.format) return column.format;
  if (column.type === 'date') return 'yyyy-mm-dd';
  if (column.type === 'boolean') return 'boolean';
  if (column.type !== 'number') return undefined;

  if (/\b(revenue|cost|price|amount|budget|planned|actual|difference|value|sales|spend|deal)\b/i.test(column.name)) {
    return '$#,##0';
  }
  if (/\b(rate|ratio|percent|percentage|margin)\b/i.test(column.name)) {
    return '0.0%';
  }
  return '#,##0';
}

function inferColumnWidth(column: ColumnSchema): number {
  const base = Math.max(12, Math.min(28, column.name.length + 4));
  switch (column.type) {
    case 'number':
      return Math.max(base, 14);
    case 'date':
      return Math.max(base, 16);
    case 'boolean':
      return Math.max(base, 12);
    case 'text':
    default:
      return Math.max(base, /notes?|description|summary|task|company|contact/i.test(column.name) ? 22 : 14);
  }
}

function hasChartableColumns(sheet: SheetMeta): boolean {
  const hasLabel = sheet.schema.some((column) => column.type === 'text' || column.type === 'date');
  const numericCount = sheet.schema.filter((column) => column.type === 'number').length;
  return hasLabel && numericCount > 0;
}

export function applySpreadsheetCraftMetadata(
  sheets: SheetMeta[],
  options: SpreadsheetCraftSheetOptions = {},
): SheetMeta[] {
  const changedIds = new Set(options.changedSheetIds ?? sheets.map((sheet) => sheet.id));
  return sheets.map((sheet) => {
    if (!changedIds.has(sheet.id)) return sheet;

    const schema = sheet.schema.map((column) => ({
      ...column,
      ...(inferColumnFormat(column) ? { format: inferColumnFormat(column) } : {}),
    }));
    const columnWidths = Object.fromEntries(
      schema.map((column) => [
        column.name,
        Math.max(sheet.columnWidths[column.name] ?? 0, inferColumnWidth(column)),
      ]),
    );

    return {
      ...sheet,
      schema,
      frozenRows: Math.max(1, sheet.frozenRows),
      columnWidths,
    };
  });
}

function buildFormattingSummaryForSheets(sheets: SheetMeta[]): string[] {
  return sheets.flatMap((sheet) => {
    const formattedColumns = sheet.schema
      .filter((column) => Boolean(column.format))
      .map((column) => `${column.name} (${column.format})`);
    const lines = [
      sheet.frozenRows > 0 ? `${sheet.name}: frozen header row enabled.` : undefined,
      Object.keys(sheet.columnWidths).length > 0
        ? `${sheet.name}: readable widths set for ${Object.keys(sheet.columnWidths).length} column(s).`
        : undefined,
      formattedColumns.length > 0
        ? `${sheet.name}: number/date formats applied to ${formattedColumns.join(', ')}.`
        : undefined,
    ];
    return lines.filter((line): line is string => Boolean(line));
  });
}

function buildChartSpecSummaryForSheets(sheets: SheetMeta[]): string[] {
  return sheets
    .filter(hasChartableColumns)
    .map((sheet) => {
      const labelColumn = sheet.schema.find((column) => column.type === 'text' || column.type === 'date')?.name ?? 'first label column';
      const valueColumns = sheet.schema
        .filter((column) => column.type === 'number')
        .map((column) => column.name)
        .slice(0, 3);
      const chartType = /month|date|week|quarter|year/i.test(labelColumn) ? 'line' : 'bar';
      return `${sheet.name}: ${chartType} chart spec ready using ${labelColumn} and ${valueColumns.join(', ')}.`;
    });
}

function resolveSpreadsheetRuntimeActionPart(plan: SpreadsheetPlan): ArtifactPart {
  switch (plan.kind) {
    case 'create-formula-column':
      return {
        id: 'formula',
        artifactType: 'spreadsheet',
        kind: 'formula',
        orderIndex: 0,
        title: `Formula column${plan.formula?.outputColumnName ? `: ${plan.formula.outputColumnName}` : ''}`,
        brief: plan.formula
          ? `Create computed column ${plan.formula.outputColumnName} using ${plan.formula.expressionLabel}.`
          : 'Create a deterministic computed formula column.',
        status: 'pending',
      };
    case 'create-query-view':
      return {
        id: 'query',
        artifactType: 'spreadsheet',
        kind: 'query',
        orderIndex: 0,
        title: `Query view${plan.queryView?.outputSheetName ? `: ${plan.queryView.outputSheetName}` : ''}`,
        brief: plan.queryView
          ? `Create query view ${plan.queryView.outputSheetName} from ${plan.queryView.sourceSheetName}.`
          : 'Create a deterministic query view sheet.',
        status: 'pending',
      };
    case 'create-chart-pack':
      return {
        id: 'chart',
        artifactType: 'spreadsheet',
        kind: 'chart',
        orderIndex: 0,
        title: `Chart${plan.chartTarget?.sheetName ? `: ${plan.chartTarget.sheetName}` : ''}`,
        brief: plan.chartTarget
          ? `Create a chart from ${plan.chartTarget.sheetName}.`
          : 'Create a deterministic chart from the active sheet.',
        status: 'pending',
      };
    case 'sheet-action':
    case 'summarize-sheet':
    case 'create-workbook':
    default:
      return {
        id: 'workbook-action',
        artifactType: 'spreadsheet',
        kind: 'workbook-action',
        orderIndex: 0,
        title: plan.kind === 'create-workbook'
          ? 'Workbook creation'
          : plan.kind === 'summarize-sheet'
            ? 'Sheet summary'
            : 'Workbook action',
        brief: plan.action
          ? `Execute ${plan.action.type} on the active workbook.`
          : plan.starterPlan?.summary ?? 'Execute deterministic spreadsheet workbook action.',
        status: 'pending',
      };
  }
}

function buildSpreadsheetRuntimeParts(plan: SpreadsheetPlan): ArtifactPart[] {
  const actionPart = resolveSpreadsheetRuntimeActionPart(plan);
  return [
    actionPart,
    {
      id: 'validation',
      artifactType: 'spreadsheet',
      kind: 'validation-result',
      orderIndex: 1,
      title: 'Spreadsheet validation',
      brief: 'Validate workbook availability, requested targets, and deterministic action safety.',
      status: 'pending',
    },
    {
      id: 'finalize',
      artifactType: 'spreadsheet',
      kind: 'finalization',
      orderIndex: 2,
      title: 'Spreadsheet finalization',
      brief: 'Summarize changed sheets, validation outcome, and downstream refresh impact.',
      status: 'pending',
    },
  ];
}

function buildSpreadsheetFallbackRuntimeParts(result: SpreadsheetOutput): ArtifactPart[] {
  const partId = getPartId(result);
  const message = describeSpreadsheetResult(result);
  return [
    {
      id: partId,
      artifactType: 'spreadsheet',
      kind: 'workbook-action',
      orderIndex: 0,
      title: result.kind === 'clarification-needed'
        ? 'Spreadsheet clarification'
        : result.kind === 'blocked'
          ? 'Spreadsheet blocked action'
          : result.kind === 'no-intent'
            ? 'Spreadsheet action selection'
            : 'Workbook action',
      brief: message,
      status: result.kind === 'blocked' || result.kind === 'clarification-needed' || result.kind === 'no-intent'
        ? 'failed'
        : 'pending',
    },
    {
      id: 'validation',
      artifactType: 'spreadsheet',
      kind: 'validation-result',
      orderIndex: 1,
      title: 'Spreadsheet validation',
      brief: 'Record deterministic spreadsheet validation outcome.',
      status: result.planValidation?.passed === false ? 'failed' : 'done',
    },
    {
      id: 'finalize',
      artifactType: 'spreadsheet',
      kind: 'finalization',
      orderIndex: 2,
      title: 'Spreadsheet finalization',
      brief: 'Summarize the deterministic spreadsheet result.',
      status: 'done',
    },
  ];
}

function toQueuedOperationKind(kind: ArtifactPartKind): 'create' | 'formula' | 'query' | 'refresh' {
  if (kind === 'formula') return 'formula';
  if (kind === 'query') return 'query';
  if (kind === 'chart') return 'create';
  return 'refresh';
}

function hasOnlyDefaultSpreadsheetPart(workQueue: ArtifactPart[]): boolean {
  return workQueue.length === 1 && workQueue[0]?.id === 'spreadsheet-part-1';
}

export function attachSpreadsheetRuntimeParts(input: AttachSpreadsheetRuntimePartsInput): ArtifactPart[] {
  const parts = buildSpreadsheetRuntimeParts(input.plan);
  input.runPlan.workQueue = parts;
  input.runPlan.queueMode = 'sequential';
  input.runPlan.workflow.queueMode = 'sequential';
  input.runPlan.workflow.queuedWorkItems = parts
    .filter((part) => part.kind !== 'validation-result' && part.kind !== 'finalization')
    .map((part) => ({
      id: part.id,
      orderIndex: part.orderIndex,
      targetType: 'sheet',
      targetLabel: part.title,
      operationKind: toQueuedOperationKind(part.kind),
      status: 'pending',
      promptSummary: part.brief,
    }));

  return parts;
}

export function attachSpreadsheetRuntimeResultParts(input: AttachSpreadsheetRuntimeResultPartsInput): ArtifactPart[] {
  if (input.runPlan.workQueue.length > 0 && !hasOnlyDefaultSpreadsheetPart(input.runPlan.workQueue)) {
    return input.runPlan.workQueue;
  }

  if (input.result.plan) {
    return attachSpreadsheetRuntimeParts({
      runPlan: input.runPlan,
      plan: input.result.plan,
    });
  }

  const parts = buildSpreadsheetFallbackRuntimeParts(input.result);
  input.runPlan.workQueue = parts;
  input.runPlan.queueMode = 'sequential';
  input.runPlan.workflow.queueMode = 'sequential';
  input.runPlan.workflow.queuedWorkItems = parts
    .filter((part) => part.kind === 'workbook-action')
    .map((part) => ({
      id: part.id,
      orderIndex: part.orderIndex,
      targetType: 'sheet',
      targetLabel: part.title,
      operationKind: 'refresh',
      status: part.status === 'failed' ? 'blocked' : 'pending',
      promptSummary: part.brief,
    }));

  return parts;
}

function describeSpreadsheetResult(result: SpreadsheetOutput): string {
  switch (result.kind) {
    case 'spreadsheet-created':
      return result.summary;
    case 'action-executed':
    case 'formula-column-created':
    case 'query-view-created':
    case 'chart-created':
    case 'sheet-summarized':
    case 'clarification-needed':
    case 'blocked':
    case 'no-intent':
      return result.message;
  }
}

function getPartId(result: SpreadsheetOutput): string {
  switch (result.kind) {
    case 'formula-column-created':
      return 'formula';
    case 'query-view-created':
      return 'query';
    case 'chart-created':
      return 'chart';
    case 'spreadsheet-created':
    case 'action-executed':
    case 'sheet-summarized':
    case 'clarification-needed':
    case 'blocked':
    case 'no-intent':
      return 'workbook-action';
  }
}

function isBlockingSpreadsheetResultKind(kind: SpreadsheetOutput['kind']): boolean {
  return kind === 'blocked' || kind === 'clarification-needed' || kind === 'no-intent';
}

function resolvePrimarySpreadsheetRuntimePart(
  runPlan: ArtifactRunPlan,
  result: SpreadsheetOutput,
): ArtifactPart {
  const preferredPartId = getPartId(result);
  const workQueue = hasOnlyDefaultSpreadsheetPart(runPlan.workQueue) ? [] : runPlan.workQueue;
  return workQueue.find((part) => part.id === preferredPartId)
    ?? workQueue.find((part) => part.kind !== 'validation-result' && part.kind !== 'finalization')
    ?? buildSpreadsheetFallbackRuntimeParts(result)[0]!;
}

function countChangedSheets(result: SpreadsheetOutput): number {
  return 'updatedSheets' in result ? result.updatedSheets.length : 0;
}

function getChangedSheets(result: SpreadsheetOutput): SheetMeta[] {
  return 'updatedSheets' in result ? result.updatedSheets : [];
}

function countRefreshedSheets(result: SpreadsheetOutput): number {
  return 'refreshedSheetIds' in result ? result.refreshedSheetIds?.length ?? 0 : 0;
}

function buildSpreadsheetFormattingSummary(result: SpreadsheetOutput): string[] {
  const changedSheets = getChangedSheets(result);
  if (changedSheets.length === 0) return [];
  return Array.from(new Set(buildFormattingSummaryForSheets(changedSheets)));
}

function buildSpreadsheetChartSpecSummary(result: SpreadsheetOutput): string[] {
  if (result.kind === 'chart-created') {
    return [`Created ${result.chartType} chart spec from ${result.rowCount} source row(s).`];
  }

  const changedSheets = getChangedSheets(result);
  if (changedSheets.length === 0) return [];
  return Array.from(new Set(buildChartSpecSummaryForSheets(changedSheets)));
}

function buildSpreadsheetDownstreamReady(input: {
  result: SpreadsheetOutput;
  validationPassed: boolean;
  changedSheetCount: number;
  refreshedSheetCount: number;
  chartSpecSummary: string[];
}): boolean {
  if (!input.validationPassed || isBlockingSpreadsheetResultKind(input.result.kind)) return false;
  return (
    input.changedSheetCount > 0 ||
    input.refreshedSheetCount > 0 ||
    input.chartSpecSummary.length > 0 ||
    input.result.kind === 'chart-created' ||
    (input.result.planSummary?.downstreamAugmentationImpact.length ?? 0) > 0
  );
}

function buildValidationSummary(result: SpreadsheetOutput, validationPassed: boolean, validationBlockingCount: number): string {
  if (validationPassed) return 'Validation passed.';
  const issueSummary = result.planValidation?.issues.map((issue) => issue.message).filter(Boolean).join(' ') ?? '';
  return `Validation blocked with ${validationBlockingCount} issue(s).${issueSummary ? ` ${issueSummary}` : ''}`;
}

function buildSpreadsheetRuntimeActionSummary(input: {
  result: SpreadsheetOutput;
  validationPassed: boolean;
  validationBlockingCount: number;
  changedSheetCount: number;
  refreshedSheetCount: number;
  downstreamReady: boolean;
}): string[] {
  const changedSheets = getChangedSheets(input.result).map((sheet) => sheet.name);
  const refreshed = 'refreshedSheetIds' in input.result ? input.result.refreshedSheetIds ?? [] : [];
  return [
    changedSheets.length > 0
      ? `Changed sheets: ${changedSheets.join(', ')}.`
      : 'Changed sheets: none.',
    refreshed.length > 0
      ? `Refreshed derived sheets: ${refreshed.join(', ')}.`
      : `Refreshed derived sheets: ${input.refreshedSheetCount}.`,
    buildValidationSummary(input.result, input.validationPassed, input.validationBlockingCount),
    input.downstreamReady
      ? 'Downstream readiness: ready for linked documents, decks, and chart sources.'
      : 'Downstream readiness: no changed workbook surface is ready for downstream artifacts yet.',
  ];
}

function hasUsefulSpreadsheetFormattingIntent(result: SpreadsheetOutput): boolean {
  return (
    result.kind === 'spreadsheet-created' ||
    result.kind === 'formula-column-created' ||
    result.kind === 'query-view-created' ||
    result.kind === 'chart-created'
  );
}

function buildSpreadsheetQualitySignals(input: {
  result: SpreadsheetOutput;
  validationPassed: boolean;
  validationBlockingCount: number;
  spreadsheetActionKind: string;
  changedSheetCount: number;
  refreshedSheetCount: number;
  formattingSummaryCount: number;
  chartSpecSummaryCount: number;
  downstreamReady: boolean;
}): ArtifactQualitySignalScore[] {
  const targetClarity = input.spreadsheetActionKind !== 'blocked' &&
    input.spreadsheetActionKind !== 'clarification-needed' &&
    input.spreadsheetActionKind !== 'no-intent';
  const changedOrCharted = input.changedSheetCount > 0 || input.result.kind === 'chart-created';
  const planImpactCount = input.result.planSummary?.downstreamAugmentationImpact.length ?? 0;

  return [
    scoreQualitySignal({
      id: 'deterministic-correctness',
      label: 'Deterministic correctness',
      score: input.validationPassed ? 100 : input.validationBlockingCount > 0 ? 25 : 55,
      target: 92,
      detail: input.validationPassed
        ? 'Spreadsheet plan validation passed.'
        : `${input.validationBlockingCount} validation issue(s) remain.`,
    }),
    scoreQualitySignal({
      id: 'target-clarity',
      label: 'Target clarity',
      score: targetClarity ? 90 : 35,
      target: 80,
      detail: `Runtime action kind: ${input.spreadsheetActionKind}.`,
    }),
    scoreQualitySignal({
      id: 'formatting-usefulness',
      label: 'Formatting usefulness',
      score: input.formattingSummaryCount > 0
        ? 92
        : hasUsefulSpreadsheetFormattingIntent(input.result)
          ? 82
          : input.result.kind === 'sheet-summarized'
            ? 70
            : 55,
      target: 72,
      detail: input.formattingSummaryCount > 0
        ? `${input.formattingSummaryCount} deterministic formatting action(s) recorded.`
        : hasUsefulSpreadsheetFormattingIntent(input.result)
          ? 'Workbook output has a structured created/formula/query/chart surface.'
        : 'Workbook action has limited formatting signal.',
    }),
    scoreQualitySignal({
      id: 'downstream-readiness',
      label: 'Downstream readiness',
      score: input.downstreamReady ? 92 : changedOrCharted || input.refreshedSheetCount > 0 || planImpactCount > 0 ? 88 : 62,
      target: 74,
      detail: `${input.changedSheetCount} changed sheet(s), ${input.refreshedSheetCount} refreshed derived sheet(s), ${input.chartSpecSummaryCount} chart-ready spec(s).`,
    }),
  ];
}

export function emitSpreadsheetRuntimeResultEvents(input: {
  runPlan: ArtifactRunPlan;
  result: SpreadsheetOutput;
  onEvent: EventListener;
}): void {
  const { runPlan, result, onEvent } = input;
  const actionPart = resolvePrimarySpreadsheetRuntimePart(runPlan, result);
  const partId = actionPart.id;
  const message = describeSpreadsheetResult(result);
  const isBlockingKind = isBlockingSpreadsheetResultKind(result.kind);
  const validationPassed = result.planValidation?.passed ?? !isBlockingKind;
  const validationBlockingCount = result.planValidation?.issues.length ?? (isBlockingKind ? 1 : 0);
  const changedSheetCount = countChangedSheets(result);
  const refreshedSheetCount = countRefreshedSheets(result);
  const chartSpecSummary = buildSpreadsheetChartSpecSummary(result);
  const downstreamReady = buildSpreadsheetDownstreamReady({
    result,
    validationPassed,
    changedSheetCount,
    refreshedSheetCount,
    chartSpecSummary,
  });
  const actionSummary = buildSpreadsheetRuntimeActionSummary({
    result,
    validationPassed,
    validationBlockingCount,
    changedSheetCount,
    refreshedSheetCount,
    downstreamReady,
  });

  emitArtifactRunEvent(onEvent, {
    runId: runPlan.runId,
    type: 'runtime.validation-started',
    role: 'validator',
    message: 'Checking spreadsheet plan...',
    partId: 'validation',
    pct: 64,
  });

  emitArtifactRunEvent(onEvent, {
    runId: runPlan.runId,
    type: 'runtime.validation-completed',
    role: 'validator',
    message: result.planValidation?.passed === false
      ? 'Spreadsheet validation blocked the requested action.'
      : 'Spreadsheet validation completed.',
    partId: 'validation',
    pct: 76,
  });

  emitArtifactRunEvent(onEvent, {
    runId: runPlan.runId,
    type: 'runtime.part-started',
    role: isBlockingKind ? 'validator' : 'generator',
    message: isBlockingKind
      ? 'Spreadsheet action blocked.'
      : 'Executing spreadsheet runtime part.',
    partId,
    pct: 82,
  });

  emitArtifactRunEvent(onEvent, {
    runId: runPlan.runId,
    type: isBlockingKind
      ? 'runtime.cancelled'
      : 'runtime.part-completed',
    role: isBlockingKind ? 'validator' : 'generator',
    message,
    partId,
    pct: 88,
  });

  emitArtifactRunEvent(onEvent, {
    runId: runPlan.runId,
    type: 'runtime.finalized',
    role: 'finalizer',
    message: `Spreadsheet runtime summary finalized. ${actionSummary.join(' ')}`,
    partId: 'finalize',
    pct: 100,
  });
}

export function buildSpreadsheetRuntimeTelemetry(input: {
  result: SpreadsheetOutput;
  totalRuntimeMs: number;
  runPlan?: ArtifactRunPlan;
}): ArtifactRuntimeTelemetry {
  const isBlockingKind = isBlockingSpreadsheetResultKind(input.result.kind);
  const validationPassed = input.result.planValidation?.passed ?? !isBlockingKind;
  const validationBlockingCount = input.result.planValidation?.issues.length ?? (isBlockingKind ? 1 : 0);
  const workQueue = input.runPlan?.workQueue ?? [];
  const queuedPartCount = workQueue.length || 1;
  const completedPartCount = isBlockingKind ? 1 : queuedPartCount;
  const validationIssueRules = input.result.planValidation?.issues.map((issue) => issue.code) ?? [];
  const spreadsheetActionKind = input.result.plan?.kind ?? input.result.kind;
  const validationByPart = workQueue.length > 0
    ? workQueue.map((part) => ({
        partId: part.id,
        label: part.title,
        validationPassed: part.kind === 'validation-result' ? validationPassed : !isBlockingKind,
        blockingCount: part.kind === 'validation-result' ? validationBlockingCount : 0,
        advisoryCount: 0,
        rules: part.kind === 'validation-result' ? validationIssueRules : [],
      }))
    : [{
        partId: getPartId(input.result),
        label: spreadsheetActionKind,
        validationPassed,
        blockingCount: validationBlockingCount,
        advisoryCount: 0,
        rules: validationIssueRules,
      }];
  const changedSheetCount = countChangedSheets(input.result);
  const refreshedSheetCount = countRefreshedSheets(input.result);
  const spreadsheetFormattingSummary = buildSpreadsheetFormattingSummary(input.result);
  const spreadsheetChartSpecSummary = buildSpreadsheetChartSpecSummary(input.result);
  const spreadsheetDownstreamReady = buildSpreadsheetDownstreamReady({
    result: input.result,
    validationPassed,
    changedSheetCount,
    refreshedSheetCount,
    chartSpecSummary: spreadsheetChartSpecSummary,
  });
  const qualityCheck = {
    id: 'spreadsheet-validation',
    label: 'Spreadsheet deterministic validation',
    passed: validationPassed,
    blockingCount: validationBlockingCount,
    advisoryCount: 0,
  };
  const qualitySignals = input.runPlan?.qualityBar
    ? buildSpreadsheetQualitySignals({
        result: input.result,
        validationPassed,
        validationBlockingCount,
        spreadsheetActionKind,
        changedSheetCount,
        refreshedSheetCount,
        formattingSummaryCount: spreadsheetFormattingSummary.length,
        chartSpecSummaryCount: spreadsheetChartSpecSummary.length,
        downstreamReady: spreadsheetDownstreamReady,
      })
    : undefined;
  const qualitySummary = input.runPlan?.qualityBar && qualitySignals
    ? summarizeQualitySignals(input.runPlan.qualityBar, qualitySignals)
    : undefined;
  const qualityDecision = input.runPlan?.qualityBar
    ? decideArtifactQualityPolish({
        qualityBar: input.runPlan.qualityBar,
        validationPassed,
        validationBlockingCount,
        qualityPassed: qualitySummary?.passed,
        qualityScore: qualitySummary?.score,
        qualityBlockingCount: validationBlockingCount,
        deterministicPolishAvailable: false,
        llmPolishAvailable: false,
      })
    : undefined;
  const spreadsheetCraftCheck = qualitySummary
    ? {
        id: 'spreadsheet-craft',
        label: 'Spreadsheet craft readiness',
        passed: qualitySummary.passed,
        blockingCount: 0,
        advisoryCount: qualitySummary.passed ? 0 : qualitySummary.failedSignalCount || 1,
      }
    : undefined;
  const qualityChecks = spreadsheetCraftCheck
    ? [qualityCheck, spreadsheetCraftCheck]
    : [qualityCheck];
  const craftAdvisoryCount = spreadsheetCraftCheck?.advisoryCount ?? 0;

  return {
    timeToFirstPreviewMs: 0,
    totalRuntimeMs: input.totalRuntimeMs,
    validationPassed,
    validationBlockingCount,
    validationAdvisoryCount: 0,
    repairCount: 0,
    runMode: 'deterministic-action',
    queuedPartCount,
    completedPartCount,
    repairedPartCount: 0,
    qualityPassed: validationPassed && (qualitySummary?.passed ?? true),
    ...(typeof qualitySummary?.score === 'number' ? { qualityScore: qualitySummary.score } : {}),
    ...(qualitySummary?.grade ? { qualityGrade: qualitySummary.grade } : {}),
    qualityBlockingCount: validationBlockingCount,
    qualityAdvisoryCount: craftAdvisoryCount,
    ...(qualitySignals ? { qualitySignals } : {}),
    ...(qualityDecision?.reason || qualitySummary?.polishingSkippedReason
      ? { qualityPolishingSkippedReason: qualityDecision?.reason ?? qualitySummary?.polishingSkippedReason }
      : {}),
    ...(qualityDecision ? { qualityDecision: qualityDecision.status, qualityPolishAction: qualityDecision.action } : {}),
    qualityChecks,
    spreadsheetActionKind,
    changedSheetCount,
    refreshedSheetCount,
    ...(spreadsheetFormattingSummary.length > 0 ? { spreadsheetFormattingSummary } : {}),
    ...(spreadsheetChartSpecSummary.length > 0 ? { spreadsheetChartSpecSummary } : {}),
    spreadsheetDownstreamReady,
    validationByPart,
  };
}

export function finalizeSpreadsheetRuntimeResult(
  input: FinalizeSpreadsheetRuntimeResultInput,
): FinalizeSpreadsheetRuntimeResultOutput {
  const parts = attachSpreadsheetRuntimeResultParts({
    runPlan: input.runPlan,
    result: input.result,
  });
  const runtime = buildSpreadsheetRuntimeTelemetry({
    result: input.result,
    totalRuntimeMs: input.totalRuntimeMs,
    runPlan: input.runPlan,
  });

  emitSpreadsheetRuntimeResultEvents({
    runPlan: input.runPlan,
    result: input.result,
    onEvent: input.onEvent,
  });
  const actionSummary = buildSpreadsheetRuntimeActionSummary({
    result: input.result,
    validationPassed: runtime.validationPassed,
    validationBlockingCount: runtime.validationBlockingCount,
    changedSheetCount: runtime.changedSheetCount ?? 0,
    refreshedSheetCount: runtime.refreshedSheetCount ?? 0,
    downstreamReady: runtime.spreadsheetDownstreamReady ?? false,
  });

  return {
    parts,
    runtime,
    advancedDiagnostics: [
      ...actionSummary,
      ...(runtime.spreadsheetFormattingSummary?.map((line) => `Formatting: ${line}`) ?? []),
      ...(runtime.spreadsheetChartSpecSummary?.map((line) => `Chart spec: ${line}`) ?? []),
      ...formatRuntimeQualityDiagnostics(runtime)
        .map((diagnostic) => diagnostic.message),
    ],
  };
}
