/**
 * Presentation Workflow — The main multi-agent pipeline.
 *
 * Flow: Plan → Design → QA Validate → [QA Branch] → Review → Revise (if needed)
 *
 * The QA branch runs a QA-revision LLM pass when programmatic QA finds errors,
 * or passes through unchanged when QA passes.
 *
 * Uses Mastra-style .then()/.branch() chaining with event emission
 * for real-time UI progress updates.
 */

import { createWorkflow, createLLMClient } from './engine';
import {
  planStep,
  designStep,
  qaValidateStep,
  qaPassStep,
  qaReviseStep,
  reviewStep,
  reviseStep,
} from './steps';
import type {
  PresentationInput,
  PresentationOutput,
  LLMConfig,
  EventListener,
} from './types';
import type { QAStepOutput } from './steps';

// ── Workflow Definition ──────────────────────────────────────

export const presentationWorkflow = createWorkflow<PresentationInput, PresentationOutput>({
  id: 'presentation',
})
  .then(planStep)
  .then(designStep)
  .then(qaValidateStep)
  .branch({
    predicate: (input: unknown) => {
      const qaOutput = input as QAStepOutput;
      return qaOutput.qaResult.passed ? 'pass' : 'fail';
    },
    branches: {
      pass: qaPassStep,
      fail: qaReviseStep,
    },
  })
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
