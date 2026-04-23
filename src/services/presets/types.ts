import type { DocumentType, WorkflowPreset, WorkflowPresetCollection } from '@/types/project';

export interface AppliedWorkflowPreset {
  id: string;
  name: string;
  artifactType?: DocumentType;
  rulesAppendix?: string;
}

export interface ResolvedWorkflowPresetState {
  presets: WorkflowPresetCollection;
  defaultPreset?: WorkflowPreset;
  selectedPreset?: WorkflowPreset;
  appliedPreset?: AppliedWorkflowPreset;
}

// TODO(phase-8): Expand preset metadata once lifecycle and save/duplicate flows land.
