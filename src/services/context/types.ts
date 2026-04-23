import type { AIImagePart, AIMessage } from '@/services/ai/types';
import type { FileAttachment } from '@/types';
import type { ProjectDocument, WorkbookMeta } from '@/types/project';

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
  label: string;
  charCount: number;
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
    projectDocumentCount: number;
  };
  metrics: ContextMetricSet;
  sources: ContextSource[];
}

// TODO(phase-1): Split artifact/data payloads more aggressively once targeted
// context selection lands for all artifact types.
