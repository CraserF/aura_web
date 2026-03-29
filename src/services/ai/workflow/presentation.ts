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
import { useSettingsStore } from '@/stores/settingsStore';
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

  // Create the AI SDK model with shared defaults (temperature, maxOutputTokens)
  const baseModel: LanguageModel = createModel(llmConfig);
  const model = withDefaults(baseModel);

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

    // ── Phase 2: Design (ToolLoopAgent with self-validation) ─────
    const designStepId = isEdit ? 'targeted-design' : 'design';
    const designLabel = isEdit ? 'Editing slides…' : 'Designing your slide…';
    onEvent({ type: 'step-start', stepId: designStepId, label: designLabel });
    onEvent({ type: 'progress', message: isEdit ? 'Applying changes…' : 'Designing a stunning slide…', pct: 30 });

    const designResult = isEdit
      ? await designEdit(
          planResult,
          input.existingSlidesHtml!,
          input.chatHistory,
          model,
          onEvent,
          signal,
        )
      : await design(
          planResult,
          input.existingSlidesHtml,
          input.chatHistory,
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

    const shouldEvaluate = alwaysRunEvaluation || !qaResult.passed;

    if (shouldEvaluate) {
      onEvent({ type: 'step-start', stepId: 'evaluate', label: 'Evaluating quality…' });

      finalHtml = await evaluateAndRevise(
        model,
        designResult.html,
        planResult,
        onEvent,
        signal,
      );

      onEvent({ type: 'step-done', stepId: 'evaluate', label: 'Evaluating quality…' });
    } else {
      onEvent({ type: 'step-skipped', stepId: 'evaluate', label: 'Evaluating quality…' });
      onEvent({ type: 'progress', message: 'QA passed — skipping evaluation', pct: 85 });
    }

    reviewPassed = qaResult.passed;

    if (signal?.aborted) throw new DOMException('Workflow aborted', 'AbortError');

    // ── Phase 4: Finalize ────────────────────────────────────────
    onEvent({ type: 'step-start', stepId: 'finalize', label: 'Finalizing slide…' });

    const output: PresentationOutput = {
      html: finalHtml,
      title: designResult.title,
      slideCount: designResult.slideCount,
      reviewPassed,
    };

    onEvent({ type: 'step-done', stepId: 'finalize', label: 'Finalizing slide…' });
    onEvent({ type: 'complete', result: output });

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
