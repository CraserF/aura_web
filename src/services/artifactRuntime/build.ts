import { buildArtifactWorkflowPlan } from '@/services/artifactRuntime/planner';
import { buildArtifactQualityBar } from '@/services/artifactRuntime/qualityBar';
import {
  planDeckRhythm,
  resolveDefaultScaffoldSelection,
} from '@/services/presentationScaffolds';
import {
  buildDesignContextSpec,
  resolveArtifactPackForSelection,
} from '@/services/artifactPacks';
import type { BuildArtifactWorkflowPlanInput, PresentationRecipeId, RuntimeOutputMode } from '@/services/artifactRuntime/types';
import type {
  ArtifactQualityBar,
  ArtifactPart,
  ArtifactProviderPolicy,
  ArtifactRunPlan,
  DesignManifest,
  PresentationNarrativePlan,
  PresentationSlideBlueprint,
  PresentationSlideRole,
  ValidationGate,
} from '@/services/artifactRuntime/types';
import type {
  ArtifactDesignDirectionId,
  ArtifactEditSurface,
  ArtifactOutputMode,
  ArtifactStructurePlan,
} from '@/services/artifactPacks';
import type { SlideBrief } from '@/services/ai/workflow/agents/planner';
import type {
  PresentationAllowedEditSurface,
  PresentationExportIntent,
  PresentationMediaSlotPlan,
} from '@/services/presentationScaffolds';

export interface BuildArtifactRunPlanInput extends BuildArtifactWorkflowPlanInput {
  runId: string;
}

const RUNTIME_OUTPUT_MODES: RuntimeOutputMode[] = [
  'Executive',
  'Editorial',
  'Proposal',
  'Research',
  'Launch',
  'Teaching',
  'Data Story',
];

const PRESENTATION_RECIPE_LAYOUTS: Record<PresentationRecipeId, string[]> = {
  'title-opening': ['polished title lockup', 'animated seam', 'ambient background system'],
  'stage-setting': ['scene panel', 'insight stack', 'context rail'],
  'editorial-explainer': ['asymmetric editorial spread', 'embedded micro-diagram', 'pullout proof strip'],
  'finance-grid': ['light infographic grid', 'mechanism diagram', 'summary strip'],
  'metrics-summary': ['dominant metric row', 'interpretation panel', 'priority stack'],
  comparison: ['parallel comparison lanes', 'bridge verdict', 'shared proof strip'],
  'quiz-reveal': ['focal question object', 'answer stack', 'bounded reveal motion'],
  'closing-action': ['decisive close headline', 'next-step rail', 'supporting proof band'],
  'general-polished': ['premium editorial canvas', 'asymmetric content zones', 'reusable component family'],
};

function buildProviderPolicy(tier: ArtifactProviderPolicy['tier']): ArtifactProviderPolicy {
  return tier === 'local-best-effort'
    ? {
        tier,
        mode: 'local-constrained',
        maxRepairPasses: 1,
        secondaryEvaluation: 'skip',
        generationGranularity: 'part',
      }
    : {
        tier,
        mode: 'frontier-quality',
        maxRepairPasses: 2,
        secondaryEvaluation: 'enabled',
        generationGranularity: 'part',
      };
}

function extractGuidedOutputMode(projectRulesBlock?: string): RuntimeOutputMode | undefined {
  if (!projectRulesBlock) return undefined;
  const match = projectRulesBlock.match(/-\s*Output mode:\s*([^\n]+)/i);
  const rawMode = match?.[1]?.trim().toLowerCase();
  return RUNTIME_OUTPUT_MODES.find((mode) => mode.toLowerCase() === rawMode);
}

function withGuidedOutputMode(input: BuildArtifactRunPlanInput): BuildArtifactRunPlanInput {
  const guidedOutputMode = input.guidedOutputMode ?? extractGuidedOutputMode(input.projectRulesBlock);
  return guidedOutputMode ? { ...input, guidedOutputMode } : input;
}

