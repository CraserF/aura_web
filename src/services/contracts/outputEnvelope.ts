import type { DocumentType } from '@/types/project';

import type { RunExplainResult } from '@/services/executionSpec/types';
import type { EditingTelemetry } from '@/services/editing/types';
import type {
  RunResultChangedTarget,
  RunResultProjectOutputs,
  RunResultSpreadsheetOutputs,
  RunResultValidationSummary,
} from '@/services/contracts/runResult';
import type { ExecutionMode } from '@/services/runs/types';
import type { PublishReadinessResult } from '@/services/validation/types';
import type { SpreadsheetExecutionSummary } from '@/services/spreadsheet/plans';
import type { ArtifactWorkflowPlan } from '@/services/workflowPlanner/types';
import type { PresentationRuntimeTelemetry } from '@/services/ai/workflow/types';

export interface DocumentRunOutputs {
  artifactType: 'document';
  title?: string;
  html?: string;
  markdown?: string;
  editing?: EditingTelemetry;
  publish?: PublishReadinessResult;
}

export interface PresentationRunOutputs {
  artifactType: 'presentation';
  title?: string;
  html?: string;
  slideCount?: number;
  reviewPassed?: boolean;
  runtime?: PresentationRuntimeTelemetry;
  editing?: EditingTelemetry;
  publish?: PublishReadinessResult;
}

export interface SpreadsheetRunOutputs {
  artifactType: 'spreadsheet';
  kind?: string;
  workbookTitle?: string;
  sheetName?: string;
  chartHtml?: string;
  chartType?: string;
  rowCount?: number;
  updatedSheets?: unknown;
  spreadsheet?: SpreadsheetExecutionSummary | RunResultSpreadsheetOutputs;
  editing?: EditingTelemetry;
  publish?: PublishReadinessResult;
}

export interface ProjectRunOutputs {
  artifactType: 'project';
  project?: RunResultProjectOutputs;
  publish?: PublishReadinessResult;
}

export interface RunOutputsEnvelope {
  artifactType: DocumentType | 'project';
  mode: ExecutionMode;
  targetSummary: string[];
  changedTargets: RunResultChangedTarget[];
  validation: RunResultValidationSummary;
  workflowPlan?: ArtifactWorkflowPlan;
  document?: DocumentRunOutputs;
  presentation?: PresentationRunOutputs;
  spreadsheet?: SpreadsheetRunOutputs;
  project?: ProjectRunOutputs;
  explain?: RunExplainResult;
}
