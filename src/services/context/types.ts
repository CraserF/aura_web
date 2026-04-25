import type { AIImagePart, AIMessage } from '@/services/ai/types';
import type { FileAttachment } from '@/types';
import type { ProjectDocument, WorkbookMeta } from '@/types/project';

export type ContextDetailLevel = 'full' | 'overview' | 'compact';
export type ContextScopeMode = 'auto' | 'current-artifact' | 'selected-artifacts' | 'project';
export type ContextCompactionMode = 'off' | 'auto';

export interface PinnedSheetRef {
  documentId: string;
  sheetId: string;
}

export interface ContextSelectionState {
  scopeMode: ContextScopeMode;
  pinnedDocumentIds: string[];
  pinnedMemoryPaths: string[];
  pinnedSheetRefs: PinnedSheetRef[];
  excludedSourceIds: string[];
  compactionMode: ContextCompactionMode;
  recentMessageCount: number;
}

export function createDefaultContextSelectionState(): ContextSelectionState {
  return {
    scopeMode: 'auto',
    pinnedDocumentIds: [],
    pinnedMemoryPaths: [],
    pinnedSheetRefs: [],
    excludedSourceIds: [],
    compactionMode: 'auto',
    recentMessageCount: 6,
  };
}

export interface ContextMetricSet {
  promptChars: number;
  promptWithContextChars: number;
  chatHistoryChars: number;
  memoryContextChars: number;
  artifactContextChars: number;
  attachmentContextChars: number;
  estimatedTotalTokens: number;
}

export interface ContextSource {
  kind: 'conversation' | 'attachments' | 'artifact' | 'memory' | 'data';
  id: string;
  label: string;
  reasonIncluded: string;
  tokenEstimate: number;
  detailLevel: ContextDetailLevel;
  pinned: boolean;
  excluded: boolean;
  compacted: boolean;
  charCount: number;
}

export interface ContextCompactionSummary {
  applied: boolean;
  beforeTokens: number;
  afterTokens: number;
  strategy: string;
  compactedSourceIds: string[];
}

export interface ContextBundle {
  conversation: {
    prompt: string;
    promptWithContext: string;
    chatHistory: AIMessage[];
  };
  attachments: {
    files: FileAttachment[];
    textContext: string;
    imageParts: AIImagePart[];
  };
  artifact: {
    activeDocument: ProjectDocument | null;
    activeWorkbook: WorkbookMeta | null;
    existingContentHtml?: string;
    existingMarkdown?: string;
    relatedDocuments: Array<Pick<ProjectDocument, 'id' | 'title' | 'type'>>;
  };
  memory: {
    text: string;
  };
  data: {
    projectId: string;
    projectDocumentCount: number;
  };
  metrics: ContextMetricSet;
  sources: ContextSource[];
  compaction: ContextCompactionSummary;
}

// TODO(phase-1): Split artifact/data payloads more aggressively once targeted
// context selection lands for all artifact types.
