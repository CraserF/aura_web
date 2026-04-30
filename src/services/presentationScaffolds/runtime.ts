import { generateObject } from 'ai';
import type { LanguageModel, ModelMessage } from 'ai';
import { z } from 'zod';
import type { PlanResult, SlideBrief } from '@/services/ai/workflow/agents/planner';
import type { EventListener, PresentationInput, PresentationOutput } from '@/services/ai/workflow/types';
import type { ArtifactRunPlan } from '@/services/artifactRuntime/types';
import { withRetry } from '@/services/ai/fallbackModel';
import { CACHE_CONTROL } from '@/services/ai/workflow/engine';
import { aiDebugLog, toErrorInfo } from '@/services/ai/debug';
import {
  assembleScaffoldDeck,
  buildScaffoldStyleBlock,
  extractScaffoldSections,
  extractScaffoldSlotInventory,
  patchScaffoldSlotsInHtml,
  type ScaffoldSlotPatch,
  compileScaffoldSlide,
} from './compiler';
import { resolveScaffoldForRunPlan } from './registry';
import { planDeckRhythm } from './rhythm';
import { validateScaffoldedDeck } from './validator';
import type {
  DeckRhythmPlan,
  PresentationScaffold,
  ScaffoldCompileResult,
  ScaffoldValidationResult,
  SlideSkeleton,
  SlideSlotPayload,
} from './types';

export interface ScaffoldedPresentationQueueOptions {
  planResult: PlanResult;
  model: LanguageModel;
  onEvent: EventListener;
  onSlideDraft?: (combinedHtml: string, slideIndex: number, totalSlides: number) => void;
  onSlideComplete: (combinedHtml: string, slideIndex: number, totalSlides: number) => void;
  initialHtml?: string;
  replaceExistingSlides?: boolean;
  runPlan?: ArtifactRunPlan;
  signal?: AbortSignal;
}

export interface ScaffoldedPresentationQueueResult {
  html: string;
  slideCount: number;
  title: string;
  slideTimingsMs: number[];
  styleSystemApplied: true;
  rhythmPlan: DeckRhythmPlan;
  validation: ScaffoldValidationResult;
  compileResult: ScaffoldCompileResult;
}

const ROLE_KICKERS: Record<string, string> = {
  'title-scene': 'Opening',
  context: 'Context',
  problem: 'Tension',
  'metric-proof': 'Proof',
  comparison: 'Trade-off',
  mechanism: 'Mechanism',
  recommendation: 'Recommendation',
  timeline: 'Sequence',
  'closing-action': 'Next',
  content: 'Focus',
};

function cleanSentence(value: string, maxLength: number): string {
  return value
    .replace(/\s+/g, ' ')
    .replace(/^[-*\d.\s]+/, '')
    .trim()
    .slice(0, maxLength)
    .trim();
}

function fallbackForSlot(input: {
  slotId: string;
  kind: string;
  placeholder?: string;
  brief: SlideBrief;
  entryIndex: number;
  totalSlides: number;
  role: string;
}): string {
  const { slotId, kind, placeholder, brief, entryIndex, totalSlides, role } = input;
  const guidance = cleanSentence(brief.contentGuidance || brief.visualGuidance || brief.title, 220);
  const kicker = ROLE_KICKERS[role] ?? 'Focus';
  const footer = `${String(entryIndex + 1).padStart(2, '0')} / ${String(totalSlides).padStart(2, '0')}`;

  if (slotId === 'footer') return footer;
  if (kind === 'kicker' || slotId.endsWith('_label') || slotId === 'panel_label' || slotId === 'proof_label') {
    return placeholder ?? kicker;
  }
  if (kind === 'title' && slotId === 'title') return cleanSentence(brief.title, 88);
  if (kind === 'subtitle') return guidance || placeholder || 'A concise frame for the decision ahead.';
  if (kind === 'metric-value') {
    if (slotId.includes('1')) return '01';
    if (slotId.includes('2')) return '03';
    if (slotId.includes('3')) return '1';
    return placeholder ?? '01';
  }
  if (kind === 'metric-label') return placeholder ?? 'Decision signal translated into plain language.';
  if (kind === 'quote') return placeholder ?? (guidance || 'The signal is clear enough to act.');
  if (kind === 'step-title') return placeholder ?? 'Next move';
  if (kind === 'step-body') return placeholder ?? 'Name the action, owner, or signal that advances the work.';
  if (kind === 'paragraph') return guidance || placeholder || 'Use this slot for one concrete, audience-ready point.';
  return placeholder ?? (guidance || brief.title);
}

