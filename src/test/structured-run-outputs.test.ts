import { describe, expect, it } from 'vitest';

import { buildRunRequest } from '@/services/chat/buildRunRequest';
import { createDefaultContextSelectionState } from '@/services/context/types';
import type { ProjectData, ProjectDocument } from '@/types/project';

function makeDocument(overrides: Partial<ProjectDocument> = {}): ProjectDocument {
  return {
    id: 'doc-1',
    title: 'Artifact',
    type: 'document',
    contentHtml: '<article><h1>Artifact</h1><p>Body</p></article>',
    sourceMarkdown: '# Artifact',
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

async function buildRequest(project: ProjectData, activeDocument: ProjectDocument | null, prompt: string) {
  const { runRequest } = await buildRunRequest({
    prompt,
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

  return runRequest;
}

describe('structured artifact runtime parts', () => {
  it('models document, presentation, and spreadsheet runs with first-class runtime parts', async () => {
    const document = makeDocument();
    const presentation = makeDocument({
      id: 'deck-1',
      type: 'presentation',
      title: 'Deck',
      contentHtml: '<section><h1>Deck</h1></section>',
      slideCount: 3,
      sourceMarkdown: undefined,
    });
    const spreadsheet = makeDocument({
      id: 'sheet-1',
      type: 'spreadsheet',
      title: 'Data',
      contentHtml: '',
      sourceMarkdown: undefined,
      workbook: {
        activeSheetIndex: 0,
        sheets: [{
          id: 'sheet-a',
          name: 'Data',
          tableName: 'table_1',
          schema: [
            { name: 'Revenue', type: 'number', nullable: false },
            { name: 'Cost', type: 'number', nullable: false },
          ],
          frozenRows: 0,
          frozenCols: 0,
          columnWidths: {},
          formulas: [],
        }],
      },
    });
    const project = makeProject([document, presentation, spreadsheet]);

    const documentRun = await buildRequest(project, document, 'Tighten this document section');
    const presentationRun = await buildRequest(project, presentation, 'Add 2 slides: customer proof, implementation timeline');
    const spreadsheetRun = await buildRequest(project, spreadsheet, 'Add a margin column as Revenue minus Cost');

    expect(documentRun.artifactRunPlan.workQueue[0]?.kind).toBe('document-shell');
    expect(presentationRun.artifactRunPlan.workQueue.map((part) => part.kind)).toEqual(['slide', 'slide']);
    expect(spreadsheetRun.artifactRunPlan.workQueue[0]?.kind).toBe('workbook-action');
    expect([documentRun, presentationRun, spreadsheetRun].every((run) => !('serializableSpec' in run))).toBe(true);
  });
});