function buildDesignManifest(input: BuildArtifactRunPlanInput, workflow = buildArtifactWorkflowPlan(input)): DesignManifest {
  const guidance = workflow.templateGuidance;
  const isPresentation = workflow.artifactType === 'presentation';
  const recipeId = workflow.presentationRecipeId ?? 'general-polished';
  const family =
    guidance.selectedTemplateId ??
    guidance.documentThemeFamily ??
    guidance.presentationRecipeId ??
    'artifact-default';

  return {
    id: `${workflow.artifactType}-manifest-${input.runId}`,
    artifactType: workflow.artifactType,
    family,
    ...(guidance.selectedTemplateId ? { templateId: guidance.selectedTemplateId } : {}),
    ...(workflow.presentationRecipeId ? { recipeId: workflow.presentationRecipeId } : {}),
    typography: isPresentation
      ? {
          coverH1Px: '76-96',
          contentH2Px: '44-60',
          bodyPx: '24-30',
          labelMinPx: 16,
        }
      : {
          coverH1Px: '34-48',
          contentH2Px: '24-34',
          bodyPx: '16-19',
          labelMinPx: 12,
        },
    colors: guidance.selectedTemplateId?.includes('light') || workflow.artifactType !== 'presentation'
      ? {
          mode: 'light',
          background: '#f7f4ee',
          text: '#171512',
          accent: '#2f6f73',
        }
      : {
          mode: 'dark',
          background: '#101418',
          text: '#f7f4ee',
          accent: '#7cc4ff',
        },
    layoutRecipes: isPresentation
      ? PRESENTATION_RECIPE_LAYOUTS[recipeId]
      : ['readable shell', 'module stack', 'mobile-safe evidence bands'],
    componentClasses: isPresentation
      ? ['slide-shell', 'title-lockup', 'content-grid', 'insight-card', 'metric-strip', 'diagram-pane']
      : ['doc-shell', 'doc-hero', 'doc-section', 'doc-kpi-row', 'doc-proof-strip', 'doc-timeline'],
    iconAndDiagramRules: [
      'Use inline SVG or CSS-built diagrams only.',
      'Avoid external images, JavaScript, and unsupported wrappers.',
      'Keep diagrams semantic and reusable across artifact parts.',
    ],
    motionBudget: {
      maxAnimatedSystems: guidance.providerTier === 'local-best-effort' ? 1 : 2,
      reducedMotionRequired: true,
    },
    canvasContract: isPresentation
      ? [
          'Output fragments must be <style> plus <section> elements only.',
          'Slides render inside the fixed 16:9 Reveal canvas.',
          'Essential text must remain readable when the stage is scaled down.',
        ]
      : [
          'Document HTML must be iframe-safe, fluid, and print-safe.',
          'Avoid fixed-width modules that clip on narrow framed viewports.',
          'No remote assets or JavaScript.',
        ],
  };
}

function buildWorkQueue(workflow: ArtifactRunPlan['workflow']): ArtifactPart[] {
  if (workflow.queuedWorkItems.length > 0) {
    return workflow.queuedWorkItems.map((item) => ({
      id: item.id,
      artifactType: workflow.artifactType,
      kind: item.targetType === 'slide'
        ? 'slide'
        : item.targetType === 'section'
          ? 'document-module'
          : item.targetType === 'sheet'
            ? 'workbook-action'
            : workflow.artifactType === 'presentation'
              ? 'deck'
              : workflow.artifactType === 'document'
                ? 'document-shell'
                : 'workbook-action',
      orderIndex: item.orderIndex,
      title: item.targetLabel,
      brief: item.promptSummary,
      status: item.status === 'pending' ? 'pending' : item.status === 'done' ? 'done' : item.status === 'active' ? 'active' : 'failed',
      sourceWorkItemId: item.id,
      ...(item.recipeId ? { recipeId: item.recipeId } : {}),
    }));
  }

  return [{
    id: `${workflow.artifactType}-part-1`,
    artifactType: workflow.artifactType,
    kind: workflow.artifactType === 'presentation'
      ? 'deck'
      : workflow.artifactType === 'document'
        ? 'document-shell'
        : 'workbook-action',
    orderIndex: 0,
    title: workflow.artifactType === 'presentation'
      ? 'Presentation deck'
      : workflow.artifactType === 'document'
        ? 'Document'
        : 'Workbook update',
    brief: workflow.summary,
    status: 'pending',
    ...(workflow.presentationRecipeId ? { recipeId: workflow.presentationRecipeId } : {}),
  }];
}

