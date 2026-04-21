/**
 * Presentation Workflow — Plain async orchestrator using AI SDK patterns.
 *
 * Two flows:
 *
 *  CREATE flow (new slide):
 *    Plan → Design (ToolLoopAgent) → [Evaluate → Revise] → Finalize
 *
 *  EDIT flow (modify/refine_style/add_slides):
 *    Plan → Targeted Design (ToolLoopAgent) → [Evaluate → Revise] → Finalize
 *
 * The designer agent self-validates via QA tools. The evaluate→revise loop
 * provides an independent LLM quality check (configurable via settings).
 */

import type { LanguageModel } from 'ai';
import { createModel } from './engine';
import { withDefaults } from '../middleware';
import { plan } from './agents/planner';
import { design, designEdit } from './agents/designer';
import { validateSlides } from './agents/qa-validator';
import { evaluateAndRevise } from './agents/evaluator';
import { sanitizeInnerHtml } from '@/services/html/sanitizer';
import { useSettingsStore } from '@/stores/settingsStore';
import { aiDebugLog, toErrorInfo } from '../debug';
import type {
  PresentationInput,
  PresentationOutput,
  LLMConfig,
  EventListener,
} from './types';

// ── Convenience runner ───────────────────────────────────────

export interface RunWorkflowOptions {
  input: PresentationInput;
  llmConfig: LLMConfig;
  onEvent: EventListener;
  signal?: AbortSignal;
}

/**
 * Run the appropriate presentation workflow based on whether slides exist.
 * Sequential orchestrator — calls each phase directly using AI SDK patterns.
 */
