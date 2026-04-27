import { describe, expect, it } from 'vitest';
import type { WorkflowStep } from '@/types';
import {
  humanizeWorkflowStepId,
  upsertWorkflowStepStatus,
  workflowStepUpdateFromRuntimeEvent,
} from '@/services/chat/workflowProgress';

function seededPresentationSteps(): WorkflowStep[] {
  return [
    { id: 'plan', label: 'Planning', status: 'done' },
    { id: 'design', label: 'Creating slides', status: 'active' },
    { id: 'evaluate', label: 'Checking quality', status: 'pending' },
    { id: 'finalize', label: 'Finishing', status: 'pending' },
  ];
}

describe('workflow progress helpers', () => {
  it('materializes slide-specific runtime repair progress before deck evaluation', () => {
    const steps = upsertWorkflowStepStatus(
      seededPresentationSteps(),
      'slide-1',
      'active',
      'Repairing slide 1 fragment.',
    );

    expect(steps.map((step) => step.id)).toEqual([
      'plan',
      'design',
      'slide-1',
      'evaluate',
      'finalize',
    ]);
    expect(steps.find((step) => step.id === 'slide-1')).toMatchObject({
      label: 'Repairing slide 1 fragment.',
      status: 'active',
    });
  });

  it('keeps repaired slide labels visible when runtime completion arrives', () => {
    const activeSteps = upsertWorkflowStepStatus(
      seededPresentationSteps(),
      'slide-1',
      'active',
      'Repairing slide 1 fragment.',
    );
    const completedSteps = upsertWorkflowStepStatus(
      activeSteps,
      'slide-1',
      'done',
      'Repaired slide 1 fragment.',
    );

    expect(completedSteps.find((step) => step.id === 'slide-1')).toMatchObject({
      label: 'Repaired slide 1 fragment.',
      status: 'done',
    });
    expect(completedSteps.filter((step) => step.id === 'slide-1')).toHaveLength(1);
  });

  it('humanizes dynamic runtime step ids when no label is provided', () => {
    expect(humanizeWorkflowStepId('slide-12')).toBe('Slide 12');
    expect(humanizeWorkflowStepId('document-module-2')).toBe('Document module 2');
    expect(humanizeWorkflowStepId('formula')).toBe('Formula');
    expect(humanizeWorkflowStepId('query')).toBe('Query');
    expect(humanizeWorkflowStepId('chart')).toBe('Chart');
    expect(humanizeWorkflowStepId('runtime-repair-started')).toBe('Runtime Repair Started');
  });

  it('materializes runtime part events into stable spreadsheet progress labels', () => {
    const update = workflowStepUpdateFromRuntimeEvent({
      type: 'progress',
      message: 'Executing spreadsheet runtime part.',
      pct: 82,
      partId: 'formula',
      runId: 'sheet-run',
    });
    expect(update).toEqual({
      stepId: 'formula',
      status: 'active',
      label: 'Formula',
    });

    const steps = upsertWorkflowStepStatus(
      [
        { id: 'plan', label: 'Planning', status: 'done' },
        { id: 'workbook-action', label: 'Workbook action', status: 'pending' },
        { id: 'validation', label: 'Checking quality', status: 'pending' },
        { id: 'finalize', label: 'Finishing', status: 'pending' },
      ],
      update!.stepId,
      update!.status,
      update!.label,
    );

    expect(steps.map((step) => step.id)).toEqual([
      'plan',
      'workbook-action',
      'formula',
      'validation',
      'finalize',
    ]);
  });

  it('preserves module-specific and slide-specific runtime labels', () => {
    expect(workflowStepUpdateFromRuntimeEvent({
      type: 'progress',
      message: 'Repairing slide 2 fragment.',
      pct: 70,
      partId: 'slide-2',
    })).toEqual({
      stepId: 'slide-2',
      status: 'active',
      label: 'Repairing slide 2 fragment.',
    });

    expect(workflowStepUpdateFromRuntimeEvent({
      type: 'progress',
      message: 'Applying deterministic document module repair.',
      pct: 86,
      partId: 'document-module-3',
    })).toEqual({
      stepId: 'document-module-3',
      status: 'active',
      label: 'Document module 3',
    });
  });
});
