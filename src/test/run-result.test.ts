import { describe, expect, it } from 'vitest';

import { renderRunResult } from '@/services/chat/renderRunResult';
import { clearRunRegistry, createRunRecord, getRunRecord, markRunTouchedDocuments, recordRunEvent, setRunDependencyWarnings, updateRunRecordStatus } from '@/services/runs/registry';
import { clearRunEvents, publishRunEvent } from '@/services/events/eventBus';
import type { RunResult } from '@/services/contracts/runResult';

const baseIntent = {
  artifactType: 'document' as const,
  operation: 'edit' as const,
  scope: 'document' as const,
  targetDocumentId: 'doc-1',
  targetSelectors: [{ type: 'document-block' as const, label: 'Best matching document block' }],
  allowFullRegeneration: false,
  confidence: 0.99,
  needsClarification: false,
  reason: 'active document type is authoritative',
};

describe('run result rendering and registry', () => {
  it('renders assistant content and warning text from a RunResult', () => {
    const result: RunResult = {
      runId: 'run-1',
      status: 'completed',
      intent: baseIntent,
      outputs: {
        envelope: {
          artifactType: 'document',
          targetSummary: ['Best matching document block'],
          changedTargets: [{ documentId: 'doc-1', action: 'updated' }],
          validation: { passed: true, summary: 'QA passed' },
          document: {
            artifactType: 'document',
            title: 'Quarterly Brief',
          },
        },
        title: 'Quarterly Brief',
      },
      assistantMessage: {
        content: 'Created document "Quarterly Brief".',
      },
      validation: {
        passed: true,
        summary: 'QA passed',
      },
      warnings: [{ code: 'qa-warning', message: 'Minor chart spacing issue flagged.' }],
      changedTargets: [{ documentId: 'doc-1', action: 'updated' }],
      structuredStatus: {
        title: 'Document updated',
        detail: 'Document update completed successfully.',
        advancedDiagnostics: ['Quality blocked by 1 issue across Typography.'],
      },
    };

    const rendered = renderRunResult(result);

    expect(rendered.content).toContain('Created document');
    expect(rendered.content).toContain('Minor chart spacing issue');
    expect(rendered.content).not.toContain('Quality blocked');
    expect(rendered.statusMessage).toContain('completed successfully');
    expect(result.structuredStatus.advancedDiagnostics).toEqual([
      'Quality blocked by 1 issue across Typography.',
    ]);
  });

  it('passes clarifyOptions through when present on the assistant message', () => {
    const result: RunResult = {
      runId: 'run-budget-exhausted',
      status: 'completed',
      intent: baseIntent,
      outputs: {
        envelope: {
          artifactType: 'presentation',
          targetSummary: [],
          changedTargets: [],
          validation: { passed: true, summary: 'Passed' },
          presentation: { artifactType: 'presentation' },
        },
      },
      assistantMessage: {
        content: 'Generated 3 slides. Could not meet the quality bar in time.',
        clarifyOptions: [{ label: 'Improve', value: 'Please review and improve the quality of the presentation.' }],
      },
      validation: { passed: true, summary: 'Passed' },
      warnings: [],
      changedTargets: [],
      structuredStatus: {
        title: 'Presentation created',
        detail: 'Presentation workflow completed.',
        advancedDiagnostics: ['Quality decision: safe-budget-exhausted; action: skipped-no-budget.'],
      },
    };

    const rendered = renderRunResult(result);

    // Plain outcome label visible in content
    expect(rendered.content).toContain('Could not meet the quality bar in time.');
    // Advanced diagnostics kept out of plain content
    expect(rendered.content).not.toContain('safe-budget-exhausted');
    // Improve option forwarded
    expect(rendered.clarifyOptions).toHaveLength(1);
    expect(rendered.clarifyOptions?.[0]?.label).toBe('Improve');
    // Advanced diagnostics accessible via structuredStatus
    expect(result.structuredStatus.advancedDiagnostics).toContain('Quality decision: safe-budget-exhausted; action: skipped-no-budget.');
  });

  it('does not include clarifyOptions when quality passed', () => {
    const result: RunResult = {
      runId: 'run-excellent',
      status: 'completed',
      intent: baseIntent,
      outputs: {
        envelope: {
          artifactType: 'presentation',
          targetSummary: [],
          changedTargets: [],
          validation: { passed: true, summary: 'Passed' },
          presentation: { artifactType: 'presentation' },
        },
      },
      assistantMessage: {
        content: 'Generated 3 slides. Looks polished.',
      },
      validation: { passed: true, summary: 'Passed' },
      warnings: [],
      changedTargets: [],
      structuredStatus: {
        title: 'Presentation created',
        detail: 'Presentation workflow completed.',
      },
    };

    const rendered = renderRunResult(result);
    expect(rendered.clarifyOptions).toBeUndefined();
    expect(rendered.content).toContain('Looks polished.');
  });

  it('tracks run lifecycle status in the registry skeleton', () => {
    clearRunRegistry();
    clearRunEvents();

    const created = createRunRecord('run-1', baseIntent);
    const running = updateRunRecordStatus('run-1', 'running');
    const event = publishRunEvent({
      type: 'run.generating',
      runId: 'run-1',
      source: 'test',
      payload: { step: 'working' },
    });
    recordRunEvent('run-1', event);
    markRunTouchedDocuments('run-1', ['doc-1']);
    setRunDependencyWarnings('run-1', ['Broken link']);
    const completed = updateRunRecordStatus('run-1', 'completed');

    expect(created.status).toBe('pending');
    expect(running?.status).toBe('running');
    expect(completed?.status).toBe('completed');
    expect(getRunRecord('run-1')?.status).toBe('completed');
    expect(getRunRecord('run-1')?.latestEventType).toBe('run.generating');
    expect(getRunRecord('run-1')?.touchedDocumentIds).toEqual(['doc-1']);
    expect(getRunRecord('run-1')?.dependencyWarnings).toEqual(['Broken link']);
  });
});
