import type { WorkflowStep } from '@/types';
import type { WorkflowEvent } from '@/services/ai/workflow/types';

const PRESENTATION_STEP_ANCHORS = ['evaluate', 'finalize'];
const DOCUMENT_STEP_ANCHORS = ['qa', 'finalize'];
const SPREADSHEET_STEP_ANCHORS = ['validation', 'finalize'];
const FALLBACK_STEP_ANCHORS = ['finalize'];

const RUNTIME_STEP_LABELS: Record<string, string> = {
  'document-outline': 'Planning',
  'document-validation': 'Checking quality',
  'document-modules': 'Document modules',
  'document-repair': 'Document repair',
  'workbook-action': 'Workbook action',
  validation: 'Checking quality',
  finalize: 'Finishing',
  formula: 'Formula',
  query: 'Query',
  chart: 'Chart',
};

const GENERIC_RUNTIME_LABELS = [
  /^checking spreadsheet plan/i,
  /^spreadsheet validation (?:completed|blocked)/i,
  /^executing spreadsheet runtime part\.?$/i,
  /^spreadsheet runtime summary finalized\.?$/i,
  /^applying deterministic document (?:module )?repair\.?$/i,
];

export interface RuntimeWorkflowStepUpdate {
  stepId: string;
  status: WorkflowStep['status'];
  label?: string;
}

export function humanizeWorkflowStepId(stepId: string): string {
  const slideMatch = /^slide-(\d+)$/i.exec(stepId);
  if (slideMatch?.[1]) {
    return `Slide ${slideMatch[1]}`;
  }

  const documentModuleMatch = /^document-module-(\d+)$/i.exec(stepId);
  if (documentModuleMatch?.[1]) {
    return `Document module ${documentModuleMatch[1]}`;
  }

  const runtimeLabel = RUNTIME_STEP_LABELS[stepId];
  if (runtimeLabel) {
    return runtimeLabel;
  }

  return stepId
    .replace(/[-_]+/g, ' ')
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

export function workflowStepUpdateFromRuntimeEvent(
  event: WorkflowEvent,
): RuntimeWorkflowStepUpdate | null {
  switch (event.type) {
    case 'step-start':
      return {
        stepId: event.stepId,
        status: 'active',
        label: resolveRuntimeWorkflowLabel(event.stepId, event.label),
      };
    case 'step-done':
      return {
        stepId: event.stepId,
        status: 'done',
        label: resolveRuntimeWorkflowLabel(event.stepId, event.label),
      };
    case 'step-error':
      return {
        stepId: event.stepId,
        status: 'error',
        label: resolveRuntimeWorkflowLabel(event.stepId),
      };
    case 'step-skipped':
      return {
        stepId: event.stepId,
        status: 'skipped',
        label: resolveRuntimeWorkflowLabel(event.stepId, event.label),
      };
    case 'step-update':
      return {
        stepId: event.stepId,
        status: event.status,
        label: resolveRuntimeWorkflowLabel(event.stepId, event.label),
      };
    case 'progress':
      return event.partId
        ? {
            stepId: event.partId,
            status: 'active',
            label: resolveRuntimeWorkflowLabel(event.partId, event.message),
          }
        : null;
    default:
      return null;
  }
}

export function upsertWorkflowStepStatus(
  steps: WorkflowStep[],
  stepId: string,
  stepStatus: WorkflowStep['status'],
  label?: string,
): WorkflowStep[] {
  const trimmedLabel = label?.trim();
  const existingStep = steps.find((step) => step.id === stepId);

  if (existingStep) {
    return steps.map((step) =>
      step.id === stepId
        ? {
            ...step,
            status: stepStatus,
            ...(trimmedLabel ? { label: trimmedLabel } : {}),
          }
        : step,
    );
  }

  const nextStep: WorkflowStep = {
    id: stepId,
    label: trimmedLabel || humanizeWorkflowStepId(stepId),
    status: stepStatus,
  };
  const insertIndex = resolveWorkflowStepInsertIndex(steps, stepId);

  return [
    ...steps.slice(0, insertIndex),
    nextStep,
    ...steps.slice(insertIndex),
  ];
}

function resolveWorkflowStepInsertIndex(steps: WorkflowStep[], stepId: string): number {
  const anchors = resolveStepAnchors(stepId);
  const anchorIndex = steps.findIndex((step) => anchors.includes(step.id));
  return anchorIndex >= 0 ? anchorIndex : steps.length;
}

function resolveRuntimeWorkflowLabel(stepId: string, label?: string): string {
  const trimmedLabel = label?.trim();
  if (!trimmedLabel || GENERIC_RUNTIME_LABELS.some((pattern) => pattern.test(trimmedLabel))) {
    return humanizeWorkflowStepId(stepId);
  }
  return trimmedLabel;
}

function resolveStepAnchors(stepId: string): string[] {
  if (/^slide-\d+$/i.test(stepId)) {
    return PRESENTATION_STEP_ANCHORS;
  }

  if (/^document-/i.test(stepId)) {
    return DOCUMENT_STEP_ANCHORS;
  }

  if (/^(?:workbook-action|formula|query|chart)$/i.test(stepId)) {
    return SPREADSHEET_STEP_ANCHORS;
  }

  return FALLBACK_STEP_ANCHORS;
}
