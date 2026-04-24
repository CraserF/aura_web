import { resolveTemplatePlan } from '@/services/ai/templates';
import { getProviderCapabilityProfile } from '@/services/ai/providerCapabilities';
import type { BuildArtifactWorkflowPlanInput, ArtifactWorkflowPlan, ArtifactWorkflowRequestKind, QueuedWorkItem, WorkflowPreservationIntent } from '@/services/workflowPlanner/types';
import { parseSlideBriefs } from '@/services/ai/workflow/agents/planner';

const STYLE_CHANGE_RE = /\b(style|theme|palette|color|font|typography|spacing|visual|design|look)\b/i;
const STRUCTURE_CHANGE_RE = /\b(reorder|reorganize|restructure|re-layout|relayout|move section|insert section|add subsection|convert layout)\b/i;
const MULTI_ARTIFACT_RE = /\b(?:create|make|build|generate|add)\b[\s\S]*\b(\d+|several|multiple|few)\s+(?:slides?|sections?|artifacts?)\b/i;

function resolveRequestKind(input: BuildArtifactWorkflowPlanInput): ArtifactWorkflowRequestKind {
  if (input.mode !== 'execute') {
    return 'explain';
  }

  if (input.allowFullRegeneration) {
    return 'rewrite';
  }

  if (input.artifactType === 'presentation') {
    const hasQueuedSlides = parseSlideBriefs(input.prompt).length > 1 && MULTI_ARTIFACT_RE.test(input.prompt);
    if (hasQueuedSlides) {
      return input.operation === 'create' ? 'batch' : 'queue';
    }
  }

  if (input.operation === 'create') {
    return 'create';
  }

  if (STYLE_CHANGE_RE.test(input.prompt) || input.editStrategyHint === 'style-token') {
    return 'restyle';
  }

  return 'edit';
}

function resolvePreservationIntent(input: BuildArtifactWorkflowPlanInput, requestKind: ArtifactWorkflowRequestKind): WorkflowPreservationIntent {
  if (requestKind === 'rewrite') {
    return 'full';
  }

  if (requestKind === 'restyle') {
    return 'content';
  }

  if (STRUCTURE_CHANGE_RE.test(input.prompt)) {
    return 'structure';
  }

  if (input.operation === 'edit' || input.operation === 'action') {
    return 'content';
  }

  return 'full';
}

function buildQueuedWorkItems(input: BuildArtifactWorkflowPlanInput, requestKind: ArtifactWorkflowRequestKind): QueuedWorkItem[] {
  if (input.artifactType === 'presentation' && (requestKind === 'batch' || requestKind === 'queue')) {
    const slideBriefs = parseSlideBriefs(input.prompt);
    return slideBriefs.map((brief, index) => ({
      id: `slide-${index + 1}`,
      orderIndex: index,
      targetType: 'slide',
      targetLabel: brief.title,
      operationKind: input.operation === 'create' ? 'create' : 'edit',
      status: 'pending',
      promptSummary: brief.contentGuidance,
    }));
  }

  return [];
}

function buildDesignConstraints(input: BuildArtifactWorkflowPlanInput, requestKind: ArtifactWorkflowRequestKind): string[] {
  const providerProfile = getProviderCapabilityProfile({
    id: input.providerId,
    model: input.providerModel,
  });
  const providerTier = providerProfile.providerId === 'ollama' ? 'local-best-effort' : 'frontier';

  if (input.artifactType === 'presentation') {
    return providerTier === 'local-best-effort'
      ? [
          'Prefer one strong focal area and no more than 1-3 major layout zones.',
          'Use a tighter visual system with explicit hierarchy instead of generic multi-card grids.',
          'Bias toward shorter headings, simpler component grammar, and fewer simultaneous design ideas.',
          requestKind === 'restyle'
            ? 'Preserve existing slide content and structure; change visual tokens first.'
            : 'Generate one queued slide at a time and preserve deck continuity between items.',
        ]
      : [
          'Favor a clear scene, asymmetry, and one reusable component family over generic dashboard repetition.',
          'Use exemplar-backed slide recipes and preserve deck-level continuity across create/edit operations.',
          'Keep slide density deliberate; do not fill the canvas edge-to-edge with equal-weight modules.',
        ];
  }

  if (input.artifactType === 'document') {
    return [
      'Prefer a purposeful reading rhythm with strong section hierarchy and mobile-safe stacking.',
      requestKind === 'restyle'
        ? 'Preserve content and structure while shifting the visual system.'
        : 'Avoid flattening dense prompts into generic memo prose.',
    ];
  }

  return [
    'Keep spreadsheet work deterministic and correctness-first.',
    'Separate formula, query, schema, and refresh operations clearly.',
  ];
}

function buildAntiPatterns(input: BuildArtifactWorkflowPlanInput): string[] {
  if (input.artifactType === 'presentation') {
    return [
      'generic office-style KPI card walls',
      'placeholder tokens or unfinished copy',
      'weak type hierarchy or low-contrast styling',
      'opaque multi-slide runs without per-slide progress',
    ];
  }

  if (input.artifactType === 'document') {
    return [
      'plain memo text when the prompt asks for a polished visual document',
      'dense multi-column prose blocks that break on smaller viewports',
      'restyle requests that silently rewrite the substance',
    ];
  }

  return [
    'ambiguous spreadsheet actions',
    'non-deterministic formula or query behavior',
    'silent dependency refresh side effects',
  ];
}

export function buildArtifactWorkflowPlan(input: BuildArtifactWorkflowPlanInput): ArtifactWorkflowPlan {
  const requestKind = resolveRequestKind(input);
  const preservationIntent = resolvePreservationIntent(input, requestKind);
  const queuedWorkItems = buildQueuedWorkItems(input, requestKind);
  const templatePlan = input.artifactType === 'presentation'
    ? resolveTemplatePlan(input.prompt)
    : undefined;
  const providerProfile = getProviderCapabilityProfile({
    id: input.providerId,
    model: input.providerModel,
  });

  return {
    artifactType: input.artifactType,
    requestKind,
    preservationIntent,
    queueMode: queuedWorkItems.length > 0 ? 'sequential' : 'none',
    queuedWorkItems,
    templateGuidance: {
      artifactType: input.artifactType,
      intentFamily: requestKind,
      providerTier: providerProfile.providerId === 'ollama' ? 'local-best-effort' : 'frontier',
      exemplarPackId: templatePlan?.exemplarPackId,
      designConstraints: buildDesignConstraints(input, requestKind),
      antiPatterns: buildAntiPatterns(input),
    },
    summary: queuedWorkItems.length > 0
      ? `Queued ${queuedWorkItems.length} ${queuedWorkItems.length === 1 ? 'item' : 'items'} for sequential ${input.artifactType} work.`
      : `${requestKind} ${input.artifactType} workflow with ${preservationIntent} preservation intent.`,
  };
}
