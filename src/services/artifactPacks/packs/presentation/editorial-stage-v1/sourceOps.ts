import type { SlideBrief } from '@/services/ai/workflow/agents/planner';
import type {
  ArtifactDesignDirectionId,
  ArtifactMediaResolver,
  ArtifactOutputMode,
  ArtifactValidationFinding,
} from '@/services/artifactPacks';
import { compileEditorialStagePack } from './compiler';
import {
  EDITORIAL_STAGE_LAYOUT_BY_ID,
  type EditorialStageLayout,
  type EditorialStageLayoutId,
  type EditorialStageSlot,
} from './layouts';
import {
  editorialStageSourceSchema,
  type EditorialStageRhythmEntry,
  type EditorialStageSlide,
  type EditorialStageSource,
} from './schemas';

export const EDITORIAL_STAGE_PACK_ID = 'presentation/editorial-stage-v1';
export const EDITORIAL_STAGE_PACK_VERSION = '1.0.0';

export interface EditorialStageSourceEditResult {
  source: EditorialStageSource;
  changed: boolean;
  reason?: string;
}

export interface EditorialStageCompiledSourceUpdate extends EditorialStageSourceEditResult {
  compileResult: ReturnType<typeof compileEditorialStagePack>;
  html: string;
  styleBlock: string;
  slideCount: number;
  title: string;
  repairCount: number;
  repairedFindingIds: string[];
}

export interface EditorialStageSourceRepairResult {
  source: EditorialStageSource;
  changed: boolean;
  repairCount: number;
  repairedFindingIds: string[];
}

const ROLE_LABELS: Record<string, string> = {
  'title-scene': 'Opening',
  context: 'Context',
  proof: 'Proof',
  story: 'Context',
  evidence: 'Evidence',
  mechanism: 'Mechanism',
  question: 'Decision',
  quote: 'Voice',
  comparison: 'Trade-off',
  explainer: 'Explanation',
  decision: 'Recommendation',
  'closing-action': 'Next',
};

const REPAIRABLE_FINDING_IDS = new Set([
  'slot.required_missing',
  'slot.too_long_for_layout',
  'title.too_long_for_layout',
  'slot.html_detected',
  'slot.unknown_key',
  'presentation.asset_missing_when_required',
  'media.slot_unknown',
  'media.aspect_invalid',
  'media.crop_invalid',
]);

function cloneSource(source: EditorialStageSource): EditorialStageSource {
  return {
    ...source,
    rhythmPlan: source.rhythmPlan.map((entry) => ({
      ...entry,
      mediaNeeds: entry.mediaNeeds.map((need) => ({ ...need })),
    })),
    slides: source.slides.map((slide) => ({
      ...slide,
      slots: { ...slide.slots },
      media: slide.media.map((media) => ({ ...media })),
      sourceNotes: [...slide.sourceNotes],
    })),
  };
}

function cleanText(value: string | undefined, maxLength: number): string {
  return (value ?? '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^(?:[-*]\s+|\d+[.)]\s+)/, '')
    .trim()
    .slice(0, maxLength)
    .trim();
}

function sanitizeUnknownText(value: unknown): unknown {
  if (typeof value === 'string') {
    return value
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 520)
      .trim();
  }
  if (Array.isArray(value)) return value.map(sanitizeUnknownText);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, sanitizeUnknownText(nested)]),
    );
  }
  return value;
}

function extractNumber(text: string): string | undefined {
  return text.match(/\b\d+(?:[.,]\d+)?\s?(?:%|x|k|m|bn|bps)?\b/i)?.[0]?.replace(/\s+/g, '');
}

function resolveDirectionId(directionId: ArtifactDesignDirectionId | string | undefined): EditorialStageSource['directionId'] {
  switch (directionId) {
    case 'modern-minimal':
      return 'modern-minimal';
    case 'data-utility':
      return 'data-utility';
    case 'warm-narrative':
      return 'warm-narrative';
    case 'bold-editorial':
      return 'bold-editorial';
    default:
      return 'editorial-magazine';
  }
}

function schemaRoleForLayout(layout: EditorialStageLayout): EditorialStageSlide['role'] {
  return layout.role as EditorialStageSlide['role'];
}

