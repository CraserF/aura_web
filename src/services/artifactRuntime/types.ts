import type { DocumentType } from '@/types/project';
import type {
  ArtifactWorkflowRequestKind,
  ArtifactWorkflowPlan,
  DocumentThemeFamily,
  PresentationRecipeId,
  QueuedWorkItem,
  TemplateGuidanceProfile,
  WorkflowPreservationIntent,
  WorkflowProviderTier,
} from '@/services/workflowPlanner/types';

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
