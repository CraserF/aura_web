import type { DocumentType, ProjectDocument } from '@/types/project';
import type { ProviderId } from '@/types';

import type { ExemplarPackId, ReferenceStylePackId, TemplateId } from '@/services/ai/templates';

export type ArtifactWorkflowRequestKind =
  | 'create'
  | 'edit'
  | 'restyle'
  | 'rewrite'
  | 'batch'
  | 'queue';

export type WorkflowPreservationIntent = 'content' | 'style' | 'structure' | 'full';

export type WorkflowProviderTier = 'frontier' | 'local-best-effort';
export type PresentationRecipeId =
  | 'title-opening'
  | 'stage-setting'
  | 'editorial-explainer'
  | 'finance-grid'
  | 'metrics-summary'
  | 'comparison'
  | 'quiz-reveal'
  | 'closing-action'
  | 'general-polished';
export type DocumentThemeFamily =
  | 'executive-light'
  | 'editorial-light'
  | 'proposal-light'
  | 'research-light'
  | 'playbook-light'
  | 'infographic-light';

export type QueuedWorkStatus = 'pending' | 'active' | 'done' | 'blocked';

export interface QueuedWorkItem {
  id: string;
  orderIndex: number;
  targetType: 'artifact' | 'slide' | 'section' | 'sheet';
  targetLabel: string;
  operationKind: 'create' | 'edit' | 'restyle' | 'rewrite' | 'formula' | 'query' | 'refresh';
  status: QueuedWorkStatus;
  promptSummary: string;
  recipeId?: PresentationRecipeId;
}

export interface TemplateGuidanceProfile {
  artifactType: DocumentType;
  intentFamily: ArtifactWorkflowRequestKind;
  providerTier: WorkflowProviderTier;
  selectedTemplateId?: TemplateId;
  exemplarPackId?: ExemplarPackId;
  referenceStylePackId?: ReferenceStylePackId;
  presentationRecipeId?: PresentationRecipeId;
  documentThemeFamily?: DocumentThemeFamily;
  designConstraints: string[];
  antiPatterns: string[];
}

export interface ArtifactWorkflowPlan {
  artifactType: DocumentType;
  requestKind: ArtifactWorkflowRequestKind;
  preservationIntent: WorkflowPreservationIntent;
  presentationRecipeId?: PresentationRecipeId;
  documentThemeFamily?: DocumentThemeFamily;
  queueMode: 'none' | 'sequential';
  queuedWorkItems: QueuedWorkItem[];
  templateGuidance: TemplateGuidanceProfile;
  summary: string;
}

export interface WorkflowBenchmarkResult {
  fixtureId: string;
  artifactType: DocumentType;
  providerId: string;
  model?: string;
  timeToFirstProgressMs?: number;
  timeToFirstUsableOutputMs?: number;
  totalCompletionMs?: number;
  progressStayedContinuous: boolean;
  qualityScore: number;
  consistencyScore: number;
  failureClassification?:
    | 'routing-bug'
    | 'workflow-bug'
    | 'provider-capability-mismatch'
    | 'prompt-design-system-issue'
    | 'model-quality-limitation';
  notes?: string;
  evidenceLink?: string;
}

export interface BuildArtifactWorkflowPlanInput {
  prompt: string;
  artifactType: DocumentType;
  operation: 'create' | 'edit' | 'action';
  activeDocument: ProjectDocument | null;
  mode: 'execute' | 'dry-run' | 'explain';
  providerId: ProviderId;
  providerModel?: string;
  editStrategyHint?: string;
  allowFullRegeneration: boolean;
}