export async function runPresentationWorkflow(
  opts: RunWorkflowOptions,
): Promise<PresentationOutput> {
  const { input, llmConfig, onEvent, signal } = opts;
  const isEdit = !!input.existingSlidesHtml;
  const effectiveChatHistory = input.memoryContext
    ? [
        ...input.chatHistory,
        {
          role: 'assistant' as const,
          content: `Relevant memory context:\n${input.memoryContext}`,
        },
      ]
    : input.chatHistory;
  const workflowStart = performance.now();

  // Create the AI SDK model with shared defaults (temperature, maxOutputTokens)
  const baseModel: LanguageModel = await createModel(llmConfig);
  const model = withDefaults(baseModel);
  aiDebugLog('workflow', `starting ${isEdit ? 'edit' : 'create'} workflow`, { model: llmConfig.model });

  try {
    // ── Phase 1: Plan (rule-based, no LLM) ──────────────────────
    onEvent({ type: 'step-start', stepId: 'plan', label: 'Analyzing your request…' });
    onEvent({ type: 'progress', message: 'Understanding your request…', pct: 10 });

    const planResult = await plan(input.prompt, isEdit);

    if (planResult.blocked) {
      onEvent({ type: 'step-error', stepId: 'plan', error: planResult.blockReason ?? 'Request blocked.' });
      throw new Error(planResult.blockReason ?? 'Request blocked.');
    }

    onEvent({
      type: 'progress',
      message: `Detected ${planResult.style} style, animation level ${planResult.animationLevel}`,
      pct: 20,
    });
    onEvent({ type: 'step-done', stepId: 'plan', label: 'Analyzing your request…' });

    // Check for abort between phases
    if (signal?.aborted) throw new DOMException('Workflow aborted', 'AbortError');

    // ── Batch create flow ────────────────────────────────────────
    if (planResult.intent === 'batch_create' && planResult.slideBriefs && planResult.slideBriefs.length > 0) {
      onEvent({ type: 'step-start', stepId: 'design', label: `Designing ${planResult.slideBriefs.length} slides…` });
      onEvent({ type: 'progress', message: `Planning ${planResult.slideBriefs.length} slides…`, pct: 25 });

      const { runBatchQueue } = await import('./batchQueue');

      const batchResult = await runBatchQueue({
        planResult,
        model,
        onEvent,
        onSlideComplete: (combinedHtml, slideIndex, totalSlides) => {
          onEvent({ type: 'batch-slide-complete', html: combinedHtml, slideIndex, totalSlides });
        },
        signal,
      });

      onEvent({ type: 'step-done', stepId: 'design', label: `Designing ${planResult.slideBriefs.length} slides…` });
      onEvent({ type: 'step-skipped', stepId: 'evaluate', label: 'Evaluating quality…' });
      onEvent({ type: 'step-start', stepId: 'finalize', label: 'Finalizing presentation…' });

      const batchOutput: PresentationOutput = {
        html: batchResult.html,
        title: batchResult.title,
        slideCount: batchResult.slideCount,
        reviewPassed: true,
      };

      onEvent({ type: 'step-done', stepId: 'finalize', label: 'Finalizing presentation…' });
      onEvent({ type: 'complete', result: batchOutput });

      return batchOutput;
    }

    // ── Phase 2: Design (ToolLoopAgent with self-validation) ─────
    const designStepId = isEdit ? 'targeted-design' : 'design';
    const designLabel = isEdit ? 'Editing slides…' : 'Designing your slide…';
    onEvent({ type: 'step-start', stepId: designStepId, label: designLabel });
    onEvent({ type: 'progress', message: isEdit ? 'Applying changes…' : 'Designing a stunning slide…', pct: 30 });

    const designResult = isEdit
      ? await designEdit(
          planResult,
          input.existingSlidesHtml!,
          effectiveChatHistory,
          model,
          onEvent,
          signal,
        )
      : await design(
          planResult,
          input.existingSlidesHtml,
          effectiveChatHistory,
          model,
          onEvent,
          signal,
        );

    onEvent({
      type: 'progress',
      message: isEdit
        ? `Updated ${designResult.slideCount} slide(s)`
        : `Slide designed${designResult.title ? `: ${designResult.title}` : ''}`,
      pct: 70,
    });
    onEvent({ type: 'step-done', stepId: designStepId, label: designLabel });

    if (signal?.aborted) throw new DOMException('Workflow aborted', 'AbortError');

    // ── Phase 3: Evaluate + Revise (configurable) ────────────────
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
      const blockingIssues = qaResult.violations.filter((v) => v.tier === 'blocking');
      const advisories = qaResult.violations.filter((v) => v.tier === 'advisory');
      aiDebugLog('workflow', qaResult.passed ? 'QA advisories on final output' : 'QA blocking issues on final output', {
        blockingCount: qaResult.blockingCount,
        advisoryCount: qaResult.advisoryCount,
        blockingIssues: blockingIssues.map((v) => `[${v.rule}] slide ${v.slide}: ${v.detail}`),
        advisories: advisories.map((v) => `[${v.rule}] slide ${v.slide}: ${v.detail}`),
      });
    }

    // Evaluator runs only when:
    // 1. The designer took the fast path (QA passed on draft, no agent loop ran)
    // 2. The intent supports LLM evaluation (add_slides validates new-slide-only internally)
    // 3. alwaysRunEvaluation is enabled OR QA somehow failed on the fast-path output
    // When fastPath=false (agent loop ran), the agent already self-corrected — don't pile on.
    const canEvaluate = planResult.intent !== 'add_slides';
    const shouldEvaluate = canEvaluate && designResult.fastPath && (alwaysRunEvaluation || !qaResult.passed);
    aiDebugLog('workflow', `phase 3 decision`, {
      intent: planResult.intent,
      fastPath: designResult.fastPath,
      qaPassed: qaResult.passed,
      blockingCount: qaResult.blockingCount,
      advisoryCount: qaResult.advisoryCount,
      alwaysRunEvaluation,
      canEvaluate,
      shouldEvaluate,
    });

    if (shouldEvaluate) {
      onEvent({ type: 'step-start', stepId: 'evaluate', label: 'Evaluating quality…' });
      try {
        finalHtml = await evaluateAndRevise(
          model,
          designResult.html,
          planResult,
          onEvent,
          signal,
        );
        onEvent({ type: 'step-done', stepId: 'evaluate', label: 'Evaluating quality…' });
      } catch (evalErr) {
        // Evaluation failed — log and continue with designer output unchanged
        aiDebugLog('workflow', 'evaluator error, using designer output', toErrorInfo(evalErr));
        console.warn('[Workflow] evaluator error, using designer output:', evalErr);
        onEvent({ type: 'step-skipped', stepId: 'evaluate', label: 'Evaluating quality…' });
      }
    } else {
      onEvent({ type: 'step-skipped', stepId: 'evaluate', label: 'Evaluating quality…' });
      onEvent({ type: 'progress', message: 'QA passed — skipping evaluation', pct: 85 });
    }

    // For add_slides the merged deck's QA mixes old slides with new; use the designer's
    // result (fastPath = new slide passed, agent ran = agent corrected it) instead.
    reviewPassed = planResult.intent === 'add_slides' ? designResult.fastPath : qaResult.passed;

    if (signal?.aborted) throw new DOMException('Workflow aborted', 'AbortError');

    // ── Phase 4: Finalize ────────────────────────────────────────
    onEvent({ type: 'step-start', stepId: 'finalize', label: 'Finalizing slide…' });

    const output: PresentationOutput = {
      html: sanitizeInnerHtml(finalHtml),
      title: designResult.title,
      slideCount: designResult.slideCount,
      reviewPassed,
    };

    onEvent({ type: 'step-done', stepId: 'finalize', label: 'Finalizing slide…' });
    onEvent({ type: 'complete', result: output });

    aiDebugLog('workflow', `workflow complete in ${(performance.now() - workflowStart).toFixed(0)}ms`, {
      slideCount: output.slideCount,
      reviewPassed,
      fastPath: designResult.fastPath,
      evaluationRan: shouldEvaluate,
    });

    return output;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    const message = err instanceof Error ? err.message : String(err);
    onEvent({ type: 'step-error', stepId: 'workflow', error: message });
    throw err;
  }
}
