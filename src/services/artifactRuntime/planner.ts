import { resolveTemplatePlan } from '@/services/ai/templates';
import { getProviderCapabilityProfile } from '@/services/ai/providerCapabilities';
import { selectDocumentBlueprint } from '@/services/ai/templates/document-blueprints';
import type {
  BuildArtifactWorkflowPlanInput,
  ArtifactWorkflowPlan,
  ArtifactWorkflowRequestKind,
  QueuedWorkItem,
  WorkflowPreservationIntent,
  PresentationRecipeId,
  DocumentThemeFamily,
} from '@/services/artifactRuntime/types';
import { parseSlideBriefs } from '@/services/ai/workflow/agents/planner';

const STYLE_CHANGE_RE = /\b(style|theme|palette|color|font|typography|spacing|visual|design|look)\b/i;
const STRUCTURE_CHANGE_RE = /\b(reorder|reorganize|restructure|re-layout|relayout|move section|insert section|add subsection|convert layout)\b/i;
const MULTI_ARTIFACT_RE = /\b(?:create|make|build|generate|add)\b[\s\S]*\b(\d+|several|multiple|few)\s+(?:slides?|sections?|artifacts?)\b/i;
const TITLE_RE = /\b(title slide|hero slide|cover slide|opening slide|opening statement)\b/i;
const LAUNCH_RE = /\b(launch plan|launch narrative|launch deck|go-to-market|gtm|market rollout|pitch opening)\b/i;
const STAGE_SETTING_RE = /\b(setting(?: |-)?the(?: |-)?stage|why it matters|context slide|framing slide|background slide|problem framing)\b/i;
const FINANCE_GRID_RE = /\b(finance|financial|blended|mechanism|capital stack|allocation|funding structure|grid)\b/i;
const METRICS_RE = /\b(kpi|metric|scorecard|dashboard|stats?|performance)\b/i;
const COMPARISON_RE = /\b(compare|comparison|versus|vs\.?|before\b.*\bafter|trade[- ]?off)\b/i;
const QUIZ_RE = /\b(quiz|trivia|knowledge check|multiple choice|interactive reveal|game show)\b/i;
const CLOSING_RE = /\b(closing|conclusion|next steps|call to action|summary slide|thank you)\b/i;

function resolveDocumentTypeHint(prompt: string): string {
  const normalized = prompt.toLowerCase();
  if (/\b(readme|setup guide|developer guide|installation)\b/.test(normalized)) return 'readme';
  if (/\b(wiki|knowledge base|reference|documentation)\b/.test(normalized)) return 'wiki';
  if (/\b(notes?|meeting notes?|minutes|summary notes)\b/.test(normalized)) return 'notes';
  if (/\b(proposal|pitch|plan|roadmap)\b/.test(normalized)) return 'proposal';
  if (/\b(brief|one-pager|memo|overview)\b/.test(normalized)) return 'brief';
  if (/\b(report|analysis|findings|assessment|review)\b/.test(normalized)) return 'report';
  return 'article';
}

function resolveRequestKind(input: BuildArtifactWorkflowPlanInput): ArtifactWorkflowRequestKind {
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

function resolvePresentationRecipe(prompt: string): PresentationRecipeId {
  if (QUIZ_RE.test(prompt)) return 'quiz-reveal';
  if (TITLE_RE.test(prompt) || LAUNCH_RE.test(prompt)) return 'title-opening';
  if (STAGE_SETTING_RE.test(prompt)) return 'stage-setting';
  if (COMPARISON_RE.test(prompt)) return 'comparison';
  if (FINANCE_GRID_RE.test(prompt)) return 'finance-grid';
  if (METRICS_RE.test(prompt)) return 'metrics-summary';
  if (CLOSING_RE.test(prompt)) return 'closing-action';
  if (/\b(editorial|explainer|story|narrative|feature|insight)\b/i.test(prompt)) return 'editorial-explainer';
  return 'general-polished';
}

function resolveDocumentThemeFamily(input: BuildArtifactWorkflowPlanInput): DocumentThemeFamily {
  const blueprint = selectDocumentBlueprint(input.prompt, resolveDocumentTypeHint(input.prompt));
  const normalized = `${input.prompt} ${blueprint.id}`.toLowerCase();

  if (/\b(process|workflow|playbook|runbook|guide|checklist|setup|onboard)\b/.test(normalized)) {
    return 'playbook-light';
  }
  if (/\b(research|study|assessment|methodology|findings|analysis)\b/.test(normalized)) {
    return 'research-light';
  }
  if (/\b(proposal|strategy|plan|roadmap|board|business case)\b/.test(normalized)) {
    return 'proposal-light';
  }
  if (/\b(snapshot|scorecard|one-pager|one pager|infographic|overview)\b/.test(normalized)) {
    return 'infographic-light';
  }
  if (/\b(report|editorial|article|insight|review)\b/.test(normalized)) {
    return 'editorial-light';
  }
  return 'executive-light';
}

function resolveReferenceStylePackId(input: BuildArtifactWorkflowPlanInput, presentationRecipeId?: PresentationRecipeId, documentThemeFamily?: DocumentThemeFamily) {
  if (input.artifactType === 'presentation') {
    switch (presentationRecipeId) {
      case 'title-opening':
        return 'presentation-launch-narrative' as const;
      case 'stage-setting':
        return 'presentation-stage-setting' as const;
      case 'finance-grid':
      case 'metrics-summary':
        return 'presentation-finance-grid-light' as const;
      case 'quiz-reveal':
        return 'presentation-quiz-show' as const;
      case 'closing-action':
        return 'presentation-launch-narrative' as const;
      default:
        return 'presentation-executive-starter' as const;
    }
  }

  if (input.artifactType === 'document' && documentThemeFamily) {
    return 'document-professional-light' as const;
  }

  return undefined;
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
      recipeId: resolvePresentationRecipe(`${brief.title} ${brief.contentGuidance}`),
    }));
  }

  return [];
}

