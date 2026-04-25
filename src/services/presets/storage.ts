import type { ProjectData, WorkflowPresetCollection } from '@/types/project';

import { loadWorkflowPresets } from '@/services/projectRules/load';

export function loadPresetCollection(value?: unknown): WorkflowPresetCollection {
  return loadWorkflowPresets(value);
}

export function savePresetCollection(
  project: ProjectData,
  workflowPresets: WorkflowPresetCollection,
): ProjectData {
  return {
    ...project,
    workflowPresets,
    updatedAt: Date.now(),
  };
}

// TODO(phase-8): Add save/duplicate/edit helpers for preset management UI.
