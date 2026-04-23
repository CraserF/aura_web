import { buildAttachmentContext } from '@/lib/fileAttachment';
import type { AIImagePart, AIMessage } from '@/services/ai/types';
import { resolveOutgoingMessageScope } from '@/services/chat/routing';
import { estimateTokenCount } from '@/services/memory';
import type { MemoryContextBuildResult } from '@/services/memory';
import {
  getActiveWorkbook,
  getExistingArtifactText,
  getRelatedDocuments,
} from '@/services/context/selectors';
import { stripHtmlToText, summarizeContextValue, summarizeForDetailLevel } from '@/services/context/summarize';
import type {
  ContextDetailLevel,
  ContextSelectionState,
  ContextSource,
} from '@/services/context/types';
import type { ChatMessage, FileAttachment } from '@/types';
import type { ContextPolicy, ProjectData, ProjectDocument, WorkbookMeta } from '@/types/project';

export interface AssembleContextInput {
  prompt: string;
  attachments: FileAttachment[];
  messages: ProjectData['chatHistory'];
  activeDocument: ProjectDocument | null;
  project: ProjectData;
  showAllMessages: boolean;
  applyToAllDocuments: boolean;
  memoryContext: string;
  memoryContextResult?: MemoryContextBuildResult;
  contextPolicy: ContextPolicy;
  selectionState: ContextSelectionState;
}

export interface SelectedContextEntry {
  source: ContextSource;
  text: string;
  channel: 'prompt' | 'conversation' | 'attachments' | 'artifact' | 'memory' | 'data';
  message?: AIMessage;
  relatedDocument?: Pick<ProjectDocument, 'id' | 'title' | 'type'>;
  variants?: Partial<Record<ContextDetailLevel, string>>;
}

export interface ContextSelectionResult {
  messageScope: 'document' | 'project';
  scopedDocumentId: string | undefined;
  entries: SelectedContextEntry[];
  attachments: {
    files: FileAttachment[];
    imageParts: AIImagePart[];
  };
  artifact: {
    activeDocument: ProjectDocument | null;
    activeWorkbook: WorkbookMeta | null;
    existingContentHtml?: string;
    existingMarkdown?: string;
    relatedDocuments: Array<Pick<ProjectDocument, 'id' | 'title' | 'type'>>;
  };
  data: {
    projectId: string;
    projectDocumentCount: number;
  };
}

