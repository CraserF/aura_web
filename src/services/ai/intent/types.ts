import type { ClarifyOption } from '@/types';
import type { DocumentType } from '@/types/project';

export type IntentOperation = 'create' | 'edit' | 'action';
export type IntentScope = 'document' | 'project';

export interface IntentClarification {
  required: boolean;
  question: string;
  options: ClarifyOption[];
}

export interface ResolvedIntent {
  artifactType: DocumentType;
  operation: IntentOperation;
  scope: IntentScope;
  targetDocumentId?: string;
  targetSheetId?: string;
  confidence: number;
  needsClarification: boolean;
  reason: string;
  clarification?: IntentClarification;
}

// TODO(phase-1): Expand this contract once routing and clarification behavior move
// entirely behind the intent service boundary.
