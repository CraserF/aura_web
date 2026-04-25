import { describe, expect, it } from 'vitest';

import { buildRunRequest } from '@/services/chat/buildRunRequest';
import { createDefaultContextSelectionState } from '@/services/context/types';
import { buildNonMutatingRunResult } from '@/services/executionSpec/explain';
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

async function buildResult(project: ProjectData, activeDocument: ProjectDocument | null, prompt: string) {
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

  return buildNonMutatingRunResult({ runRequest, project });
}

describe('structured run outputs', () => {
  it('normalizes document, presentation, spreadsheet, and project explain outputs into stable envelopes', async () => {
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

    const documentResult = await buildResult(project, document, 'Tighten this document section');
    const presentationResult = await buildResult(project, presentation, 'Update the current slide title');
    const spreadsheetResult = await buildResult(project, spreadsheet, 'Add a margin column as Revenue minus Cost');
    const projectResult = await buildResult(project, document, 'Summarize the project');

    expect(documentResult.outputs.envelope.document?.artifactType).toBe('document');
    expect(presentationResult.outputs.envelope.presentation?.artifactType).toBe('presentation');
    expect(spreadsheetResult.outputs.envelope.spreadsheet?.artifactType).toBe('spreadsheet');
    expect(projectResult.outputs.envelope.project?.artifactType).toBe('project');
  });
});
