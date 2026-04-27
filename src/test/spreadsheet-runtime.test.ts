import { describe, expect, it } from 'vitest';

import {
  attachSpreadsheetRuntimeParts,
  attachSpreadsheetRuntimeResultParts,
  buildArtifactRunPlan,
  buildSpreadsheetRuntimeTelemetry,
  emitSpreadsheetRuntimeResultEvents,
} from '@/services/artifactRuntime';
import type { SpreadsheetOutput } from '@/services/ai/workflow/spreadsheet';
import type { WorkflowEvent } from '@/services/ai/workflow/types';
import type { SpreadsheetPlan } from '@/services/spreadsheet/plans';

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
      plan: {
        kind: 'create-formula-column',
        targets: [],
        requiresClarification: false,
        canAugmentProject: true,
        formula: {
          outputColumnName: 'Margin',
          expression: 'Revenue - Cost',
          dependsOn: ['Revenue', 'Cost'],
          expressionLabel: 'revenue minus cost',
        },
      },
      planValidation: {
        passed: true,
        issues: [],
      },
    };
    attachSpreadsheetRuntimeParts({
      runPlan,
      plan: result.plan!,
    });
    const events: WorkflowEvent[] = [];

    emitSpreadsheetRuntimeResultEvents({
      runPlan,
      result,
      onEvent: (event) => events.push(event),
    });

    expect(events).toEqual([
      {
        type: 'step-start',
        stepId: 'validation',
        label: 'Checking spreadsheet plan...',
      },
      {
        type: 'step-done',
        stepId: 'validation',
        label: 'Spreadsheet validation completed.',
      },
      {
        type: 'step-update',
        stepId: 'formula',
        label: 'Executing spreadsheet runtime part.',
        status: 'active',
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
    expect(runPlan.workQueue.map((part) => part.kind)).toEqual([
      'formula',
      'validation-result',
      'finalization',
    ]);
    expect(buildSpreadsheetRuntimeTelemetry({ result, totalRuntimeMs: 42, runPlan })).toEqual({
      timeToFirstPreviewMs: 0,
      totalRuntimeMs: 42,
      validationPassed: true,
      validationBlockingCount: 0,
      validationAdvisoryCount: 0,
      repairCount: 0,
      runMode: 'deterministic-action',
      queuedPartCount: 3,
      completedPartCount: 3,
      repairedPartCount: 0,
      qualityPassed: true,
      qualityBlockingCount: 0,
      qualityAdvisoryCount: 0,
      qualityChecks: [{
        id: 'spreadsheet-validation',
        label: 'Spreadsheet deterministic validation',
        passed: true,
        blockingCount: 0,
        advisoryCount: 0,
      }],
      spreadsheetActionKind: 'create-formula-column',
      changedSheetCount: 0,
      refreshedSheetCount: 0,
      validationByPart: [
        {
          partId: 'formula',
          label: 'Formula column: Margin',
          validationPassed: true,
          blockingCount: 0,
          advisoryCount: 0,
          rules: [],
        },
        {
          partId: 'validation',
          label: 'Spreadsheet validation',
          validationPassed: true,
          blockingCount: 0,
          advisoryCount: 0,
          rules: [],
        },
        {
          partId: 'finalize',
          label: 'Spreadsheet finalization',
          validationPassed: true,
          blockingCount: 0,
          advisoryCount: 0,
          rules: [],
        },
      ],
    });
  });

  it.each([
    {
      name: 'workbook action',
      plan: {
        kind: 'sheet-action',
        targets: [],
        requiresClarification: false,
        canAugmentProject: true,
        action: { type: 'sort', column: 'Amount', direction: 'desc' },
      } as SpreadsheetPlan,
      expectedKind: 'workbook-action',
      expectedId: 'workbook-action',
    },
    {
      name: 'formula',
      plan: {
        kind: 'create-formula-column',
        targets: [],
        requiresClarification: false,
        canAugmentProject: true,
        formula: {
          outputColumnName: 'Margin',
          expression: 'Revenue - Cost',
          dependsOn: ['Revenue', 'Cost'],
          expressionLabel: 'revenue minus cost',
        },
      } as SpreadsheetPlan,
      expectedKind: 'formula',
      expectedId: 'formula',
    },
    {
      name: 'query',
      plan: {
        kind: 'create-query-view',
        targets: [],
        requiresClarification: false,
        canAugmentProject: true,
        queryView: {
          sourceSheetId: 'sales',
          sourceSheetName: 'Sales',
          outputSheetName: 'Revenue by Region',
          selectColumns: ['Region'],
          filters: [],
          aggregates: [{ column: 'Revenue', operation: 'sum', alias: 'Total Revenue' }],
        },
      } as SpreadsheetPlan,
      expectedKind: 'query',
      expectedId: 'query',
    },
    {
      name: 'chart',
      plan: {
        kind: 'create-chart-pack',
        targets: [],
        requiresClarification: false,
        canAugmentProject: false,
        chartTarget: {
          sheetId: 'sales',
          sheetName: 'Sales',
        },
      } as SpreadsheetPlan,
      expectedKind: 'chart',
      expectedId: 'chart',
    },
  ])('attaches $name as first-class spreadsheet runtime parts', ({ plan, expectedKind, expectedId }) => {
    const runPlan = buildArtifactRunPlan({
      runId: `${expectedId}-parts-run`,
      prompt: 'Spreadsheet runtime parts',
      artifactType: 'spreadsheet',
      operation: 'action',
      activeDocument: null,
      mode: 'execute',
      providerId: 'openai',
      providerModel: 'gpt-4o',
      allowFullRegeneration: false,
    });

    const parts = attachSpreadsheetRuntimeParts({ runPlan, plan });

    expect(parts.map((part) => part.id)).toEqual([expectedId, 'validation', 'finalize']);
    expect(parts[0]?.kind).toBe(expectedKind);
    expect(runPlan.workQueue).toEqual(parts);
    expect(runPlan.workflow.queuedWorkItems).toHaveLength(1);
    expect(runPlan.workflow.queuedWorkItems[0]?.targetType).toBe('sheet');
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

    expect(events[3]).toEqual({
      type: 'step-update',
      stepId: expectedStepId,
      label: message,
      status: 'done',
    });
  });

  it('records spreadsheet action diagnostics for changed and refreshed sheets', () => {
    const runPlan = buildArtifactRunPlan({
      runId: 'sheet-diagnostics-run',
      prompt: 'Sort the sheet and refresh derived views',
      artifactType: 'spreadsheet',
      operation: 'action',
      activeDocument: null,
      mode: 'execute',
      providerId: 'openai',
      providerModel: 'gpt-4o',
      allowFullRegeneration: false,
    });
    const plan: SpreadsheetPlan = {
      kind: 'sheet-action',
      targets: [],
      requiresClarification: false,
      canAugmentProject: true,
      action: { type: 'sort', column: 'Amount', direction: 'desc' },
    };
    attachSpreadsheetRuntimeParts({ runPlan, plan });
    const result = {
      kind: 'action-executed',
      message: 'Sorted Sheet 1 by Amount descending.',
      updatedSheets: [
        {
          id: 'sheet-1',
          name: 'Sheet 1',
          tableName: 'Sheet 1',
          schema: [],
          frozenRows: 0,
          frozenCols: 0,
          columnWidths: {},
          formulas: [],
        },
      ],
      refreshedSheetIds: ['query-1', 'query-2'],
      plan,
      planValidation: {
        passed: true,
        issues: [],
      },
    } as SpreadsheetOutput;

    expect(buildSpreadsheetRuntimeTelemetry({ result, totalRuntimeMs: 18, runPlan })).toEqual(expect.objectContaining({
      runMode: 'deterministic-action',
      queuedPartCount: 3,
      completedPartCount: 3,
      qualityPassed: true,
      spreadsheetActionKind: 'sheet-action',
      changedSheetCount: 1,
      refreshedSheetCount: 2,
    }));
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

    expect(events[3]).toEqual({
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

    expect(events[1]).toEqual({
      type: 'step-done',
      stepId: 'validation',
      label: 'Spreadsheet validation blocked the requested action.',
    });
    expect(events[3]).toEqual({
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
      runMode: 'deterministic-action',
      queuedPartCount: 1,
      completedPartCount: 1,
      repairedPartCount: 0,
      qualityPassed: false,
      qualityBlockingCount: 0,
      qualityAdvisoryCount: 0,
      qualityChecks: [{
        id: 'spreadsheet-validation',
        label: 'Spreadsheet deterministic validation',
        passed: false,
        blockingCount: 0,
        advisoryCount: 0,
      }],
      spreadsheetActionKind: 'blocked',
      changedSheetCount: 0,
      refreshedSheetCount: 0,
      validationByPart: [{
        partId: 'workbook-action',
        label: 'blocked',
        validationPassed: false,
        blockingCount: 0,
        advisoryCount: 0,
        rules: [],
      }],
    });
  });

  it.each([
    {
      kind: 'clarification-needed' as const,
      message: 'Which column should the formula use?',
      expectedActionKind: 'clarification-needed',
    },
    {
      kind: 'no-intent' as const,
      message: 'Ask me to change, analyze, or create something in the workbook.',
      expectedActionKind: 'no-intent',
    },
  ])('records fallback diagnostics for $kind spreadsheet results without a work queue', ({ kind, message, expectedActionKind }) => {
    const runPlan = buildArtifactRunPlan({
      runId: `${kind}-fallback-run`,
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
        passed: false,
        issues: [{ code: 'missing-intent', message: 'No deterministic spreadsheet action could be selected.' }],
      },
    } as SpreadsheetOutput;

    attachSpreadsheetRuntimeResultParts({
      runPlan,
      result,
    });
    const events: WorkflowEvent[] = [];
    emitSpreadsheetRuntimeResultEvents({
      runPlan,
      result,
      onEvent: (event) => events.push(event),
    });
    const telemetry = buildSpreadsheetRuntimeTelemetry({
      result,
      totalRuntimeMs: 12,
      runPlan,
    });

    expect(telemetry).toEqual(expect.objectContaining({
      runMode: 'deterministic-action',
      queuedPartCount: 3,
      completedPartCount: 1,
      qualityPassed: false,
      spreadsheetActionKind: expectedActionKind,
      changedSheetCount: 0,
      refreshedSheetCount: 0,
    }));
    expect(runPlan.workQueue.map((part) => part.id)).toEqual(['workbook-action', 'validation', 'finalize']);
    expect(runPlan.workflow.queuedWorkItems).toHaveLength(1);
    expect(events.map((event) => `${event.type}:${'stepId' in event ? event.stepId : 'progress'}`)).toEqual([
      'step-start:validation',
      'step-done:validation',
      'step-update:workbook-action',
      'step-error:workbook-action',
      'step-done:finalize',
    ]);
    expect(telemetry.validationByPart).toEqual([
      {
        partId: 'workbook-action',
        label: kind === 'clarification-needed' ? 'Spreadsheet clarification' : 'Spreadsheet action selection',
        validationPassed: false,
        blockingCount: 0,
        advisoryCount: 0,
        rules: [],
      },
      {
        partId: 'validation',
        label: 'Spreadsheet validation',
        validationPassed: false,
        blockingCount: 1,
        advisoryCount: 0,
        rules: ['missing-intent'],
      },
      {
        partId: 'finalize',
        label: 'Spreadsheet finalization',
        validationPassed: false,
        blockingCount: 0,
        advisoryCount: 0,
        rules: [],
      },
    ]);
  });
});
