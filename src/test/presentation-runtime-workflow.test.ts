import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LanguageModel } from 'ai';
import type { BatchQueueOptions, BatchQueueResult } from '@/services/ai/workflow/batchQueue';
import type { PlanResult } from '@/services/ai/workflow/agents/planner';
import type { WorkflowEvent } from '@/services/ai/workflow/types';
import { summarizeRuntimeDiagnostics } from '@/services/artifactRuntime/diagnostics';
import { buildArtifactRunPlan } from '@/services/artifactRuntime/build';

const batchQueueMocks = vi.hoisted(() => ({
  runBatchQueue: vi.fn(),
}));

vi.mock('@/services/ai/workflow/batchQueue', () => ({
  runBatchQueue: batchQueueMocks.runBatchQueue,
}));

const { runQueuedPresentationRuntime } = await import('@/services/artifactRuntime/presentationRuntime');
const runBatchQueueMock = batchQueueMocks.runBatchQueue;

const VALID_STYLE = `<style>
  :root { --bg: #ffffff; --accent: #245c5f; }
  @keyframes fade { from { opacity: .9; } to { opacity: 1; } }
  @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
  .slide-title { color: #162235; font-size: 84px; animation: fade 1s ease both; }
  .slide-body { color: #314158; font-size: 28px; }
</style>`;

function createPlanResult(): PlanResult {
  return {
    intent: 'batch_create',
    blocked: false,
    blueprint: {
      palette: {
        bg: '#ffffff',
      },
    },
    slideBriefs: [
      {
        index: 1,
        title: 'Opening thesis',
        contentGuidance: 'State the main argument.',
      },
      {
        index: 2,
        title: 'Next move',
        contentGuidance: 'Close with the action.',
      },
    ],
  } as PlanResult;
}

function createRunPlan() {
  return buildArtifactRunPlan({
    runId: 'presentation-runtime-workflow-run',
    prompt: 'Create 2 slides: opening thesis, next move',
    artifactType: 'presentation',
    operation: 'create',
    activeDocument: null,
    mode: 'execute',
    providerId: 'openai',
    providerModel: 'gpt-4o',
    allowFullRegeneration: false,
  });
}

function createBatchResult(html: string): BatchQueueResult {
  return {
    html,
    slideCount: html.match(/<section\b/gi)?.length ?? 0,
    title: 'Queued Runtime Deck',
  };
}

describe('presentation runtime workflow orchestration', () => {
  beforeEach(() => {
    runBatchQueueMock.mockReset();
  });

  it('records first-preview and queued slide telemetry for generated decks', async () => {
    const firstSlideHtml = `${VALID_STYLE}
      <section data-background-color="#ffffff"><h1 class="slide-title">Opening thesis</h1><p class="slide-body">Decision-ready opening.</p></section>`;
    const fullDeckHtml = `${firstSlideHtml}
      <section data-background-color="#ffffff"><h2 class="slide-title">Next move</h2><p class="slide-body">Approve the next action.</p></section>`;
    runBatchQueueMock.mockImplementation(async (options: BatchQueueOptions) => {
      options.onSlideComplete(firstSlideHtml, 1, 2);
      options.onSlideComplete(fullDeckHtml, 2, 2);
      return createBatchResult(fullDeckHtml);
    });
    const events: WorkflowEvent[] = [];

    const output = await runQueuedPresentationRuntime({
      runPlan: createRunPlan(),
      planResult: createPlanResult(),
      model: {} as LanguageModel,
      input: {
        prompt: 'Create 2 slides: opening thesis, next move',
        chatHistory: [],
      },
      onEvent: (event) => events.push(event),
      isEdit: false,
    });

    expect(runBatchQueueMock).toHaveBeenCalledTimes(1);
    expect(events.filter((event) => event.type === 'batch-slide-complete')).toHaveLength(2);
    expect(output.runtime?.runMode).toBe('queued-create');
    expect(output.runtime?.queuedPartCount).toBe(2);
    expect(output.runtime?.completedPartCount).toBe(2);
    expect(output.runtime?.timeToFirstPreviewMs).toBeGreaterThanOrEqual(0);
    expect(output.runtime?.validationPassed).toBe(true);
    expect(output.runtime?.validationByPart?.filter((part) => part.partId.startsWith('slide-'))).toHaveLength(2);

    const diagnostics = summarizeRuntimeDiagnostics([{
      artifactType: 'presentation',
      telemetry: output.runtime!,
      promptText: 'Create 2 slides: opening thesis, next move',
    }]);
    expect(diagnostics.firstPreviewCount).toBe(1);
    expect(diagnostics.totalQueuedPartCount).toBe(2);
    expect(diagnostics.validationPassRate).toBe(1);
  });

  it('repairs failing queued slide fragments before final deck validation', async () => {
    const fullDeckHtml = `${VALID_STYLE}
      <section><h1 class="slide-title">Opening thesis</h1><p class="slide-body">Decision-ready opening.</p></section>
      <section data-background-color="#ffffff"><h2 class="slide-title">Next move</h2><p class="slide-body">Approve the next action.</p></section>`;
    runBatchQueueMock.mockImplementation(async (options: BatchQueueOptions) => {
      options.onSlideComplete(fullDeckHtml, 1, 2);
      return createBatchResult(fullDeckHtml);
    });
    const events: WorkflowEvent[] = [];

    const output = await runQueuedPresentationRuntime({
      runPlan: createRunPlan(),
      planResult: createPlanResult(),
      model: {} as LanguageModel,
      input: {
        prompt: 'Create 2 slides: opening thesis, next move',
        chatHistory: [],
      },
      onEvent: (event) => events.push(event),
      isEdit: false,
    });

    expect(output.html).toContain('<section data-background-color="#ffffff"><h1 class="slide-title">Opening thesis</h1>');
    expect(output.runtime?.validationPassed).toBe(true);
    expect(output.runtime?.repairCount).toBe(1);
    expect(output.runtime?.repairedPartCount).toBe(1);
    expect(events).toContainEqual(expect.objectContaining({
      type: 'progress',
      message: 'Repairing slide 1 fragment.',
    }));
    expect(events.some((event) =>
      event.type === 'progress' && event.message === 'Applying deterministic presentation repair.',
    )).toBe(false);
  });
});
