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
import { aiDebugLog } from '../debug';
import { getProviderCapabilityProfile } from '../providerCapabilities';
import { applyArtifactRunPlanToPresentationPlan } from '@/services/artifactRuntime/presentation';
import {
  canRunQueuedPresentationRuntime,
  runQueuedPresentationRuntime,
  runSinglePresentationRuntime,
} from '@/services/artifactRuntime/presentationRuntime';
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
  // Create the AI SDK model with shared defaults (temperature, maxOutputTokens)
  const baseModel: LanguageModel = await createModel(llmConfig);
  const model = withDefaults(baseModel);
  const providerProfile = getProviderCapabilityProfile({
    id: llmConfig.providerEntry.id,
    model: llmConfig.model,
  });
  const editCorrectionPolicy = {
    mode: providerProfile.editCorrectionMode,
    maxCorrectionSteps: providerProfile.maxEditCorrectionSteps,
  } as const;
  aiDebugLog('workflow', `starting ${isEdit ? 'edit' : 'create'} workflow`, { model: llmConfig.model });

  try {
    // ── Phase 1: Plan (rule-based, no LLM) ──────────────────────
    onEvent({ type: 'step-start', stepId: 'plan', label: 'Analyzing your request…' });
    onEvent({ type: 'progress', message: 'Understanding your request…', pct: 10 });

    let planResult = await plan(input.prompt, isEdit);

    if (planResult.blocked) {
      onEvent({ type: 'step-error', stepId: 'plan', error: planResult.blockReason ?? 'Request blocked.' });
      throw new Error(planResult.blockReason ?? 'Request blocked.');
    }

    planResult = applyArtifactRunPlanToPresentationPlan(planResult, input.artifactRunPlan, isEdit);
    const guidanceProfile = input.templateGuidance ?? input.artifactRunPlan?.templateGuidance;

    onEvent({
      type: 'progress',
      message: input.artifactRunPlan
        ? `Designing with ${input.artifactRunPlan.designManifest.family}`
        : `Detected ${planResult.style} style, animation level ${planResult.animationLevel}`,
      pct: 20,
    });
    onEvent({ type: 'step-done', stepId: 'plan', label: 'Analyzing your request…' });

    // Check for abort between phases
    if (signal?.aborted) throw new DOMException('Workflow aborted', 'AbortError');

    // ── Queued multi-slide flow ─────────────────────────────────
    if (canRunQueuedPresentationRuntime(planResult)) {
      return runQueuedPresentationRuntime({
        ...(input.artifactRunPlan ? { runPlan: input.artifactRunPlan } : {}),
        planResult,
        model,
        input,
        onEvent,
        isEdit,
        ...(guidanceProfile ? { guidanceProfile } : {}),
        ...(signal ? { signal } : {}),
      });
    }

    return runSinglePresentationRuntime({
      ...(input.artifactRunPlan ? { runPlan: input.artifactRunPlan } : {}),
      planResult,
      model,
      input,
      onEvent,
      isEdit,
      effectiveChatHistory,
      ...(guidanceProfile ? { guidanceProfile } : {}),
      editCorrectionPolicy,
      skipSecondaryEvaluation: providerProfile.secondaryEvaluation === 'skip',
      ...(signal ? { signal } : {}),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    const message = err instanceof Error ? err.message : String(err);
    onEvent({ type: 'step-error', stepId: 'workflow', error: message });
    throw err;
  }
}
