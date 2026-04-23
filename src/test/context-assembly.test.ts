import { describe, expect, it } from 'vitest';

import { assembleContext } from '@/services/context/assemble';
import type { ChatMessage, FileAttachment } from '@/types';
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

describe('assembleContext', () => {
  it('assembles scoped conversation, attachment, artifact, and memory context', () => {
    const activeDocument = makeDocument();
    const otherDocument = makeDocument({ id: 'doc-2', title: 'Slides', type: 'presentation', contentHtml: '<section>Slides</section>' });
    const messages: ChatMessage[] = [
      { id: 'm1', role: 'user', content: 'Project message', timestamp: 1, scope: 'project' },
      { id: 'm2', role: 'assistant', content: 'Scoped reply', timestamp: 2, documentId: 'doc-1', scope: 'document' },
      { id: 'm3', role: 'assistant', content: 'Other doc reply', timestamp: 3, documentId: 'doc-2', scope: 'document' },
    ];
    const attachments: FileAttachment[] = [
      {
        id: 'a1',
        name: 'brief.md',
        mimeType: 'text/markdown',
        kind: 'text',
        content: '# Notes',
      },
    ];

    const assembled = assembleContext({
      prompt: 'Condense this into an executive summary',
      attachments,
      messages,
      activeDocument,
      project: makeProject(messages, [activeDocument, otherDocument]),
      showAllMessages: false,
      applyToAllDocuments: false,
      memoryContext: 'Remember the quarterly launch cadence.',
    });

    expect(assembled.messageScope).toBe('document');
    expect(assembled.scopedDocumentId).toBe('doc-1');
    expect(assembled.context.conversation.chatHistory).toHaveLength(2);
    expect(assembled.context.attachments.textContext).toContain('brief.md');
    expect(assembled.context.artifact.existingContentHtml).toContain('Existing');
    expect(assembled.context.artifact.relatedDocuments).toEqual([
      { id: 'doc-2', title: 'Slides', type: 'presentation' },
    ]);
    expect(assembled.context.memory.text).toContain('launch cadence');
    expect(assembled.context.metrics.estimatedTotalTokens).toBeGreaterThan(0);
    expect(assembled.context.sources.length).toBeGreaterThan(0);
  });
});
