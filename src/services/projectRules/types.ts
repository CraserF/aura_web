import type { DocumentType } from '@/types/project';

export interface ProjectRulesDocument {
  markdown: string;
  updatedAt: number;
}

export interface ContextPolicyOverride {
  includeProjectChat?: boolean;
  includeMemory?: boolean;
  includeAttachments?: boolean;
  includeRelatedDocuments?: boolean;
  maxChatMessages?: number;
  maxMemoryTokens?: number;
  maxRelatedDocuments?: number;
  maxAttachmentChars?: number;
}

export interface ContextPolicy extends ContextPolicyOverride {
  version: number;
  artifactOverrides?: Partial<Record<DocumentType, ContextPolicyOverride>>;
}

export interface WorkflowPreset {
  id: string;
  name: string;
  artifactType?: DocumentType;
  rulesAppendix?: string;
  contextPolicyOverrides?: ContextPolicyOverride;
  documentStylePreset?: string;
  enabled: boolean;
}

export interface WorkflowPresetCollection {
  version: number;
  presets: WorkflowPreset[];
  defaultPresetByArtifact: Partial<Record<DocumentType, string>>;
}

export interface ResolvedProjectRulesSnapshot {
  markdown: string;
  promptBlock: string;
  contextPolicy: ContextPolicy;
  activePresetId?: string;
  diagnostics: import('@/services/configValidate/types').ConfigDiagnostic[];
}