export function selectContextSources(input: AssembleContextInput): ContextSelectionResult {
  const {
    prompt,
    attachments,
    messages,
    activeDocument,
    project,
    showAllMessages,
    applyToAllDocuments,
    memoryContextResult,
    contextPolicy,
    selectionState,
  } = input;

  const { messageScope, scopedDocumentId } = resolveOutgoingMessageScope(
    activeDocument?.id,
    applyToAllDocuments,
  );
  const activeWorkbook = getActiveWorkbook(activeDocument);
  const { existingContentHtml, existingMarkdown } = getExistingArtifactText(activeDocument);
  const relatedDocuments = resolveSelectedDocuments(project, activeDocument, selectionState, contextPolicy);

  const entries: SelectedContextEntry[] = [];
  entries.push(makeSourceEntry({
    channel: 'prompt',
    kind: 'conversation',
    id: 'conversation:prompt',
    label: 'Prompt',
    reasonIncluded: 'Current user prompt',
    detailLevel: 'full',
    text: prompt,
  }));

  const selectedMessages = selectConversationMessages(
    messages,
    activeDocument,
    showAllMessages,
    selectionState,
    contextPolicy,
  );
  for (const message of selectedMessages) {
    entries.push(makeSourceEntry({
      channel: 'conversation',
      kind: 'conversation',
      id: `conversation:message:${message.id}`,
      label: message.role === 'user' ? 'User message' : 'Assistant message',
      reasonIncluded: 'Message is in the active runtime scope',
      detailLevel: 'full',
      text: message.content,
      message: {
        role: message.role,
        content: message.content,
      },
    }));
  }

  const attachmentTextContext = contextPolicy.includeAttachments
    ? buildAttachmentContext(attachments).slice(0, contextPolicy.maxAttachmentChars ?? Number.MAX_SAFE_INTEGER)
    : '';
  if (attachmentTextContext && !selectionState.excludedSourceIds.includes('attachments:text')) {
    entries.push(makeSourceEntry({
      channel: 'attachments',
      kind: 'attachments',
      id: 'attachments:text',
      label: 'Attachment text',
      reasonIncluded: 'Text attachments are enabled by context policy',
      detailLevel: 'full',
      text: attachmentTextContext,
    }));
  }

  for (const attachment of attachments.filter((item) => item.kind === 'image')) {
    const sourceId = `attachments:image:${attachment.id}`;
    if (selectionState.excludedSourceIds.includes(sourceId)) continue;
    entries.push({
      source: {
        kind: 'attachments',
        id: sourceId,
        label: attachment.name,
        reasonIncluded: 'Image attachment is available to the active run',
        tokenEstimate: 0,
        detailLevel: 'full',
        pinned: false,
        excluded: false,
        compacted: false,
        charCount: 0,
      },
      text: '',
      channel: 'attachments',
    });
  }

  if (existingContentHtml) {
    entries.push(makeSourceEntry({
      channel: 'artifact',
      kind: 'artifact',
      id: `artifact:html:${activeDocument?.id ?? 'none'}`,
      label: 'Active artifact HTML',
      reasonIncluded: 'Current artifact HTML is part of the editing context',
      detailLevel: 'full',
      text: existingContentHtml,
      pinned: true,
    }));
  }

  if (existingMarkdown) {
    entries.push(makeSourceEntry({
      channel: 'artifact',
      kind: 'artifact',
      id: `artifact:markdown:${activeDocument?.id ?? 'none'}`,
      label: 'Active artifact markdown',
      reasonIncluded: 'Current artifact markdown is part of the editing context',
      detailLevel: 'full',
      text: existingMarkdown,
      pinned: true,
    }));
  }

  for (const document of relatedDocuments) {
    const sourceId = `artifact:related:${document.id}`;
    if (selectionState.excludedSourceIds.includes(sourceId)) continue;
    const summary = buildDocumentSummary(project.documents.find((entry) => entry.id === document.id));
    if (!summary) continue;
    entries.push(makeSourceEntry({
      channel: 'artifact',
      kind: 'artifact',
      id: sourceId,
      label: document.title,
      reasonIncluded: selectionState.pinnedDocumentIds.includes(document.id)
        ? 'Pinned document'
        : 'Related project artifact',
      detailLevel: 'full',
      text: summary.full,
      variants: summary,
      pinned: selectionState.pinnedDocumentIds.includes(document.id),
      relatedDocument: document,
    }));
  }

  for (const pinnedSheetRef of selectionState.pinnedSheetRefs) {
    const sourceId = `data:sheet:${pinnedSheetRef.documentId}:${pinnedSheetRef.sheetId}`;
    if (selectionState.excludedSourceIds.includes(sourceId)) continue;
    const doc = project.documents.find((entry) => entry.id === pinnedSheetRef.documentId && entry.type === 'spreadsheet');
    const sheet = doc?.workbook?.sheets.find((entry) => entry.id === pinnedSheetRef.sheetId);
    if (!doc || !sheet) continue;
    const text = [
      `Pinned sheet: ${doc.title} / ${sheet.name}`,
      `Columns: ${sheet.schema.map((column) => `${column.name} (${column.type})`).join(', ') || 'none'}`,
    ].join('\n');
    entries.push(makeSourceEntry({
      channel: 'data',
      kind: 'data',
      id: sourceId,
      label: `${doc.title} / ${sheet.name}`,
      reasonIncluded: 'Pinned spreadsheet sheet',
      detailLevel: 'overview',
      text,
      pinned: true,
    }));
  }

  let addedStructuredMemory = false;
  if (memoryContextResult) {
    for (const item of memoryContextResult.items) {
      const sourceId = item.id.startsWith('memory:dir:') ? item.id : `memory:item:${item.id}`;
      if (selectionState.excludedSourceIds.includes(sourceId)) continue;
      entries.push(makeSourceEntry({
        channel: 'memory',
        kind: 'memory',
        id: sourceId,
        label: item.label,
        reasonIncluded: item.reasonIncluded,
        detailLevel: item.detailLevel,
        text: item.text,
        variants: {
          full: item.text,
          overview: summarizeForDetailLevel(item.text, 'overview'),
          compact: summarizeForDetailLevel(item.text, 'compact'),
        },
        pinned: item.pinned,
      }));
      addedStructuredMemory = true;
    }
  }

  if (!addedStructuredMemory && input.memoryContext && !selectionState.excludedSourceIds.includes('memory:text')) {
    const cappedMemoryText = input.memoryContext.slice(0, (contextPolicy.maxMemoryTokens ?? 1200) * 4);
    entries.push(makeSourceEntry({
      channel: 'memory',
      kind: 'memory',
      id: 'memory:text',
      label: 'Memory context',
      reasonIncluded: 'Resolved memory context for the active run',
      detailLevel: 'overview',
      text: cappedMemoryText,
      variants: {
        full: cappedMemoryText,
        overview: summarizeForDetailLevel(cappedMemoryText, 'overview'),
        compact: summarizeForDetailLevel(cappedMemoryText, 'compact'),
      },
    }));
  }

  return {
    messageScope,
    scopedDocumentId,
    entries,
    attachments: {
      files: attachments,
      imageParts: attachments
        .filter((attachment) => attachment.kind === 'image')
        .map((attachment) => ({
          type: 'image' as const,
          image: attachment.content,
          mimeType: attachment.mimeType,
        })),
    },
    artifact: {
      activeDocument,
      activeWorkbook,
      existingContentHtml,
      existingMarkdown,
      relatedDocuments,
    },
    data: {
      projectId: project.id,
      projectDocumentCount: project.documents.length,
    },
  };
}

