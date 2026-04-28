/**
 * Batch Queue Runner — generates slides sequentially for batch_create intent.
 * Each slide streams to the canvas as it completes.
 */
import type { LanguageModel } from 'ai';
import type { PlanResult, SlideBrief } from './agents/planner';
import type { EventListener } from './types';
import { design } from './agents/designer';
import { sanitizeInnerHtml } from '@/services/html/sanitizer';
import { buildPresentationBatchSlidePrompt } from '@/services/artifactRuntime/presentationPrompts';
import type { ArtifactRunPlan, TemplateGuidanceProfile } from '@/services/artifactRuntime/types';

export interface BatchQueueOptions {
  planResult: PlanResult;
  model: LanguageModel;
  onEvent: EventListener;
  onSlideComplete: (combinedHtml: string, slideIndex: number, totalSlides: number) => void;
  initialHtml?: string;
  guidanceProfile?: TemplateGuidanceProfile;
  runPlan?: ArtifactRunPlan;
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
  const { planResult, model, onEvent, onSlideComplete, initialHtml, guidanceProfile, runPlan, signal } = opts;
  const briefs: SlideBrief[] = planResult.slideBriefs ?? [];
  const totalSlides = briefs.length;

  if (totalSlides === 0) throw new Error('No slide briefs in batch plan');

  let sharedStyleBlock = '';
  const extensionStyleBlocks: string[] = [];
  const completedSections: string[] = [];
  let sharedLinkBlock = '';
  let batchTitle = briefs[0]?.title ?? 'Presentation';
  const isAppendingToExistingDeck = Boolean(initialHtml);

  if (initialHtml) {
    const initialLinks = initialHtml.match(/<link[^>]*>/gi) ?? [];
    sharedLinkBlock = Array.from(new Set(initialLinks)).join('\n');
    sharedStyleBlock = initialHtml.match(/<style[\s\S]*?<\/style>/i)?.[0] ?? '';
    const initialSections = initialHtml.match(/<section[\s\S]*?<\/section>/gi) ?? [];
    completedSections.push(...initialSections);
  }

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
    const slidePrompt = buildPresentationBatchSlidePrompt({
      brief,
      totalSlides,
      planResult,
      ...(runPlan ? { runPlan } : {}),
      ...(sharedStyleBlock ? { sharedStyleBlock } : {}),
      ...(isAppendingToExistingDeck ? { isAppendingToExistingDeck } : {}),
      ...(guidanceProfile ? { guidanceProfile } : {}),
    });

    // Create a modified plan result with the slide-specific prompt
    const slidePlanResult: PlanResult = {
      ...planResult,
      intent: 'create',
      enhancedPrompt: slidePrompt,
    };

    // Generate this slide using the standard design flow
    const slideResult = await design(
      slidePlanResult,
      buildCurrentHtml(sharedLinkBlock, sharedStyleBlock, completedSections, extensionStyleBlocks),
      [], // no chat history for individual batch slides
      model,
      onEvent,
      undefined,
      guidanceProfile,
      signal,
      runPlan,
      slidePrompt,
    );

    const cleanHtml = sanitizeInnerHtml(slideResult.html);

    const linkMatch = cleanHtml.match(/<link[^>]*>/gi) ?? [];
    if (linkMatch.length > 0) {
      sharedLinkBlock = Array.from(new Set([...(sharedLinkBlock ? sharedLinkBlock.split('\n') : []), ...linkMatch])).filter(Boolean).join('\n');
    }
    const styleMatch = cleanHtml.match(/<style[\s\S]*?<\/style>/i)?.[0] ?? '';

    // Extract shared style from the first newly generated slide if we are
    // building a fresh deck. Existing decks keep their original style block and
    // treat new style blocks as incremental extensions.
    if (i === 0 && !sharedStyleBlock) {
      sharedStyleBlock = styleMatch;
      batchTitle = slideResult.title ?? brief.title;
    } else if (styleMatch && styleMatch !== sharedStyleBlock && !extensionStyleBlocks.includes(styleMatch)) {
      extensionStyleBlocks.push(styleMatch);
    }

    // Extract just the <section> elements from this slide
    const sectionRegex = /<section[\s\S]*?<\/section>/gi;
    let sectionMatch: RegExpExecArray | null;
    while ((sectionMatch = sectionRegex.exec(cleanHtml)) !== null) {
      const matchedSection = sectionMatch[0];
      if (matchedSection) completedSections.push(matchedSection);
    }

    // Build combined HTML and notify canvas
    const combinedHtml = buildCurrentHtml(sharedLinkBlock, sharedStyleBlock, completedSections, extensionStyleBlocks);
    onSlideComplete(combinedHtml, brief.index, totalSlides);

    onEvent({
      type: 'step-update',
      stepId: `slide-${brief.index}`,
      label: `Slide ${brief.index}/${totalSlides}: ${brief.title}`,
      status: 'done',
    });
  }

  const finalHtml = buildCurrentHtml(sharedLinkBlock, sharedStyleBlock, completedSections, extensionStyleBlocks);
  return {
    html: finalHtml,
    slideCount: completedSections.length,
    title: batchTitle,
  };
}

function buildCurrentHtml(
  linkBlock: string,
  styleBlock: string,
  sections: string[],
  extensionStyleBlocks: string[] = [],
): string {
  return [linkBlock, styleBlock, ...extensionStyleBlocks, ...sections].filter(Boolean).join('\n');
}