function resolvePresentationAudience(prompt: string): string {
  const normalized = prompt.toLowerCase();
  if (/\b(board|executive|leadership|c-suite|investor)\b/.test(normalized)) {
    return 'executive decision makers';
  }
  if (/\b(customer|client|buyer|sales|prospect)\b/.test(normalized)) {
    return 'customer-facing stakeholders';
  }
  if (/\bteam|internal|workshop|training|class|students?\b/.test(normalized)) {
    return 'internal team and learning stakeholders';
  }
  if (/\b(market|analyst|research|findings)\b/.test(normalized)) {
    return 'analytical reviewers who need the argument to land quickly';
  }
  return 'presentation viewers who need a clear decision path';
}

function resolvePresentationSlideRole(
  part: ArtifactPart,
  index: number,
  total: number,
): PresentationSlideRole {
  const text = `${part.title} ${part.brief} ${part.recipeId ?? ''}`.toLowerCase();
  if (index === 0 || /\b(title|opening|cover|thesis|launch)\b/.test(text)) return 'title-scene';
  if (index === total - 1 || /\b(close|closing|next steps?|cta)\b/.test(text)) return 'closing-action';
  if (/\b(metric|kpi|number|score|signal|proof|dashboard)\b/.test(text)) return 'metric-proof';
  if (/\b(compare|comparison|versus|before|after|trade[- ]?off)\b/.test(text)) return 'comparison';
  if (/\b(timeline|roadmap|phase|sequence|milestone)\b/.test(text)) return 'timeline';
  if (/\b(problem|gap|risk|barrier|challenge)\b/.test(text)) return 'problem';
  if (/\b(how|model|mechanism|system|flow|process|architecture)\b/.test(text)) return 'mechanism';
  if (/\b(context|market|background|why|setting)\b/.test(text)) return 'context';
  if (/\b(action|decision|recommend|proposal|ask)\b/.test(text)) return 'recommendation';

  const middleRoles: PresentationSlideRole[] = ['context', 'metric-proof', 'comparison', 'mechanism', 'recommendation'];
  return middleRoles[(index - 1) % middleRoles.length] ?? 'content';
}

function layoutPatternForSlideRole(role: PresentationSlideRole, manifest: DesignManifest): string {
  const fallback = manifest.layoutRecipes[0] ?? 'premium editorial canvas';
  switch (role) {
    case 'title-scene':
      return 'full-stage title scene with one focal lockup, compact support rail, and motif sample';
    case 'context':
      return 'stage-setting split with scene panel, insight stack, and short transition line';
    case 'problem':
      return 'problem framing spread with focal tension panel and evidence strip';
    case 'metric-proof':
      return 'dominant metric/proof strip with one interpretive visual, not a wall of equal cards';
    case 'comparison':
      return 'parallel comparison lanes with a center bridge or verdict';
    case 'mechanism':
      return 'asymmetric mechanism diagram with labeled steps and one narrative takeaway';
    case 'recommendation':
      return 'recommendation-first layout with proof band and decision/action cue';
    case 'timeline':
      return 'sequential timeline or roadmap with clear phase hierarchy';
    case 'closing-action':
      return 'decisive closing scene with next-step rail and compact support proof';
    case 'content':
      return fallback;
  }
}

function narrativeBeatForSlideRole(role: PresentationSlideRole, title: string): string {
  switch (role) {
    case 'title-scene':
      return `Open with the deck promise and make "${title}" feel like a designed scene, not a section header.`;
    case 'context':
      return `Establish the context behind "${title}" and bridge from the opening promise into evidence.`;
    case 'problem':
      return `Name the tension or gap in "${title}" so the need for action is obvious.`;
    case 'metric-proof':
      return `Turn "${title}" into proof: one dominant signal, one interpretation, and one implication.`;
    case 'comparison':
      return `Use "${title}" to clarify the tradeoff and end with a verdict or bridge.`;
    case 'mechanism':
      return `Explain the mechanism behind "${title}" with a visual model and concise labels.`;
    case 'recommendation':
      return `Make "${title}" the recommended path, supported by proof and next action.`;
    case 'timeline':
      return `Sequence "${title}" into clear phases with timing, ownership, or dependency cues.`;
    case 'closing-action':
      return `Close "${title}" with the decision, action path, and a confident final note.`;
    case 'content':
      return `Advance the argument in "${title}" with one clear takeaway.`;
  }
}

