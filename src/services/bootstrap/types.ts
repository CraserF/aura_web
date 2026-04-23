import type { ContextPolicyOverride, DocumentType, WorkflowPresetCollection } from '@/types/project';

// TODO(phase-5): Fill these contracts out as the bootstrap layer lands.

export type StarterArtifactType = DocumentType;

export interface StarterArtifactRef {
  key: string;
  type: StarterArtifactType;
  starterId: string;
}

export interface DocumentStarterTemplate {
  id: string;
  label: string;
  description: string;
  blueprintId: string;
  documentStylePreset?: string;
  seedPrompt?: string;
  initialTitle?: string;
}

export interface SpreadsheetStarterTemplate {
  id: string;
  label: string;
  description: string;
  starterKind: string;
  seedPrompt?: string;
  initialTitle?: string;
}

export interface ProjectStarterKit {
  id: string;
  label: string;
  description: string;
  artifacts: StarterArtifactRef[];
  projectRulesMarkdown?: string;
  contextPolicyOverrides?: ContextPolicyOverride;
  workflowPresets?: WorkflowPresetCollection;
  defaultProjectTitle?: string;
}

export type InitStatus = 'created' | 'updated' | 'skipped';

export interface InitReportItem {
  kind: string;
  target: string;
  status: InitStatus;
  summary: string;
}

export interface InitReport {
  ranAt: number;
  projectId: string;
  items: InitReportItem[];
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
}
