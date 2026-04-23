import type {
  ContextPolicy,
  ProjectRulesDocument,
  WorkflowPresetCollection,
} from '@/services/projectRules/types';

export function defaultProjectRules(): ProjectRulesDocument {
  return {
    markdown: '',
    updatedAt: 0,
  };
}

export function defaultContextPolicy(): ContextPolicy {
  return {
    version: 1,
    includeProjectChat: true,
    includeMemory: true,
    includeAttachments: true,
    includeRelatedDocuments: true,
    maxChatMessages: 12,
    maxMemoryTokens: 1200,
    maxRelatedDocuments: 6,
    maxAttachmentChars: 12000,
    artifactOverrides: {},
  };
}

export function defaultWorkflowPresets(): WorkflowPresetCollection {
  return {
    version: 1,
    presets: [],
    defaultPresetByArtifact: {},
  };
}