function visualWeightForLayout(layoutId: EditorialStageLayoutId, layout: EditorialStageLayout): EditorialStageSlide['visualWeight'] {
  if (layout.defaultMood.startsWith('hero') || layoutId === 'cover' || layoutId === 'question-hero') return 'hero';
  if (layoutId === 'big-number') return 'proof';
  return 'standard';
}

function resolveLayoutForBrief(input: {
  brief: SlideBrief;
  index: number;
  total: number;
  previousLayoutId?: EditorialStageLayoutId;
}): EditorialStageLayoutId {
  const text = `${input.brief.title} ${input.brief.contentGuidance ?? ''}`.toLowerCase();
  if (input.index === 0) return 'cover';
  if (input.index === input.total - 1 && input.total > 1) return 'closing-action';
  if (input.total >= 6 && input.index > 0 && input.index % 4 === 3) return 'question-hero';

  const preferred = (() => {
    if (/\b(compare|comparison|versus|vs|trade[- ]?off|before|after)\b/.test(text)) return 'comparison';
    if (/\b(metric|kpi|number|percent|proof|signal|data|evidence)\b/.test(text) && extractNumber(text)) return 'big-number';
    if (/\b(process|system|mechanism|workflow|roadmap|timeline|phase)\b/.test(text)) return 'process-pipeline';
    if (/\b(decision|recommend|ask|proposal|action)\b/.test(text)) return 'decision';
    if (/\bquote|voice|testimonial\b/.test(text)) return 'big-quote';
    return 'story-split';
  })();

  if (preferred !== input.previousLayoutId) return preferred;
  return preferred === 'story-split' ? 'comparison' : 'story-split';
}

function slotValue(input: {
  slot: EditorialStageSlot;
  layoutId: EditorialStageLayoutId;
  brief: SlideBrief;
  index: number;
  total: number;
  number?: string;
}): string {
  const guidance = cleanText(input.brief.contentGuidance || input.brief.visualGuidance || input.brief.title, input.slot.maxLength);
  const title = cleanText(input.brief.title, input.slot.maxLength);
  const layout = EDITORIAL_STAGE_LAYOUT_BY_ID[input.layoutId];
  const kicker = ROLE_LABELS[schemaRoleForLayout(layout)] ?? 'Focus';
  const footer = `${String(input.index + 1).padStart(2, '0')} / ${String(input.total).padStart(2, '0')}`;

  switch (input.slot.id) {
    case 'kicker':
      return cleanText(kicker, input.slot.maxLength);
    case 'title':
    case 'question':
      return title || 'Decision point';
    case 'subtitle':
    case 'bridge':
    case 'context':
    case 'body':
    case 'interpretation':
      return guidance || 'Use the strongest available evidence to make the next decision explicit.';
    case 'quote':
      return guidance || 'The signal is clear enough to act on.';
    case 'metric_value':
      return input.number ?? '1';
    case 'metric_label':
      return guidance || 'important signal from the brief.';
    case 'section_number':
      return `0${input.index + 1}`;
    case 'meta':
    case 'footer':
    case 'source':
    case 'caption':
      return input.slot.required ? footer : '';
    case 'left_label':
      return 'Baseline path';
    case 'right_label':
      return 'Focused path';
    case 'left_body':
      return guidance || 'The current path spreads attention across too many priorities.';
    case 'right_body':
      return 'The proposed path concentrates attention around the strongest proof.';
    case 'verdict':
      return 'Choose the path the audience can understand, repeat, and act on.';
    case 'recommendation':
      return guidance || 'Commit to the focused path and make the next decision explicit.';
    case 'risk':
      return 'Name the tradeoff early so the decision feels honest.';
    case 'tradeoff':
      return 'Trade surface area for focus, repetition, and proof quality.';
    case 'ask':
      return 'Approve the next step and review progress at the next checkpoint.';
    case 'action_1':
      return 'Confirm the decision and owner.';
    case 'action_2':
      return 'Translate the decision into the working plan.';
    case 'action_3':
      return 'Review the signal after the first checkpoint.';
    default:
      if (input.slot.id.endsWith('_title')) return title || 'Next step';
      if (input.slot.id.endsWith('_body')) return guidance || 'Make the step concrete and measurable.';
      return guidance || title || 'Audience-ready point';
  }
}