function buildPresentationSlideBlueprint(input: {
  part: ArtifactPart;
  index: number;
  total: number;
  manifest: DesignManifest;
}): PresentationSlideBlueprint {
  const role = resolvePresentationSlideRole(input.part, input.index, input.total);
  return {
    role,
    narrativeBeat: narrativeBeatForSlideRole(role, input.part.title),
    layoutPattern: layoutPatternForSlideRole(role, input.manifest),
    motifInstruction: input.index === 0
      ? 'Establish the reusable motif, CSS variables, class vocabulary, and type scale on this slide.'
      : 'Reuse the established motif and tokens, but change composition and focal object for this slide role.',
    continuityInstruction: input.index === 0
      ? 'Define deck-level visual rules that later slides can inherit.'
      : 'Preserve shared tokens, class names, and motif language while avoiding adjacent repeated-grid layouts.',
  };
}

function buildPresentationNarrativePlan(input: {
  prompt: string;
  workflow: ArtifactRunPlan['workflow'];
  designManifest: DesignManifest;
  workQueue: ArtifactPart[];
}): PresentationNarrativePlan | undefined {
  if (input.workflow.artifactType !== 'presentation') return undefined;

  const slideParts = input.workQueue.filter((part) => part.kind === 'slide');
  const plannedParts = slideParts.length > 0
    ? slideParts
    : input.workQueue.filter((part) => part.kind === 'deck').slice(0, 1);
  if (plannedParts.length === 0) return undefined;

  const audience = resolvePresentationAudience(input.prompt);
  const slideBlueprints = plannedParts.map((part, index) => ({
    part,
    blueprint: buildPresentationSlideBlueprint({
      part,
      index,
      total: plannedParts.length,
      manifest: input.designManifest,
    }),
  }));
  const firstTitle = plannedParts[0]?.title ?? 'opening';
  const lastTitle = plannedParts[plannedParts.length - 1]?.title ?? 'decision';

  return {
    promise: `Give ${audience} a polished path from ${firstTitle} to ${lastTitle}.`,
    audience,
    arc: plannedParts.length > 1
      ? 'Open with a strong promise, develop context and proof through varied slide roles, then close with a decision or action path.'
      : 'Create one premium opening scene that communicates the promise, evidence cue, and next action in a single frame.',
    visualMotif: `Use a ${input.designManifest.colors.accent} connective motif with ${input.designManifest.componentClasses.slice(0, 4).join(', ')} and reusable CSS tokens.`,
    slideRoles: slideBlueprints.map(({ part, blueprint }) => ({
      slideId: part.id,
      title: part.title,
      role: blueprint.role,
    })),
    layoutMap: slideBlueprints.map(({ part, blueprint }) => ({
      slideId: part.id,
      layoutPattern: blueprint.layoutPattern,
    })),
    continuityRules: [
      'Slide 1 establishes the CSS variables, type scale, motif, and reusable class vocabulary.',
      'Every later slide preserves shared tokens and class names while varying composition for its role.',
      'Avoid adjacent repeated card grids; use diagrams, comparisons, timelines, or proof strips when they clarify the story.',
      'Carry a short transition phrase or visual cue between slides so the deck reads as one argument.',
    ],
  };
}

function attachPresentationNarrativePlan(
  workQueue: ArtifactPart[],
  narrativePlan?: PresentationNarrativePlan,
  designManifest?: DesignManifest,
): ArtifactPart[] {
  if (!narrativePlan || !designManifest) return workQueue;

  return workQueue.map((part, index) => {
    if (part.kind !== 'slide' && part.kind !== 'deck') return part;
    const slideIndex = Math.max(0, narrativePlan.slideRoles.findIndex((entry) => entry.slideId === part.id));
    return {
      ...part,
      presentationSlideBlueprint: buildPresentationSlideBlueprint({
        part,
        index: slideIndex >= 0 ? slideIndex : index,
        total: Math.max(1, narrativePlan.slideRoles.length),
        manifest: designManifest,
      }),
    };
  });
}

