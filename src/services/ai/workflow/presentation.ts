/**
 * Presentation Workflow — Intent-based multi-agent pipelines.
 *
 * Two workflows:
 *
 *  CREATE flow (new decks):
 *    Plan → Batch Design → Draft Complete → QA Validate → [QA Branch] → Review → Revise
 *    - Slides appear on canvas in batches of 3 (~15s for first batch)
 *    - QA/Review/Revise runs in "background" (user already sees draft)
 *
 *  EDIT flow (modify/refine_style/add_slides):
 *    Plan → Targeted Design → Draft Complete → QA Validate → [QA Branch]
 *    - Uses compact ~3K-token prompt (10x smaller)
 *    - No review/revise — completes in ~15-30s
 */

import { createWorkflow, createLLMClient } from './engine';
import {
  planStep,
  batchDesignStep,
  targetedDesignStep,
  draftCompleteStep,
  qaValidateStep,
  qaPassStep,
  qaReviseStep,
  editStyleReviewStep,
  reviewStep,
  reviseStep,
} from './steps';
import type {
  PresentationInput,
  PresentationOutput,
  LLMConfig,
  EventListener,
  BranchConfig,
} from './types';
import type { QAStepOutput } from './steps';

// ── QA branch predicate (shared between both pipelines) ─────

const qaBranchConfig: BranchConfig = {
  predicate: (input) => {
    const qaOutput = input as QAStepOutput;
    return qaOutput.qaResult.passed ? 'pass' : 'fail';
  },
  branches: {
    pass: qaPassStep as never,
    fail: qaReviseStep as never,
  },
};

// ── CREATE workflow (batch generation + background review) ───

export const createWorkflowPipeline = createWorkflow<PresentationInput, PresentationOutput>({
  id: 'presentation-create',
})
  .then(planStep)
  .then(batchDesignStep)
  .then(draftCompleteStep)
  .then(qaValidateStep)
  .branch(qaBranchConfig)
  .then(reviewStep)
  .then(reviseStep);

// ── EDIT workflow (targeted design, no review) ──────────────

export const editWorkflowPipeline = createWorkflow<PresentationInput, PresentationOutput>({
  id: 'presentation-edit',
})
  .then(planStep)
  .then(targetedDesignStep)
  .then(draftCompleteStep)
  .then(qaValidateStep)
  .branch(qaBranchConfig)
  .then(editStyleReviewStep)
  .then(reviseStep);

// ── Convenience runner ───────────────────────────────────────

export interface RunWorkflowOptions {
  input: PresentationInput;
  llmConfig: LLMConfig;
  onEvent: EventListener;
  signal?: AbortSignal;
}

/**
 * Run the appropriate presentation workflow based on whether slides exist.
 * - Existing slides → edit workflow (compact prompt, no review)
 * - No slides → create workflow (batch generation + background review)
 */
export async function runPresentationWorkflow(
  opts: RunWorkflowOptions,
): Promise<PresentationOutput> {
  const { input, llmConfig, onEvent, signal } = opts;

  const isEdit = !!input.existingSlidesHtml;
  const workflow = isEdit ? editWorkflowPipeline : createWorkflowPipeline;

  const llm = createLLMClient(llmConfig);
  const unsub = workflow.onEvent(onEvent);

  try {
    const result = await workflow.execute(input, llm, signal);
    return result;
  } finally {
    unsub();
  }
}
