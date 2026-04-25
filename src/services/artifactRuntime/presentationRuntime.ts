import type { LanguageModel } from 'ai';

import { runBatchQueue } from '@/services/ai/workflow/batchQueue';
import { validateSlides } from '@/services/ai/workflow/agents/qa-validator';
import { sanitizeSlideHtml } from '@/services/ai/utils/sanitizeHtml';
import { sanitizeInnerHtml } from '@/services/html/sanitizer';
import type { PlanResult } from '@/services/ai/workflow/agents/planner';
import type {
  EventListener,
  PresentationInput,
  PresentationOutput,
} from '@/services/ai/workflow/types';
import type { TemplateGuidanceProfile } from '@/services/workflowPlanner/types';
import type { ArtifactRunPlan } from '@/services/artifactRuntime/types';

export interface PresentationRuntimeValidationResult {
  passed: boolean;
  blockingCount: number;
  advisoryCount: number;
  summary: string;
}

export interface PresentationRuntimeRepairResult {
  html: string;
  repairCount: number;
  repaired: boolean;
  summary: string;
}

export interface QueuedPresentationRuntimeOptions {
  runPlan?: ArtifactRunPlan;
  planResult: PlanResult;
  model: LanguageModel;
  input: PresentationInput;
  onEvent: EventListener;
  isEdit: boolean;
  guidanceProfile?: TemplateGuidanceProfile;
  signal?: AbortSignal;
}

export interface StaticPresentationRuntimeFinalizeInput {
  rawHtml: string;
  title: string;
  slideCount: number;
  runPlan?: ArtifactRunPlan;
}

export function canRunQueuedPresentationRuntime(planResult: PlanResult): boolean {
  return (
    (planResult.intent === 'batch_create' || planResult.intent === 'add_slides') &&
    (planResult.slideBriefs?.length ?? 0) > 0
  );
}

export function validatePresentationRuntimeOutput(
  html: string,
  planResult: PlanResult,
  expectedSlideCount: number,
): PresentationRuntimeValidationResult {
  const qaResult = validateSlides(html, {
    expectedSlideCount,
    expectedBgColor: planResult.blueprint.palette.bg,
    isCreate: planResult.intent === 'batch_create' || planResult.intent === 'create',
    styleManifest: planResult.styleManifest,
    exemplarPackId: planResult.exemplarPackId,
  });
  const blockingCount = qaResult.violations.filter((violation) => violation.tier === 'blocking').length;
  const advisoryCount = qaResult.violations.length - blockingCount;

  return {
    passed: blockingCount === 0,
    blockingCount,
    advisoryCount,
    summary: qaResult.violations.length === 0
      ? 'Queued presentation runtime validation passed.'
      : `Queued presentation runtime found ${blockingCount} blocking issue(s) and ${advisoryCount} advisory issue(s).`,
  };
}

export async function repairPresentationRuntimeOutput(
  html: string,
  validation: PresentationRuntimeValidationResult,
  runPlan: ArtifactRunPlan | undefined,
  onEvent: EventListener,
): Promise<PresentationRuntimeRepairResult> {
  if (validation.passed) {
    return {
      html,
      repairCount: 0,
      repaired: false,
      summary: 'No repair needed.',
    };
  }

  const maxRepairPasses = runPlan?.providerPolicy.maxRepairPasses ?? 0;
  if (maxRepairPasses <= 0) {
    return {
      html,
      repairCount: 0,
      repaired: false,
      summary: 'Repair skipped because no runtime repair budget is available.',
    };
  }

  onEvent({
    type: 'progress',
    message: 'Runtime repair is queued for a later slice; keeping validated draft unchanged.',
    pct: 88,
  });

  return {
    html,
    repairCount: 0,
    repaired: false,
    summary: 'Repair stub recorded; deterministic repair implementation is pending.',
  };
}

