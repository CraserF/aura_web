/**
 * Lightweight workflow engine inspired by Mastra's createStep/createWorkflow.
 * Runs entirely in the browser — no server dependency.
 *
 * Supports:
 *  - Sequential steps (.then)
 *  - Parallel steps (.parallel)
 *  - Conditional branching (.branch)
 *  - Per-step retry with backoff
 *  - Per-step timeout
 *  - Event emission for real-time UI updates
 *  - Abort/cancel via AbortController
 */

import { streamText, generateObject } from 'ai';
import type { LanguageModelV1 } from 'ai';
import type {
  Step,
  StepContext,
  WorkflowEvent,
  EventListener,
  LLMClient,
  LLMConfig,
  BranchConfig,
} from './types';

// ── Step factory (mirrors Mastra's createStep) ───────────────

export function createStep<TIn, TOut>(def: Step<TIn, TOut>): Step<TIn, TOut> {
  return def;
}

// ── LLM Client factory ──────────────────────────────────────

export function createLLMClient(config: LLMConfig): LLMClient {
  const model: LanguageModelV1 = config.providerEntry.createModel({
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    model: config.model,
  });

  return {
    async generate(messages, onChunk) {
      const result = streamText({
        model,
        messages,
        temperature: 0.7,
        maxTokens: 16384,
      });

      let fullText = '';
      for await (const chunk of result.textStream) {
        fullText += chunk;
        onChunk?.(chunk);
      }
      return fullText;
    },

    async generateStructured(messages, schema, schemaName) {
      const result = await generateObject({
        model,
        messages,
        schema,
        schemaName,
        maxRetries: 2,
      });
      return result.object;
    },
  };
}

// ── Utilities ────────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Step timed out after ${ms}ms`)), ms),
    ),
  ]);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Workflow builder & runner ────────────────────────────────

type StepNode =
  | { kind: 'sequential'; step: Step }
  | { kind: 'parallel'; steps: Step[] }
  | { kind: 'branch'; config: BranchConfig };

export class Workflow<TInput = unknown, TOutput = unknown> {
  readonly id: string;
  private nodes: StepNode[] = [];
  private listeners: EventListener[] = [];

  constructor(opts: { id: string }) {
    this.id = opts.id;
  }

  /** Add a sequential step */
  then<A, B>(step: Step<A, B>): this {
    this.nodes.push({ kind: 'sequential', step: step as unknown as Step });
    return this;
  }

  /** Add parallel steps (all receive the same input, outputs keyed by step id) */
  parallel(steps: Step[]): this {
    this.nodes.push({ kind: 'parallel', steps });
    return this;
  }

  /** Add a conditional branch — predicate returns the branch name to execute */
  branch(config: BranchConfig): this {
    this.nodes.push({ kind: 'branch', config });
    return this;
  }

  /** Subscribe to workflow events */
  onEvent(listener: EventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private emit(event: WorkflowEvent) {
    for (const l of this.listeners) {
      try {
        l(event);
      } catch {
        // Don't let listener errors crash the workflow
      }
    }
  }

  /** Execute a single step with retry and timeout support */
  private async executeStep(
    step: Step,
    ctx: StepContext,
  ): Promise<unknown> {
    const maxAttempts = step.retry?.maxAttempts ?? 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const promise = step.execute(ctx);
        if (step.timeoutMs) {
          return await withTimeout(promise, step.timeoutMs);
        }
        return await promise;
      } catch (err) {
        const isLastAttempt = attempt === maxAttempts;
        const error = err instanceof Error ? err : new Error(String(err));

        if (isLastAttempt) throw error;
        if (step.retry?.retryOn && !step.retry.retryOn(error)) throw error;

        this.emit({
          type: 'retry-attempt',
          stepId: step.id,
          attempt,
          maxAttempts,
        });

        await delay(step.retry?.backoffMs ?? 1000);
      }
    }

    // Unreachable, but TypeScript needs it
    throw new Error('Unexpected retry loop exit');
  }

  /** Execute the workflow */
  async execute(
    input: TInput,
    llm: LLMClient,
    signal?: AbortSignal,
  ): Promise<TOutput> {
    const results = new Map<string, unknown>();
    let current: unknown = input;
    const abortSignal = signal ?? new AbortController().signal;

    for (const node of this.nodes) {
      if (abortSignal.aborted) throw new DOMException('Workflow aborted', 'AbortError');

      if (node.kind === 'sequential') {
        const { step } = node;
        this.emit({ type: 'step-start', stepId: step.id, label: step.description ?? step.id });

        try {
          const ctx: StepContext = {
            inputData: current,
            llm,
            emit: (e) => this.emit(e),
            getStepResult: <R,>(id: string) => results.get(id) as R | undefined,
            signal: abortSignal,
          };
          const output = await this.executeStep(step, ctx);
          results.set(step.id, output);
          current = output;
          this.emit({ type: 'step-done', stepId: step.id, label: step.description ?? step.id });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          this.emit({ type: 'step-error', stepId: step.id, error: msg });
          throw err;
        }
      }

      if (node.kind === 'parallel') {
        const parallelInput = current;
        const promises = node.steps.map(async (step) => {
          this.emit({ type: 'step-start', stepId: step.id, label: step.description ?? step.id });
          try {
            const ctx: StepContext = {
              inputData: parallelInput,
              llm,
              emit: (e) => this.emit(e),
              getStepResult: <R,>(id: string) => results.get(id) as R | undefined,
              signal: abortSignal,
            };
            const output = await this.executeStep(step, ctx);
            results.set(step.id, output);
            this.emit({ type: 'step-done', stepId: step.id, label: step.description ?? step.id });
            return { id: step.id, output };
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.emit({ type: 'step-error', stepId: step.id, error: msg });
            throw err;
          }
        });

        const settled = await Promise.all(promises);
        // Build keyed output like Mastra's parallel: { "step-1": output1, "step-2": output2 }
        const keyed: Record<string, unknown> = {};
        for (const { id, output } of settled) {
          keyed[id] = output;
        }
        current = keyed;
      }

      if (node.kind === 'branch') {
        const { config } = node;
        const branchName = config.predicate(current);
        const branchStep = config.branches[branchName];

        if (!branchStep) {
          throw new Error(`Branch '${branchName}' not found in branch config`);
        }

        this.emit({ type: 'branch-taken', stepId: branchStep.id, branch: branchName });
        this.emit({ type: 'step-start', stepId: branchStep.id, label: branchStep.description ?? branchStep.id });

        // Mark skipped branches
        for (const [name, step] of Object.entries(config.branches)) {
          if (name !== branchName) {
            this.emit({ type: 'step-skipped', stepId: step.id, label: step.description ?? step.id });
          }
        }

        try {
          const ctx: StepContext = {
            inputData: current,
            llm,
            emit: (e) => this.emit(e),
            getStepResult: <R,>(id: string) => results.get(id) as R | undefined,
            signal: abortSignal,
          };
          const output = await this.executeStep(branchStep, ctx);
          results.set(branchStep.id, output);
          current = output;
          this.emit({ type: 'step-done', stepId: branchStep.id, label: branchStep.description ?? branchStep.id });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          this.emit({ type: 'step-error', stepId: branchStep.id, error: msg });
          throw err;
        }
      }
    }

    this.emit({ type: 'complete', result: current });
    return current as TOutput;
  }
}

/** Factory function (mirrors Mastra's createWorkflow) */
export function createWorkflow<TIn, TOut>(opts: { id: string }) {
  return new Workflow<TIn, TOut>(opts);
}