function buildFallbackPayload(input: {
  skeleton: SlideSkeleton;
  brief: SlideBrief;
  entryIndex: number;
  totalSlides: number;
  role: string;
  slideId: string;
}): SlideSlotPayload {
  const slots = Object.fromEntries(input.skeleton.slots.map((slot) => [
    slot.id,
    fallbackForSlot({
      slotId: slot.id,
      kind: slot.kind,
      placeholder: slot.placeholder,
      brief: input.brief,
      entryIndex: input.entryIndex,
      totalSlides: input.totalSlides,
      role: input.role,
    }),
  ]));

  return {
    slideId: input.slideId,
    skeletonId: input.skeleton.id,
    slots,
  };
}

function buildSlotPayloadSchema(skeleton: SlideSkeleton) {
  const slotShape = Object.fromEntries(skeleton.slots.map((slot) => {
    const schema = z.string().max(slot.maxLength);
    return [slot.id, slot.required ? schema.min(1) : schema.optional()];
  }));

  return z.object({
    slots: z.object(slotShape).strict(),
    hiddenSlots: z.array(z.string()).optional(),
  }).strict();
}

function canUseStructuredModel(model: LanguageModel): boolean {
  return typeof (model as { specificationVersion?: unknown }).specificationVersion === 'string';
}

function buildSlotSystemPrompt(scaffold: PresentationScaffold): string {
  return [
    'You fill content slots for one Aura presentation scaffold slide.',
    'Return structured JSON only. Do not return CSS. Do not return HTML sections. Do not invent classes.',
    `Scaffold: ${scaffold.id}. The host compiler owns layout, CSS, wrappers, data-background-color, motion, and validation.`,
    'Use concise slide copy. Preserve the requested story, but fit each slot max length.',
    'No emoji icons. No placeholders. No markdown bullets unless the slot label explicitly asks for a list.',
  ].join('\n');
}

function buildSlotUserPrompt(input: {
  runPlan?: ArtifactRunPlan;
  brief: SlideBrief;
  skeleton: SlideSkeleton;
  rhythmEntry: DeckRhythmPlan['entries'][number];
  totalSlides: number;
}): string {
  const slotLines = input.skeleton.slots.map((slot) =>
    `- ${slot.id}: ${slot.kind}, ${slot.required ? 'required' : 'optional'}, max ${slot.maxLength} chars, label "${slot.label}"`).join('\n');

  return [
    `Deck intent: ${input.runPlan?.userIntent ?? input.brief.contentGuidance}`,
    `Slide ${input.brief.index} of ${input.totalSlides}: ${input.brief.title}`,
    `Narrative guidance: ${input.brief.contentGuidance}`,
    input.brief.visualGuidance ? `Visual guidance: ${input.brief.visualGuidance}` : '',
    `Role: ${input.rhythmEntry.role}`,
    `Skeleton: ${input.skeleton.id} (${input.skeleton.layoutFamily})`,
    `Transition purpose: ${input.rhythmEntry.transitionPurpose}`,
    '',
    'Allowed slots:',
    slotLines,
  ].filter(Boolean).join('\n');
}