function nextSlideId(source: EditorialStageSource): string {
  const max = source.slides.reduce((highest, slide) => {
    const number = Number(slide.slideId.match(/\d+/)?.[0] ?? '0');
    return Math.max(highest, Number.isFinite(number) ? number : 0);
  }, 0);
  return `slide-${max + 1}`;
}

function buildSlide(input: {
  source: EditorialStageSource;
  brief: SlideBrief;
  index: number;
  total: number;
  layoutId?: EditorialStageLayoutId;
}): EditorialStageSlide {
  const previousLayoutId = input.source.slides[input.source.slides.length - 1]?.layoutId;
  const layoutId = input.layoutId ?? resolveLayoutForBrief({
    brief: input.brief,
    index: input.index,
    total: input.total,
    previousLayoutId,
  });
  const layout = EDITORIAL_STAGE_LAYOUT_BY_ID[layoutId];
  const text = `${input.brief.title} ${input.brief.contentGuidance ?? ''}`;
  const number = extractNumber(text);
  const slots = Object.fromEntries(layout.slots.map((slot) => [
    slot.id,
    slotValue({
      slot,
      layoutId,
      brief: input.brief,
      index: input.index,
      total: input.total,
      number,
    }),
  ]));

  return {
    slideId: nextSlideId(input.source),
    layoutId,
    role: schemaRoleForLayout(layout),
    mood: layout.defaultMood,
    density: layout.defaultDensity,
    visualWeight: layout.defaultMood.startsWith('hero') || layoutId === 'cover' || layoutId === 'question-hero'
      ? 'hero'
      : layoutId === 'big-number'
        ? 'proof'
        : 'standard',
    motion: layout.motion,
    slots,
    media: [],
    sourceNotes: layoutId === 'big-number' && number ? ['User brief'] : [],
  };
}

function rebuildRhythmPlan(source: EditorialStageSource): EditorialStageRhythmEntry[] {
  return source.slides.map((slide, index) => ({
    slideIndex: index + 1,
    slideId: slide.slideId,
    narrativeRole: cleanText(ROLE_LABELS[slide.role] ?? slide.role, 80) || 'Focus',
    layoutId: slide.layoutId,
    mood: slide.mood,
    density: slide.density,
    visualWeight: slide.visualWeight,
    motion: slide.motion,
    transitionPurpose: cleanText(
      slide.slots.title ?? slide.slots.question ?? slide.slots.kicker ?? `Slide ${index + 1}`,
      140,
    ) || 'Advance the argument.',
    mediaNeeds: slide.media.map((media) => ({
      slotId: media.slotId,
      purpose: media.caption ?? media.altText,
      required: false,
    })),
  }));
}

