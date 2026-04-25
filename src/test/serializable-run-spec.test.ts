import { describe, expect, it } from 'vitest';

import { buildRunRequest } from '@/services/chat/buildRunRequest';
import { createDefaultContextSelectionState } from '@/services/context/types';
import { deserializeRunSpec, serializeRunSpec } from '@/services/executionSpec/serialize';
import { hydrateRunSpec } from '@/services/executionSpec/hydrate';
import type { ProjectData, ProjectDocument } from '@/types/project';

function makeDocument(overrides: Partial<ProjectDocument> = {}): ProjectDocument {
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

describe('serializable run spec', () => {
  it('round-trips through serialize and hydrate without exposing raw secrets', async () => {
    const activeDocument = makeDocument();
    const { runRequest } = await buildRunRequest({
      prompt: 'Tighten this document',
      attachments: [],
      messages: [],
      project: makeProject([activeDocument]),
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

    const spec = runRequest.serializableSpec;
    expect(spec).toBeDefined();
    const serialized = serializeRunSpec(spec!);

    expect(serialized).not.toContain('super-secret-key');

    const parsed = deserializeRunSpec(serialized);
    const hydrated = hydrateRunSpec(parsed);

    expect(parsed.mode).toBe('explain');
    expect(parsed.providerRef.hasApiKey).toBe(true);
    expect(parsed.targeting.targetDocumentId).toBe(activeDocument.id);
    expect(parsed.contextSnapshot.selectedSourceIds.length).toBeGreaterThan(0);
    expect(hydrated.providerConfig.apiKey).toBe('');
    expect(hydrated.providerConfig.model).toBe('gpt-4.1');
    expect(hydrated.intent.targetDocumentId).toBe(activeDocument.id);
  });
});
