import type { GenerationStatus, WorkflowStep } from '@/types';
import type { WorkflowEvent } from '@/services/ai/workflow/types';
import type { ArtifactPartKind, ArtifactRunPlan } from '@/services/artifactRuntime/types';

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
  /^repair(?:ing|ed) slide \d+/i,
  /^running final qa checks/i,
  /^slide \d+ of \d+ complete/i,
];

export interface RuntimeWorkflowStepUpdate {
  stepId: string;
  status: WorkflowStep['status'];
  label?: string;
}

export interface WorkflowStepProgress {
  currentStep?: number;
  totalSteps?: number;
}

export interface WorkflowItemProgress {
  currentItem?: number;
  totalItems?: number;
  itemLabel?: string;
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

/**
 * Convert detailed runtime labels into the small public vocabulary used by the
 * chat progress UI. Detailed scores, repair causes, and failure IDs stay in
 * advanced diagnostics/run history.
 */
export function publicWorkflowProgressLabel(input: {
  stepId?: string;
  label?: string;
}): string {
  const stepId = input.stepId?.trim();
  const label = input.label?.trim();
  const text = `${stepId ?? ''} ${label ?? ''}`.trim();

  if (stepId) {
    if (/^(?:plan|document-outline)$/i.test(stepId)) return 'Planning';
    if (/^document-modules$/i.test(stepId)) return label || 'Document modules';
    if (/^(?:design|targeted-design|slide-\d+)$/i.test(stepId)) {
      return /\b(?:repair(?:ing|ed)?|revise|revised|revision|polish(?:ing|ed)?|retry(?:ing)?)\b/i.test(text)
        ? 'Polishing quality'
        : 'Creating slides';
    }
    if (/^generate$/i.test(stepId)) {
      if (/\b(?:document|section|module)\b/i.test(text)) return label || 'Creating document';
      if (/\b(?:slide|deck|presentation)\b/i.test(text)) return 'Creating slides';
      return label || 'Creating';
    }
    if (/^(?:qa|qa-validate|evaluate|review|document-validation|validation)$/i.test(stepId)) {
      return 'Checking quality';
    }
    if (/^(?:revise|document-repair)$/i.test(stepId)) return 'Polishing quality';
    if (/^finalize$/i.test(stepId)) return 'Finishing';
  }

  if (/\b(?:plan|planning|understanding)\b/i.test(text)) return 'Planning';
  if (/\b(?:repair(?:ing|ed)?|revise|revised|revision|polish(?:ing|ed)?|retry(?:ing)?)\b/i.test(text)) return 'Polishing quality';
  if (/\b(?:quality|qa|check|checking|review|evaluate|validation|validate|safe|contract)\b/i.test(text)) return 'Checking quality';
  if (/\b(?:finish|final|finalizing)\b/i.test(text)) return 'Finishing';
  if (/\b(?:document|section|module)\b/i.test(text)) return label || 'Creating document';
  if (/\b(?:slide|deck|presentation)\b/i.test(text)) return 'Creating slides';
  if (/\b(?:create|creating|generate|generating|craft|crafting|write|writing|draft)\b/i.test(text)) return label || 'Creating';

  return label || 'Working...';
}

export function resolveWorkflowStepProgress(steps?: WorkflowStep[]): WorkflowStepProgress {
  const visibleSteps = steps?.filter((step) => step.status !== 'skipped') ?? [];
  if (visibleSteps.length === 0) return {};

  const activeIndex = visibleSteps.findIndex((step) => step.status === 'active' || step.status === 'error');
  const pendingIndex = visibleSteps.findIndex((step) => step.status === 'pending');
  const resolvedIndex = activeIndex >= 0
    ? activeIndex
    : pendingIndex >= 0
      ? pendingIndex
      : visibleSteps.length - 1;

  return {
    currentStep: resolvedIndex + 1,
    totalSteps: visibleSteps.length,
  };
}

export function countRunPlanParts(
  runPlan: Pick<ArtifactRunPlan, 'workQueue'> | undefined,
  kinds: ArtifactPartKind[],
): number | undefined {
  const count = runPlan?.workQueue.filter((part) => kinds.includes(part.kind)).length ?? 0;
  return count > 0 ? count : undefined;
}

export function parseWorkflowItemProgress(input: {
  stepId?: string;
  partId?: string;
  message?: string;
  totalItems?: number;
  itemLabel?: string;
}): WorkflowItemProgress {
  const text = input.message?.trim() ?? '';
  const labeledMatch = findLabeledItemProgress(text);
  if (labeledMatch) {
    return {
      currentItem: labeledMatch.currentItem,
      totalItems: labeledMatch.totalItems,
      itemLabel: input.itemLabel ?? labeledMatch.itemLabel,
    };
  }

  const id = input.partId ?? input.stepId;
  const idMatch = id ? parseItemProgressFromId(id) : null;
  if (!idMatch) return {};

  return {
    currentItem: idMatch.currentItem,
    ...(input.totalItems ? { totalItems: input.totalItems } : {}),
    itemLabel: input.itemLabel ?? idMatch.itemLabel,
  };
}

export function formatGenerationStatusText(
  status: Extract<GenerationStatus, { state: 'generating' }>,
): string {
  const rawStep = status.step?.trim() || 'Working...';
  const base = /\battempt\s+\d+\s+of\s+\d+\b/i.test(rawStep)
    ? rawStep
    : publicWorkflowProgressLabel({ label: rawStep });
  const stepText = status.currentStep !== undefined && status.totalSteps !== undefined
    ? `Step ${status.currentStep} of ${status.totalSteps}: ${base}`
    : base;

  if (status.currentItem !== undefined && status.totalItems !== undefined) {
    return `${stepText} · ${formatItemLabel(status.itemLabel)} ${status.currentItem} of ${status.totalItems}`;
  }

  if (status.currentItem !== undefined) {
    return `${stepText} · ${formatItemLabel(status.itemLabel)} ${status.currentItem}`;
  }

  return stepText;
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

function findLabeledItemProgress(text: string): WorkflowItemProgress | null {
  const itemThenCount = /\b(slides?|sections?|modules?|parts?)\s+(\d+)\s*(?:of|\/)\s*(\d+)\b/i.exec(text);
  if (itemThenCount?.[1] && itemThenCount[2] && itemThenCount[3]) {
    return {
      itemLabel: normalizeItemLabel(itemThenCount[1]),
      currentItem: parseInt(itemThenCount[2], 10),
      totalItems: parseInt(itemThenCount[3], 10),
    };
  }

  const countThenItem = /\b(\d+)\s*(?:of|\/)\s*(\d+)\s+(slides?|sections?|modules?|parts?)\b/i.exec(text);
  if (countThenItem?.[1] && countThenItem[2] && countThenItem[3]) {
    return {
      itemLabel: normalizeItemLabel(countThenItem[3]),
      currentItem: parseInt(countThenItem[1], 10),
      totalItems: parseInt(countThenItem[2], 10),
    };
  }

  return null;
}

function parseItemProgressFromId(id: string): WorkflowItemProgress | null {
  const slideMatch = /^slide-(\d+)$/i.exec(id);
  if (slideMatch?.[1]) {
    return {
      currentItem: parseInt(slideMatch[1], 10),
      itemLabel: 'slide',
    };
  }

  const documentModuleMatch = /^document-module-(\d+)$/i.exec(id);
  if (documentModuleMatch?.[1]) {
    return {
      currentItem: parseInt(documentModuleMatch[1], 10),
      itemLabel: 'section',
    };
  }

  return null;
}

function normalizeItemLabel(label: string): string {
  return /^slides?$/i.test(label) ? 'slide' : 'section';
}

function formatItemLabel(label?: string): string {
  const normalized = label?.trim() || 'item';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}
