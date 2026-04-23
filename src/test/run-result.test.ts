import { describe, expect, it } from 'vitest';

import { renderRunResult } from '@/services/chat/renderRunResult';
import { clearRunRegistry, createRunRecord, getRunRecord, updateRunRecordStatus } from '@/services/runs/registry';
import type { RunResult } from '@/services/contracts/runResult';

const baseIntent = {
  artifactType: 'document' as const,
  operation: 'edit' as const,
  scope: 'document' as const,
  targetDocumentId: 'doc-1',
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
      outputs: { title: 'Quarterly Brief' },
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
      },
    };

    const rendered = renderRunResult(result);

    expect(rendered.content).toContain('Created document');
    expect(rendered.content).toContain('Minor chart spacing issue');
    expect(rendered.statusMessage).toContain('completed successfully');
  });

  it('tracks run lifecycle status in the registry skeleton', () => {
    clearRunRegistry();

    const created = createRunRecord('run-1', baseIntent);
    const running = updateRunRecordStatus('run-1', 'running');
    const completed = updateRunRecordStatus('run-1', 'completed');

    expect(created.status).toBe('pending');
    expect(running?.status).toBe('running');
    expect(completed?.status).toBe('completed');
    expect(getRunRecord('run-1')?.status).toBe('completed');
  });
});
