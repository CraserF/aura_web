import { buildArtifactWorkflowPlan } from '@/services/artifactRuntime/planner';
import { buildArtifactQualityBar } from '@/services/artifactRuntime/qualityBar';
import type { BuildArtifactWorkflowPlanInput, PresentationRecipeId, RuntimeOutputMode } from '@/services/artifactRuntime/types';
import type {
  ArtifactQualityBar,
  ArtifactPart,
  ArtifactProviderPolicy,
  ArtifactRunPlan,
  DesignManifest,
  ValidationGate,
} from '@/services/artifactRuntime/types';

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
    ...(workflow.documentThemeFamily ? { documentThemeFamily: workflow.documentThemeFamily } : {}),
    queueMode: workflow.queueMode,
    templateGuidance: workflow.templateGuidance,
    workflow,
    roles: ['planner', 'design-director', 'generator', 'validator', 'repairer', 'finalizer'],
    providerPolicy,
    designManifest,
    qualityBar,
    workQueue: buildWorkQueue(workflow),
    validationGates: buildValidationGates(workflow, qualityBar),
    metricsBudget: {
      targetFirstPreviewMs: workflow.artifactType === 'presentation' ? 30_000 : 45_000,
      targetRepairCount: providerPolicy.maxRepairPasses,
      tokenBudgetPolicy: 'automatic',
    },
    cancellation: {
      source: 'user-only',
    },
  };
}
