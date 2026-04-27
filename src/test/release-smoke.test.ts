import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LanguageModel } from 'ai';
import type { BatchQueueOptions, BatchQueueResult } from '@/services/ai/workflow/batchQueue';
import type { PlanResult } from '@/services/ai/workflow/agents/planner';
import type { WorkflowEvent } from '@/services/ai/workflow/types';
import type { TemplateId } from '@/services/ai/templates';
import {
  buildArtifactRunPlan,
  buildPresentationQualityChecklist,
  runQueuedPresentationRuntime,
} from '@/services/artifactRuntime';
import { createBlankProject, buildStarterArtifact } from '@/services/bootstrap/projectStarter';
import { initProject } from '@/services/bootstrap/initProject';
import { listProjectStarterKits } from '@/services/bootstrap/starterKits';
import type { ProjectStarterArtifact, ProjectStarterKit } from '@/services/bootstrap/types';

const batchQueueMocks = vi.hoisted(() => ({
  runBatchQueue: vi.fn(),
}));

vi.mock('@/services/ai/workflow/batchQueue', () => ({
  runBatchQueue: batchQueueMocks.runBatchQueue,
}));

const runBatchQueueMock = batchQueueMocks.runBatchQueue;

const VALID_STYLE = `<style>
  :root { --bg: #ffffff; --ink: #142033; --accent: #245c5f; }
  @keyframes fadeIn { from { opacity: .9; } to { opacity: 1; } }
  @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
  .slide-title { color: var(--ink); font-size: 84px; line-height: .96; animation: fadeIn .4s ease both; }
  .slide-body { color: #314158; font-size: 28px; line-height: 1.28; }
  .slide-label { color: var(--accent); font-size: 18px; text-transform: uppercase; }
</style>`;

function countSections(html: string): number {
  return html.match(/<section\b/gi)?.length ?? 0;
}

function countStyleBlocks(html: string): number {
  return html.match(/<style\b/gi)?.length ?? 0;
}

function expectPresentationSmokeContract(html: string, slideCount: number): void {
  const checklist = buildPresentationQualityChecklist({ html });

  expect(countSections(html)).toBe(slideCount);
  expect(countStyleBlocks(html)).toBe(1);
  expect(checklist.ready).toBe(true);
  expect(checklist.viewportContractPassed).toBe(true);
  expect(html).not.toMatch(/\{\{[A-Z0-9_]+\}\}/);
  expect(html).not.toMatch(/<(?:html|body|script|link)\b/i);
  expect(html).not.toMatch(/\sstyle=/i);
  expect(html).not.toMatch(/<p\b[^>]*>\s*<\/p>/i);
}

function createSlide(index: number, title: string, body: string): string {
  return `<section data-background-color="#ffffff"><p class="slide-label">Slide ${index}</p><h1 class="slide-title">${title}</h1><p class="slide-body">${body}</p></section>`;
}

function createPlanResult(slideBriefs: PlanResult['slideBriefs']): PlanResult {
  return {
    intent: 'batch_create',
    blocked: false,
    blueprint: { palette: { bg: '#ffffff' } },
    slideBriefs,
  } as PlanResult;
}

