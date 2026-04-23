import { buildAttachmentContext } from '@/lib/fileAttachment';
import { buildScopedChatHistory, resolveOutgoingMessageScope } from '@/services/chat/routing';
import {
  countConversationChars,
  countTextChars,
} from '@/services/ai/debug';
import type { FileAttachment } from '@/types';
import type { AIImagePart } from '@/services/ai/types';
import type { ProjectData, ProjectDocument } from '@/types/project';

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
  } = input;

  const { messageScope, scopedDocumentId } = resolveOutgoingMessageScope(
    activeDocument?.id,
    applyToAllDocuments,
  );
  const attachmentTextContext = buildAttachmentContext(attachments);
  const promptWithContext = (attachmentTextContext ? `${prompt}${attachmentTextContext}` : prompt).trim();
  const chatHistory = buildScopedChatHistory(messages, activeDocument?.id, showAllMessages);
  const imageParts: AIImagePart[] = attachments
    .filter((attachment) => attachment.kind === 'image')
    .map((attachment) => ({
      type: 'image',
      image: attachment.content,
      mimeType: attachment.mimeType,
    }));
  const activeWorkbook = getActiveWorkbook(activeDocument);
  const { existingContentHtml, existingMarkdown } = getExistingArtifactText(activeDocument);
  const relatedDocuments = getRelatedDocuments(project, activeDocument);

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
      text: summarizeContextValue(memoryContext),
    },
    data: {
      projectId: project.id,
      projectDocumentCount: project.documents.length,
    },
    metrics: {
      promptChars: countTextChars(prompt),
      promptWithContextChars: countTextChars(promptWithContext),
      chatHistoryChars: countConversationChars(chatHistory),
      memoryContextChars: countTextChars(memoryContext),
      artifactContextChars:
        countTextChars(existingContentHtml) +
        countTextChars(existingMarkdown) +
        countTextChars(activeWorkbook ? JSON.stringify(activeWorkbook) : ''),
      attachmentContextChars: countTextChars(attachmentTextContext),
      estimatedTotalTokens: estimateContextTokens([
        promptWithContext,
        memoryContext,
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
