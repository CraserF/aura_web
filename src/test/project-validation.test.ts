import { describe, expect, it, vi } from 'vitest';
import type { ProjectData, ProjectDocument } from '@/types/project';

vi.mock('@/services/validation/cleanEnv', () => ({
  runCleanEnvironmentChecks: vi.fn(async () => []),
}));

import { validateProjectAgainstProfile } from '@/services/validation/projectValidation';

function makeDocument(overrides: Partial<ProjectDocument> = {}): ProjectDocument {
  return {
    id: 'doc-1',
    title: 'Brief',
    type: 'document',
    contentHtml: '<style>:root{--doc-primary:#000;--doc-accent:#111;--doc-text:#111;--doc-bg:#fff;--doc-surface:#f5f5f5}</style><h1>Brief</h1><h2>Section</h2><div data-aura-linked-table="missing-sheet:sheet-1"></div>',
    sourceMarkdown: '# Brief',
    themeCss: '',
    slideCount: 0,
    chartSpecs: {},
    linkedTableRefs: [{ spreadsheetDocId: 'missing-sheet', sheetId: 'sheet-1' }],
    order: 0,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

function makeProject(documents: ProjectDocument[]): ProjectData {
  return {
    id: 'project-1',
    title: '',
    visibility: 'private',
    documents,
    activeDocumentId: documents[0]?.id ?? null,
    chatHistory: [],
    sections: { drafts: [], main: [], suggestions: [], issues: [] },
    createdAt: 1,
    updatedAt: 1,
  };
}

describe('project validation', () => {
  it('aggregates artifact issues, dependency issues, and export readiness', async () => {
    const result = await validateProjectAgainstProfile({
      project: makeProject([makeDocument()]),
      profileId: 'publish-ready',
    });

    expect(result.passed).toBe(false);
    expect(result.blockingIssues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['broken-linked-table', 'missing-project-title']),
    );
    expect(result.artifactTargets).toHaveLength(1);
  });
});
