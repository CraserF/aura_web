/**
 * Presentation Workflow — provider/model setup shell for the runtime-owned
 * presentation orchestrator.
 */

import { createModel } from './engine';
import { withDefaults } from '../middleware';
import { aiDebugLog } from '../debug';
import { getProviderCapabilityProfile } from '../providerCapabilities';
import { runPresentationRuntime } from '@/services/artifactRuntime/presentationRuntime';
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
  const baseModel = await createModel(llmConfig);
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
    return await runPresentationRuntime({
      model,
      input,
      onEvent,
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
