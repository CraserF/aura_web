/**
 * Batch Queue Runner — generates slides sequentially for batch_create intent.
 * Each slide streams to the canvas as it completes.
 */
import type { LanguageModel } from 'ai';
import type { PlanResult, SlideBrief } from './agents/planner';
import type { EventListener } from './types';
import { design } from './agents/designer';
import { buildBatchSlidePrompt } from '../prompts/composer';
import { sanitizeInnerHtml } from '@/services/html/sanitizer';

export interface BatchQueueOptions {
  planResult: PlanResult;
  model: LanguageModel;
  onEvent: EventListener;
  onSlideComplete: (combinedHtml: string, slideIndex: number, totalSlides: number) => void;
  signal?: AbortSignal;
}

export interface BatchQueueResult {
  html: string;
  slideCount: number;
  title: string;
}

/**
 * Run slides sequentially, calling onSlideComplete after each so the canvas
 * can display progressive results.
 */
export async function runBatchQueue(opts: BatchQueueOptions): Promise<BatchQueueResult> {
  const { planResult, model, onEvent, onSlideComplete, signal } = opts;
  const briefs: SlideBrief[] = planResult.slideBriefs ?? [];
  const totalSlides = briefs.length;

  if (totalSlides === 0) throw new Error('No slide briefs in batch plan');

  let sharedStyleBlock = ''; // extracted <style> from slide 1
  const completedSections: string[] = [];
  let sharedLinkBlock = ''; // extracted <link> from slide 1
  let batchTitle = briefs[0]?.title ?? 'Presentation';

  for (let i = 0; i < briefs.length; i++) {
    const brief = briefs[i];
    if (!brief) continue;

    if (signal?.aborted) throw new DOMException('Batch aborted', 'AbortError');

    onEvent({
      type: 'progress',
      message: `Designing slide ${brief.index} of ${totalSlides}: ${brief.title}`,
      pct: Math.round(20 + (i / totalSlides) * 60),
    });
    onEvent({
      type: 'step-update',
      stepId: `slide-${brief.index}`,
      label: `Slide ${brief.index}/${totalSlides}: ${brief.title}`,
      status: 'active',
    });

    // Build the enhanced prompt for this slide
    const slidePrompt = buildBatchSlidePrompt(
      planResult.enhancedPrompt,
      brief,
      totalSlides,
      i === 0 ? undefined : sharedStyleBlock,
    );

    // Create a modified plan result with the slide-specific prompt
    const slidePlanResult: PlanResult = {
      ...planResult,
      intent: 'create',
      enhancedPrompt: slidePrompt,
    };

    // Generate this slide using the standard design flow
    const slideResult = await design(
      slidePlanResult,
      i === 0 ? undefined : buildCurrentHtml(sharedLinkBlock, sharedStyleBlock, completedSections),
      [], // no chat history for individual batch slides
      model,
      onEvent,
      undefined,
      signal,
    );

    const cleanHtml = sanitizeInnerHtml(slideResult.html);

    // Extract shared <link> and <style> from slide 1 for reuse
    if (i === 0) {
      const linkMatch = cleanHtml.match(/<link[^>]*>/gi) ?? [];
      sharedLinkBlock = linkMatch.join('\n');
      const styleMatch = cleanHtml.match(/<style[\s\S]*?<\/style>/i)?.[0] ?? '';
      sharedStyleBlock = styleMatch;
      batchTitle = slideResult.title ?? brief.title;
    }

    // Extract just the <section> elements from this slide
    const sectionRegex = /<section[\s\S]*?<\/section>/gi;
    let sectionMatch: RegExpExecArray | null;
    while ((sectionMatch = sectionRegex.exec(cleanHtml)) !== null) {
      const matchedSection = sectionMatch[0];
      if (matchedSection) completedSections.push(matchedSection);
    }

    // Build combined HTML and notify canvas
    const combinedHtml = buildCurrentHtml(sharedLinkBlock, sharedStyleBlock, completedSections);
    onSlideComplete(combinedHtml, brief.index, totalSlides);

    onEvent({
      type: 'step-update',
      stepId: `slide-${brief.index}`,
      label: `Slide ${brief.index}/${totalSlides}: ${brief.title}`,
      status: 'done',
    });
  }

  const finalHtml = buildCurrentHtml(sharedLinkBlock, sharedStyleBlock, completedSections);
  return {
    html: finalHtml,
    slideCount: completedSections.length,
    title: batchTitle,
  };
}

function buildCurrentHtml(linkBlock: string, styleBlock: string, sections: string[]): string {
  return [linkBlock, styleBlock, ...sections].filter(Boolean).join('\n');
}
