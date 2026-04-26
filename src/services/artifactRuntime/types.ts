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

export type ArtifactRunPlanVersion = 1;

export type ArtifactRuntimeRole =
  | 'planner'
  | 'design-director'
  | 'generator'
  | 'validator'
  | 'repairer'
  | 'finalizer';

export type ArtifactPartKind =
  | 'deck'
  | 'slide'
  | 'section'
  | 'document-shell'
  | 'document-module'
  | 'workbook-action'
  | 'formula'
  | 'query'
  | 'chart'
  | 'validation-result';

export type ArtifactPartStatus = 'pending' | 'active' | 'done' | 'failed';

export interface ArtifactProviderPolicy {
  tier: WorkflowProviderTier;
  mode: 'frontier-quality' | 'local-constrained';
  maxRepairPasses: number;
  secondaryEvaluation: 'enabled' | 'skip';
  generationGranularity: 'artifact' | 'part';
}

export interface DesignManifest {
  id: string;
  artifactType: DocumentType;
  family: string;
  templateId?: string;
  recipeId?: PresentationRecipeId;
  typography: {
    coverH1Px: string;
    contentH2Px: string;
    bodyPx: string;
    labelMinPx: number;
  };
  colors: {
    mode: 'light' | 'dark';
    background: string;
    text: string;
    accent: string;
  };
  layoutRecipes: string[];
  componentClasses: string[];
  iconAndDiagramRules: string[];
  motionBudget: {
    maxAnimatedSystems: number;
    reducedMotionRequired: true;
  };
  canvasContract: string[];
}

export interface ArtifactPart {
  id: string;
  artifactType: DocumentType;
  kind: ArtifactPartKind;
  orderIndex: number;
  title: string;
  brief: string;
  status: ArtifactPartStatus;
  sourceWorkItemId?: QueuedWorkItem['id'];
  recipeId?: PresentationRecipeId;
}

export interface ValidationGate {
  id: string;
  artifactType: DocumentType;
  label: string;
  severity: 'blocking' | 'advisory';
  status: 'pending' | 'passed' | 'failed' | 'skipped';
  checks: string[];
}

export interface ArtifactRuntimeMetricsBudget {
  targetFirstPreviewMs: number;
  targetRepairCount: number;
  tokenBudgetPolicy: 'automatic';
}

export interface ArtifactRunPlan {
  version: ArtifactRunPlanVersion;
  runId: string;
  artifactType: DocumentType;
  operation: 'create' | 'edit' | 'action';
  userIntent: string;
  intentSummary: string;
  requestKind: ArtifactWorkflowRequestKind;
  preservationIntent: WorkflowPreservationIntent;
  presentationRecipeId?: PresentationRecipeId;
  documentThemeFamily?: DocumentThemeFamily;
  queueMode: 'none' | 'sequential';
  templateGuidance: TemplateGuidanceProfile;
  /** Compatibility field for older workflow consumers while ArtifactRunPlan becomes primary. */
  workflow: ArtifactWorkflowPlan;
  roles: ArtifactRuntimeRole[];
  providerPolicy: ArtifactProviderPolicy;
  designManifest: DesignManifest;
  workQueue: ArtifactPart[];
  validationGates: ValidationGate[];
  metricsBudget: ArtifactRuntimeMetricsBudget;
  cancellation: {
    source: 'user-only';
  };
}

export type ArtifactRunEventType =
  | 'runtime.plan-created'
  | 'runtime.design-manifest-created'
  | 'runtime.part-started'
  | 'runtime.part-completed'
  | 'runtime.validation-started'
  | 'runtime.validation-completed'
  | 'runtime.repair-started'
  | 'runtime.repair-completed'
  | 'runtime.finalized'
  | 'runtime.cancelled';

export interface ArtifactRunEvent {
  id: string;
  runId: string;
  type: ArtifactRunEventType;
  timestamp: number;
  role: ArtifactRuntimeRole;
  message: string;
  partId?: string;
  pct?: number;
}
