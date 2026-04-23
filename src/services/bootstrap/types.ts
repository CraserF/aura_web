import type {
  ContextPolicyOverride,
  DocumentType,
  ProjectDocumentStarterRef,
  WorkflowPresetCollection,
} from '@/types/project';

export type StarterArtifactType = DocumentType;

export interface PresentationStarterTemplate {
  id: string;
  label: string;
  description: string;
  templateId: string;
  initialTitle?: string;
}

export interface ProjectStarterArtifact {
  key: string;
  type: StarterArtifactType;
  starterId: string;
  initialTitle?: string;
}

export interface DocumentStarterTemplate {
  id: string;
  label: string;
  description: string;
  blueprintId: string;
  documentType?: string;
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
  artifacts: ProjectStarterArtifact[];
  projectRulesMarkdown?: string;
  contextPolicyOverrides?: ContextPolicyOverride;
  workflowPresets?: WorkflowPresetCollection;
  defaultProjectTitle?: string;
}

export interface InitProjectOptions {
  starterKitId?: string;
  artifacts?: ProjectStarterArtifact[];
  defaultProjectTitle?: string;
  projectRulesMarkdown?: string;
  contextPolicyOverrides?: ContextPolicyOverride;
  workflowPresets?: WorkflowPresetCollection;
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

export interface StarterArtifactBuildResult {
  title: string;
  type: StarterArtifactType;
  contentHtml: string;
  themeCss: string;
  slideCount: number;
  description?: string;
  sourceMarkdown?: string;
  workbook?: import('@/types/project').WorkbookMeta;
  starterRef: ProjectDocumentStarterRef;
}
