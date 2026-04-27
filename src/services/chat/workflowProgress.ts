import type { WorkflowStep } from '@/types';

const PRESENTATION_STEP_ANCHORS = ['evaluate', 'finalize'];
const DOCUMENT_STEP_ANCHORS = ['qa', 'finalize'];
const FALLBACK_STEP_ANCHORS = ['finalize'];

export function humanizeWorkflowStepId(stepId: string): string {
  const slideMatch = /^slide-(\d+)$/i.exec(stepId);
  if (slideMatch?.[1]) {
    return `Slide ${slideMatch[1]}`;
  }

  const documentModuleMatch = /^document-module-(\d+)$/i.exec(stepId);
  if (documentModuleMatch?.[1]) {
    return `Document module ${documentModuleMatch[1]}`;
  }

  return stepId
    .replace(/[-_]+/g, ' ')
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
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

function resolveStepAnchors(stepId: string): string[] {
  if (/^slide-\d+$/i.test(stepId)) {
    return PRESENTATION_STEP_ANCHORS;
  }

  if (/^document-/i.test(stepId)) {
    return DOCUMENT_STEP_ANCHORS;
  }

  return FALLBACK_STEP_ANCHORS;
}
