import { describe, expect, it } from 'vitest';

import { buildDesignerPrompt, buildEditDesignerPrompt } from '@/services/ai/prompts/composer';
import { resolveProjectRulesSnapshot } from '@/services/projectRules/resolve';
import { getTemplateBlueprint } from '@/services/ai/templates';
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

describe('project rules resolution', () => {
  it('merges defaults, artifact overrides, and preset overrides deterministically', () => {
    const snapshot = resolveProjectRulesSnapshot(makeProject({
      projectRules: {
        markdown: 'Prefer concise executive language.',
        updatedAt: 10,
      },
      contextPolicy: {
        version: 1,
        includeProjectChat: true,
        includeMemory: true,
        includeAttachments: true,
        includeRelatedDocuments: true,
        maxChatMessages: 8,
        maxMemoryTokens: 300,
        maxRelatedDocuments: 4,
        maxAttachmentChars: 500,
        artifactOverrides: {
          document: {
            maxChatMessages: 5,
          },
        },
      },
      workflowPresets: {
        version: 1,
        presets: [{
          id: 'doc-default',
          name: 'Document default',
          artifactType: 'document',
          rulesAppendix: 'Always add a decision summary.',
          contextPolicyOverrides: {
            maxMemoryTokens: 120,
          },
          enabled: true,
        }],
        defaultPresetByArtifact: {
          document: 'doc-default',
        },
      },
    }), 'document');

    expect(snapshot.promptBlock).toContain('Prefer concise executive language.');
    expect(snapshot.promptBlock).toContain('Always add a decision summary.');
    expect(snapshot.contextPolicy.maxChatMessages).toBe(5);
    expect(snapshot.contextPolicy.maxMemoryTokens).toBe(120);
    expect(snapshot.activePresetId).toBe('doc-default');
  });
});

describe('project rules prompt injection', () => {
  it('injects the shared project rules block exactly once into create and edit prompts', async () => {
    const projectRulesBlock = '## PROJECT RULES\n\nKeep slides tightly aligned to the launch theme.';
    const createPrompt = await buildDesignerPrompt(
      getTemplateBlueprint('keynote'),
      'keynote',
      'default-template',
      2,
      undefined,
      projectRulesBlock,
    );
    const editPrompt = buildEditDesignerPrompt(
      getTemplateBlueprint('keynote').palette,
      2,
      projectRulesBlock,
    );

    expect(createPrompt.match(/## PROJECT RULES/g)).toHaveLength(1);
    expect(editPrompt.match(/## PROJECT RULES/g)).toHaveLength(1);
  });
});