export async function runQueuedPresentationRuntime(
  opts: QueuedPresentationRuntimeOptions,
): Promise<PresentationOutput> {
  const {
    runPlan,
    planResult,
    model,
    input,
    onEvent,
    isEdit,
    guidanceProfile,
    signal,
  } = opts;

  const runtimeStart = performance.now();
  let firstPreviewAt: number | undefined;
  const slideBriefs = planResult.slideBriefs ?? [];
  if (slideBriefs.length === 0) {
    throw new Error('Queued presentation runtime requires slide briefs.');
  }

  const queuedStepId = isEdit ? 'targeted-design' : 'design';
  const queuedLabel = isEdit
    ? `Creating ${slideBriefs.length} new slide${slideBriefs.length === 1 ? '' : 's'}…`
    : `Creating ${slideBriefs.length} slide${slideBriefs.length === 1 ? '' : 's'}…`;

  onEvent({ type: 'step-start', stepId: queuedStepId, label: queuedLabel });
  onEvent({
    type: 'progress',
    message: runPlan
      ? `Creating ${slideBriefs.length} slide part${slideBriefs.length === 1 ? '' : 's'} from the runtime plan…`
      : `Creating ${slideBriefs.length} queued slide${slideBriefs.length === 1 ? '' : 's'}…`,
    pct: 25,
  });

  const batchResult = await runBatchQueue({
    planResult,
    model,
    onEvent,
    ...(isEdit && input.existingSlidesHtml ? { initialHtml: input.existingSlidesHtml } : {}),
    ...(guidanceProfile ? { guidanceProfile } : {}),
    onSlideComplete: (combinedHtml, slideIndex, totalSlides) => {
      firstPreviewAt ??= performance.now();
      onEvent({ type: 'batch-slide-complete', html: combinedHtml, slideIndex, totalSlides });
    },
    ...(signal ? { signal } : {}),
  });

  onEvent({ type: 'step-done', stepId: queuedStepId, label: queuedLabel });
  onEvent({ type: 'step-start', stepId: 'evaluate', label: 'Checking queued slides…' });

  const validation = validatePresentationRuntimeOutput(
    batchResult.html,
    planResult,
    batchResult.slideCount,
  );
  onEvent({
    type: 'progress',
    message: validation.summary,
    pct: validation.passed ? 86 : 82,
  });

  const repair = await repairPresentationRuntimeOutput(
    batchResult.html,
    validation,
    runPlan,
    onEvent,
  );

  if (validation.passed || !repair.repaired) {
    onEvent({ type: 'step-done', stepId: 'evaluate', label: 'Checking queued slides…' });
  }

  onEvent({ type: 'step-start', stepId: 'finalize', label: 'Finalizing presentation…' });

  const output: PresentationOutput = {
    html: sanitizeInnerHtml(repair.html),
    title: batchResult.title,
    slideCount: batchResult.slideCount,
    reviewPassed: validation.passed,
    runtime: {
      ...(firstPreviewAt ? { timeToFirstPreviewMs: Math.round(firstPreviewAt - runtimeStart) } : {}),
      totalRuntimeMs: Math.round(performance.now() - runtimeStart),
      validationPassed: validation.passed,
      validationBlockingCount: validation.blockingCount,
      validationAdvisoryCount: validation.advisoryCount,
      repairCount: repair.repairCount,
    },
  };

  onEvent({
    type: 'progress',
    message: repair.repaired
      ? `Presentation finalized after ${repair.repairCount} repair pass${repair.repairCount === 1 ? '' : 'es'}.`
      : 'Presentation finalized from queued runtime output.',
    pct: 96,
  });
  onEvent({ type: 'step-done', stepId: 'finalize', label: 'Finalizing presentation…' });
  onEvent({ type: 'complete', result: output });

  return output;
}

export function finalizeStaticPresentationRuntime(
  input: StaticPresentationRuntimeFinalizeInput,
): PresentationOutput {
  const runtimeStart = performance.now();
  const html = sanitizeSlideHtml(input.rawHtml);
  const qaResult = validateSlides(html, {
    expectedSlideCount: input.slideCount,
    isCreate: true,
  });
  const blockingCount = qaResult.violations.filter((violation) => violation.tier === 'blocking').length;
  const advisoryCount = qaResult.violations.length - blockingCount;

  return {
    html,
    title: input.title,
    slideCount: input.slideCount,
    reviewPassed: blockingCount === 0,
    runtime: {
      timeToFirstPreviewMs: 0,
      totalRuntimeMs: Math.round(performance.now() - runtimeStart),
      validationPassed: blockingCount === 0,
      validationBlockingCount: blockingCount,
      validationAdvisoryCount: advisoryCount,
      repairCount: 0,
    },
  };
}
