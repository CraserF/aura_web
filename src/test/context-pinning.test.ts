import { describe, expect, it } from 'vitest';

import { assembleContext } from '@/services/context/assemble';
import { createDefaultContextSelectionState } from '@/services/context/types';
import { defaultContextPolicy } from '@/services/projectRules/defaults';
import type { ChatMessage } from '@/types';
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

function makeProject(messages: ChatMessage[], documents: ProjectDocument[]): ProjectData {
  return {
    id: 'project-1',
    title: 'Project',
    visibility: 'private',
    documents,
    activeDocumentId: documents[0]?.id ?? null,
    chatHistory: messages,
    sections: { drafts: [], main: [], suggestions: [], issues: [] },
    createdAt: 1,
    updatedAt: 1,
  };
}

describe('context pinning and exclusions', () => {
  it('always includes pinned documents in selected-artifacts mode', () => {
    const activeDocument = makeDocument();
    const pinnedDocument = makeDocument({
      id: 'doc-2',
      title: 'Pinned presentation',
      type: 'presentation',
      contentHtml: '<section>Roadmap</section>',
    });

    const selectionState = {
      ...createDefaultContextSelectionState(),
      scopeMode: 'selected-artifacts' as const,
      pinnedDocumentIds: ['doc-2'],
    };

    const assembled = assembleContext({
      prompt: 'Build a pitch update',
      attachments: [],
      messages: [],
      activeDocument,
      project: makeProject([], [activeDocument, pinnedDocument]),
      showAllMessages: false,
      applyToAllDocuments: false,
      memoryContext: '',
      contextPolicy: defaultContextPolicy(),
      selectionState,
    });

    expect(assembled.context.artifact.relatedDocuments).toEqual([
      { id: 'doc-2', title: 'Pinned presentation', type: 'presentation' },
    ]);
    expect(assembled.context.sources.find((source) => source.id === 'artifact:related:doc-2')?.pinned).toBe(true);
  });

  it('never includes excluded sources', () => {
    const activeDocument = makeDocument();
    const relatedDocument = makeDocument({
      id: 'doc-2',
      title: 'Excluded appendix',
      contentHtml: '<p>Appendix</p>',
    });

    const selectionState = {
      ...createDefaultContextSelectionState(),
      excludedSourceIds: ['artifact:related:doc-2', 'attachments:text'],
    };

    const assembled = assembleContext({
      prompt: 'Summarize this project',
      attachments: [{
        id: 'a1',
        name: 'brief.md',
        mimeType: 'text/markdown',
        kind: 'text',
        content: '# Brief',
      }],
      messages: [],
      activeDocument,
      project: makeProject([], [activeDocument, relatedDocument]),
      showAllMessages: false,
      applyToAllDocuments: false,
      memoryContext: '',
      contextPolicy: defaultContextPolicy(),
      selectionState,
    });

    expect(assembled.context.sources.some((source) => source.id === 'artifact:related:doc-2')).toBe(false);
    expect(assembled.context.sources.some((source) => source.id === 'attachments:text')).toBe(false);
  });
});
