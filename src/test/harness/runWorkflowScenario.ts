import type { ProjectData, ProjectDocument } from '@/types/project';

import { buildRunRequest } from '@/services/chat/buildRunRequest';
import { createDefaultContextSelectionState } from '@/services/context/types';
import { mockBuildMemoryContext, mockProviderConfig } from '@/test/harness/mockProvider';

export interface WorkflowScenario {
  id: string;
  artifactType: 'document' | 'presentation' | 'spreadsheet';
  operation: 'create' | 'edit' | 'action';
  prompt: string;
  activeDocumentType?: 'document' | 'presentation' | 'spreadsheet';
  expects: Record<string, unknown>;
}

function makeActiveDocument(type: WorkflowScenario['activeDocumentType']): ProjectDocument | null {
  if (!type) {
    return null;
  }

  return {
    id: `${type}-1`,
    title: `${type} artifact`,
    type,
    contentHtml: type === 'presentation' ? '<section>Deck</section>' : '<p>Document</p>',
    sourceMarkdown: type === 'document' ? '# Draft' : undefined,
    themeCss: '',
    slideCount: type === 'presentation' ? 1 : 0,
    chartSpecs: {},
    workbook: type === 'spreadsheet'
      ? {
          activeSheetIndex: 0,
          sheets: [{
            id: 'sheet-1',
            name: 'Data',
            tableName: 'table_1',
            schema: [{ name: 'Amount', type: 'number', nullable: false }],
            frozenRows: 0,
            frozenCols: 0,
            columnWidths: {},
            formulas: [],
          }],
        }
      : undefined,
    order: 0,
    createdAt: 1,
    updatedAt: 1,
  };
}

export async function runWorkflowScenario(scenario: WorkflowScenario) {
  const activeDocument = makeActiveDocument(scenario.activeDocumentType);
  const project: ProjectData = {
    id: 'project-1',
    title: 'Scenario Project',
    visibility: 'private',
    documents: activeDocument ? [activeDocument] : [],
    activeDocumentId: activeDocument?.id ?? null,
    chatHistory: [],
    sections: { drafts: [], main: [], suggestions: [], issues: [] },
    createdAt: 1,
    updatedAt: 1,
  };

  const { runRequest, messageScope, scopedDocumentId } = await buildRunRequest({
    prompt: scenario.prompt,
    attachments: [],
    messages: [],
    project,
    activeDocument,
    showAllMessages: false,
    applyToAllDocuments: false,
    providerConfig: mockProviderConfig,
    selectionState: createDefaultContextSelectionState(),
    buildMemoryContext: mockBuildMemoryContext,
  });

  return {
    runRequest,
    messageScope,
    scopedDocumentId,
  };
}
