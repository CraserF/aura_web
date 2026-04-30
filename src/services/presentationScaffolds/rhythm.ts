import type { SlideBrief } from '@/services/ai/workflow/agents/planner';
import type { ArtifactRunPlan, PresentationSlideRole } from '@/services/artifactRuntime/types';
import type {
  DeckRhythmEntry,
  DeckRhythmPlan,
  PresentationExportIntent,
  PresentationScaffold,
  PresentationScaffoldDirectionId,
  ScaffoldDensity,
  ScaffoldMood,
  ScaffoldSlideRole,
  ScaffoldTheme,
  ScaffoldVisualWeight,
} from './types';

function toScaffoldRole(role: PresentationSlideRole | undefined, index: number, total: number): ScaffoldSlideRole {
  if (role) return role;
  if (index === 0) return 'title-scene';
  if (index === total - 1) return 'closing-action';
  const sequence: ScaffoldSlideRole[] = ['context', 'metric-proof', 'comparison', 'mechanism', 'recommendation'];
  return sequence[(index - 1) % sequence.length] ?? 'content';
}

function fallbackSkeletonForIndex(index: number, total: number): string {
  if (index === 0) return 'cover';
  if (index === total - 1) return 'closing-action';
  const sequence = ['context', 'metric-proof', 'comparison', 'mechanism-process'];
  return sequence[(index - 1) % sequence.length] ?? 'context';
}

function selectSkeletonId(input: {
  scaffold: PresentationScaffold;
  role: ScaffoldSlideRole;
  index: number;
  total: number;
  previousSkeletonId?: string;
}): string {
  const allowed = input.scaffold.roleSkeletonMap[input.role] ?? [];
  const fallback = fallbackSkeletonForIndex(input.index, input.total);
  const candidates = allowed.length > 0 ? allowed : [fallback];
  const nonRepeated = candidates.find((candidate) => candidate !== input.previousSkeletonId);
  return nonRepeated ?? candidates[0] ?? fallback;
}

function rhythmDensity(theme: ScaffoldTheme, skeletonId: string, fallback: ScaffoldDensity): ScaffoldDensity {
  return theme.densityBySkeleton?.[skeletonId] ?? fallback;
}

function rhythmMood(theme: ScaffoldTheme, skeletonId: string, fallback: ScaffoldMood): ScaffoldMood {
  return theme.moodBySkeleton[skeletonId] ?? fallback;
}

function visualWeightForSkeleton(skeletonId: string): ScaffoldVisualWeight {
  if (skeletonId === 'cover' || skeletonId === 'closing-action') return 'hero';
  if (skeletonId === 'metric-proof') return 'proof';
  return 'standard';
}

function transitionPurpose(index: number, total: number, role: ScaffoldSlideRole): string {
  if (index === 0) return 'Open with the deck promise, motif, and audience-relevant thesis.';
  if (index === total - 1) return 'Close with the action path and final decision cue.';
  if (role === 'metric-proof') return 'Turn the prior claim into evidence and implication.';
  if (role === 'comparison') return 'Clarify the tradeoff before the recommendation.';
  if (role === 'mechanism' || role === 'timeline') return 'Explain how the path works without repeating proof layout.';
  return 'Advance the argument with a new visual rhythm.';
}

export function planDeckRhythm(input: {
  scaffold: PresentationScaffold;
  theme: ScaffoldTheme;
  directionId: PresentationScaffoldDirectionId;
  exportIntent: PresentationExportIntent;
  briefs: SlideBrief[];
  runPlan?: ArtifactRunPlan;
}): DeckRhythmPlan {
  let previousSkeletonId: string | undefined;
  const total = Math.max(1, input.briefs.length);
  const entries: DeckRhythmEntry[] = input.briefs.map((brief, index) => {
    const runtimePart = input.runPlan?.workQueue
      .filter((part) => part.kind === 'slide')
      .sort((left, right) => left.orderIndex - right.orderIndex)[index];
    const role = toScaffoldRole(runtimePart?.presentationSlideBlueprint?.role, index, total);
    const skeletonId = selectSkeletonId({
      scaffold: input.scaffold,
      role,
      index,
      total,
      previousSkeletonId,
    });
    previousSkeletonId = skeletonId;
    const skeleton = input.scaffold.skeletons.find((candidate) => candidate.id === skeletonId);
    const density = rhythmDensity(input.theme, skeletonId, skeleton?.density ?? 'balanced');
    const mood = rhythmMood(input.theme, skeletonId, skeleton?.mood ?? 'light');

    return {
      slideId: runtimePart?.id ?? `slide-${brief.index}`,
      slideIndex: brief.index,
      title: brief.title,
      role,
      skeletonId,
      density,
      mood,
      motionIntensity: input.exportIntent === 'editable-pptx' ? 'none' : 'subtle',
      visualWeight: visualWeightForSkeleton(skeletonId),
      transitionPurpose: transitionPurpose(index, total, role),
      mediaNeeds: (skeleton?.mediaSlots ?? []).map((slot) => ({
        slotId: slot.id,
        purpose: slot.label,
        required: Boolean(slot.required),
      })),
    };
  });

  return {
    scaffoldId: input.scaffold.id,
    directionId: input.directionId,
    themeId: input.theme.id,
    exportIntent: input.exportIntent,
    slideCount: entries.length,
    motif: `${input.directionId} editorial signal rings`,
    entries,
    rules: [
      'Use only skeleton ids from the scaffold manifest.',
      'Fill declared data-slot fields only; never return CSS or full slide HTML.',
      'Avoid adjacent repeated content skeletons.',
      'Slide 1 establishes the motif and later slides preserve class and token vocabulary.',
    ],
  };
}