function buildValidationGates(workflow: ArtifactRunPlan['workflow'], qualityBar: ArtifactQualityBar): ValidationGate[] {
  const sharedChecks = [
    'No unresolved template tokens.',
    'No unsupported HTML wrappers or JavaScript.',
    'Readable essential typography.',
  ];

  if (workflow.artifactType === 'presentation') {
    return [
      {
        id: 'presentation-fragment-contract',
        artifactType: 'presentation',
        label: 'Presentation canvas contract',
        severity: 'blocking',
        status: 'pending',
        checks: [
          ...sharedChecks,
          'Fragment contains <style> and <section> output only.',
          'Scaffolded runs use one locked scaffold CSS file plus skeleton sections.',
          'The model returns structured slot payloads only; no raw CSS or full-slide HTML.',
          'Reduced-motion handling exists when animations are present.',
          'Slide count matches assembled section count.',
        ],
      },
      {
        id: 'presentation-excellence-contract',
        artifactType: 'presentation',
        label: 'Presentation excellence bar',
        severity: 'advisory',
        status: 'pending',
        checks: [
          `Quality tier ${qualityBar.tier} reaches score ${qualityBar.acceptanceThresholds.minimumScore}+ before finalization or records a polishing reason.`,
          'Deck has a narrative arc, strong opening scene, varied slide roles, and continuity tokens.',
          'Boring repeated-grid patterns trigger polishing or quality advisories.',
        ],
      },
    ];
  }

  if (workflow.artifactType === 'document') {
    return [
      {
        id: 'document-iframe-contract',
        artifactType: 'document',
        label: 'Document iframe contract',
        severity: 'blocking',
        status: 'pending',
        checks: [
          ...sharedChecks,
          'Document modules stack safely on mobile.',
          'No remote assets or fixed-width clipping risks.',
        ],
      },
      {
        id: 'document-excellence-contract',
        artifactType: 'document',
        label: 'Document excellence bar',
        severity: 'advisory',
        status: 'pending',
        checks: [
          `Quality tier ${qualityBar.tier} reaches score ${qualityBar.acceptanceThresholds.minimumScore}+ before finalization or records a polishing reason.`,
          'Document meets target depth with a content blueprint, module budgets, and useful evidence rhythm.',
          'Flat or too-short output triggers enrichment or quality advisories.',
        ],
      },
    ];
  }

  return [
    {
      id: 'spreadsheet-deterministic-contract',
      artifactType: 'spreadsheet',
      label: 'Spreadsheet deterministic execution',
      severity: 'blocking',
      status: 'pending',
      checks: [
        'Formula, query, chart, and refresh actions are explicit.',
        'Workbook writes are deterministic runtime operations.',
        'Validation summarizes changed sheets and dependencies.',
      ],
    },
    {
      id: 'spreadsheet-craft-contract',
      artifactType: 'spreadsheet',
      label: 'Spreadsheet craft bar',
      severity: 'advisory',
      status: 'pending',
      checks: [
        `Quality tier ${qualityBar.tier} reaches score ${qualityBar.acceptanceThresholds.minimumScore}+ before finalization or records a polishing reason.`,
        'Workbook output has clear targets, useful formatting intent, and downstream readiness telemetry.',
      ],
    },
  ];
}

function resolvePresentationExportIntent(projectRulesBlock?: string): PresentationExportIntent {
  const raw = projectRulesBlock?.match(/\bExport intent\s*:\s*([a-z0-9-]+)/i)?.[1]?.toLowerCase();
  if (raw === 'pdf' || raw === 'editable-pptx') return raw;
  return 'html';
}

function resolveArtifactExportIntent(input: {
  artifactType: BuildArtifactRunPlanInput['artifactType'];
  presentationExportIntent?: PresentationExportIntent;
}): ArtifactOutputMode {
  if (input.artifactType === 'presentation') return input.presentationExportIntent ?? 'html';
  if (input.artifactType === 'spreadsheet') return 'xlsx';
  return 'html';
}

