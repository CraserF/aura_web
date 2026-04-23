import { describe, expect, it } from 'vitest';

import { buildRunRequest } from '@/services/chat/buildRunRequest';
import type { ProjectData, ProjectDocument } from '@/types/project';

function makeDocument(overrides: Partial<ProjectDocument> = {}): ProjectDocument {
  return {
    id: 'doc-1',
    title: 'Document',
    type: 'document',
    contentHtml: '<p>Existing</p>',
    sourceMarkdown: '# Existing',
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

describe('buildRunRequest', () => {
  it('packages the provider snapshot, active artifact refs, and resolved project rules snapshot', async () => {
    const activeDocument = makeDocument();
    const result = await buildRunRequest({
      prompt: 'Revise this into a tighter summary',
      attachments: [],
      messages: [],
      project: makeProject([activeDocument]),
      activeDocument,
      showAllMessages: false,
      applyToAllDocuments: false,
      providerConfig: {
        id: 'openai',
        name: 'OpenAI',
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o',
      },
      buildMemoryContext: async () => 'Relevant launch notes',
    });

    expect(result.messageScope).toBe('document');
    expect(result.scopedDocumentId).toBe('doc-1');
    expect(result.runRequest.providerConfig.model).toBe('gpt-4o');
    expect(result.runRequest.activeArtifacts.activeDocument?.id).toBe('doc-1');
    expect(result.runRequest.projectRulesSnapshot.contextPolicy.maxChatMessages).toBe(12);
    expect(result.runRequest.projectRulesSnapshot.promptBlock).toBe('');
    expect(result.runRequest.context.memory.text).toContain('launch notes');
    expect(result.runRequest.intent.artifactType).toBe('document');
    expect(result.runRequest.projectRulesSnapshot.activePresetId).toBeUndefined();
  });
});
