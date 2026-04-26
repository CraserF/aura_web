/**
 * Workflow types for the presentation generation pipeline.
 * Uses AI SDK patterns directly — no custom step/context abstractions.
 */
import type { AIMessage, ProviderEntry } from '../types';
import type { EditStrategy, EditingTelemetry, ResolvedTarget } from '@/services/editing/types';
import type { ArtifactRunPlan } from '@/services/artifactRuntime/types';
import type { TemplateGuidanceProfile } from '@/services/workflowPlanner/types';

export type { AIMessage };

/** Events emitted during workflow execution */
export type WorkflowEvent =
  | { type: 'step-start';      stepId: string; label: string }
  | { type: 'step-done';       stepId: string; label: string }
  | { type: 'step-error';      stepId: string; error: string }
  | { type: 'step-skipped';    stepId: string; label: string }
  | { type: 'step-update';     stepId: string; label: string; status: 'active' | 'done' | 'error' | 'pending' }
  | { type: 'streaming';       stepId: string; chunk: string }
  | { type: 'progress';        message: string; pct?: number }
  | { type: 'retry-attempt';   stepId: string; attempt: number; maxAttempts: number }
  | { type: 'draft-complete';  html: string }
  | { type: 'batch-slide-complete'; html: string; slideIndex: number; totalSlides: number }
  | { type: 'complete';        result: unknown };

/** Subscribe to workflow events */
export type EventListener = (event: WorkflowEvent) => void;

/** Config needed to create a LanguageModel via the provider registry */
export interface LLMConfig {
  providerEntry: ProviderEntry;
  apiKey: string;
  baseUrl: string;
  model?: string;
}

/** Input to the presentation workflow */
export interface PresentationInput {
  prompt: string;
  existingSlidesHtml?: string;
  chatHistory: AIMessage[];
  memoryContext?: string;
  projectRulesBlock?: string;
  artifactRunPlan?: ArtifactRunPlan;
  templateGuidance?: TemplateGuidanceProfile;
  editing?: {
    resolvedTargets: ResolvedTarget[];
    targetSummary: string[];
    strategyHint?: EditStrategy;
    allowFullRegeneration: boolean;
  };
}

/** Runtime telemetry shared by artifact workflows as they move onto ArtifactRuntime. */
export interface ArtifactRuntimeTelemetry {
  timeToFirstPreviewMs?: number;
  totalRuntimeMs: number;
  validationPassed: boolean;
  validationBlockingCount: number;
  validationAdvisoryCount: number;
  repairCount: number;
  runMode?: 'single-stream' | 'queued-create' | 'queued-edit' | 'deterministic-action';
  queuedPartCount?: number;
  completedPartCount?: number;
  repairedPartCount?: number;
}

/** Output from the presentation workflow */
export type PresentationRuntimeTelemetry = ArtifactRuntimeTelemetry;

export interface PresentationOutput {
  html: string;
  title?: string;
  slideCount: number;
  reviewPassed: boolean;
  runtime?: PresentationRuntimeTelemetry;
  editing?: EditingTelemetry;
}