function buildArtifactStructurePlan(input: {
  workflow: ArtifactRunPlan['workflow'];
  workQueue: ArtifactPart[];
  packId?: string;
  directionId?: ArtifactDesignDirectionId;
}): ArtifactStructurePlan {
  const unit =
    input.workflow.artifactType === 'presentation'
      ? 'slides'
      : input.workflow.artifactType === 'document'
        ? 'modules'
        : 'sheets';
  const relevantParts = input.workQueue.length > 0 ? input.workQueue : [];

  return {
    artifactType: input.workflow.artifactType,
    ...(input.packId ? { packId: input.packId } : {}),
    ...(input.directionId ? { directionId: input.directionId } : {}),
    targetLength: {
      unit,
      count: Math.max(1, relevantParts.length),
    },
    nodes: relevantParts.map((part) => ({
      id: part.id,
      orderIndex: part.orderIndex,
      role: part.presentationSlideBlueprint?.role ?? part.kind,
      label: part.title,
      layoutFamily:
        part.presentationSlideBlueprint?.layoutPattern
        ?? part.documentModuleBlueprint?.componentPattern
        ?? part.kind,
      requiredSlots: [],
      optionalSlots: [],
    })),
    rhythm: relevantParts.map((part) => ({
      nodeId: part.id,
      purpose: part.brief,
      density: 'balanced',
      visualWeight: part.presentationSlideBlueprint?.role === 'title-scene' || part.presentationSlideBlueprint?.role === 'closing-action'
        ? 'hero'
        : part.presentationSlideBlueprint?.role === 'metric-proof'
          ? 'proof'
          : 'standard',
      transitionRole: part.presentationSlideBlueprint?.narrativeBeat ?? part.title,
    })),
    rules: [
      'Compile from source payloads rather than treating compiled output as source.',
      'Use the selected artifact pack and design direction as the source of visual truth.',
      'Reject unsupported edit surfaces instead of allowing freeform layout changes.',
    ],
  };
}

function resolveArtifactEditSurface(input: {
  editSurfaces: readonly ArtifactEditSurface[];
  workflow: ArtifactRunPlan['workflow'];
  operation: BuildArtifactRunPlanInput['operation'];
}): ArtifactEditSurface | undefined {
  if (input.editSurfaces.length === 0) return undefined;
  if (input.operation === 'create') {
    return input.editSurfaces.find((surface) => surface.kind === 'create') ?? input.editSurfaces[0];
  }
  if (input.workflow.requestKind === 'restyle') {
    return input.editSurfaces.find((surface) => surface.kind === 'restyle') ?? input.editSurfaces[0];
  }
  if (input.workflow.requestKind === 'queue') {
    return input.editSurfaces.find((surface) =>
      surface.kind === 'add-slide' || surface.kind === 'add-module' || surface.kind === 'add-sheet') ?? input.editSurfaces[0];
  }
  return input.editSurfaces.find((surface) => surface.kind === 'text-edit') ?? input.editSurfaces[0];
}

function buildAllowedEditSurface(input: {
  workflow: ArtifactRunPlan['workflow'];
  operation: BuildArtifactRunPlanInput['operation'];
  prompt: string;
}): PresentationAllowedEditSurface {
  const lockedAreas = [
    'CSS selectors',
    'class names',
    'layout grids',
    'motion keyframes',
    'font stacks',
    'section wrappers',
    'data-background-color',
    'validation gates',
  ];
  const allowedSlotKinds: PresentationAllowedEditSurface['allowedSlotKinds'] = [
    'kicker',
    'title',
    'subtitle',
    'paragraph',
    'quote',
    'metric-value',
    'metric-label',
    'step-title',
    'step-body',
    'footer',
    'label',
  ];

  if (input.operation === 'create') {
    return { kind: 'create', allowedSlotKinds, lockedAreas };
  }

  if (input.workflow.requestKind === 'restyle') {
    return {
      kind: 'restyle',
      allowedSlotKinds: [],
      lockedAreas,
      reason: 'Restyle requests can swap scaffold theme tokens only.',
    };
  }

  if (input.workflow.requestKind === 'queue' || /\b(add|append|insert)\b[\s\S]*\bslides?\b/i.test(input.prompt)) {
    return {
      kind: 'add-slide',
      allowedSlotKinds,
      lockedAreas,
      reason: 'Add-slide requests choose an allowed skeleton and fill its slots.',
    };
  }

  if (input.workflow.preservationIntent === 'structure') {
    return {
      kind: 'restructure',
      allowedSlotKinds,
      lockedAreas,
      reason: 'Restructure requests rerun scaffold rhythm and recompile existing slot payloads.',
    };
  }

  return {
    kind: 'text-edit',
    allowedSlotKinds,
    lockedAreas,
    reason: 'Text edits patch data-slot payloads and recompile.',
  };
}

