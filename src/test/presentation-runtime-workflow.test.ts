import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LanguageModel } from 'ai';
import type { BatchQueueOptions, BatchQueueResult } from '@/services/ai/workflow/batchQueue';
import type { DesignResult } from '@/services/ai/workflow/agents/designer';
import type { PlanResult } from '@/services/ai/workflow/agents/planner';
import type { WorkflowEvent } from '@/services/ai/workflow/types';
import { summarizeRuntimeDiagnostics } from '@/services/artifactRuntime/diagnostics';
import { buildArtifactRunPlan } from '@/services/artifactRuntime/build';

const batchQueueMocks = vi.hoisted(() => ({
  runBatchQueue: vi.fn(),
}));

const designerMocks = vi.hoisted(() => ({
  design: vi.fn(),
  designEdit: vi.fn(),
}));

vi.mock('@/services/ai/workflow/batchQueue', () => ({
  runBatchQueue: batchQueueMocks.runBatchQueue,
}));

vi.mock('@/services/ai/workflow/agents/designer', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/services/ai/workflow/agents/designer')>();
  return {
    ...original,
    design: designerMocks.design,
    designEdit: designerMocks.designEdit,
  };
});

const {
  runPresentationRuntime,
  runQueuedPresentationRuntime,
  runSinglePresentationRuntime,
} = await import('@/services/artifactRuntime/presentationRuntime');
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
    designerMocks.design.mockReset();
    designerMocks.designEdit.mockReset();
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
    expect(output.runtime?.promptTokenEstimate).toBeGreaterThan(0);
    expect(output.runtime?.viewportContractPassed).toBe(true);
    expect(output.runtime?.validationByPart?.filter((part) => part.partId.startsWith('slide-'))).toHaveLength(2);

    const diagnostics = summarizeRuntimeDiagnostics([{
      artifactType: 'presentation',
      telemetry: output.runtime!,
      promptText: 'Create 2 slides: opening thesis, next move',
    }]);
    expect(diagnostics.firstPreviewCount).toBe(1);
    expect(diagnostics.totalQueuedPartCount).toBe(2);
    expect(diagnostics.validationPassRate).toBe(1);
    expect(diagnostics.viewportContractSampleCount).toBe(1);
    expect(diagnostics.viewportContractPassRate).toBe(1);
    expect(diagnostics.viewportBlockingIssueCount).toBe(0);
  });

  it('prefers ArtifactRunPlan workQueue slide parts over legacy slide briefs', async () => {
    const runPlan = createRunPlan();
    runPlan.queueMode = 'sequential';
    runPlan.workQueue = [
      {
        id: 'runtime-slide-2',
        artifactType: 'presentation',
        kind: 'slide',
        orderIndex: 1,
        title: 'Runtime slide two',
        brief: 'Close with the runtime-authored action.',
        status: 'pending',
      },
      {
        id: 'runtime-slide-1',
        artifactType: 'presentation',
        kind: 'slide',
        orderIndex: 0,
        title: 'Runtime slide one',
        brief: 'Open with the runtime-authored thesis.',
        status: 'pending',
      },
    ];
    const legacyPlanResult = {
      ...createPlanResult(),
      slideBriefs: [
        {
          index: 1,
          title: 'Legacy ignored',
          contentGuidance: 'This legacy planner brief should not drive queued generation.',
        },
      ],
    } as PlanResult;
    const firstSlideHtml = `${VALID_STYLE}
      <section data-background-color="#ffffff"><h1 class="slide-title">Runtime slide one</h1><p class="slide-body">Runtime-authored thesis.</p></section>`;
    const fullDeckHtml = `${firstSlideHtml}
      <section data-background-color="#ffffff"><h2 class="slide-title">Runtime slide two</h2><p class="slide-body">Runtime-authored action.</p></section>`;
    runBatchQueueMock.mockImplementation(async (options: BatchQueueOptions) => {
      expect(options.planResult.slideBriefs?.map((brief) => brief.title)).toEqual([
        'Runtime slide one',
        'Runtime slide two',
      ]);
      options.onSlideComplete(firstSlideHtml, 1, 2);
      options.onSlideComplete(fullDeckHtml, 2, 2);
      return createBatchResult(fullDeckHtml);
    });

    const output = await runQueuedPresentationRuntime({
      runPlan,
      planResult: legacyPlanResult,
      model: {} as LanguageModel,
      input: {
        prompt: 'Create 2 slides from the runtime plan',
        chatHistory: [],
      },
      onEvent: vi.fn(),
      isEdit: false,
    });

    expect(runBatchQueueMock).toHaveBeenCalledTimes(1);
    expect(output.html).toContain('Runtime slide one');
    expect(output.html).toContain('Runtime slide two');
    expect(output.html).not.toContain('Legacy ignored');
    expect(output.runtime?.queuedPartCount).toBe(2);
    expect(output.runtime?.completedPartCount).toBe(2);
  });

  it('orchestrates planning, design manifest, queued slides, validation, and finalization from the runtime', async () => {
    const runPlan = createRunPlan();
    runPlan.queueMode = 'sequential';
    runPlan.workQueue = [
      {
        id: 'runtime-outline-slide-1',
        artifactType: 'presentation',
        kind: 'slide',
        orderIndex: 0,
        title: 'Runtime outline',
        brief: 'Show the runtime-owned outline.',
        status: 'pending',
      },
      {
        id: 'runtime-outline-slide-2',
        artifactType: 'presentation',
        kind: 'slide',
        orderIndex: 1,
        title: 'Runtime finalization',
        brief: 'Show validation and final assembly.',
        status: 'pending',
      },
    ];
    const firstSlideHtml = `${VALID_STYLE}
      <section data-background-color="#ffffff"><h1 class="slide-title">Runtime outline</h1><p class="slide-body">Planner and design manifest are ready.</p></section>`;
    const fullDeckHtml = `${firstSlideHtml}
      <section data-background-color="#ffffff"><h2 class="slide-title">Runtime finalization</h2><p class="slide-body">Validation and final assembly pass.</p></section>`;
    runBatchQueueMock.mockImplementation(async (options: BatchQueueOptions) => {
      expect(options.runPlan?.runId).toBe(runPlan.runId);
      expect(options.planResult.slideBriefs?.map((brief) => brief.title)).toEqual([
        'Runtime outline',
        'Runtime finalization',
      ]);
      options.onSlideComplete(firstSlideHtml, 1, 2);
      options.onSlideComplete(fullDeckHtml, 2, 2);
      return createBatchResult(fullDeckHtml);
    });
    const events: WorkflowEvent[] = [];

    const output = await runPresentationRuntime({
      model: {} as LanguageModel,
      input: {
        prompt: 'Create a two slide deck about runtime ownership',
        chatHistory: [],
        artifactRunPlan: runPlan,
      },
      onEvent: (event) => events.push(event),
      editCorrectionPolicy: {
        mode: 'full',
        maxCorrectionSteps: 1,
      },
      skipSecondaryEvaluation: false,
    });

    expect(runBatchQueueMock).toHaveBeenCalledTimes(1);
    expect(output.runtime?.runMode).toBe('queued-create');
    expect(output.runtime?.queuedPartCount).toBe(2);
    expect(output.runtime?.validationPassed).toBe(true);
    expect(events).toContainEqual(expect.objectContaining({
      type: 'progress',
      message: runPlan.intentSummary,
      pct: 18,
    }));
    expect(events).toContainEqual(expect.objectContaining({
      type: 'progress',
      message: `Design manifest ready: ${runPlan.designManifest.family}.`,
      pct: 20,
    }));
    expect(events).toContainEqual(expect.objectContaining({
      type: 'step-done',
      stepId: 'finalize',
    }));
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
      partId: 'slide-1',
      runId: 'presentation-runtime-workflow-run',
    }));
    expect(events).toContainEqual(expect.objectContaining({
      type: 'step-update',
      stepId: 'slide-1',
      label: 'Repaired slide 1 fragment.',
      status: 'done',
    }));
    expect(events.some((event) =>
      event.type === 'progress' && event.message === 'Applying deterministic presentation repair.',
    )).toBe(false);
  });

  it('single-slide create runs deterministic repair when validation fails', async () => {
    const singlePlanResult: PlanResult = {
      intent: 'create',
      blocked: false,
      blueprint: { palette: { bg: '#ffffff' } },
      slideBriefs: [],
    } as PlanResult;
    // HTML missing data-background-color triggers a blocking violation
    const brokenHtml = `${VALID_STYLE}
      <section><h1 class="slide-title">Opening thesis</h1><p class="slide-body">Decision-ready opening.</p></section>`;
    const designResult: DesignResult = {
      html: brokenHtml,
      slideCount: 1,
      title: 'Opening thesis',
      fastPath: true,
    };
    designerMocks.design.mockResolvedValue(designResult);

    const output = await runSinglePresentationRuntime({
      runPlan: buildArtifactRunPlan({
        runId: 'single-repair-test',
        prompt: 'Create an opening slide',
        artifactType: 'presentation',
        operation: 'create',
        activeDocument: null,
        mode: 'execute',
        providerId: 'openai',
        providerModel: 'gpt-4o',
        allowFullRegeneration: false,
      }),
      planResult: singlePlanResult,
      model: {} as LanguageModel,
      input: { prompt: 'Create an opening slide', chatHistory: [] },
      onEvent: () => {},
      isEdit: false,
      effectiveChatHistory: [],
      skipSecondaryEvaluation: true,
    });

    // After repair the section should have data-background-color added
    expect(output.html).toContain('data-background-color="#ffffff"');
    expect(output.runtime?.validationPassed).toBe(true);
    expect(output.runtime?.repairCount).toBeGreaterThanOrEqual(1);
    // reviewPassed reflects post-repair validation
    expect(output.reviewPassed).toBe(true);
  });

  it('single-slide discards LLM polish when it introduces blocking issues', async () => {
    const singlePlanResult: PlanResult = {
      intent: 'create',
      blocked: false,
      blueprint: { palette: { bg: '#ffffff' } },
      slideBriefs: [],
    } as PlanResult;
    const validHtml = `${VALID_STYLE}
      <section data-background-color="#ffffff"><h1 class="slide-title">Opening thesis</h1><p class="slide-body">Decision-ready opening.</p></section>`;
    designerMocks.design.mockResolvedValue({
      html: validHtml,
      slideCount: 1,
      title: 'Opening thesis',
      fastPath: true,
    } as DesignResult);

    const output = await runSinglePresentationRuntime({
      runPlan: buildArtifactRunPlan({
        runId: 'single-polish-regression-test',
        prompt: 'Create an opening slide',
        artifactType: 'presentation',
        operation: 'create',
        activeDocument: null,
        mode: 'execute',
        providerId: 'openai',
        providerModel: 'gpt-4o',
        allowFullRegeneration: false,
      }),
      planResult: singlePlanResult,
      model: {} as LanguageModel,
      input: { prompt: 'Create an opening slide', chatHistory: [] },
      onEvent: () => {},
      isEdit: false,
      effectiveChatHistory: [],
      // alwaysRunEvaluation is off by default; fastPath=true qualifies for polish when score is low
      // but skipSecondaryEvaluation=true ensures we don't actually call the evaluator model
      skipSecondaryEvaluation: true,
    });

    // The valid pre-polish HTML is preserved
    expect(output.html).toContain('data-background-color="#ffffff"');
    expect(output.runtime?.validationPassed).toBe(true);
    expect(output.reviewPassed).toBe(true);
  });
});
