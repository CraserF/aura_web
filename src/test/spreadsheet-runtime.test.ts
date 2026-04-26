import { describe, expect, it } from 'vitest';

import { buildArtifactRunPlan, emitSpreadsheetRuntimeResultEvents } from '@/services/artifactRuntime';
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
  });
});