function extractReplacement(prompt: string): string | undefined {
  return prompt.match(/["“]([^"”]{1,520})["”]/)?.[1]?.trim()
    ?? prompt.match(/\b(?:to|as|read|say)\s+(.{1,520})$/i)?.[1]?.replace(/[.?!]\s*$/, '').trim();
}

function resolveTargetSlideIndex(prompt: string, source: EditorialStageSource): number {
  const slideNumber = Number(prompt.match(/\bslide\s+(\d+)\b/i)?.[1] ?? '0');
  if (Number.isFinite(slideNumber) && slideNumber >= 1 && slideNumber <= source.slides.length) {
    return slideNumber - 1;
  }
  if (/\b(first|cover|opening|title slide)\b/i.test(prompt)) return 0;
  if (/\b(last|final|closing)\b/i.test(prompt)) return Math.max(0, source.slides.length - 1);
  return 0;
}

function resolveSlotId(prompt: string, slide: EditorialStageSlide): string | undefined {
  const layout = EDITORIAL_STAGE_LAYOUT_BY_ID[slide.layoutId];
  const declared = new Set(layout.slots.map((slot) => slot.id));
  const explicit = prompt.match(/\bslot\s+["']?([a-z0-9_.-]+)["']?/i)?.[1];
  if (explicit && declared.has(explicit)) return explicit;

  const candidates: Array<[RegExp, string[]]> = [
    [/\b(title|headline|heading)\b/i, ['title', 'question']],
    [/\b(subtitle|subhead|dek)\b/i, ['subtitle', 'context', 'bridge']],
    [/\b(metric label|number label)\b/i, ['metric_label']],
    [/\b(kicker|eyebrow|label)\b/i, ['kicker', 'section_number', 'left_label', 'right_label']],
    [/\b(metric|number|value)\b/i, ['metric_value']],
    [/\b(quote|pull quote)\b/i, ['quote']],
    [/\b(body|paragraph|copy|description)\b/i, ['body', 'interpretation', 'recommendation', 'left_body', 'right_body']],
    [/\b(footer|source|caption)\b/i, ['footer', 'source', 'caption', 'meta']],
    [/\b(ask)\b/i, ['ask']],
    [/\b(risk)\b/i, ['risk']],
    [/\b(trade.?off)\b/i, ['tradeoff']],
    [/\b(verdict)\b/i, ['verdict']],
    [/\b(action 1|first action)\b/i, ['action_1']],
    [/\b(action 2|second action)\b/i, ['action_2']],
    [/\b(action 3|third action)\b/i, ['action_3']],
  ];

  for (const [pattern, slotIds] of candidates) {
    if (!pattern.test(prompt)) continue;
    const match = slotIds.find((slotId) => declared.has(slotId));
    if (match) return match;
  }

  return layout.slots.find((slot) => slot.kind === 'title')?.id;
}

export function isEditorialStageSource(value: unknown): value is EditorialStageSource {
  return editorialStageSourceSchema.safeParse(value).success;
}

export function normalizeEditorialStageSource(value: unknown): EditorialStageSource | null {
  const parsed = editorialStageSourceSchema.safeParse(value);
  if (parsed.success) return cloneSource(parsed.data);

  const sanitized = editorialStageSourceSchema.safeParse(sanitizeUnknownText(value));
  if (!sanitized.success) return null;

  const repaired = repairEditorialStageSourcePayload(sanitized.data);
  return cloneSource(repaired.source);
}

export function restyleEditorialStageSource(
  source: EditorialStageSource,
  directionId: ArtifactDesignDirectionId | string | undefined,
): EditorialStageSourceEditResult {
  const nextDirectionId = resolveDirectionId(directionId);
  if (source.directionId === nextDirectionId) {
    return {
      source: cloneSource(source),
      changed: false,
      reason: `Source already uses ${nextDirectionId}.`,
    };
  }
  return {
    source: {
      ...cloneSource(source),
      directionId: nextDirectionId,
    },
    changed: true,
  };
}

export function addEditorialStageSlideFromBrief(
  source: EditorialStageSource,
  brief: SlideBrief,
): EditorialStageSourceEditResult {
  if (source.slides.length >= 18) {
    return {
      source: cloneSource(source),
      changed: false,
      reason: 'Editorial Stage decks are capped at 18 slides.',
    };
  }

  const next = cloneSource(source);
  const slide = buildSlide({
    source: next,
    brief,
    index: next.slides.length,
    total: next.slides.length + 1,
  });
  next.slides.push(slide);
  next.rhythmPlan = rebuildRhythmPlan(next);
  return {
    source: next,
    changed: true,
  };
}

export function patchEditorialStageTextSlots(
  source: EditorialStageSource,
  prompt: string,
): EditorialStageSourceEditResult {
  const replacement = cleanText(extractReplacement(prompt), 520);
  if (!replacement) {
    return {
      source: cloneSource(source),
      changed: false,
      reason: 'No explicit replacement text was found for a slot edit.',
    };
  }

  const next = cloneSource(source);
  const slideIndex = resolveTargetSlideIndex(prompt, next);
  const slide = next.slides[slideIndex];
  if (!slide) {
    return {
      source: next,
      changed: false,
      reason: 'The requested slide was not found.',
    };
  }
  const slotId = resolveSlotId(prompt, slide);
  if (!slotId) {
    return {
      source: next,
      changed: false,
      reason: 'No declared slot matched the edit request.',
    };
  }

  const slot = EDITORIAL_STAGE_LAYOUT_BY_ID[slide.layoutId].slots.find((candidate) => candidate.id === slotId);
  const value = cleanText(replacement, slot?.maxLength ?? 520);
  if (!value || slide.slots[slotId] === value) {
    return {
      source: next,
      changed: false,
      reason: 'Slot value was unchanged.',
    };
  }

  slide.slots[slotId] = value;
  next.rhythmPlan = rebuildRhythmPlan(next);
  return {
    source: next,
    changed: true,
  };
}

function pathSlideIndex(finding: ArtifactValidationFinding): number | null {
  const slideIndex = finding.path?.[1];
  return typeof slideIndex === 'number' ? slideIndex : null;
}

function pathSlotId(finding: ArtifactValidationFinding): string | null {
  const slotId = finding.path?.[3];
  return typeof slotId === 'string' ? slotId : null;
}

function pathMediaIndex(finding: ArtifactValidationFinding): number | null {
  const mediaIndex = finding.path?.[3];
  return typeof mediaIndex === 'number' ? mediaIndex : null;
}

function firstTextFromSlide(slide: EditorialStageSlide, source: EditorialStageSource): string {
  return cleanText(
    slide.slots.title ||
    slide.slots.question ||
    slide.slots.quote ||
    slide.slots.body ||
    slide.slots.recommendation ||
    source.title,
    120,
  ) || 'Decision point';
}

function guidanceFromSlide(slide: EditorialStageSlide, source: EditorialStageSource): string {
  const text = [
    slide.slots.body,
    slide.slots.context,
    slide.slots.interpretation,
    slide.slots.recommendation,
    slide.slots.quote,
    source.brief,
  ].filter(Boolean).join(' ');
  return cleanText(text, 260) || 'Use the strongest available evidence to make the next decision explicit.';
}

function rebuildSlotsForLayout(input: {
  source: EditorialStageSource;
  slide: EditorialStageSlide;
  layoutId: EditorialStageLayoutId;
  index: number;
  total: number;
}): Record<string, string> {
  const layout = EDITORIAL_STAGE_LAYOUT_BY_ID[input.layoutId];
  const brief: SlideBrief = {
    index: input.index + 1,
    title: firstTextFromSlide(input.slide, input.source),
    contentGuidance: guidanceFromSlide(input.slide, input.source),
  };

  return Object.fromEntries(layout.slots.map((slot) => {
    const existing = cleanText(input.slide.slots[slot.id], slot.maxLength);
    return [
      slot.id,
      existing ||
        slotValue({
          slot,
          layoutId: input.layoutId,
          brief,
          index: input.index,
          total: input.total,
          number: extractNumber(`${brief.title} ${brief.contentGuidance ?? ''}`),
        }),
    ];
  }));
}

function convertSlideToLayout(
  source: EditorialStageSource,
  slideIndex: number,
  layoutId: EditorialStageLayoutId,
): boolean {
  const slide = source.slides[slideIndex];
  if (!slide || slide.layoutId === layoutId) return false;
  const layout = EDITORIAL_STAGE_LAYOUT_BY_ID[layoutId];
  const slots = rebuildSlotsForLayout({
    source,
    slide,
    layoutId,
    index: slideIndex,
    total: source.slides.length,
  });
  slide.layoutId = layoutId;
  slide.role = schemaRoleForLayout(layout);
  slide.mood = layout.defaultMood;
  slide.density = layout.defaultDensity;
  slide.visualWeight = visualWeightForLayout(layoutId, layout);
  slide.motion = layout.motion;
  slide.slots = slots;
  slide.media = slide.media.filter((media) =>
    layout.mediaSlots.some((slot) => slot.id === media.slotId && !slot.required),
  );
  return true;
}

function repairFinding(source: EditorialStageSource, finding: ArtifactValidationFinding): boolean {
  const slideIndex = pathSlideIndex(finding);
  if (slideIndex === null) return false;
  const slide = source.slides[slideIndex];

  if (!slide) return false;
  const layout = EDITORIAL_STAGE_LAYOUT_BY_ID[slide.layoutId];
  if (!layout) return false;

  if (finding.id === 'slot.unknown_key') {
    const slotId = pathSlotId(finding);
    if (!slotId || !(slotId in slide.slots)) return false;
    delete slide.slots[slotId];
    return true;
  }

  if (
    finding.id === 'slot.html_detected' ||
    finding.id === 'slot.required_missing' ||
    finding.id === 'slot.too_long_for_layout' ||
    finding.id === 'title.too_long_for_layout'
  ) {
    const slotId = pathSlotId(finding);
    const slot = layout.slots.find((candidate) => candidate.id === slotId);
    if (!slot || !slotId) return false;
    const cleaned = cleanText(slide.slots[slotId], slot.maxLength);
    const fallback = slotValue({
      slot,
      layoutId: slide.layoutId,
      brief: {
        index: slideIndex + 1,
        title: firstTextFromSlide(slide, source),
        contentGuidance: guidanceFromSlide(slide, source),
      },
      index: slideIndex,
      total: source.slides.length,
      number: extractNumber(`${slide.slots.title ?? ''} ${slide.slots.body ?? ''}`),
    });
    const nextValue = cleaned || fallback;
    if (slide.slots[slotId] === nextValue) return false;
    slide.slots[slotId] = nextValue;
    return true;
  }

  if (finding.id === 'presentation.asset_missing_when_required') {
    return convertSlideToLayout(source, slideIndex, 'story-split');
  }

  const mediaIndex = pathMediaIndex(finding);
  if (mediaIndex === null) return false;
  const media = slide.media[mediaIndex];
  if (!media) return false;
  const mediaSlot = layout.mediaSlots.find((slot) => slot.id === media.slotId);

  if (finding.id === 'media.slot_unknown') {
    slide.media.splice(mediaIndex, 1);
    return true;
  }

  if (finding.id === 'media.aspect_invalid' && mediaSlot) {
    const nextAspect = mediaSlot.aspectRatios[0];
    if (media.aspectRatio === nextAspect) return false;
    media.aspectRatio = nextAspect;
    return true;
  }

  if (finding.id === 'media.crop_invalid' && mediaSlot) {
    const nextCrop = mediaSlot.cropModes[0];
    if (media.cropMode === nextCrop) return false;
    media.cropMode = nextCrop;
    return true;
  }

  return false;
}

export function repairEditorialStageSourcePayload(
  source: EditorialStageSource,
  options: {
    outputMode?: ArtifactOutputMode;
    mediaResolver?: ArtifactMediaResolver;
    maxPasses?: number;
  } = {},
): EditorialStageSourceRepairResult {
  const next = cloneSource(source);
  const repairedFindingIds: string[] = [];
  const maxPasses = Math.max(1, options.maxPasses ?? 2);

  for (let pass = 0; pass < maxPasses; pass += 1) {
    const compileResult = compileEditorialStagePack({
      source: next,
      outputMode: options.outputMode ?? next.outputMode,
      ...(options.mediaResolver ? { mediaResolver: options.mediaResolver } : {}),
    });
    const repairableFindings = compileResult.validation.findings.filter((finding) =>
      REPAIRABLE_FINDING_IDS.has(finding.id),
    );
    let changedThisPass = false;

    for (const validationFinding of repairableFindings) {
      const repaired = repairFinding(next, validationFinding);
      if (repaired) {
        changedThisPass = true;
        repairedFindingIds.push(validationFinding.id);
      }
    }

    if (!changedThisPass) break;
    next.rhythmPlan = rebuildRhythmPlan(next);
  }

  return {
    source: next,
    changed: repairedFindingIds.length > 0,
    repairCount: repairedFindingIds.length,
    repairedFindingIds,
  };
}

export function compileEditorialStageSourceUpdate(
  edit: EditorialStageSourceEditResult,
  options: { outputMode?: ArtifactOutputMode; mediaResolver?: ArtifactMediaResolver } = {},
): EditorialStageCompiledSourceUpdate {
  const repair = edit.changed
    ? repairEditorialStageSourcePayload(edit.source, options)
    : {
        source: edit.source,
        changed: false,
        repairCount: 0,
        repairedFindingIds: [],
      };
  const source = repair.source;
  const compileResult = compileEditorialStagePack({
    source,
    outputMode: options.outputMode ?? source.outputMode,
    ...(options.mediaResolver ? { mediaResolver: options.mediaResolver } : {}),
  });
  const html = compileResult.output.content;
  const sections = html.match(/<section\b[\s\S]*?<\/section>/gi) ?? [];

  return {
    ...edit,
    source,
    changed: edit.changed || repair.changed,
    compileResult,
    html,
    styleBlock: html.match(/<style\b[\s\S]*?<\/style>/i)?.[0] ?? '',
    slideCount: sections.length,
    title: source.title,
    repairCount: repair.repairCount,
    repairedFindingIds: repair.repairedFindingIds,
  };
}
