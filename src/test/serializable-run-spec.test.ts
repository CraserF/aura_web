import { describe, expect, it } from 'vitest';

import { buildRunRequest } from '@/services/chat/buildRunRequest';
import { createDefaultContextSelectionState } from '@/services/context/types';
import type { ProjectData, ProjectDocument } from '@/types/project';

function makeDocument(): ProjectDocument {
  return {
    id: 'doc-1',
    title: 'Working Draft',
    type: 'document',
    contentHtml: '<article><h1>Working Draft</h1><p>Body</p></article>',
    sourceMarkdown: '# Working Draft',
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

describe('internal runtime request privacy', () => {
  it('does not expose provider secrets because active runs only build internal runtime plans', async () => {
    const activeDocument = makeDocument();
    const { runRequest } = await buildRunRequest({
      prompt: 'Tighten this document',
      attachments: [],
      messages: [],
      project: makeProject(activeDocument),
      activeDocument,
      showAllMessages: false,
      applyToAllDocuments: false,
      providerConfig: {
        id: 'openai',
        name: 'OpenAI',
        apiKey: 'super-secret-key',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4.1',
      },
      selectionState: createDefaultContextSelectionState(),
      buildMemoryContext: async () => ({
        text: 'Memory context',
        tokenCount: 3,
        budgetExceeded: false,
        trimmedMemories: [],
        items: [],
      }),
      mode: 'explain',
    });

    expect(runRequest.mode).toBe('execute');
    expect('serializableSpec' in runRequest).toBe(false);
    expect(JSON.stringify(runRequest.artifactRunPlan)).not.toContain('super-secret-key');
    expect(runRequest.artifactRunPlan.intentSummary).toContain('document workflow');
  });
});