function createRunPlan(prompt: string, operation: 'create' | 'edit' = 'create') {
  return buildArtifactRunPlan({
    runId: `release-smoke-${operation}`,
    prompt,
    artifactType: 'presentation',
    operation,
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
    slideCount: countSections(html),
    title: 'Release Smoke Deck',
  };
}

function getStarterKit(starterKitId: string): ProjectStarterKit {
  const kit = listProjectStarterKits().find((entry) => entry.id === starterKitId);
  if (!kit) {
    throw new Error(`Missing starter kit ${starterKitId}`);
  }
  return kit;
}

function getStarterArtifact(starterKitId: string): ProjectStarterArtifact {
  const kit = getStarterKit(starterKitId);
  const artifact = kit?.artifacts.find((entry) => entry.type === 'presentation');
  if (!artifact) {
    throw new Error(`Missing presentation starter artifact for ${starterKitId}`);
  }
  return artifact;
}

describe('presentation release smoke contracts', () => {
  beforeEach(() => {
    runBatchQueueMock.mockReset();
  });

  it('initializes executive and launch starter decks with production canvas contracts', async () => {
    const starterCases: Array<{
      starterKitId: string;
      expectedStarterId: string;
      expectedTemplateId: TemplateId;
    }> = [
      {
        starterKitId: 'executive-briefing',
        expectedStarterId: 'corporate',
        expectedTemplateId: 'executive-briefing-light',
      },
      {
        starterKitId: 'launch-plan',
        expectedStarterId: 'pitch-deck',
        expectedTemplateId: 'launch-narrative-light',
      },
    ];

    for (const starterCase of starterCases) {
      const baseProject = createBlankProject();
      const kit = getStarterKit(starterCase.starterKitId);
      const artifact = getStarterArtifact(starterCase.starterKitId);
      const { project, report } = await initProject(baseProject, {
        starterKitId: starterCase.starterKitId,
        artifacts: [artifact],
        defaultProjectTitle: kit.defaultProjectTitle,
        projectRulesMarkdown: kit.projectRulesMarkdown,
        contextPolicyOverrides: kit.contextPolicyOverrides,
        workflowPresets: kit.workflowPresets,
      });
      const deck = project.documents.find((document) => document.type === 'presentation');
      const buildResult = await buildStarterArtifact(artifact, starterCase.starterKitId);

      expect(report.createdCount).toBeGreaterThan(0);
      expect(report.items.some((item) => item.kind === 'artifact' && item.status === 'created')).toBe(true);
      expect(deck?.starterRef?.starterId).toBe(starterCase.expectedStarterId);
      expect(deck?.contentHtml).toContain('@scope (.reveal .slides)');
      expect(deck?.themeCss).toBe('');
      expect(deck?.slideCount).toBeGreaterThanOrEqual(3);
      expect(deck?.slideCount).toBeLessThanOrEqual(5);
      expectPresentationSmokeContract(deck?.contentHtml ?? '', deck?.slideCount ?? 0);

      expect(buildResult.runtimePlan?.designManifest.family).toBe(starterCase.expectedTemplateId);
      expect(buildResult.runtimePlan?.workQueue).toHaveLength(buildResult.slideCount);
      expect(buildResult.runtime?.runMode).toBe('deterministic-action');
      expect(buildResult.runtime?.queuedPartCount).toBe(buildResult.slideCount);
      expect(buildResult.runtime?.completedPartCount).toBe(buildResult.slideCount);
      expect(buildResult.runtime?.validationPassed).toBe(true);
    }
  });

  it('creates a fresh 3-slide presentation with first-preview and queued-part telemetry', async () => {
    const slideOne = `${VALID_STYLE}${createSlide(1, 'Opening thesis', 'Decision-ready opening for the deck.')}`;
    const fullDeck = `${VALID_STYLE}${createSlide(1, 'Opening thesis', 'Decision-ready opening for the deck.')}
      ${createSlide(2, 'Evidence stack', 'Three signals make the recommendation easier to trust.')}
      ${createSlide(3, 'Next action', 'Approve the immediate action and owner.')}`;
    runBatchQueueMock.mockImplementation(async (options: BatchQueueOptions) => {
      options.onSlideComplete(slideOne, 1, 3);
      options.onSlideComplete(`${slideOne}${createSlide(2, 'Evidence stack', 'Three signals make the recommendation easier to trust.')}`, 2, 3);
      options.onSlideComplete(fullDeck, 3, 3);
      return createBatchResult(fullDeck);
    });
    const events: WorkflowEvent[] = [];

    const output = await runQueuedPresentationRuntime({
      runPlan: createRunPlan('Create a 3-slide presentation for a release smoke test'),
      planResult: createPlanResult([
        { index: 1, title: 'Opening thesis', contentGuidance: 'State the main argument.' },
        { index: 2, title: 'Evidence stack', contentGuidance: 'Show proof.' },
        { index: 3, title: 'Next action', contentGuidance: 'Close with action.' },
      ]),
      model: {} as LanguageModel,
      input: {
        prompt: 'Create a 3-slide presentation for a release smoke test',
        chatHistory: [],
      },
      onEvent: (event) => events.push(event),
      isEdit: false,
    });

    expectPresentationSmokeContract(output.html, 3);
    expect(output.runtime?.runMode).toBe('queued-create');
    expect(output.runtime?.queuedPartCount).toBe(3);
    expect(output.runtime?.completedPartCount).toBe(3);
    expect(output.runtime?.timeToFirstPreviewMs).toBeGreaterThanOrEqual(0);
    expect(output.runtime?.validationPassed).toBe(true);
    expect(events.filter((event) => event.type === 'batch-slide-complete')).toHaveLength(3);
  });

  it('edits a queued presentation while preserving an unaffected slide', async () => {
    const existingDeck = `${VALID_STYLE}${createSlide(1, 'Keep this slide exactly', 'This unaffected opening slide should remain in place.')}
      ${createSlide(2, 'Old recommendation', 'This slide should be updated.')}`;
    const editedDeck = `${VALID_STYLE}${createSlide(1, 'Keep this slide exactly', 'This unaffected opening slide should remain in place.')}
      ${createSlide(2, 'Updated recommendation', 'The recommendation now reflects the requested edit.')}`;
    runBatchQueueMock.mockImplementation(async (options: BatchQueueOptions) => {
      expect(options.initialHtml).toBe(existingDeck);
      options.onSlideComplete(editedDeck, 1, 1);
      return createBatchResult(editedDeck);
    });
    const events: WorkflowEvent[] = [];

    const output = await runQueuedPresentationRuntime({
      runPlan: createRunPlan('Update only the recommendation slide', 'edit'),
      planResult: createPlanResult([
        { index: 2, title: 'Updated recommendation', contentGuidance: 'Update the recommendation only.' },
      ]),
      model: {} as LanguageModel,
      input: {
        prompt: 'Update only the recommendation slide',
        existingSlidesHtml: existingDeck,
        chatHistory: [],
      },
      onEvent: (event) => events.push(event),
      isEdit: true,
    });

    expectPresentationSmokeContract(output.html, 2);
    expect(output.html).toContain('Keep this slide exactly');
    expect(output.html).toContain('Updated recommendation');
    expect(output.runtime?.runMode).toBe('queued-edit');
    expect(output.runtime?.queuedPartCount).toBe(1);
    expect(output.runtime?.validationPassed).toBe(true);
    expect(events).toContainEqual(expect.objectContaining({
      type: 'step-update',
      stepId: 'targeted-design',
      status: 'done',
    }));
  });
});