async function customizeSlideSlots(input: {
  model: LanguageModel;
  scaffold: PresentationScaffold;
  skeleton: SlideSkeleton;
  brief: SlideBrief;
  rhythmEntry: DeckRhythmPlan['entries'][number];
  totalSlides: number;
  runPlan?: ArtifactRunPlan;
  signal?: AbortSignal;
}): Promise<SlideSlotPayload> {
  const fallback = buildFallbackPayload({
    skeleton: input.skeleton,
    brief: input.brief,
    entryIndex: input.brief.index - 1,
    totalSlides: input.totalSlides,
    role: input.rhythmEntry.role,
    slideId: input.rhythmEntry.slideId,
  });

  if (!canUseStructuredModel(input.model)) {
    return fallback;
  }

  try {
    const schema = buildSlotPayloadSchema(input.skeleton);
    const result = await withRetry(() =>
      generateObject({
        model: input.model,
        schema,
        messages: [
          { role: 'system', content: buildSlotSystemPrompt(input.scaffold), providerOptions: CACHE_CONTROL } as ModelMessage,
          { role: 'user', content: buildSlotUserPrompt(input) },
        ],
        maxOutputTokens: 1400,
        abortSignal: input.signal,
      }));

    const generatedSlots = Object.fromEntries(
      Object.entries(result.object.slots)
        .filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
    );

    return {
      slideId: input.rhythmEntry.slideId,
      skeletonId: input.skeleton.id,
      slots: {
        ...fallback.slots,
        ...generatedSlots,
      },
      hiddenSlots: result.object.hiddenSlots?.filter((slotId) =>
        input.skeleton.slots.some((slot) => slot.id === slotId && !slot.required)),
    };
  } catch (error) {
    aiDebugLog('presentation-scaffold', 'slot generation fell back to deterministic payload', toErrorInfo(error));
    return fallback;
  }
}

function resolveBriefs(planResult: PlanResult, runPlan?: ArtifactRunPlan): SlideBrief[] {
  const runtimeBriefs = runPlan?.workQueue
    .filter((part) => part.kind === 'slide')
    .sort((left, right) => left.orderIndex - right.orderIndex)
    .map((part, index) => ({
      index: index + 1,
      title: part.title,
      contentGuidance: part.brief,
      visualGuidance: part.presentationSlideBlueprint?.layoutPattern,
    })) ?? [];

  if (runtimeBriefs.length > 0) return runtimeBriefs;
  if ((planResult.slideBriefs?.length ?? 0) > 0) return planResult.slideBriefs!;

  return [{
    index: 1,
    title: planResult.enhancedPrompt.slice(0, 72) || 'Presentation',
    contentGuidance: planResult.enhancedPrompt,
  }];
}

