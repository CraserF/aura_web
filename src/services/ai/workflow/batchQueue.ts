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
import { extractPresentationSectionFragments } from '@/services/artifactRuntime/presentationStyleSystem';

export interface BatchQueueOptions {
  planResult: PlanResult;
  model: LanguageModel;
  onEvent: EventListener;
  onSlideDraft?: (combinedHtml: string, slideIndex: number, totalSlides: number) => void;
  onSlideComplete: (combinedHtml: string, slideIndex: number, totalSlides: number) => void;
  initialHtml?: string;
  guidanceProfile?: TemplateGuidanceProfile;
  runPlan?: ArtifactRunPlan;
  styleSystemHtml?: string;
  signal?: AbortSignal;
}

export interface BatchQueueResult {
  html: string;
  slideCount: number;
  title: string;
  slideTimingsMs?: number[];
  styleSystemApplied?: boolean;
}

/**
 * Run slides sequentially, calling onSlideComplete after each so the canvas
 * can display progressive results.
 */
export async function runBatchQueue(opts: BatchQueueOptions): Promise<BatchQueueResult> {
  const { planResult, model, onEvent, onSlideDraft, onSlideComplete, initialHtml, guidanceProfile, runPlan, styleSystemHtml, signal } = opts;
  const briefs: SlideBrief[] = planResult.slideBriefs ?? [];
  const totalSlides = briefs.length;

  if (totalSlides === 0) throw new Error('No slide briefs in batch plan');

  let sharedStyleBlock = styleSystemHtml?.trim() ?? '';
  const extensionStyleBlocks: string[] = [];
  const completedSections: string[] = [];
  let sharedLinkBlock = '';
  let batchTitle = briefs[0]?.title ?? 'Presentation';
  const isAppendingToExistingDeck = Boolean(initialHtml);
  const lockedStyleSystem = Boolean(sharedStyleBlock);
  const slideTimingsMs: number[] = [];

  if (initialHtml) {
    const initialLinks = initialHtml.match(/<link[^>]*>/gi) ?? [];
    sharedLinkBlock = Array.from(new Set(initialLinks)).join('\n');
    sharedStyleBlock = sharedStyleBlock || (initialHtml.match(/<style[\s\S]*?<\/style>/i)?.[0] ?? '');
    const initialSections = extractPresentationSectionFragments(initialHtml);
    completedSections.push(...initialSections);
  }

  for (let i = 0; i < briefs.length; i++) {
    const brief = briefs[i];
    if (!brief) continue;

    if (signal?.aborted) throw new DOMException('Batch aborted', 'AbortError');

    const slideStartedAt = performance.now();
    const slideStartPct = Math.round(18 + (i / totalSlides) * 52);
    const slideEndPct = Math.round(18 + ((i + 1) / totalSlides) * 52);
    onEvent({
      type: 'progress',
      message: `Designing slide ${brief.index} of ${totalSlides}: ${brief.title}`,
      pct: slideStartPct,
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
      ...(lockedStyleSystem ? { lockedStyleSystem } : {}),
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
    const stopHeartbeat = startSlideHeartbeat({
      onEvent,
      slideIndex: brief.index,
      totalSlides,
      title: brief.title,
      startPct: slideStartPct,
      endPct: Math.max(slideStartPct, slideEndPct - 2),
    });
    const slideEventHandler: EventListener = (event) => {
      if (event.type !== 'draft-complete') {
        onEvent(event);
        return;
      }

      const draftSections = extractPresentationSectionFragments(sanitizeInnerHtml(event.html));
      if (draftSections.length === 0) return;

      const draftHtml = buildCurrentHtml(
        lockedStyleSystem ? '' : sharedLinkBlock,
        sharedStyleBlock,
        [...completedSections, ...draftSections],
        lockedStyleSystem ? [] : extensionStyleBlocks,
      );
      onSlideDraft?.(draftHtml, brief.index, totalSlides);
    };

    const slideResult = await (async () => {
      try {
        return await design(
          slidePlanResult,
          buildModelContextHtml(sharedLinkBlock, sharedStyleBlock, completedSections),
          [], // no chat history for individual batch slides
          model,
          slideEventHandler,
          undefined,
          guidanceProfile,
          signal,
          runPlan,
          slidePrompt,
        );
      } finally {
        stopHeartbeat();
      }
    })();

    const cleanHtml = sanitizeInnerHtml(slideResult.html);

    const linkMatch = cleanHtml.match(/<link[^>]*>/gi) ?? [];
    if (linkMatch.length > 0) {
      sharedLinkBlock = Array.from(new Set([...(sharedLinkBlock ? sharedLinkBlock.split('\n') : []), ...linkMatch])).filter(Boolean).join('\n');
    }
    const styleMatch = lockedStyleSystem ? '' : cleanHtml.match(/<style[\s\S]*?<\/style>/i)?.[0] ?? '';

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
    const generatedSections = extractPresentationSectionFragments(cleanHtml);
    completedSections.push(...generatedSections);

    // Build combined HTML and notify canvas
    const combinedHtml = buildCurrentHtml(
      lockedStyleSystem ? '' : sharedLinkBlock,
      sharedStyleBlock,
      completedSections,
      lockedStyleSystem ? [] : extensionStyleBlocks,
    );
    onSlideComplete(combinedHtml, brief.index, totalSlides);
    slideTimingsMs.push(Math.round(performance.now() - slideStartedAt));
    onEvent({
      type: 'progress',
      message: `Slide ${brief.index} of ${totalSlides} ready: ${brief.title}`,
      pct: slideEndPct,
      partId: `slide-${brief.index}`,
    });

    onEvent({
      type: 'step-update',
      stepId: `slide-${brief.index}`,
      label: `Slide ${brief.index}/${totalSlides}: ${brief.title}`,
      status: 'done',
    });
  }

  const finalHtml = buildCurrentHtml(
    lockedStyleSystem ? '' : sharedLinkBlock,
    sharedStyleBlock,
    completedSections,
    lockedStyleSystem ? [] : extensionStyleBlocks,
  );
  return {
    html: finalHtml,
    slideCount: completedSections.length,
    title: batchTitle,
    slideTimingsMs,
    styleSystemApplied: lockedStyleSystem,
  };
}

function startSlideHeartbeat(input: {
  onEvent: EventListener;
  slideIndex: number;
  totalSlides: number;
  title: string;
  startPct: number;
  endPct: number;
}): () => void {
  let tick = 0;
  const timer = setInterval(() => {
    tick += 1;
    const pct = Math.min(input.endPct, input.startPct + tick);
    input.onEvent({
      type: 'progress',
      message: `Still working on slide ${input.slideIndex} of ${input.totalSlides}: ${input.title}`,
      pct,
      partId: `slide-${input.slideIndex}`,
    });
  }, 8000);
  return () => clearInterval(timer);
}

function buildCurrentHtml(
  linkBlock: string,
  styleBlock: string,
  sections: string[],
  extensionStyleBlocks: string[] = [],
): string {
  return [linkBlock, styleBlock, ...extensionStyleBlocks, ...sections].filter(Boolean).join('\n');
}

function buildModelContextHtml(
  linkBlock: string,
  styleBlock: string,
  sections: string[],
): string {
  return buildCurrentHtml(linkBlock, styleBlock, sections.slice(-2), []);
}
