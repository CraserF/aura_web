import { describe, expect, it } from 'vitest';

import { assembleContext } from '@/services/context/assemble';
import { getCompressionBudget } from '@/services/context/compressionBudget';
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

describe('context compaction', () => {
  it('uses a larger global compression budget for generation context', () => {
    expect(getCompressionBudget()).toBe(12000);
  });

  it('compacts older conversation while keeping recent messages and pinned memory', () => {
    const activeDocument = makeDocument();
    const messages: ChatMessage[] = Array.from({ length: 12 }).map((_, index) => ({
      id: `m${index}`,
      role: index % 2 === 0 ? 'user' : 'assistant',
      content: `message-${index} ${'detail '.repeat(700)}`,
      timestamp: index,
      documentId: 'doc-1',
      scope: 'document',
    }));

    const selectionState = {
      ...createDefaultContextSelectionState(),
      recentMessageCount: 2,
      pinnedMemoryPaths: ['memory/product'],
    };

    const assembled = assembleContext({
      prompt: 'Prepare a concise update',
      attachments: [],
      messages,
      activeDocument,
      project: makeProject(messages, [activeDocument]),
      showAllMessages: false,
      applyToAllDocuments: false,
      memoryContext: '',
      memoryContextResult: {
        text: 'unused',
        tokenCount: 0,
        budgetExceeded: false,
        trimmedMemories: [],
        items: [
          {
            id: 'memory:dir:memory/product',
            directoryPath: 'memory/product',
            label: 'memory/product (full)',
            text: `Summary: Product focus\n${'detail '.repeat(500)}`,
            detailLevel: 'full',
            pinned: true,
            tokenEstimate: 1000,
            reasonIncluded: 'Pinned memory directory memory/product',
          },
          {
            id: 'memory:retrieved:memory-1',
            directoryPath: 'memory/customer',
            label: 'memory/customer (overview)',
            text: `Summary: Customer goals\n${'detail '.repeat(500)}`,
            detailLevel: 'full',
            pinned: false,
            tokenEstimate: 1000,
            reasonIncluded: 'Matched memory/customer',
          },
        ],
      },
      contextPolicy: defaultContextPolicy(),
      selectionState,
    });

    expect(assembled.context.compaction.applied).toBe(true);
    expect(assembled.context.compaction.beforeTokens).toBeGreaterThan(assembled.context.compaction.afterTokens);
    expect(assembled.context.compaction.compactedSourceIds).toContain('conversation:message:m0');
    expect(assembled.context.sources.some((source) => source.id === 'conversation:summary')).toBe(true);
    expect(assembled.context.conversation.chatHistory).toHaveLength(2);
    expect(assembled.context.sources.find((source) => source.id === 'memory:dir:memory/product')?.pinned).toBe(true);
  });
});
