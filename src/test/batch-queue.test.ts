import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LanguageModel } from 'ai';
import type { PlanResult } from '@/services/ai/workflow/agents/planner';

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
});
