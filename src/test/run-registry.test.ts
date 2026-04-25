import { beforeEach, describe, expect, it } from 'vitest';

import {
  appendRunPolicyActions,
  clearRunRegistry,
  createRunRecord,
  getRunRecord,
  markRunTouchedDocuments,
  markSupersededRuns,
  setRunBlockedReason,
  setRunOutputSummary,
  setRunRetryInfo,
  updateRunRecordStatus,
} from '@/services/runs/registry';

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

describe('run registry expansion', () => {
  beforeEach(() => {
    clearRunRegistry();
  });

  it('tracks retry, blocked reason, policy actions, and output summaries', () => {
    createRunRecord('run-1', baseIntent);
    setRunRetryInfo('run-1', 'run-root', 1);
    setRunBlockedReason('run-1', 'Need clarification');
    appendRunPolicyActions('run-1', ['request-clarification', 'block-publish']);
    setRunOutputSummary('run-1', 'Updated document successfully.', 'output-run-1');

    expect(getRunRecord('run-1')).toMatchObject({
      retryChainRootId: 'run-root',
      retryCount: 1,
      blockedReason: 'Need clarification',
      policyActions: ['request-clarification', 'block-publish'],
      finalOutputSummary: 'Updated document successfully.',
      outputBufferId: 'output-run-1',
    });
  });

  it('marks older active runs as superseded when a newer run touches the same artifact', () => {
    createRunRecord('run-1', baseIntent);
    updateRunRecordStatus('run-1', 'running');
    markRunTouchedDocuments('run-1', ['doc-1']);

    createRunRecord('run-2', baseIntent);
    updateRunRecordStatus('run-2', 'completed');
    markRunTouchedDocuments('run-2', ['doc-1']);

    markSupersededRuns('run-2', ['doc-1']);

    expect(getRunRecord('run-1')?.status).toBe('superseded');
    expect(getRunRecord('run-2')?.status).toBe('completed');
  });
});
