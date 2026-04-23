import { describe, expect, it } from 'vitest';

import { buildRunRequest } from '@/services/chat/buildRunRequest';
import { createDefaultContextSelectionState } from '@/services/context/types';
import { buildNonMutatingRunResult } from '@/services/executionSpec/explain';
import type { ProjectData, ProjectDocument } from '@/types/project';

function makeDocument(overrides: Partial<ProjectDocument> = {}): ProjectDocument {
  return {
    id: 'doc-1',
    title: 'Main Brief',
    type: 'document',
    contentHtml: '<article><h1>Main Brief</h1><p>Body</p></article>',
    sourceMarkdown: '# Main Brief',
    themeCss: '',
    slideCount: 0,
    chartSpecs: {},
    lifecycleState: 'draft',
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

describe('run explain mode', () => {
  it('reports included context and predicted project changes deterministically', async () => {
    const project = makeProject([
      makeDocument(),
      makeDocument({
        id: 'sheet-1',
        title: 'Metrics',
        type: 'spreadsheet',
        contentHtml: '',
        workbook: {
          activeSheetIndex: 0,
          sheets: [{
            id: 'sheet-a',
            name: 'Data',
            tableName: 'table_1',
            schema: [{ name: 'Amount', type: 'number', nullable: false }],
            frozenRows: 0,
            frozenCols: 0,
            columnWidths: {},
            formulas: [],
          }],
        },
      }),
    ]);
    const activeDocument = project.documents[0] ?? null;

    const { runRequest } = await buildRunRequest({
      prompt: 'Summarize the project into one overview',
      attachments: [],
      messages: [],
      project,
      activeDocument,
      showAllMessages: false,
      applyToAllDocuments: false,
      providerConfig: { id: 'openai', name: 'OpenAI', apiKey: 'test-key' },
      selectionState: createDefaultContextSelectionState(),
      buildMemoryContext: async () => ({
        text: '',
        tokenCount: 0,
        budgetExceeded: false,
        trimmedMemories: [],
        items: [],
      }),
      allowClarification: false,
      mode: 'explain',
    });

    const result = await buildNonMutatingRunResult({
      runRequest,
      project,
    });

    expect(result.status).toBe('completed');
    expect(result.outputs.envelope.mode).toBe('explain');
    expect(result.outputs.envelope.project).toBeDefined();
    expect(result.outputs.envelope.explain?.projectOperation).toBe('summarize-project');
    expect(result.outputs.envelope.explain?.validationProfile).toBe('publish-ready');
    expect(result.outputs.envelope.explain?.includedSources.length).toBeGreaterThan(0);
    expect(result.outputs.envelope.explain?.predictedChanges.some((change) => change.action !== 'none')).toBe(true);
  });
});
