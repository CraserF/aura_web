import { detectWorkflowType } from '@/lib/workflowType';
import type { AIMessage } from '@/services/ai/types';
import type { ChatMessage } from '@/types';
import type { DocumentType } from '@/types/project';

export type ChatMessageScope = 'document' | 'project';

export function isMessageInChatScope(
  message: ChatMessage,
  activeDocumentId: string | null | undefined,
  showAllMessages: boolean,
): boolean {
  if (showAllMessages || !activeDocumentId) return true;
  return message.scope === 'project' || !message.documentId || message.documentId === activeDocumentId;
}

export function buildScopedChatHistory(
  messages: ChatMessage[],
  activeDocumentId: string | null | undefined,
  showAllMessages: boolean,
): AIMessage[] {
  return messages
    .filter((message) => isMessageInChatScope(message, activeDocumentId, showAllMessages))
    .map((message) => ({
      role: message.role,
      content: message.content,
    }));
}

export function resolveOutgoingMessageScope(
  activeDocumentId: string | null | undefined,
  applyToAllDocuments: boolean,
): { messageScope: ChatMessageScope; scopedDocumentId: string | undefined } {
  const messageScope: ChatMessageScope =
    applyToAllDocuments || !activeDocumentId ? 'project' : 'document';

  return {
    messageScope,
    scopedDocumentId: messageScope === 'document' ? (activeDocumentId ?? undefined) : undefined,
  };
}

export function resolveChatWorkflowType(
  prompt: string,
  activeDocumentType?: DocumentType | null,
): DocumentType {
  return activeDocumentType ?? detectWorkflowType(prompt);
}
