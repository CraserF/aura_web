import { describe, expect, it } from 'vitest';

import type { ProjectDocument } from '@/types/project';
import { applyDraftLifecycleOnContentUpdate, deriveLifecycleFromValidation, normalizeDocumentLifecycle } from '@/services/lifecycle/state';

function makeDocument(overrides: Partial<ProjectDocument> = {}): ProjectDocument {
  return {
    id: 'doc-1',
    title: 'Document',
    type: 'document',
    contentHtml: '<p>Existing</p>',
    sourceMarkdown: '# Existing',
    themeCss: '',
    slideCount: 0,
    chartSpecs: {},
    order: 0,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe('artifact lifecycle helpers', () => {
  it('normalizes missing lifecycle state to draft', () => {
    expect(normalizeDocumentLifecycle(makeDocument()).lifecycleState).toBe('draft');
  });

  it('downgrades approved content edits back to draft', () => {
    const updates = applyDraftLifecycleOnContentUpdate(
      makeDocument({ lifecycleState: 'approved' }),
      { contentHtml: '<p>Updated</p>' },
    );

    expect(updates.lifecycleState).toBe('draft');
  });

  it('marks dependency-driven validation failures as stale', () => {
    const next = deriveLifecycleFromValidation({
      passed: false,
      blockingIssues: [{ code: 'broken-linked-table', message: 'Broken', severity: 'blocking', source: 'dependency-graph' }],
      warnings: [],
      score: 48,
      profileId: 'publish-ready',
      artifactTargets: [{ documentId: 'doc-1', artifactType: 'document' }],
    });

    expect(next.lifecycleState).toBe('stale');
    expect(next.lastValidationProfileId).toBe('publish-ready');
  });
});
