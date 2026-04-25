import { describe, expect, it } from 'vitest';

import { buildRunRequest } from '@/services/chat/buildRunRequest';
import { createDefaultContextSelectionState } from '@/services/context/types';
import type { ProjectData, ProjectDocument } from '@/types/project';

function makeDocument(): ProjectDocument {
  return {
    id: 'doc-1',
    title: 'Document',
    type: 'document',
    contentHtml: '<article><h1>Document</h1></article>',
    sourceMarkdown: '# Document',
    themeCss: '',
    slideCount: 0,
    chartSpecs: {},
    lifecycleState: 'draft',
    order: 0,
    createdAt: 1,
    updatedAt: 1,
  };
}

function makeProject(document: ProjectDocument): ProjectData {
  return {
    id: 'project-1',
    title: 'Project',
    visibility: 'private',
    documents: [document],
    activeDocumentId: document.id,
    chatHistory: [],
    sections: { drafts: [], main: [], suggestions: [], issues: [] },
    createdAt: 1,
    updatedAt: 1,
  };
}

describe('external adapter quarantine', () => {
  it('does not attach the legacy serializable external spec to active app runs', async () => {
    const activeDocument = makeDocument();
    const result = await buildRunRequest({
      prompt: 'Tighten this document into an executive brief',
      attachments: [],
      messages: [],
      project: makeProject(activeDocument),
      activeDocument,
      showAllMessages: false,
      applyToAllDocuments: false,
      providerConfig: {
        id: 'openai',
        name: 'OpenAI',
        apiKey: 'test-key',
        model: 'gpt-4o',
      },
      selectionState: createDefaultContextSelectionState(),
      buildMemoryContext: async () => ({
        text: '',
        tokenCount: 0,
        budgetExceeded: false,
        trimmedMemories: [],
        items: [],
      }),
      mode: 'explain',
    });

    expect(result.runRequest.mode).toBe('execute');
    expect(result.runRequest.serializableSpec).toBeUndefined();
    expect(result.runRequest.artifactRunPlan.version).toBe(1);
    expect(result.runRequest.artifactRunPlan.workflow.requestKind).not.toBe('explain');
  });
});
