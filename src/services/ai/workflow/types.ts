/**
 * Mastra-inspired workflow types for browser-based multi-agent orchestration.
 * Mirrors Mastra's createStep/createWorkflow patterns without server dependencies.
 */
import type { AIMessage, ProviderEntry } from '../types';
import type { z } from 'zod';

export type { AIMessage };

/** Context passed to every step's execute function */
export interface StepContext<T = unknown> {
  inputData: T;
  /** Make an LLM call through the active provider */
  llm: LLMClient;
  /** Emit a progress event to the UI */
  emit: (event: WorkflowEvent) => void;
  /** Access previous step results by step ID */
  getStepResult: <R = unknown>(stepId: string) => R | undefined;
  /** Abort signal — check if workflow was cancelled */
  signal: AbortSignal;
}

/** Retry configuration for a step */
export interface RetryOptions {
  maxAttempts: number;
  backoffMs: number;
  retryOn?: (error: Error) => boolean;
}

/** A single workflow step (like Mastra's createStep) */
export interface Step<TInput = unknown, TOutput = unknown> {
  id: string;
  description?: string;
  retry?: RetryOptions;
  timeoutMs?: number;
  execute: (ctx: StepContext<TInput>) => Promise<TOutput>;
}

/** Branch configuration */
export interface BranchConfig<T = unknown> {
  predicate: (input: T) => string;
  branches: Record<string, Step>;
}

/** Events emitted during workflow execution */
export type WorkflowEvent =
  | { type: 'step-start';      stepId: string; label: string }
  | { type: 'step-done';       stepId: string; label: string }
  | { type: 'step-error';      stepId: string; error: string }
  | { type: 'step-skipped';    stepId: string; label: string }
  | { type: 'streaming';       stepId: string; chunk: string }
  | { type: 'progress';        message: string; pct?: number }
  | { type: 'branch-taken';    stepId: string; branch: string }
  | { type: 'retry-attempt';   stepId: string; attempt: number; maxAttempts: number }
  | { type: 'qa-loop-iteration'; iteration: number; maxIterations: number; issues: string }
  | { type: 'batch-rendered';  batchIndex: number; totalBatches: number; accumulatedHtml: string }
  | { type: 'draft-complete';  html: string }
  | { type: 'complete';        result: unknown };

/** Subscribe to workflow events */
export type EventListener = (event: WorkflowEvent) => void;

/** LLM client abstraction — wraps AI SDK model for streaming and structured output */
export interface LLMClient {
  /** Generate raw text response (streaming) — used for HTML generation */
  generate(messages: AIMessage[], onChunk?: (text: string) => void): Promise<string>;
  /** Generate Zod-validated structured output — used for outlines and review results */
  generateStructured<T>(
    messages: AIMessage[],
    schema: z.ZodType<T>,
    schemaName?: string,
  ): Promise<T>;
}

/** Config needed to create an LLM client */
export interface LLMConfig {
  providerEntry: ProviderEntry;
  apiKey: string;
  baseUrl: string;
  model?: string;
}

/** Input to the presentation workflow */
export interface PresentationInput {
  prompt: string;
  existingSlidesHtml?: string;
  chatHistory: AIMessage[];
}

/** Output from the presentation workflow */
export interface PresentationOutput {
  html: string;
  title?: string;
  slideCount: number;
  reviewPassed: boolean;
}
