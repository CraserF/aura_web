import { emitArtifactRunEvent } from '@/services/artifactRuntime/events';
import type { ArtifactRunPlan } from '@/services/artifactRuntime/types';
import type { ArtifactRuntimeTelemetry, EventListener } from '@/services/ai/workflow/types';
import type { SpreadsheetOutput } from '@/services/ai/workflow/spreadsheet';

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
}): ArtifactRuntimeTelemetry {
  const isBlockingKind = ['blocked', 'clarification-needed', 'no-intent'].includes(input.result.kind);
  const validationPassed = input.result.planValidation?.passed ?? !isBlockingKind;

  return {
    timeToFirstPreviewMs: 0,
    totalRuntimeMs: input.totalRuntimeMs,
    validationPassed,
    validationBlockingCount: input.result.planValidation?.issues.length ?? (isBlockingKind ? 1 : 0),
    validationAdvisoryCount: 0,
    repairCount: 0,
  };
}