interface MakeSourceEntryInput {
  channel: SelectedContextEntry['channel'];
  kind: ContextSource['kind'];
  id: string;
  label: string;
  reasonIncluded: string;
  detailLevel: ContextDetailLevel;
  text: string;
  message?: AIMessage;
  pinned?: boolean;
  relatedDocument?: Pick<ProjectDocument, 'id' | 'title' | 'type'>;
  variants?: Partial<Record<ContextDetailLevel, string>>;
}

function makeSourceEntry(input: MakeSourceEntryInput): SelectedContextEntry {
  const {
    channel,
    kind,
    id,
    label,
    reasonIncluded,
    detailLevel,
    text,
    message,
    pinned = false,
    relatedDocument,
  } = input;

  return {
    source: {
      kind,
      id,
      label,
      reasonIncluded,
      tokenEstimate: estimateTokenCount(text),
      detailLevel,
      pinned,
      excluded: false,
      compacted: false,
      charCount: text.length,
    },
    text,
    channel,
    ...(message ? { message } : {}),
    ...(relatedDocument ? { relatedDocument } : {}),
    ...(input.variants ? { variants: input.variants } : {}),
  } as SelectedContextEntry;
}

function selectConversationMessages(
  messages: ChatMessage[],
  activeDocument: ProjectDocument | null,
  showAllMessages: boolean,
  selectionState: ContextSelectionState,
  contextPolicy: ContextPolicy,
): ChatMessage[] {
  const filterProjectMessages = !contextPolicy.includeProjectChat;
  const maxChatMessages = Math.max(0, contextPolicy.maxChatMessages ?? messages.length);

  const scopedMessages = messages.filter((message) => {
    if (filterProjectMessages && message.scope === 'project') {
      return false;
    }

    return true;
  });

  let selectedMessages: ChatMessage[];
  if (selectionState.scopeMode === 'project' || showAllMessages) {
    selectedMessages = scopedMessages;
  } else if (selectionState.scopeMode === 'selected-artifacts') {
    const allowedIds = new Set([
      activeDocument?.id,
      ...selectionState.pinnedDocumentIds,
    ].filter(Boolean));
    selectedMessages = scopedMessages.filter((message) =>
      message.scope === 'project' || !message.documentId || allowedIds.has(message.documentId),
    );
  } else if (selectionState.scopeMode === 'current-artifact') {
    if (!activeDocument?.id) return [];
    selectedMessages = scopedMessages.filter((message) => message.documentId === activeDocument.id);
  } else if (!activeDocument?.id) {
    selectedMessages = scopedMessages;
  } else {
    selectedMessages = scopedMessages.filter((message) =>
      message.scope === 'project' || !message.documentId || message.documentId === activeDocument.id,
    );
  }

  if (maxChatMessages === 0) {
    return [];
  }

  return selectedMessages.slice(-maxChatMessages);
}

function resolveSelectedDocuments(
  project: ProjectData,
  activeDocument: ProjectDocument | null,
  selectionState: ContextSelectionState,
  contextPolicy: ContextPolicy,
): Array<Pick<ProjectDocument, 'id' | 'title' | 'type'>> {
  const allRelated = getRelatedDocuments(
    project,
    activeDocument,
    contextPolicy.maxRelatedDocuments ?? Number.MAX_SAFE_INTEGER,
  );

  if (selectionState.scopeMode === 'current-artifact') {
    return allRelated.filter((document) => selectionState.pinnedDocumentIds.includes(document.id));
  }

  if (selectionState.scopeMode === 'selected-artifacts') {
    return allRelated.filter((document) => selectionState.pinnedDocumentIds.includes(document.id));
  }

  if (selectionState.scopeMode === 'project') {
    return project.documents
      .filter((document) => document.id !== activeDocument?.id)
      .map((document) => ({ id: document.id, title: document.title, type: document.type }));
  }

  const pinned = allRelated.filter((document) => selectionState.pinnedDocumentIds.includes(document.id));
  const remaining = allRelated.filter((document) => !selectionState.pinnedDocumentIds.includes(document.id));
  return [...pinned, ...remaining];
}

function buildDocumentSummary(document: ProjectDocument | undefined): Record<ContextDetailLevel, string> | null {
  if (!document) return null;

  const baseText = document.type === 'document'
    ? summarizeContextValue(document.sourceMarkdown) || stripHtmlToText(document.contentHtml)
    : stripHtmlToText(document.contentHtml);
  const header = `${document.type === 'presentation' ? 'Presentation' : document.type === 'spreadsheet' ? 'Spreadsheet' : 'Document'}: ${document.title}`;
  const full = [header, summarizeForDetailLevel(baseText, 'overview')].filter(Boolean).join('\n');
  return {
    full,
    overview: summarizeForDetailLevel(full, 'overview'),
    compact: summarizeForDetailLevel(full, 'compact'),
  };
}
