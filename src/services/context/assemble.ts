import { buildAttachmentContext } from '@/lib/fileAttachment';
import { resolveOutgoingMessageScope } from '@/services/chat/routing';
import {
  countConversationChars,
  countTextChars,
} from '@/services/ai/debug';
import type { FileAttachment } from '@/types';
import type { AIImagePart } from '@/services/ai/types';
import type { ChatMessage } from '@/types';
import type { ContextPolicy, ProjectData, ProjectDocument } from '@/types/project';

import { estimateContextTokens } from '@/services/context/budgets';
import { getActiveWorkbook, getExistingArtifactText, getRelatedDocuments } from '@/services/context/selectors';
import { summarizeContextValue } from '@/services/context/summarize';
import type { ContextBundle, ContextSource } from '@/services/context/types';

export interface AssembleContextInput {
  prompt: string;
  attachments: FileAttachment[];
  messages: ProjectData['chatHistory'];
  activeDocument: ProjectDocument | null;
  project: ProjectData;
  showAllMessages: boolean;
  applyToAllDocuments: boolean;
  memoryContext: string;
  contextPolicy: ContextPolicy;
}

export interface AssembledChatContext {
  context: ContextBundle;
  messageScope: 'document' | 'project';
  scopedDocumentId: string | undefined;
}

export function assembleContext(input: AssembleContextInput): AssembledChatContext {
  const {
    prompt,
    attachments,
    messages,
    activeDocument,
    project,
    showAllMessages,
    applyToAllDocuments,
    memoryContext,
    contextPolicy,
  } = input;

  const { messageScope, scopedDocumentId } = resolveOutgoingMessageScope(
    activeDocument?.id,
    applyToAllDocuments,
  );
  const maxChatMessages = contextPolicy.maxChatMessages ?? 0;
  const maxAttachmentChars = contextPolicy.maxAttachmentChars ?? 0;
  const maxRelatedDocuments = contextPolicy.maxRelatedDocuments ?? 0;
  const maxMemoryTokens = contextPolicy.maxMemoryTokens ?? 0;
  const selectedMessages = selectContextMessages(messages, activeDocument?.id, showAllMessages, contextPolicy);
  const limitedMessages = maxChatMessages > 0
    ? selectedMessages.slice(-maxChatMessages)
    : [];
  const attachmentTextContext = contextPolicy.includeAttachments
    ? clampContextText(buildAttachmentContext(attachments), maxAttachmentChars)
    : '';
  const promptWithContext = (attachmentTextContext ? `${prompt}${attachmentTextContext}` : prompt).trim();
  const chatHistory = limitedMessages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
  const imageParts: AIImagePart[] = (contextPolicy.includeAttachments ? attachments : [])
    .filter((attachment) => attachment.kind === 'image')
    .map((attachment) => ({
      type: 'image',
      image: attachment.content,
      mimeType: attachment.mimeType,
    }));
  const activeWorkbook = getActiveWorkbook(activeDocument);
  const { existingContentHtml, existingMarkdown } = getExistingArtifactText(activeDocument);
  const relatedDocuments = contextPolicy.includeRelatedDocuments
    ? getRelatedDocuments(project, activeDocument, maxRelatedDocuments)
    : [];
  const normalizedMemoryContext = contextPolicy.includeMemory
    ? clampContextText(memoryContext, maxMemoryTokens * 4)
    : '';

  const sources: ContextSource[] = [
    { kind: 'conversation' as const, label: 'prompt', charCount: countTextChars(prompt) },
    { kind: 'conversation' as const, label: 'chat-history', charCount: countConversationChars(chatHistory) },
    { kind: 'attachments' as const, label: 'attachment-text', charCount: countTextChars(attachmentTextContext) },
    { kind: 'artifact' as const, label: 'artifact-html', charCount: countTextChars(existingContentHtml) },
    { kind: 'artifact' as const, label: 'artifact-markdown', charCount: countTextChars(existingMarkdown) },
    { kind: 'memory' as const, label: 'memory-context', charCount: countTextChars(memoryContext) },
  ].filter((source) => source.charCount > 0);

  const context: ContextBundle = {
    conversation: {
      prompt,
      promptWithContext,
      chatHistory,
    },
    attachments: {
      files: attachments,
      textContext: summarizeContextValue(attachmentTextContext),
      imageParts,
    },
    artifact: {
      activeDocument,
      activeWorkbook,
      existingContentHtml,
      existingMarkdown,
      relatedDocuments,
    },
    memory: {
      text: summarizeContextValue(normalizedMemoryContext),
    },
    data: {
      projectId: project.id,
      projectDocumentCount: project.documents.length,
    },
    metrics: {
      promptChars: countTextChars(prompt),
      promptWithContextChars: countTextChars(promptWithContext),
      chatHistoryChars: countConversationChars(chatHistory),
      memoryContextChars: countTextChars(normalizedMemoryContext),
      artifactContextChars:
        countTextChars(existingContentHtml) +
        countTextChars(existingMarkdown) +
        countTextChars(activeWorkbook ? JSON.stringify(activeWorkbook) : ''),
      attachmentContextChars: countTextChars(attachmentTextContext),
      estimatedTotalTokens: estimateContextTokens([
        promptWithContext,
        normalizedMemoryContext,
        existingContentHtml,
        existingMarkdown,
        activeWorkbook ? JSON.stringify(activeWorkbook) : '',
        ...chatHistory.map((message) => message.content),
      ]),
    },
    sources,
  };

  return {
    context,
    messageScope,
    scopedDocumentId,
  };
}

function clampContextText(value: string, maxChars: number): string {
  if (maxChars <= 0) return '';
  return value.length <= maxChars ? value : value.slice(0, maxChars);
}

function selectContextMessages(
  messages: ChatMessage[],
  activeDocumentId: string | null | undefined,
  showAllMessages: boolean,
  contextPolicy: ContextPolicy,
): ChatMessage[] {
  const inScope = messages.filter((message) => {
    if (showAllMessages || !activeDocumentId) return true;
    return message.scope === 'project' || !message.documentId || message.documentId === activeDocumentId;
  });

  if (contextPolicy.includeProjectChat) {
    return inScope;
  }

  if (!activeDocumentId) {
    return [];
  }

  return inScope.filter((message) => message.documentId === activeDocumentId);
}