export async function runScaffoldedPresentationQueue(
  opts: ScaffoldedPresentationQueueOptions,
): Promise<ScaffoldedPresentationQueueResult> {
  const selection = resolveScaffoldForRunPlan(opts.runPlan);
  const briefs = resolveBriefs(opts.planResult, opts.runPlan);
  const rhythmPlan = opts.runPlan?.deckRhythmPlan ?? planDeckRhythm({
    scaffold: selection.scaffold,
    theme: selection.theme,
    directionId: selection.directionId,
    exportIntent: selection.exportIntent,
    briefs,
    ...(opts.runPlan ? { runPlan: opts.runPlan } : {}),
  });
  const completedSections = opts.initialHtml ? extractScaffoldSections(opts.initialHtml) : [];
  const slideTimingsMs: number[] = [];

  opts.onEvent({
    type: 'progress',
    message: `Scaffold locked: ${selection.scaffold.label} / ${selection.theme.label}`,
    pct: 20,
    partId: 'style-system',
    runId: opts.runPlan?.runId,
  });

  for (const [index, brief] of briefs.entries()) {
    if (opts.signal?.aborted) throw new DOMException('Scaffolded queue aborted', 'AbortError');
    const startedAt = performance.now();
    const entry = rhythmPlan.entries[index];
    if (!entry) continue;
    const skeleton = selection.scaffold.skeletons.find((candidate) => candidate.id === entry.skeletonId)
      ?? selection.scaffold.skeletons[0]!;
    const slideStartPct = Math.round(22 + (index / briefs.length) * 48);
    const slideEndPct = Math.round(22 + ((index + 1) / briefs.length) * 48);

    opts.onEvent({
      type: 'step-update',
      stepId: `slide-${brief.index}`,
      label: `Slide ${brief.index}/${briefs.length}: planned (${skeleton.label})`,
      status: 'active',
    });
    opts.onEvent({
      type: 'progress',
      message: `Filling approved slots for slide ${brief.index} of ${briefs.length}: ${brief.title}`,
      pct: slideStartPct,
      partId: `slide-${brief.index}`,
      runId: opts.runPlan?.runId,
    });

    const payload = await customizeSlideSlots({
      model: opts.model,
      scaffold: selection.scaffold,
      skeleton,
      brief,
      rhythmEntry: entry,
      totalSlides: briefs.length,
      ...(opts.runPlan ? { runPlan: opts.runPlan } : {}),
      ...(opts.signal ? { signal: opts.signal } : {}),
    });
    const section = compileScaffoldSlide({
      scaffold: selection.scaffold,
      theme: selection.theme,
      skeleton,
      payload,
      rhythmEntry: entry,
      totalSlides: briefs.length,
    });
    const targetIndex = opts.replaceExistingSlides ? Math.max(0, brief.index - 1) : -1;
    if (targetIndex >= 0 && targetIndex < completedSections.length) {
      completedSections[targetIndex] = section;
    } else {
      completedSections.push(section);
    }
    const partial = assembleScaffoldDeck({
      scaffold: selection.scaffold,
      theme: selection.theme,
      directionId: selection.directionId,
      exportIntent: selection.exportIntent,
      sections: completedSections,
    });

    opts.onEvent({
      type: 'step-update',
      stepId: `slide-${brief.index}`,
      label: `Slide ${brief.index}/${briefs.length}: compiled`,
      status: 'active',
    });
    opts.onSlideDraft?.(partial.html, brief.index, briefs.length);
    opts.onSlideComplete(partial.html, brief.index, briefs.length);

    const lint = validateScaffoldedDeck({
      html: partial.html,
      scaffold: selection.scaffold,
      rhythmPlan: {
        ...rhythmPlan,
        entries: rhythmPlan.entries.slice(0, index + 1),
        slideCount: index + 1,
      },
      exportIntent: selection.exportIntent,
    });
    opts.onEvent({
      type: 'step-update',
      stepId: `slide-${brief.index}`,
      label: lint.passed
        ? `Slide ${brief.index}/${briefs.length}: linted`
        : `Slide ${brief.index}/${briefs.length}: linted with ${lint.blockingCount} blocking issue(s)`,
      status: lint.passed ? 'done' : 'error',
    });
    opts.onEvent({
      type: 'progress',
      message: `Slide ${brief.index} scaffolded and linted.`,
      pct: slideEndPct,
      partId: `slide-${brief.index}`,
      runId: opts.runPlan?.runId,
    });
    slideTimingsMs.push(Math.round(performance.now() - startedAt));
  }

  const compileResult = assembleScaffoldDeck({
    scaffold: selection.scaffold,
    theme: selection.theme,
    directionId: selection.directionId,
    exportIntent: selection.exportIntent,
    sections: completedSections,
  });
  const validation = validateScaffoldedDeck({
    html: compileResult.html,
    scaffold: selection.scaffold,
    rhythmPlan,
    exportIntent: selection.exportIntent,
  });

  return {
    html: compileResult.html,
    slideCount: compileResult.slideCount,
    title: briefs[0]?.title ?? 'Presentation',
    slideTimingsMs,
    styleSystemApplied: true,
    rhythmPlan,
    validation,
    compileResult,
  };
}

const PatchSchema = z.object({
  patches: z.array(z.object({
    slideIndex: z.number().int().min(1),
    slotId: z.string().min(1).max(80),
    value: z.string().max(240),
  }).strict()).max(12),
}).strict();

