import { describe, expect, it } from 'vitest';

import { buildRunRequest } from '@/services/chat/buildRunRequest';
import { createDefaultContextSelectionState } from '@/services/context/types';
import { resolveIntent } from '@/services/ai/intent/resolveIntent';
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
      selectionState: createDefaultContextSelectionState(),
      buildMemoryContext: async () => ({
        text: 'Relevant launch notes',
        tokenCount: 4,
        budgetExceeded: false,
        trimmedMemories: [],
        items: [],
      }),
    });

    expect(result.messageScope).toBe('document');
    expect(result.scopedDocumentId).toBe('doc-1');
    expect(result.runRequest.providerConfig.model).toBe('gpt-4o');
    expect(result.runRequest.activeArtifacts.activeDocument?.id).toBe('doc-1');
    expect(result.runRequest.projectRulesSnapshot.contextPolicy.maxChatMessages).toBe(12);
    expect(result.runRequest.projectRulesSnapshot.promptBlock).toBe('');
    expect(result.runRequest.context.memory.text).toContain('launch notes');
    expect(result.runRequest.intent.artifactType).toBe('document');
    expect(result.runRequest.intent.targetSelectors[0]?.type).toBe('paragraph-cluster');
    expect(result.runRequest.intent.editStrategyHint).toBe('block-replace');
    expect(result.runRequest.intent.allowFullRegeneration).toBe(false);
    expect(result.runRequest.projectRulesSnapshot.activePresetId).toBeUndefined();
    expect(result.runRequest.projectSnapshot.documentIds).toEqual(['doc-1']);
    expect(result.runRequest.projectSnapshot.activeDocumentId).toBe('doc-1');
    expect(result.runRequest.projectSnapshot.linkedReferenceCount).toBe(0);
    expect(result.runRequest.projectSnapshot.artifactCountsByType.document).toBe(1);
    expect(result.runRequest.artifactRunPlan.version).toBe(1);
    expect(result.runRequest.artifactRunPlan.workflow).toBe(result.runRequest.workflowPlan);
    expect(result.runRequest.artifactRunPlan.roles).toContain('design-director');
    expect(result.runRequest.workflowPlan?.artifactType).toBe('document');
    expect(result.runRequest.workflowPlan?.requestKind).toBe('edit');
    expect(result.runRequest.workflowPlan?.templateGuidance.intentFamily).toBe('edit');
    expect(result.runRequest.mode).toBe('execute');
    expect(result.runRequest.serializableSpec).toBeUndefined();
  });

  it('routes explicit cross-artifact create prompts away from the active presentation', async () => {
    const activeDocument = makeDocument({
      id: 'deck-1',
      type: 'presentation',
      contentHtml: '<section>Deck</section>',
      slideCount: 1,
    });
    const prompt = 'Create a long-form document called Operating Model Review in this project with a visible framed layout';
    const directIntent = resolveIntent({
      prompt,
      activeDocument,
      project: makeProject([activeDocument]),
      scope: 'document',
    });

    const result = await buildRunRequest({
      prompt,
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
      selectionState: createDefaultContextSelectionState(),
      buildMemoryContext: async () => ({
        text: '',
        tokenCount: 0,
        budgetExceeded: false,
        trimmedMemories: [],
        items: [],
      }),
    });

    expect(directIntent.artifactType).toBe('document');
    expect(result.runRequest.intent.artifactType).toBe('document');
    expect(result.runRequest.intent.operation).toBe('create');
    expect(result.runRequest.workflowPlan?.requestKind).toBe('create');
    expect(result.runRequest.intent.targetDocumentId).toBeUndefined();
    expect(result.runRequest.intent.targetSelectors).toEqual([]);
  });
});