function buildDesignConstraints(
  input: BuildArtifactWorkflowPlanInput,
  requestKind: ArtifactWorkflowRequestKind,
  presentationRecipeId?: PresentationRecipeId,
  documentThemeFamily?: DocumentThemeFamily,
): string[] {
  const providerProfile = getProviderCapabilityProfile({
    id: input.providerId,
    model: input.providerModel,
  });
  const providerTier = providerProfile.providerId === 'ollama' ? 'local-best-effort' : 'frontier';

  if (input.artifactType === 'presentation') {
    const recipeRules: Record<PresentationRecipeId, string[]> = {
      'title-opening': [
        'Build one strong opening scene with a central lockup, restrained support pills, and a clear connective seam or bridge motif.',
        'Keep the title short and visually dominant; avoid adding dashboard cards to the opening slide.',
      ],
      'stage-setting': [
        'Use a context-setting composition with one scene panel and one structured insight stack.',
        'Favor light editorial framing over dark dense panels.',
      ],
      'editorial-explainer': [
        'Use asymmetric columns, header rails, and embedded inline diagrams instead of repeating equal cards.',
        'Make the explanation feel like a premium editorial spread, not a generic business dashboard.',
      ],
      'finance-grid': [
        'Use light infographic cards with disciplined accent edges, embedded mechanism diagrams, and one full-width summary strip.',
        'Prefer bespoke visual explanation and layered hierarchy over KPI-wall repetition.',
      ],
      'metrics-summary': [
        'Show only a few dominant numbers with clean grouping and one clear interpretive message.',
        'Avoid sprawling metric walls or six-card grids unless explicitly requested.',
      ],
      comparison: [
        'Use a clean two-side comparison with parallel structure and one decisive bridge or verdict.',
        'Let spacing and structure make the contrast legible instead of over-coloring both sides.',
      ],
      'quiz-reveal': [
        'Center one bold focal element with playful but bounded motion and short copy.',
        'Keep the stage energetic without turning it into a cluttered game-show collage.',
      ],
      'closing-action': [
        'Use one strong close-out headline, one short action summary, and one disciplined CTA/support area.',
        'Favor clarity and confidence over novelty on closing slides.',
      ],
      'general-polished': [
        'Default to a light editorial system with strong hierarchy, asymmetry, and refined SVG-led support visuals.',
        'Avoid falling back to generic office-deck card grids when the prompt asks for a polished visual presentation.',
      ],
    };

    return providerTier === 'local-best-effort'
      ? [
          'Prefer one strong focal area and no more than 1-3 major layout zones.',
          'Use a tighter visual system with explicit hierarchy instead of generic multi-card grids.',
          'Bias toward shorter headings, simpler component grammar, and fewer simultaneous design ideas.',
          ...(presentationRecipeId ? recipeRules[presentationRecipeId] : recipeRules['general-polished']),
          requestKind === 'restyle'
            ? 'Preserve existing slide content and structure; change visual tokens first.'
            : 'Generate one queued slide at a time and preserve deck continuity between items.',
        ]
      : [
          'Favor a clear scene, asymmetry, and one reusable component family over generic dashboard repetition.',
          'Use exemplar-backed slide recipes and preserve deck-level continuity across create/edit operations.',
          'Keep slide density deliberate; do not fill the canvas edge-to-edge with equal-weight modules.',
          ...(presentationRecipeId ? recipeRules[presentationRecipeId] : recipeRules['general-polished']),
        ];
  }

  if (input.artifactType === 'document') {
    const familyRules: Record<DocumentThemeFamily, string[]> = {
      'executive-light': [
        'Keep the document clean, executive, and decision-oriented with restrained light surfaces.',
        'Lead with one strong summary block, then a concise KPI or recommendation module.',
      ],
      'editorial-light': [
        'Use a cleaner editorial rhythm with stronger title typography, pullout emphasis, and purposeful section resets.',
        'Prefer premium light-mode structure over a styled memo feel.',
      ],
      'proposal-light': [
        'Frame the document like a proposal board with value proposition, current vs proposed, and next-step clarity.',
        'Use proof strips and comparison modules instead of plain narrative blocks.',
      ],
      'research-light': [
        'Use disciplined evidence framing with clean methodology/context modules and tidy findings blocks.',
        'Keep the layout professional and structured rather than academic and flat.',
      ],
      'playbook-light': [
        'Use process rails, progress modules, and compact operational callouts.',
        'Make procedural flow obvious at a glance.',
      ],
      'infographic-light': [
        'Compress the message into a few strong visual summary modules and reduce prose.',
        'Use infographic bands, KPI rows, and comparison strips rather than long narrative sections.',
      ],
    };

    return [
      'Prefer a purposeful reading rhythm with strong section hierarchy and mobile-safe stacking.',
      ...(documentThemeFamily ? familyRules[documentThemeFamily] : familyRules['executive-light']),
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

function buildAntiPatterns(
  input: BuildArtifactWorkflowPlanInput,
  presentationRecipeId?: PresentationRecipeId,
): string[] {
  if (input.artifactType === 'presentation') {
    return [
      'generic office-style KPI card walls',
      'placeholder tokens or unfinished copy',
      'weak type hierarchy or low-contrast styling',
      'opaque multi-slide runs without per-slide progress',
      ...(presentationRecipeId === 'title-opening'
        ? ['opening slides overloaded with dashboard modules or long bullets']
        : []),
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
  const presentationRecipeId = input.artifactType === 'presentation'
    ? resolvePresentationRecipe(input.prompt)
    : undefined;
  const documentThemeFamily = input.artifactType === 'document'
    ? resolveDocumentThemeFamily(input)
    : undefined;
  const templatePlan = input.artifactType === 'presentation'
    ? resolveTemplatePlan(input.prompt, { recipeHint: presentationRecipeId })
    : undefined;
  const providerProfile = getProviderCapabilityProfile({
    id: input.providerId,
    model: input.providerModel,
  });
  const referenceStylePackId = resolveReferenceStylePackId(
    input,
    presentationRecipeId,
    documentThemeFamily,
  );

  return {
    artifactType: input.artifactType,
    requestKind,
    preservationIntent,
    ...(presentationRecipeId ? { presentationRecipeId } : {}),
    ...(documentThemeFamily ? { documentThemeFamily } : {}),
    queueMode: queuedWorkItems.length > 0 ? 'sequential' : 'none',
    queuedWorkItems,
    templateGuidance: {
      artifactType: input.artifactType,
      intentFamily: requestKind,
      providerTier: providerProfile.providerId === 'ollama' ? 'local-best-effort' : 'frontier',
      ...(templatePlan?.templateId ? { selectedTemplateId: templatePlan.templateId } : {}),
      exemplarPackId: templatePlan?.exemplarPackId,
      ...(referenceStylePackId ? { referenceStylePackId } : {}),
      ...(presentationRecipeId ? { presentationRecipeId } : {}),
      ...(documentThemeFamily ? { documentThemeFamily } : {}),
      designConstraints: buildDesignConstraints(input, requestKind, presentationRecipeId, documentThemeFamily),
      antiPatterns: buildAntiPatterns(input, presentationRecipeId),
    },
    summary: queuedWorkItems.length > 0
      ? `Queued ${queuedWorkItems.length} ${queuedWorkItems.length === 1 ? 'item' : 'items'} for sequential ${input.artifactType} work.`
      : `${requestKind} ${input.artifactType} workflow with ${preservationIntent} preservation intent${presentationRecipeId ? ` · recipe ${presentationRecipeId}` : documentThemeFamily ? ` · family ${documentThemeFamily}` : ''}.`,
  };
}
