import { createInitialMemoryTree } from '@/services/memory';
import {
  defaultContextPolicy,
  defaultProjectRules,
  defaultWorkflowPresets,
} from '@/services/projectRules/defaults';
import type { ProjectData } from '@/types/project';

// TODO(phase-5): Move starter-aware project helpers here.
export function createBlankProject(): ProjectData {
  return {
    id: crypto.randomUUID(),
    title: 'Untitled Project',
    description: '',
    visibility: 'private',
    documents: [],
    activeDocumentId: null,
    chatHistory: [],
    memoryTree: createInitialMemoryTree(),
    media: [],
    projectRules: defaultProjectRules(),
    contextPolicy: defaultContextPolicy(),
    workflowPresets: defaultWorkflowPresets(),
    sections: { drafts: [], main: [], suggestions: [], issues: [] },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