function buildScaffoldSlideBriefs(workQueue: ArtifactPart[], prompt: string): SlideBrief[] {
  const slideParts = workQueue
    .filter((part) => part.kind === 'slide')
    .sort((left, right) => left.orderIndex - right.orderIndex);

  if (slideParts.length > 0) {
    return slideParts.map((part, index) => ({
      index: index + 1,
      title: part.title,
      contentGuidance: part.brief,
      visualGuidance: part.presentationSlideBlueprint?.layoutPattern,
    }));
  }

  return [{
    index: 1,
    title: 'Presentation',
    contentGuidance: prompt,
  }];
}

function buildPresentationMediaSlotPlan(): PresentationMediaSlotPlan {
  return {
    allowedAssetIds: [],
    requiredSlots: [],
  };
}

export function buildArtifactRunPlan(input: BuildArtifactRunPlanInput): ArtifactRunPlan {
  const planInput = withGuidedOutputMode(input);
  const workflow = buildArtifactWorkflowPlan(planInput);
  const providerPolicy = buildProviderPolicy(workflow.templateGuidance.providerTier);
  const designManifest = buildDesignManifest(planInput, workflow);
  const qualityBar = buildArtifactQualityBar({
    workflow,
    providerPolicy,
    designManifest,
    guidedOutputMode: planInput.guidedOutputMode,
  });

  const baseWorkQueue = buildWorkQueue(workflow);
  const presentationNarrativePlan = buildPresentationNarrativePlan({
    prompt: planInput.prompt,
    workflow,
    designManifest,
    workQueue: baseWorkQueue,
  });
  const workQueue = attachPresentationNarrativePlan(
    baseWorkQueue,
    presentationNarrativePlan,
    designManifest,
  );
  const presentationExportIntent = workflow.artifactType === 'presentation'
    ? resolvePresentationExportIntent(planInput.projectRulesBlock)
    : undefined;
  const artifactExportIntent = resolveArtifactExportIntent({
    artifactType: workflow.artifactType,
    presentationExportIntent,
  });
  const projectRulesProxy = planInput.projectRulesBlock
    ? { projectRules: { markdown: planInput.projectRulesBlock, updatedAt: Date.now() } }
    : undefined;
  const initialArtifactDesignContext = buildDesignContextSpec({
    artifactType: workflow.artifactType,
    project: projectRulesProxy,
    briefSummary: workflow.summary,
  });
  const artifactPack = resolveArtifactPackForSelection({
    artifactType: workflow.artifactType,
    directionId: initialArtifactDesignContext.directionId,
    outputMode: artifactExportIntent,
    prompt: planInput.prompt,
  });
  const presentationScaffoldSelection = workflow.artifactType === 'presentation' && !artifactPack
    ? resolveDefaultScaffoldSelection({
        projectRulesBlock: planInput.projectRulesBlock,
        guidedOutputMode: planInput.guidedOutputMode,
        ...(workflow.presentationRecipeId ? { presentationRecipeId: workflow.presentationRecipeId } : {}),
        exportIntent: presentationExportIntent ?? 'html',
      })
    : undefined;
  const deckRhythmPlan = presentationScaffoldSelection
    ? planDeckRhythm({
        scaffold: presentationScaffoldSelection.scaffold,
        theme: presentationScaffoldSelection.theme,
        directionId: presentationScaffoldSelection.directionId,
        exportIntent: presentationScaffoldSelection.exportIntent,
        briefs: buildScaffoldSlideBriefs(workQueue, planInput.prompt),
      })
    : undefined;
  const artifactDesignContextSpec = buildDesignContextSpec({
    artifactType: workflow.artifactType,
    project: projectRulesProxy,
    packId: artifactPack?.manifest.id,
    packVersion: artifactPack?.manifest.version,
    directionId: initialArtifactDesignContext.directionId,
    audience: workflow.artifactType === 'presentation'
      ? presentationNarrativePlan?.audience
      : undefined,
    briefSummary: workflow.summary,
  });
  const artifactStructurePlan = buildArtifactStructurePlan({
    workflow,
    workQueue,
    packId: artifactPack?.manifest.id,
    directionId: artifactDesignContextSpec.directionId,
  });
  const artifactAllowedEditSurface = resolveArtifactEditSurface({
    editSurfaces: artifactPack?.manifest.editSurfaces ?? [],
    workflow,
    operation: planInput.operation,
  });
  const workflowWithArtifactPack: ArtifactRunPlan['workflow'] = {
    ...workflow,
    ...(artifactPack ? {
      artifactPackId: artifactPack.manifest.id,
      artifactPackVersion: artifactPack.manifest.version,
    } : {}),
    designDirectionId: artifactDesignContextSpec.directionId,
    artifactExportIntent,
    artifactDesignContextSpec,
    artifactStructurePlan,
    ...(artifactAllowedEditSurface ? { artifactAllowedEditSurface } : {}),
    sourcePayloadRef: `${planInput.runId}:source`,
    mediaBindingPlan: artifactDesignContextSpec.mediaBindingPlan,
    dataBindingPlan: artifactDesignContextSpec.dataBindingPlan,
  };

  return {
    version: 1,
    runId: planInput.runId,
    artifactType: workflow.artifactType,
    operation: planInput.operation,
    userIntent: planInput.prompt,
    intentSummary: workflow.summary,
    requestKind: workflow.requestKind,
    preservationIntent: workflow.preservationIntent,
    ...(workflow.presentationRecipeId ? { presentationRecipeId: workflow.presentationRecipeId } : {}),
    ...(artifactPack ? {
      artifactPackId: artifactPack.manifest.id,
      artifactPackVersion: artifactPack.manifest.version,
    } : {}),
    designDirectionId: artifactDesignContextSpec.directionId,
    artifactExportIntent,
    artifactDesignContextSpec,
    artifactStructurePlan,
    ...(artifactAllowedEditSurface ? { artifactAllowedEditSurface } : {}),
    sourcePayloadRef: `${planInput.runId}:source`,
    mediaBindingPlan: artifactDesignContextSpec.mediaBindingPlan,
    dataBindingPlan: artifactDesignContextSpec.dataBindingPlan,
    ...(presentationScaffoldSelection ? {
      presentationScaffoldId: presentationScaffoldSelection.scaffoldId,
      presentationThemeId: presentationScaffoldSelection.themeId,
      presentationDirectionId: presentationScaffoldSelection.directionId,
      presentationExportIntent: presentationScaffoldSelection.exportIntent,
      deckRhythmPlan,
      allowedEditSurface: buildAllowedEditSurface({
        workflow,
        operation: planInput.operation,
        prompt: planInput.prompt,
      }),
      designContextSpec: presentationScaffoldSelection.designContextSpec,
      mediaSlotPlan: buildPresentationMediaSlotPlan(),
    } : {}),
    ...(workflow.documentThemeFamily ? { documentThemeFamily: workflow.documentThemeFamily } : {}),
    queueMode: workflow.queueMode,
    templateGuidance: workflow.templateGuidance,
    workflow: workflowWithArtifactPack,
    roles: ['planner', 'design-director', 'generator', 'validator', 'repairer', 'finalizer'],
    providerPolicy,
    designManifest,
    qualityBar,
    ...(presentationNarrativePlan ? { presentationNarrativePlan } : {}),
    workQueue,
    validationGates: buildValidationGates(workflow, qualityBar),
    metricsBudget: {
      targetFirstPreviewMs: workflow.artifactType === 'presentation' ? 30_000 : 45_000,
      targetRepairCount: providerPolicy.maxRepairPasses,
      maxTotalRuntimeMs: qualityBar.polishingBudget.maxTotalMs,
      maxRepairPasses: providerPolicy.maxRepairPasses,
      maxOptionalPolishPasses: providerPolicy.tier === 'local-best-effort' ? 0 : 1,
      maxToolLoopSteps: providerPolicy.tier === 'local-best-effort' ? 3 : 5,
      budgetEnforcement: 'boundary-only',
      tokenBudgetPolicy: 'automatic',
    },
    cancellation: {
      source: 'user-only',
    },
  };
}
