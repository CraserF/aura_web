import { describe, expect, it } from 'vitest';
import type { ProjectDocument } from '@/types/project';

import { validateDocumentAgainstProfile } from '@/services/validation/documentValidation';

function makeDocument(overrides: Partial<ProjectDocument> = {}): ProjectDocument {
  return {
    id: 'doc-1',
    title: 'Document',
    type: 'document',
    contentHtml: '<div class="doc-shell"><h1>Document</h1><h2>Section</h2><style>:root{--doc-primary:#000;--doc-accent:#111;--doc-text:#111;--doc-bg:#fff;--doc-surface:#f5f5f5}</style><p>Body</p></div>',
    sourceMarkdown: '# Document',
    themeCss: '',
    slideCount: 0,
    chartSpecs: {},
    order: 0,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe('document validation', () => {
  it('maps document QA failures into the shared validation result shape', () => {
    const result = validateDocumentAgainstProfile({
      document: makeDocument({
        contentHtml: '<div><p>Body only</p></div>',
      }),
    });

    expect(result.passed).toBe(false);
    expect(result.blockingIssues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['has-style', 'has-h1']),
    );
    expect(result.artifactTargets[0]?.documentId).toBe('doc-1');
  });

  it('applies publish-ready warning promotion for raw markdown content', () => {
    const result = validateDocumentAgainstProfile({
      document: makeDocument({
        contentHtml: '<style>:root{--doc-primary:#000;--doc-accent:#111;--doc-text:#111;--doc-bg:#fff;--doc-surface:#f5f5f5}</style><h1>Document</h1><h2>Section</h2><p>See **bold** text.</p>',
      }),
      profileId: 'publish-ready',
    });

    expect(result.blockingIssues.map((issue) => issue.code)).toContain('literal-markdown');
  });
});
