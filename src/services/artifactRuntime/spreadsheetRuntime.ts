import { emitArtifactRunEvent } from '@/services/artifactRuntime/events';
import type { ArtifactPart, ArtifactPartKind, ArtifactRunPlan } from '@/services/artifactRuntime/types';
import type { ArtifactRuntimeTelemetry, EventListener } from '@/services/ai/workflow/types';
import type { SpreadsheetOutput } from '@/services/ai/workflow/spreadsheet';
import type { SpreadsheetPlan } from '@/services/spreadsheet/plans';

export interface AttachSpreadsheetRuntimePartsInput {
  runPlan: ArtifactRunPlan;
  plan: SpreadsheetPlan;
}

export interface AttachSpreadsheetRuntimeResultPartsInput {
  runPlan: ArtifactRunPlan;
  result: SpreadsheetOutput;
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
  const hasOnlyDefaultWorkbookPart =
    input.runPlan.workQueue.length === 1 &&
    input.runPlan.workQueue[0]?.id === 'spreadsheet-part-1';

  if (input.runPlan.workQueue.length > 0 && !hasOnlyDefaultWorkbookPart) {
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

function countChangedSheets(result: SpreadsheetOutput): number {
  return 'updatedSheets' in result ? result.updatedSheets.length : 0;
}

function countRefreshedSheets(result: SpreadsheetOutput): number {
  return 'refreshedSheetIds' in result ? result.refreshedSheetIds?.length ?? 0 : 0;
}

export function emitSpreadsheetRuntimeResultEvents(input: {
  runPlan: ArtifactRunPlan;
  result: SpreadsheetOutput;
  onEvent: EventListener;
}): void {
  const { runPlan, result, onEvent } = input;
  const partId = getPartId(result);
  const message = describeSpreadsheetResult(result);

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
    role: result.kind === 'blocked' || result.kind === 'clarification-needed' ? 'validator' : 'generator',
    message: result.kind === 'blocked' || result.kind === 'clarification-needed'
      ? 'Spreadsheet action blocked.'
      : 'Executing spreadsheet runtime part.',
    partId,
    pct: 82,
  });

  emitArtifactRunEvent(onEvent, {
    runId: runPlan.runId,
    type: result.kind === 'blocked' || result.kind === 'clarification-needed'
      ? 'runtime.cancelled'
      : 'runtime.part-completed',
    role: result.kind === 'blocked' || result.kind === 'clarification-needed' ? 'validator' : 'generator',
    message,
    partId,
    pct: 88,
  });

  emitArtifactRunEvent(onEvent, {
    runId: runPlan.runId,
    type: 'runtime.finalized',
    role: 'finalizer',
    message: 'Spreadsheet runtime summary finalized.',
    partId: 'finalize',
    pct: 100,
  });
}

export function buildSpreadsheetRuntimeTelemetry(input: {
  result: SpreadsheetOutput;
  totalRuntimeMs: number;
  runPlan?: ArtifactRunPlan;
}): ArtifactRuntimeTelemetry {
  const isBlockingKind = ['blocked', 'clarification-needed', 'no-intent'].includes(input.result.kind);
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
  const qualityCheck = {
    id: 'spreadsheet-validation',
    label: 'Spreadsheet deterministic validation',
    passed: validationPassed,
    blockingCount: validationBlockingCount,
    advisoryCount: 0,
  };

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
    qualityPassed: validationPassed,
    qualityBlockingCount: validationBlockingCount,
    qualityAdvisoryCount: 0,
    qualityChecks: [qualityCheck],
    spreadsheetActionKind,
    changedSheetCount,
    refreshedSheetCount,
    validationByPart,
  };
}
