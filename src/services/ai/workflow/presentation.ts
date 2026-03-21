/**
 * Presentation Workflow — The main multi-agent pipeline.
 *
 * Flow: Plan → Design → QA Validate → Review → Revise (if needed)
 *
 * Uses Mastra-style .then() chaining with event emission
 * for real-time UI progress updates.
 */

import { createWorkflow, createLLMClient } from './engine';
import { planStep, designStep, qaValidateStep, reviewStep, reviseStep } from './steps';
import type {
  PresentationInput,
  PresentationOutput,
  LLMConfig,
  EventListener,
} from './types';

// ── Workflow Definition ──────────────────────────────────────

export const presentationWorkflow = createWorkflow<PresentationInput, PresentationOutput>({
  id: 'presentation',
})
  .then(planStep)
  .then(designStep)
  .then(qaValidateStep)
  .then(reviewStep)
  .then(reviseStep);

// ── Convenience runner ───────────────────────────────────────

export interface RunWorkflowOptions {
  input: PresentationInput;
  llmConfig: LLMConfig;
  onEvent: EventListener;
  signal?: AbortSignal;
}

/**
 * Run the full presentation workflow.
 * Returns the final output with HTML, title, and review status.
 */
export async function runPresentationWorkflow(
  opts: RunWorkflowOptions,
): Promise<PresentationOutput> {
  const { input, llmConfig, onEvent, signal } = opts;

  const llm = createLLMClient(llmConfig);
  const unsub = presentationWorkflow.onEvent(onEvent);

  try {
    const result = await presentationWorkflow.execute(input, llm, signal);
    return result;
  } finally {
    unsub();
  }
}
