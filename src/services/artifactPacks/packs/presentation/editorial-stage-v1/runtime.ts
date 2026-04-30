import type { PlanResult, SlideBrief } from '@/services/ai/workflow/agents/planner';
import type { EventListener } from '@/services/ai/workflow/types';
import type { ArtifactRunPlan } from '@/services/artifactRuntime/types';
import { compileEditorialStagePack } from './compiler';
import {
  EDITORIAL_STAGE_LAYOUT_BY_ID,
  type EditorialStageLayout,
  type EditorialStageLayoutId,
  type EditorialStageSlot,
} from './layouts';
import type { EditorialStageRhythmEntry, EditorialStageSlide, EditorialStageSource } from './schemas';

export interface EditorialStagePresentationQueueInput {
  planResult: PlanResult;
  runPlan?: ArtifactRunPlan;
  onEvent: EventListener;
  onSlideDraft?: (combinedHtml: string, slideIndex: number, totalSlides: number) => void;
  onSlideComplete: (combinedHtml: string, slideIndex: number, totalSlides: number) => void;
}

export interface EditorialStagePresentationQueueResult {
  html: string;
  slideCount: number;
  title: string;
  slideTimingsMs: number[];
  styleSystemApplied: true;
  source: EditorialStageSource;
  compileResult: ReturnType<typeof compileEditorialStagePack>;
  styleBlock: string;
}

const PACK_ID = 'presentation/editorial-stage-v1';
const PACK_VERSION = '1.0.0';

