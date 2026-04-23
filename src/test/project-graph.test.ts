import { describe, expect, it } from 'vitest';

import { buildProjectGraph } from '@/services/projectGraph/build';
import { refreshProjectDependencies } from '@/services/projectGraph/refresh';
import { validateProjectGraph } from '@/services/projectGraph/validate';
import type { ProjectData, ProjectDocument } from '@/types/project';

function makeDocument(overrides: Partial<ProjectDocument> = {}): ProjectDocument {
  return {
    id: 'doc-1',
    title: 'Doc',
    type: 'document',
    contentHtml: '<p>Draft</p>',
    sourceMarkdown: '# Draft',
    themeCss: '',
    slideCount: 0,
    chartSpecs: {},
    order: 0,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

function makeProject(documents: ProjectDocument[]): ProjectData {
  return {
    id: 'project-1',
    title: 'Project',
    visibility: 'private',
    documents,
    activeDocumentId: documents[0]?.id ?? null,
    chatHistory: [],
    sections: { drafts: [], main: [], suggestions: [], issues: [] },
    createdAt: 1,
    updatedAt: 1,
  };
}

describe('project graph', () => {
  it('builds deterministic nodes and edges from linked refs, charts, and managed summary artifacts', () => {
    const spreadsheet = makeDocument({
      id: 'sheet-doc',
      title: 'Finance',
      type: 'spreadsheet',
      workbook: {
        activeSheetIndex: 0,
        sheets: [
          {
            id: 'sheet-1',
            name: 'Budget',
            tableName: 'budget_table',
            schema: [{ name: 'Amount', type: 'number', nullable: false }],
            frozenRows: 0,
            frozenCols: 0,
            columnWidths: {},
            formulas: [],
          },
          {
            id: 'sheet-2',
            name: 'Budget Summary',
            tableName: 'budget_summary',
            schema: [{ name: 'Amount', type: 'number', nullable: false }],
            frozenRows: 0,
            frozenCols: 0,
            columnWidths: {},
            formulas: [],
            queryView: {
              sourceSheetId: 'sheet-1',
              sourceSheetName: 'Budget',
              outputSheetName: 'Budget Summary',
              selectColumns: ['Amount'],
              filters: [],
              generatedAt: 5,
            },
          },
        ],
      },
    });
    const linkedDocument = makeDocument({
      id: 'doc-linked',
      title: 'Narrative',
      linkedTableRefs: [{ spreadsheetDocId: 'sheet-doc', sheetId: 'sheet-1' }],
      chartSpecs: { revenue: {} as never },
      updatedAt: 5,
    });
    const summary = makeDocument({
      id: 'doc-summary',
      title: 'Project Summary',
      starterRef: {
        artifactKey: 'project-summary',
        starterId: 'phase-6-project-summary',
        starterType: 'document',
      },
      updatedAt: 3,
    });

    const graph = buildProjectGraph(makeProject([linkedDocument, spreadsheet, summary]));

    expect(graph.nodes.map((node) => node.id)).toContain('document:doc-linked');
    expect(graph.nodes.map((node) => node.id)).toContain('sheet:sheet-doc:sheet-1');
    expect(graph.nodes.map((node) => node.id)).toContain('chart:doc-linked:revenue');
    expect(graph.edges.find((edge) => edge.kind === 'linked-table')?.status).toBe('valid');
    expect(graph.edges.find((edge) => edge.kind === 'query-view')?.status).toBe('valid');
    expect(graph.edges.find((edge) => edge.kind === 'derived-summary')?.status).toBe('stale');
  });

  it('reports broken references and refreshes linked-table/chart metadata from html', () => {
    const brokenDocument = makeDocument({
      id: 'doc-broken',
      title: 'Broken',
      contentHtml: '<div data-aura-linked-table="missing-sheet:sheet-1"></div>',
      linkedTableRefs: [],
    });
    const refreshed = refreshProjectDependencies(makeProject([brokenDocument]));
    const issues = validateProjectGraph(buildProjectGraph(refreshed.project));

    expect(refreshed.changes[0]?.documentId).toBe('doc-broken');
    expect(refreshed.project.documents[0]?.linkedTableRefs?.[0]?.spreadsheetDocId).toBe('missing-sheet');
    expect(issues[0]?.code).toBe('broken-linked-table');
  });
});
