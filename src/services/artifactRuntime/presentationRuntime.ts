import type { LanguageModel } from 'ai';

import { runBatchQueue } from '@/services/ai/workflow/batchQueue';
import { design, designEdit } from '@/services/ai/workflow/agents/designer';
import { validateSlides } from '@/services/ai/workflow/agents/qa-validator';
import { evaluateAndRevise } from '@/services/ai/workflow/agents/evaluator';
import { sanitizeSlideHtml } from '@/services/ai/utils/sanitizeHtml';
import { sanitizeInnerHtml } from '@/services/html/sanitizer';
import { emitArtifactRunEvent } from '@/services/artifactRuntime/events';
import { useSettingsStore } from '@/stores/settingsStore';
import { aiDebugLog, logEditingMetrics, toErrorInfo } from '@/services/ai/debug';
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

export interface SinglePresentationRuntimeOptions {
  runPlan?: ArtifactRunPlan;
  planResult: PlanResult;
  model: LanguageModel;
  input: PresentationInput;
  onEvent: EventListener;
  isEdit: boolean;
  effectiveChatHistory: PresentationInput['chatHistory'];
  guidanceProfile?: TemplateGuidanceProfile;
  editCorrectionPolicy: {
    mode: 'full' | 'best-effort';
    maxCorrectionSteps: number;
  };
  skipSecondaryEvaluation: boolean;
  signal?: AbortSignal;
}

