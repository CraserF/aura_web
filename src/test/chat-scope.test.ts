import { describe, expect, it } from 'vitest';

import {
  buildScopedChatHistory,
  isMessageInChatScope,
  resolveOutgoingMessageScope,
} from '@/services/chat/routing';
import type { ChatMessage } from '@/types';

const messages: ChatMessage[] = [
  {
    id: 'project-user',
    role: 'user',
    content: 'Project-wide instruction',
    timestamp: 1,
    scope: 'project',
  },
  {
    id: 'doc-a-user',
    role: 'user',
    content: 'Refine document A',
    timestamp: 2,
    documentId: 'doc-a',
    scope: 'document',
  },
  {
    id: 'doc-b-assistant',
    role: 'assistant',
    content: 'Updated document B',
    timestamp: 3,
    documentId: 'doc-b',
    scope: 'document',
  },
];

describe('chat scope', () => {
  it('uses document scope only when a document is active and multi-doc mode is off', () => {
    expect(resolveOutgoingMessageScope('doc-a', false)).toEqual({
      messageScope: 'document',
      scopedDocumentId: 'doc-a',
    });
  });

  it('falls back to project scope when multi-doc mode is on or nothing is active', () => {
    expect(resolveOutgoingMessageScope('doc-a', true)).toEqual({
      messageScope: 'project',
      scopedDocumentId: undefined,
    });
    expect(resolveOutgoingMessageScope(null, false)).toEqual({
      messageScope: 'project',
      scopedDocumentId: undefined,
    });
  });

  it('filters document-scoped chat visibility without hiding project-scoped messages', () => {
    expect(isMessageInChatScope(messages[0]!, 'doc-a', false)).toBe(true);
    expect(isMessageInChatScope(messages[1]!, 'doc-a', false)).toBe(true);
    expect(isMessageInChatScope(messages[2]!, 'doc-a', false)).toBe(false);
  });

  it('includes every message when show-all mode is enabled', () => {
    expect(messages.every((message) => isMessageInChatScope(message, 'doc-a', true))).toBe(true);
  });

  it('builds scoped chat history from only visible messages', () => {
    expect(buildScopedChatHistory(messages, 'doc-a', false)).toEqual([
      { role: 'user', content: 'Project-wide instruction' },
      { role: 'user', content: 'Refine document A' },
    ]);
  });
});