async function buildTextPatches(input: {
  model: LanguageModel;
  prompt: string;
  html: string;
  signal?: AbortSignal;
}): Promise<ScaffoldSlotPatch[]> {
  const inventory = extractScaffoldSlotInventory(input.html).slice(0, 80);
  if (inventory.length === 0) return [];
  if (!canUseStructuredModel(input.model)) return [];

  try {
    const result = await withRetry(() =>
      generateObject({
        model: input.model,
        schema: PatchSchema,
        messages: [
          {
            role: 'system',
            content: 'You patch text slots in a scaffolded Aura deck. Return JSON only. Use only existing slideIndex and slotId pairs. Do not return HTML or CSS.',
            providerOptions: CACHE_CONTROL,
          } as ModelMessage,
          {
            role: 'user',
            content: [
              `Edit request: ${input.prompt}`,
              'Existing slot inventory:',
              inventory.map((entry) => `- slide ${entry.slideIndex}, skeleton ${entry.skeletonId}, slot ${entry.slotId}: ${entry.value}`).join('\n'),
            ].join('\n'),
          },
        ],
        maxOutputTokens: 1200,
        abortSignal: input.signal,
      }));
    const allowed = new Set(inventory.map((entry) => `${entry.slideIndex}:${entry.slotId}`));
    return result.object.patches.filter((patch) => allowed.has(`${patch.slideIndex}:${patch.slotId}`));
  } catch (error) {
    aiDebugLog('presentation-scaffold', 'text patch generation skipped', toErrorInfo(error));
    return [];
  }
}

export async function runScaffoldedPresentationEditRuntime(input: {
  runPlan?: ArtifactRunPlan;
  planResult: PlanResult;
  model: LanguageModel;
  presentationInput: PresentationInput;
  onEvent: EventListener;
  signal?: AbortSignal;
  planningDurationMs?: number;
}): Promise<PresentationOutput> {
  const startedAt = performance.now();
  const existingHtml = input.presentationInput.existingSlidesHtml ?? '';
  const selection = resolveScaffoldForRunPlan(input.runPlan);
  const sections = extractScaffoldSections(existingHtml);
  const styleBlock = buildScaffoldStyleBlock(selection.scaffold, selection.theme);
  const surface = input.runPlan?.allowedEditSurface?.kind ?? 'text-edit';

  input.onEvent({
    type: 'progress',
    message: surface === 'restyle'
      ? `Restyling scaffold tokens: ${selection.theme.label}`
      : 'Patching scaffold slots.',
    pct: 34,
    partId: 'targeted-design',
    runId: input.runPlan?.runId,
  });

  const restyledHtml = [styleBlock, ...sections].filter(Boolean).join('\n');
  const patchedHtml = surface === 'restyle'
    ? restyledHtml
    : patchScaffoldSlotsInHtml(
        restyledHtml,
        await buildTextPatches({
          model: input.model,
          prompt: input.presentationInput.prompt,
          html: restyledHtml,
          ...(input.signal ? { signal: input.signal } : {}),
        }),
      );

  const validation = validateScaffoldedDeck({
    html: patchedHtml,
    scaffold: selection.scaffold,
    exportIntent: selection.exportIntent,
  });
  const output: PresentationOutput = {
    html: patchedHtml,
    title: input.planResult.enhancedPrompt.slice(0, 80) || 'Presentation',
    slideCount: extractScaffoldSections(patchedHtml).length,
    reviewPassed: validation.passed,
    runtime: {
      totalRuntimeMs: Math.round(performance.now() - startedAt),
      validationPassed: validation.passed,
      validationBlockingCount: validation.blockingCount,
      validationAdvisoryCount: validation.advisoryCount,
      repairCount: 0,
      runMode: 'deterministic-action',
      phaseTimings: [
        ...(typeof input.planningDurationMs === 'number'
          ? [{ phaseId: 'planning', label: 'Planning', durationMs: Math.round(input.planningDurationMs), order: 0 }]
          : []),
        {
          phaseId: surface === 'restyle' ? 'scaffold-restyle' : 'scaffold-slot-patch',
          label: surface === 'restyle' ? 'Scaffold restyle' : 'Scaffold slot patch',
          durationMs: Math.round(performance.now() - startedAt),
          order: 1,
        },
      ],
      validationByPart: validation.findings.map((finding, index) => ({
        partId: finding.slideIndex ? `slide-${finding.slideIndex}` : `scaffold-${index + 1}`,
        label: finding.id,
        validationPassed: finding.severity !== 'blocking',
        blockingCount: finding.severity === 'blocking' ? 1 : 0,
        advisoryCount: finding.severity === 'advisory' ? 1 : 0,
        rules: [finding.message],
      })),
    },
  };

  input.onEvent({ type: 'draft-complete', html: patchedHtml });
  input.onEvent({ type: 'complete', result: output });
  return output;
}