const ROLE_LABELS: Record<string, string> = {
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

function cleanText(value: string | undefined, maxLength: number): string {
  return (value ?? '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^[-*\d.\s]+/, '')
    .trim()
    .slice(0, maxLength)
    .trim();
}

function extractNumber(text: string): string | undefined {
  return text.match(/\b\d+(?:[.,]\d+)?\s?(?:%|x|k|m|bn|bps)?\b/i)?.[0]?.replace(/\s+/g, '');
}

function resolveSourceDirectionId(directionId: ArtifactRunPlan['designDirectionId']): EditorialStageSource['directionId'] {
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

function resolveBriefs(input: EditorialStagePresentationQueueInput): SlideBrief[] {
  const runtimeBriefs = input.runPlan?.workQueue
    .filter((part) => part.kind === 'slide')
    .sort((left, right) => left.orderIndex - right.orderIndex)
    .map((part, index) => ({
      index: index + 1,
      title: part.title,
      contentGuidance: part.brief,
      visualGuidance: part.presentationSlideBlueprint?.layoutPattern,
    })) ?? [];

  if (runtimeBriefs.length > 0) return runtimeBriefs;
  if ((input.planResult.slideBriefs?.length ?? 0) > 0) return input.planResult.slideBriefs!;

  return [{
    index: 1,
    title: 'Presentation',
    contentGuidance: input.runPlan?.userIntent ?? input.planResult.enhancedPrompt,
  }];
}

function roleForBrief(input: {
  brief: SlideBrief;
  index: number;
  total: number;
  runPlan?: ArtifactRunPlan;
}): string {
  const part = input.runPlan?.workQueue
    .filter((candidate) => candidate.kind === 'slide')
    .sort((left, right) => left.orderIndex - right.orderIndex)[input.index];
  const blueprintRole = part?.presentationSlideBlueprint?.role;
  if (blueprintRole) return blueprintRole;
  const text = `${input.brief.title} ${input.brief.contentGuidance ?? ''}`.toLowerCase();
  if (input.index === 0) return 'title-scene';
  if (input.index === input.total - 1) return 'closing-action';
  if (/\b(compare|comparison|versus|vs|trade[- ]?off|before|after)\b/.test(text)) return 'comparison';
  if (/\b(metric|kpi|number|percent|proof|signal|data|evidence)\b/.test(text)) return 'metric-proof';
  if (/\b(process|system|mechanism|workflow|roadmap|timeline|phase)\b/.test(text)) return 'mechanism';
  if (/\b(decision|recommend|ask|proposal|action)\b/.test(text)) return 'recommendation';
  if (/\b(problem|risk|gap|challenge|tension)\b/.test(text)) return 'problem';
  return 'context';
}

function layoutForRole(input: {
  role: string;
  brief: SlideBrief;
  index: number;
  total: number;
  previousLayoutId?: EditorialStageLayoutId;
}): EditorialStageLayoutId {
  const text = `${input.brief.title} ${input.brief.contentGuidance ?? ''}`;
  if (input.index === 0) return 'cover';
  if (input.index === input.total - 1 && input.total > 1) return 'closing-action';
  if (input.total >= 6 && input.index > 0 && input.index % 4 === 3) return 'question-hero';

  const preferred = (() => {
    if (input.role === 'comparison') return 'comparison';
    if (input.role === 'metric-proof' && extractNumber(text)) return 'big-number';
    if (input.role === 'mechanism' || input.role === 'timeline') return 'process-pipeline';
    if (input.role === 'recommendation') return 'decision';
    if (input.role === 'problem' || input.role === 'context') return 'story-split';
    return 'story-split';
  })();

  if (preferred !== input.previousLayoutId) return preferred;
  return preferred === 'story-split' ? 'comparison' : 'story-split';
}

function schemaRoleForLayout(layout: EditorialStageLayout): EditorialStageSlide['role'] {
  return layout.role as EditorialStageSlide['role'];
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
  const kicker = ROLE_LABELS[schemaRoleForLayout(EDITORIAL_STAGE_LAYOUT_BY_ID[input.layoutId])] ?? 'Focus';
  const footer = `${String(input.index + 1).padStart(2, '0')} / ${String(input.total).padStart(2, '0')}`;

  switch (input.slot.id) {
    case 'kicker':
      return cleanText(kicker, input.slot.maxLength);
    case 'title':
    case 'question':
      return title || 'A clearer path forward';
    case 'subtitle':
    case 'bridge':
    case 'context':
    case 'body':
    case 'interpretation':
      return guidance || 'Frame the point in one concise, audience-ready statement.';
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
      return 'Current';
    case 'right_label':
      return 'Proposed';
    case 'left_body':
      return guidance || 'The current path spreads attention across too many priorities.';
    case 'right_body':
      return 'The proposed path concentrates attention around the strongest proof.';
    case 'verdict':
      return 'The better path is the one the audience can understand, repeat, and act on.';
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
      return guidance || title || 'Focused point';
  }
}

function buildSlide(input: {
  brief: SlideBrief;
  index: number;
  total: number;
  layoutId: EditorialStageLayoutId;
}): EditorialStageSlide {
  const layout = EDITORIAL_STAGE_LAYOUT_BY_ID[input.layoutId];
  const text = `${input.brief.title} ${input.brief.contentGuidance ?? ''}`;
  const number = extractNumber(text);
  const slots = Object.fromEntries(layout.slots.map((slot) => [
    slot.id,
    slotValue({
      slot,
      layoutId: input.layoutId,
      brief: input.brief,
      index: input.index,
      total: input.total,
      number,
    }),
  ]));

  return {
    slideId: `slide-${input.index + 1}`,
    layoutId: input.layoutId,
    role: schemaRoleForLayout(layout),
    mood: layout.defaultMood,
    density: layout.defaultDensity,
    visualWeight: layout.defaultMood.startsWith('hero') || input.layoutId === 'cover' || input.layoutId === 'question-hero'
      ? 'hero'
      : input.layoutId === 'big-number'
        ? 'proof'
        : 'standard',
    motion: layout.motion,
    slots,
    media: [],
    sourceNotes: input.layoutId === 'big-number' && number ? ['User brief'] : [],
  };
}

function buildSource(input: EditorialStagePresentationQueueInput): EditorialStageSource {
  const briefs = resolveBriefs(input);
  const slides: EditorialStageSlide[] = [];
  let previousLayoutId: EditorialStageLayoutId | undefined;

  briefs.forEach((brief, index) => {
    const role = roleForBrief({ brief, index, total: briefs.length, runPlan: input.runPlan });
    const layoutId = layoutForRole({ role, brief, index, total: briefs.length, previousLayoutId });
    previousLayoutId = layoutId;
    slides.push(buildSlide({ brief, index, total: briefs.length, layoutId }));
  });

  const rhythmPlan: EditorialStageRhythmEntry[] = slides.map((slide, index) => ({
    slideIndex: index + 1,
    slideId: slide.slideId,
    narrativeRole: cleanText(ROLE_LABELS[slide.role] ?? slide.role, 80),
    layoutId: slide.layoutId,
    mood: slide.mood,
    density: slide.density,
    visualWeight: slide.visualWeight,
    motion: slide.motion,
    transitionPurpose: cleanText(briefs[index]?.contentGuidance ?? briefs[index]?.title, 140) || 'Advance the argument.',
    mediaNeeds: [],
  }));

  return {
    schemaVersion: 1,
    artifactType: 'presentation',
    packId: PACK_ID,
    packVersion: PACK_VERSION,
    title: cleanText(briefs[0]?.title ?? 'Presentation', 120) || 'Presentation',
    audience: cleanText(input.runPlan?.artifactDesignContextSpec?.audience, 120)
      || 'viewers who need a clear decision path',
    directionId: resolveSourceDirectionId(input.runPlan?.designDirectionId),
    outputMode: input.runPlan?.artifactExportIntent === 'pdf' || input.runPlan?.artifactExportIntent === 'editable-pptx'
      ? input.runPlan.artifactExportIntent
      : 'html',
    brief: cleanText(input.runPlan?.userIntent ?? input.planResult.enhancedPrompt, 1200) || 'Create a clear presentation.',
    rhythmPlan,
    slides,
  };
}

function extractStyleBlock(html: string): string {
  return html.match(/<style\b[\s\S]*?<\/style>/i)?.[0] ?? '';
}

export async function runEditorialStagePresentationQueue(
  input: EditorialStagePresentationQueueInput,
): Promise<EditorialStagePresentationQueueResult> {
  const source = buildSource(input);
  const compileResult = compileEditorialStagePack({
    source,
    ...(input.runPlan?.artifactStructurePlan ? { structure: input.runPlan.artifactStructurePlan } : {}),
    ...(input.runPlan?.artifactDesignContextSpec ? { designContext: input.runPlan.artifactDesignContextSpec } : {}),
    outputMode: source.outputMode,
  });
  const html = compileResult.output.content;
  const styleBlock = extractStyleBlock(html);
  const sections = html.match(/<section\b[\s\S]*?<\/section>/gi) ?? [];
  const slideTimingsMs: number[] = [];

  sections.forEach((_section, index) => {
    const combinedHtml = [styleBlock, ...sections.slice(0, index + 1)].join('\n');
    slideTimingsMs.push(0);
    input.onSlideDraft?.(combinedHtml, index + 1, sections.length);
    input.onSlideComplete(combinedHtml, index + 1, sections.length);
    input.onEvent({
      type: 'step-update',
      stepId: `slide-${index + 1}`,
      label: `Slide ${index + 1}/${sections.length}: compiled`,
      status: 'done',
    });
  });

  return {
    html,
    slideCount: sections.length,
    title: source.title,
    slideTimingsMs,
    styleSystemApplied: true,
    source,
    compileResult,
    styleBlock,
  };
}

export function isEditorialStagePresentationRun(runPlan: ArtifactRunPlan | undefined): boolean {
  return runPlan?.artifactType === 'presentation' && runPlan.artifactPackId === PACK_ID;
}
