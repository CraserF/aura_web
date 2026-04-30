import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LanguageModel } from 'ai';
import type { PlanResult } from '@/services/ai/workflow/agents/planner';
import type { WorkflowEvent } from '@/services/ai/workflow/types';

const designerMocks = vi.hoisted(() => ({
  design: vi.fn(),
}));

vi.mock('@/services/ai/workflow/agents/designer', () => ({
  design: designerMocks.design,
}));

const { runBatchQueue } = await import('@/services/ai/workflow/batchQueue');
const designMock = designerMocks.design;

describe('batch presentation queue', () => {
  beforeEach(() => {
    designMock.mockReset();
  });

  it('keeps existing deck style context on the first queued appended slide', async () => {
    const existingDeck = `<style>:root{--accent:#245c5f}.existing-shell{font-size:28px}.headline{font-size:72px}</style>
      <section class="existing-shell" data-background-color="#ffffff"><h1 class="headline">Existing title</h1></section>`;
    const planResult = {
      intent: 'batch_create',
      blocked: false,
      enhancedPrompt: 'Append one proof slide to the existing deck.',
      slideBriefs: [
        {
          index: 1,
          title: 'Proof point',
          contentGuidance: 'Add one proof slide that continues the current deck.',
        },
      ],
    } as PlanResult;

    designMock.mockResolvedValue({
      html: '<section class="existing-shell" data-background-color="#ffffff"><h2 class="headline">Proof point</h2></section>',
      title: 'Proof point',
      slideCount: 1,
      fastPath: true,
    });

    const result = await runBatchQueue({
      planResult,
      model: {} as LanguageModel,
      initialHtml: existingDeck,
      onEvent: vi.fn(),
      onSlideComplete: vi.fn(),
    });

    expect(designMock).toHaveBeenCalledTimes(1);
    const designCall = designMock.mock.calls[0] ?? [];
    const existingHtmlContext = designCall[1] as string;
    const slidePrompt = designCall[9] as string;

    expect(existingHtmlContext).toContain('Existing title');
    expect(slidePrompt).toContain('Existing deck shared style');
    expect(slidePrompt).toContain('--accent');
    expect(slidePrompt).toContain('existing-shell');
    expect(slidePrompt).toContain('Append to the existing deck style system');
    expect(slidePrompt).not.toContain('PRESENTATION DESIGN VOCABULARY');
    expect(slidePrompt).not.toContain('This first slide establishes the reusable deck style system');
    expect(result.html).toContain('Existing title');
    expect(result.html).toContain('Proof point');
  });

  it('locks queued creation to one deterministic style block and section-only slide output', async () => {
    const planResult = {
      intent: 'batch_create',
      blocked: false,
      enhancedPrompt: 'Create a launch deck.',
      slideBriefs: [
        {
          index: 1,
          title: 'Opening',
          contentGuidance: 'Open the launch narrative.',
        },
        {
          index: 2,
          title: 'Proof',
          contentGuidance: 'Show one proof point.',
        },
      ],
    } as PlanResult;

    designMock
      .mockResolvedValueOnce({
        html: '<section class="launch-slide" data-background-color="#ffffff"><h1 class="launch-title">Opening</h1></section>',
        title: 'Opening',
        slideCount: 1,
        fastPath: true,
      })
      .mockResolvedValueOnce({
        html: '<style>.bad-reset{color:red}</style><section class="launch-slide" data-background-color="#ffffff"><h2>Proof</h2></section>',
        title: 'Proof',
        slideCount: 1,
        fastPath: true,
      });

    const result = await runBatchQueue({
      planResult,
      model: {} as LanguageModel,
      styleSystemHtml: '<style>:root{--bg:#fff;--primary:#0056d6;--accent:#669c35}.launch-slide{font-size:28px}.launch-title{font-size:84px}</style>',
      onEvent: vi.fn(),
      onSlideComplete: vi.fn(),
    });

    expect(designMock).toHaveBeenCalledTimes(2);
    expect((designMock.mock.calls[0]?.[9] as string)).toContain('Locked runtime-owned deck style');
    expect((designMock.mock.calls[0]?.[9] as string)).toContain('no `<style>` block');
    expect(result.html.match(/<style\b/gi)).toHaveLength(1);
    expect(result.html).not.toContain('bad-reset');
    expect(result.html).toContain('Opening');
    expect(result.html).toContain('Proof');
    expect(result.slideTimingsMs).toHaveLength(2);
    expect(result.styleSystemApplied).toBe(true);
  });

  it('previews a combined draft deck before the final queued slide completes', async () => {
    const planResult = {
      intent: 'batch_create',
      blocked: false,
      enhancedPrompt: 'Create a launch deck.',
      slideBriefs: [
        {
          index: 1,
          title: 'Opening',
          contentGuidance: 'Open the launch narrative.',
        },
      ],
    } as PlanResult;
    const onEvent = vi.fn();
    const onSlideDraft = vi.fn();
    const onSlideComplete = vi.fn();

    designMock.mockImplementationOnce(async (...args: unknown[]) => {
      const slideEventHandler = args[4] as (event: WorkflowEvent) => void;
      slideEventHandler({
        type: 'draft-complete',
        html: '<section class="launch-slide" data-background-color="#ffffff"><h1>Draft opening</h1></section>',
      });
      return {
        html: '<section class="launch-slide" data-background-color="#ffffff"><h1>Final opening</h1></section>',
        title: 'Opening',
        slideCount: 1,
        fastPath: true,
      };
    });

    const result = await runBatchQueue({
      planResult,
      model: {} as LanguageModel,
      styleSystemHtml: '<style>:root{--bg:#fff;--primary:#0056d6;--accent:#669c35}.launch-slide{font-size:28px}.launch-title{font-size:84px}</style>',
      onEvent,
      onSlideDraft,
      onSlideComplete,
    });

    expect(onSlideDraft).toHaveBeenCalledWith(expect.stringContaining('Draft opening'), 1, 1);
    expect(onSlideDraft.mock.calls[0]?.[0]).toContain('<style>');
    const draftCallOrder = onSlideDraft.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY;
    const completeCallOrder = onSlideComplete.mock.invocationCallOrder[0] ?? 0;
    expect(draftCallOrder).toBeLessThan(completeCallOrder);
    expect(onEvent).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'draft-complete' }));
    expect(onSlideComplete).toHaveBeenCalledWith(expect.stringContaining('Final opening'), 1, 1);
    expect(result.html).not.toContain('Draft opening');
    expect(result.html).toContain('Final opening');
  });
});