function startProgressHeartbeat(opts: {
  onEvent: EventListener;
  startPct: number;
  maxPct: number;
  intervalMs?: number;
  messages: string[];
}): () => void {
  const { onEvent, startPct, maxPct, intervalMs = 8000, messages } = opts;
  let tick = 0;
  const timer = setInterval(() => {
    tick += 1;
    const pct = Math.min(maxPct, startPct + (tick * 6));
    const message = messages[Math.min(tick - 1, messages.length - 1)] ?? messages[messages.length - 1] ?? 'Working...';
    onEvent({ type: 'progress', message, pct });
  }, intervalMs);

  return () => clearInterval(timer);
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

  emitArtifactRunEvent(onEvent, {
    runId: runPlan?.runId ?? 'presentation-runtime',
    type: 'runtime.repair-started',
    role: 'repairer',
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
  const runtimeRunId = runPlan?.runId ?? 'presentation-runtime';
  const slideBriefs = planResult.slideBriefs ?? [];
  if (slideBriefs.length === 0) {
    throw new Error('Queued presentation runtime requires slide briefs.');
  }

  const queuedStepId = isEdit ? 'targeted-design' : 'design';
  const queuedLabel = isEdit
    ? `Creating ${slideBriefs.length} new slide${slideBriefs.length === 1 ? '' : 's'}…`
    : `Creating ${slideBriefs.length} slide${slideBriefs.length === 1 ? '' : 's'}…`;

  emitArtifactRunEvent(onEvent, {
    runId: runtimeRunId,
    type: 'runtime.part-started',
    role: 'generator',
    message: queuedLabel,
    partId: queuedStepId,
    pct: 25,
  });
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

  emitArtifactRunEvent(onEvent, {
    runId: runtimeRunId,
    type: 'runtime.part-completed',
    role: 'generator',
    message: queuedLabel,
    partId: queuedStepId,
    pct: 80,
  });
  emitArtifactRunEvent(onEvent, {
    runId: runtimeRunId,
    type: 'runtime.validation-started',
    role: 'validator',
    message: 'Checking queued slides…',
    partId: 'evaluate',
    pct: 82,
  });

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
    emitArtifactRunEvent(onEvent, {
      runId: runtimeRunId,
      type: 'runtime.validation-completed',
      role: 'validator',
      message: 'Checking queued slides…',
      partId: 'evaluate',
      pct: 88,
    });
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
  emitArtifactRunEvent(onEvent, {
    runId: runtimeRunId,
    type: 'runtime.finalized',
    role: 'finalizer',
    message: 'Finalizing presentation…',
    partId: 'finalize',
    pct: 100,
  });
  onEvent({ type: 'complete', result: output });

  return output;
}

export async function runSinglePresentationRuntime(
  opts: SinglePresentationRuntimeOptions,
): Promise<PresentationOutput> {
  const {
    runPlan,
    planResult,
    model,
    input,
    onEvent,
    isEdit,
    effectiveChatHistory,
    guidanceProfile,
    editCorrectionPolicy,
    skipSecondaryEvaluation,
    signal,
  } = opts;
  const runtimeRunId = runPlan?.runId ?? 'presentation-runtime';
  const runtimeStart = performance.now();
  let firstPreviewAt: number | undefined;
  const runtimeOnEvent: EventListener = (event) => {
    if (!firstPreviewAt && (event.type === 'draft-complete' || event.type === 'streaming')) {
      firstPreviewAt = performance.now();
    }
    onEvent(event);
  };

  const designStepId = isEdit ? 'targeted-design' : 'design';
  const designLabel = isEdit ? 'Editing slides...' : 'Designing your slide...';
  emitArtifactRunEvent(onEvent, {
    runId: runtimeRunId,
    type: 'runtime.part-started',
    role: 'generator',
    message: designLabel,
    partId: designStepId,
    pct: 30,
  });
  onEvent({ type: 'progress', message: isEdit ? 'Applying changes...' : 'Designing a polished slide...', pct: 30 });
  const stopDesignHeartbeat = startProgressHeartbeat({
    onEvent,
    startPct: 30,
    maxPct: 60,
    messages: isEdit
      ? [
          'Still applying slide changes...',
          'Refining the updated slide composition...',
          'Finishing the current slide draft...',
        ]
      : [
          'Still designing the slide composition...',
          'Refining hierarchy, layout, and visual balance...',
          'Finishing the current slide draft...',
        ],
  });

  const designResult = await (async () => {
    try {
      return isEdit
        ? await designEdit(
            planResult,
            input.existingSlidesHtml!,
            effectiveChatHistory,
            model,
            runtimeOnEvent,
            input.projectRulesBlock,
            guidanceProfile,
            input.editing,
            editCorrectionPolicy,
            signal,
          )
        : await design(
            planResult,
            input.existingSlidesHtml,
            effectiveChatHistory,
            model,
            runtimeOnEvent,
            input.projectRulesBlock,
            guidanceProfile,
            signal,
          );
    } finally {
      stopDesignHeartbeat();
    }
  })();

  onEvent({
    type: 'progress',
    message: isEdit
      ? `Updated ${designResult.slideCount} slide(s)`
      : `Slide designed${designResult.title ? `: ${designResult.title}` : ''}`,
    pct: 70,
  });
  emitArtifactRunEvent(onEvent, {
    runId: runtimeRunId,
    type: 'runtime.part-completed',
    role: 'generator',
    message: designLabel,
    partId: designStepId,
    pct: 70,
  });

  if (signal?.aborted) throw new DOMException('Workflow aborted', 'AbortError');

  let finalHtml = designResult.html;
  let reviewPassed = true;

  const alwaysRunEvaluation = useSettingsStore.getState().alwaysRunEvaluation;
  const qaResult = validateSlides(designResult.html, {
    expectedBgColor: planResult.blueprint.palette.bg,
    isCreate: planResult.intent === 'create',
    styleManifest: planResult.styleManifest,
    exemplarPackId: planResult.exemplarPackId,
  });

  if (qaResult.violations.length > 0) {
    const blockingIssues = qaResult.violations.filter((violation) => violation.tier === 'blocking');
    const advisories = qaResult.violations.filter((violation) => violation.tier === 'advisory');
    aiDebugLog('workflow', qaResult.passed ? 'QA advisories on final output' : 'QA blocking issues on final output', {
      blockingCount: qaResult.blockingCount,
      advisoryCount: qaResult.advisoryCount,
      blockingIssues: blockingIssues.map((violation) => `[${violation.rule}] slide ${violation.slide}: ${violation.detail}`),
      advisories: advisories.map((violation) => `[${violation.rule}] slide ${violation.slide}: ${violation.detail}`),
    });
  }

  const canEvaluate = planResult.intent !== 'add_slides';
  const shouldEvaluate =
    canEvaluate &&
    designResult.fastPath &&
    (alwaysRunEvaluation || !qaResult.passed) &&
    !skipSecondaryEvaluation;
  aiDebugLog('workflow', 'phase 3 decision', {
    intent: planResult.intent,
    fastPath: designResult.fastPath,
    qaPassed: qaResult.passed,
    blockingCount: qaResult.blockingCount,
    advisoryCount: qaResult.advisoryCount,
    alwaysRunEvaluation,
    canEvaluate,
    skipSecondaryEvaluation,
    shouldEvaluate,
  });

  if (shouldEvaluate) {
    emitArtifactRunEvent(onEvent, {
      runId: runtimeRunId,
      type: 'runtime.validation-started',
      role: 'validator',
      message: 'Evaluating quality...',
      partId: 'evaluate',
      pct: 74,
    });
    try {
      finalHtml = await evaluateAndRevise(
        model,
        designResult.html,
        planResult,
        runtimeOnEvent,
        input.projectRulesBlock,
        signal,
      );
      emitArtifactRunEvent(onEvent, {
        runId: runtimeRunId,
        type: 'runtime.validation-completed',
        role: 'validator',
        message: 'Evaluating quality...',
        partId: 'evaluate',
        pct: 86,
      });
    } catch (evalErr) {
      aiDebugLog('workflow', 'evaluator error, using designer output', toErrorInfo(evalErr));
      console.warn('[Workflow] evaluator error, using designer output:', evalErr);
      onEvent({ type: 'step-skipped', stepId: 'evaluate', label: 'Evaluating quality...' });
    }
  } else {
    onEvent({ type: 'step-skipped', stepId: 'evaluate', label: 'Evaluating quality...' });
    onEvent({
      type: 'progress',
      message: skipSecondaryEvaluation
        ? 'Local model safe path - skipping secondary evaluation'
        : 'QA passed - skipping evaluation',
      pct: 85,
    });
  }

  reviewPassed = planResult.intent === 'add_slides' ? designResult.fastPath : qaResult.passed;

  if (signal?.aborted) throw new DOMException('Workflow aborted', 'AbortError');

  onEvent({ type: 'step-start', stepId: 'finalize', label: 'Finalizing slide...' });

  const output: PresentationOutput = {
    html: sanitizeInnerHtml(finalHtml),
    title: designResult.title,
    slideCount: designResult.slideCount,
    reviewPassed,
    runtime: {
      ...(firstPreviewAt ? { timeToFirstPreviewMs: Math.round(firstPreviewAt - runtimeStart) } : {}),
      totalRuntimeMs: Math.round(performance.now() - runtimeStart),
      validationPassed: qaResult.passed,
      validationBlockingCount: qaResult.blockingCount,
      validationAdvisoryCount: qaResult.advisoryCount,
      repairCount: shouldEvaluate ? 1 : 0,
    },
    ...(designResult.editing ? { editing: designResult.editing } : {}),
  };

  if (designResult.editing) {
    logEditingMetrics('presentation', {
      ...designResult.editing,
      regenerationAvoided: designResult.editing.strategyUsed !== 'full-regenerate',
    });
  }

  emitArtifactRunEvent(onEvent, {
    runId: runtimeRunId,
    type: 'runtime.finalized',
    role: 'finalizer',
    message: 'Finalizing slide...',
    partId: 'finalize',
    pct: 100,
  });
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
