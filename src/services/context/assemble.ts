import {
  countConversationChars,
  countTextChars,
} from '@/services/ai/debug';
import { compactContextSources } from '@/services/context/compact';
import { selectContextSources, type AssembleContextInput } from '@/services/context/select';
import { summarizeContextValue } from '@/services/context/summarize';
import type { ContextBundle } from '@/services/context/types';

export type { AssembleContextInput } from '@/services/context/select';

export interface AssembledChatContext {
  context: ContextBundle;
  messageScope: 'document' | 'project';
  scopedDocumentId: string | undefined;
}

export function assembleContext(input: AssembleContextInput): AssembledChatContext {
  const selection = selectContextSources(input);
  const compacted = compactContextSources(selection, input.selectionState);

  const attachmentTextContext = compacted.entries
    .filter((entry) => entry.source.id === 'attachments:text')
    .map((entry) => entry.text)
    .join('\n\n');
  const supplementalPromptContext = compacted.entries
    .filter((entry) =>
      entry.source.id === 'conversation:summary'
      || entry.source.id.startsWith('artifact:related:')
      || entry.source.id.startsWith('data:sheet:'),
    )
    .map((entry) => `${entry.source.label}:\n${entry.text}`)
    .join('\n\n');
  const promptWithContext = [
    input.prompt,
    attachmentTextContext,
    supplementalPromptContext ? `Additional context:\n${supplementalPromptContext}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')
    .trim();

  const chatHistory = compacted.entries
    .filter((entry) => entry.channel === 'conversation' && entry.message)
    .map((entry) => entry.message!);
  const memoryText = compacted.entries
    .filter((entry) => entry.channel === 'memory')
    .map((entry) => entry.text)
    .join('\n\n');
  const relatedDocuments = compacted.entries
    .filter((entry) => entry.relatedDocument)
    .map((entry) => entry.relatedDocument!);

  const context: ContextBundle = {
    conversation: {
      prompt: input.prompt,
      promptWithContext,
      chatHistory,
    },
    attachments: {
      files: compacted.attachments.files,
      textContext: summarizeContextValue(attachmentTextContext),
      imageParts: compacted.attachments.imageParts,
    },
    artifact: {
      activeDocument: compacted.artifact.activeDocument,
      activeWorkbook: compacted.artifact.activeWorkbook,
      existingContentHtml: compacted.artifact.existingContentHtml,
      existingMarkdown: compacted.artifact.existingMarkdown,
      relatedDocuments,
    },
    memory: {
      text: summarizeContextValue(memoryText),
    },
    data: compacted.data,
    metrics: {
      promptChars: countTextChars(input.prompt),
      promptWithContextChars: countTextChars(promptWithContext),
      chatHistoryChars: countConversationChars(chatHistory),
      memoryContextChars: countTextChars(memoryText),
      artifactContextChars: compacted.entries
        .filter((entry) => entry.channel === 'artifact')
        .reduce((total, entry) => total + entry.source.charCount, 0),
      attachmentContextChars: countTextChars(attachmentTextContext),
      estimatedTotalTokens: compacted.entries.reduce((total, entry) => total + entry.source.tokenEstimate, 0),
    },
    sources: compacted.entries.map((entry) => entry.source),
    compaction: compacted.compaction,
  };

  return {
    context,
    messageScope: compacted.messageScope,
    scopedDocumentId: compacted.scopedDocumentId,
  };
}
