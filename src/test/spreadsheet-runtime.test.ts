import { describe, expect, it } from 'vitest';

import {
  buildArtifactRunPlan,
  buildSpreadsheetRuntimeTelemetry,
  emitSpreadsheetRuntimeResultEvents,
} from '@/services/artifactRuntime';
import type { SpreadsheetOutput } from '@/services/ai/workflow/spreadsheet';
import type { WorkflowEvent } from '@/services/ai/workflow/types';

describe('spreadsheet runtime bridge', () => {
  it('maps deterministic spreadsheet results into runtime workflow events', () => {
    const runPlan = buildArtifactRunPlan({
      runId: 'sheet-run',
      prompt: 'Add a margin formula column',
      artifactType: 'spreadsheet',
      operation: 'action',
      activeDocument: null,
      mode: 'execute',
      providerId: 'openai',
      providerModel: 'gpt-4o',
      allowFullRegeneration: false,
    });
    const result: SpreadsheetOutput = {
      kind: 'formula-column-created',
      updatedSheets: [],
      message: 'Added computed column "Margin" using revenue minus cost.',
      planValidation: {
        passed: true,
        issues: [],
      },
    };
    const events: WorkflowEvent[] = [];

    emitSpreadsheetRuntimeResultEvents({
      runPlan,
      result,
      onEvent: (event) => events.push(event),
    });

    expect(events).toEqual([
      {
        type: 'step-done',
        stepId: 'validation',
        label: 'Spreadsheet validation completed.',
      },
      {
        type: 'step-update',
        stepId: 'formula',
        label: 'Added computed column "Margin" using revenue minus cost.',
        status: 'done',
      },
      {
        type: 'step-done',
        stepId: 'finalize',
        label: 'Spreadsheet runtime summary finalized.',
      },
    ]);
    expect(buildSpreadsheetRuntimeTelemetry({ result, totalRuntimeMs: 42 })).toEqual({
      timeToFirstPreviewMs: 0,
      totalRuntimeMs: 42,
      validationPassed: true,
      validationBlockingCount: 0,
      validationAdvisoryCount: 0,
      repairCount: 0,
    });
  });

  it.each([
    {
      kind: 'action-executed' as const,
      expectedStepId: 'workbook-action',
      message: 'Sorted Sheet 1 by Amount descending.',
      extra: { updatedSheets: [] },
    },
    {
      kind: 'query-view-created' as const,
      expectedStepId: 'query',
      message: 'Created query view "Revenue by Region" from "Sales".',
      extra: { updatedSheets: [], targetSheetId: 'sheet-query' },
    },
    {
      kind: 'chart-created' as const,
      expectedStepId: 'chart',
      message: 'Created a bar chart from "Sales" with 12 rows.',
      extra: { chartHtml: '<div data-aura-chart="chart-1"></div>', chartType: 'bar', rowCount: 12 },
    },
  ])('maps $kind spreadsheet results to the expected runtime part', ({ kind, expectedStepId, message, extra }) => {
    const runPlan = buildArtifactRunPlan({
      runId: `${kind}-run`,
      prompt: message,
      artifactType: 'spreadsheet',
      operation: 'action',
      activeDocument: null,
      mode: 'execute',
      providerId: 'openai',
      providerModel: 'gpt-4o',
      allowFullRegeneration: false,
    });
    const result = {
      kind,
      message,
      planValidation: {
        passed: true,
        issues: [],
      },
      ...extra,
    } as SpreadsheetOutput;
    const events: WorkflowEvent[] = [];

    emitSpreadsheetRuntimeResultEvents({
      runPlan,
      result,
      onEvent: (event) => events.push(event),
    });

    expect(events[1]).toEqual({
      type: 'step-update',
      stepId: expectedStepId,
      label: message,
      status: 'done',
    });
  });

  it('maps clarification results into runtime cancellation events', () => {
    const runPlan = buildArtifactRunPlan({
      runId: 'clarify-sheet-run',
      prompt: 'Add a formula',
      artifactType: 'spreadsheet',
      operation: 'action',
      activeDocument: null,
      mode: 'execute',
      providerId: 'openai',
      providerModel: 'gpt-4o',
      allowFullRegeneration: false,
    });
    const result: SpreadsheetOutput = {
      kind: 'clarification-needed',
      message: 'Which column should the formula use?',
      planValidation: {
        passed: false,
        issues: [],
      },
    };
    const events: WorkflowEvent[] = [];

    emitSpreadsheetRuntimeResultEvents({
      runPlan,
      result,
      onEvent: (event) => events.push(event),
    });

    expect(events[1]).toEqual({
      type: 'step-error',
      stepId: 'workbook-action',
      error: 'Which column should the formula use?',
    });
  });

  it('maps blocked spreadsheet results into runtime cancellation events', () => {
    const runPlan = buildArtifactRunPlan({
      runId: 'blocked-sheet-run',
      prompt: 'Create a chart',
      artifactType: 'spreadsheet',
      operation: 'action',
      activeDocument: null,
      mode: 'execute',
      providerId: 'openai',
      providerModel: 'gpt-4o',
      allowFullRegeneration: false,
    });
    const result: SpreadsheetOutput = {
      kind: 'blocked',
      message: 'I need an active populated sheet before I can create a chart.',
      planValidation: {
        passed: false,
        issues: [],
      },
    };
    const events: WorkflowEvent[] = [];

    emitSpreadsheetRuntimeResultEvents({
      runPlan,
      result,
      onEvent: (event) => events.push(event),
    });

    expect(events[0]).toEqual({
      type: 'step-done',
      stepId: 'validation',
      label: 'Spreadsheet validation blocked the requested action.',
    });
    expect(events[1]).toEqual({
      type: 'step-error',
      stepId: 'workbook-action',
      error: 'I need an active populated sheet before I can create a chart.',
    });
    expect(buildSpreadsheetRuntimeTelemetry({ result, totalRuntimeMs: 9 })).toEqual({
      timeToFirstPreviewMs: 0,
      totalRuntimeMs: 9,
      validationPassed: false,
      validationBlockingCount: 0,
      validationAdvisoryCount: 0,
      repairCount: 0,
    });
  });
});
