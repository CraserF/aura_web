import type { ClarifyOption } from '@/types';

import type { ResolvedIntent } from '@/services/ai/intent/types';
import type { EditingTelemetry } from '@/services/editing/types';
import type { RunStatus } from '@/services/runs/status';
import type { PublishReadinessResult, ValidationIssue, ValidationProfileId } from '@/services/validation/types';

export interface RunResultAssistantMessage {
  content: string;
  clarifyOptions?: ClarifyOption[];
}

export interface RunResultValidationSummary {
  passed: boolean;
  summary: string;
  profileId?: ValidationProfileId;
  score?: number;
  blockingIssues?: ValidationIssue[];
  warnings?: ValidationIssue[];
}

export interface RunResultWarning {
  code: string;
  message: string;
}

export interface RunResultChangedTarget {
  documentId?: string;
  sheetId?: string;
  action: 'created' | 'updated' | 'none';
}

export interface RunResultStructuredStatus {
  title: string;
  detail: string;
}

export interface RunResultDependencyChange {
  edgeId: string;
  kind: string;
  status: 'valid' | 'broken' | 'stale';
  sourceDocumentId?: string;
  targetDocumentId?: string;
  sheetId?: string;
  message: string;
}

export interface RunResultProjectOutputs {
  operation: string;
  updatedDocumentIds: string[];
  dependencyChanges: RunResultDependencyChange[];
  reviewSummary?: string;
  linkSummary?: string;
}

export interface RunResultOutputs extends Record<string, unknown> {
  editing?: EditingTelemetry;
  project?: RunResultProjectOutputs;
  publish?: PublishReadinessResult;
}

export interface RunResult {
  runId: string;
  status: RunStatus;
  intent: ResolvedIntent;
  outputs: RunResultOutputs;
  assistantMessage: RunResultAssistantMessage;
  validation: RunResultValidationSummary;
  warnings: RunResultWarning[];
  changedTargets: RunResultChangedTarget[];
  structuredStatus: RunResultStructuredStatus;
}

// TODO(phase-1): Replace generic outputs with artifact-specific typed payloads
// once the handler adapters are all emitting the same result surface.
