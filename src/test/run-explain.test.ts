import { describe, expect, it } from 'vitest';

import { buildRunRequest } from '@/services/chat/buildRunRequest';
import { createDefaultContextSelectionState } from '@/services/context/types';
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

describe('legacy explain request mode', () => {
  it('is normalized into an execution-oriented artifact run plan', async () => {
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
      prompt: 'Create a new executive overview document',
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

    expect(runRequest.mode).toBe('execute');
    expect(runRequest.artifactRunPlan.version).toBe(1);
    expect(runRequest.artifactRunPlan.workflow.requestKind).toBe('edit');
    expect(runRequest.serializableSpec).toBeUndefined();
  });
});
