import { describe, expect, it } from 'vitest';

import type { ProjectData, ProjectDocument } from '@/types/project';
import { resolveWorkflowPresetState } from '@/services/presets/apply';
import { buildRunRequest } from '@/services/chat/buildRunRequest';
import { createDefaultContextSelectionState } from '@/services/context/types';

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

function makeProject(overrides: Partial<ProjectData> = {}): ProjectData {
  const activeDocument = makeDocument();
  return {
    id: 'project-1',
    title: 'Project',
    visibility: 'private',
    documents: [activeDocument],
    activeDocumentId: activeDocument.id,
    chatHistory: [],
    sections: { drafts: [], main: [], suggestions: [], issues: [] },
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe('workflow presets', () => {
  it('resolves default and explicit presets against the existing project workflowPresets store', () => {
    const state = resolveWorkflowPresetState({
      version: 1,
      presets: [
        {
          id: 'doc-default',
          name: 'Document default',
          artifactType: 'document',
          rulesAppendix: 'Keep it concise.',
          enabled: true,
        },
        {
          id: 'doc-custom',
          name: 'Custom override',
          artifactType: 'document',
          rulesAppendix: 'Use a stronger CTA.',
          enabled: true,
        },
      ],
      defaultPresetByArtifact: {
        document: 'doc-default',
      },
    }, 'document', 'doc-custom');

    expect(state.defaultPreset?.id).toBe('doc-default');
    expect(state.selectedPreset?.id).toBe('doc-custom');
    expect(state.appliedPreset?.id).toBe('doc-custom');
  });

  it('threads selected and applied preset metadata into buildRunRequest', async () => {
    const activeDocument = makeDocument();
    const result = await buildRunRequest({
      prompt: 'Revise this into a tighter summary',
      attachments: [],
      messages: [],
      project: makeProject({
        workflowPresets: {
          version: 1,
          presets: [
            {
              id: 'doc-default',
              name: 'Document default',
              artifactType: 'document',
              rulesAppendix: 'Prefer short sections.',
              enabled: true,
            },
            {
              id: 'doc-custom',
              name: 'Document custom',
              artifactType: 'document',
              rulesAppendix: 'Always end with next steps.',
              enabled: true,
            },
          ],
          defaultPresetByArtifact: {
            document: 'doc-default',
          },
        },
      }),
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
      selectedPresetId: 'doc-custom',
      buildMemoryContext: async () => ({
        text: '',
        tokenCount: 0,
        budgetExceeded: false,
        trimmedMemories: [],
        items: [],
      }),
    });

    expect(result.runRequest.selectedPresetId).toBe('doc-custom');
    expect(result.runRequest.appliedPreset?.id).toBe('doc-custom');
    expect(result.runRequest.projectRulesSnapshot.activePresetId).toBe('doc-custom');
    expect(result.runRequest.projectRulesSnapshot.promptBlock).toContain('Always end with next steps.');
  });
});
