import type {
  ArtifactProviderPolicy,
  ArtifactQualityBar,
  ArtifactQualitySignalTarget,
  ArtifactQualityTier,
  ArtifactWorkflowPlan,
  DesignManifest,
  RuntimeOutputMode,
} from '@/services/artifactRuntime/types';
import { resolveReferenceQualityProfileId } from '@/services/ai/templates';

export interface BuildArtifactQualityBarInput {
  workflow: ArtifactWorkflowPlan;
  providerPolicy: ArtifactProviderPolicy;
  designManifest: DesignManifest;
  guidedOutputMode?: RuntimeOutputMode;
}

const QUALITY_SIGNAL_LABELS: Record<ArtifactQualitySignalTarget['id'], string> = {
  'content-depth': 'Content depth',
  'visual-richness': 'Visual richness',
  'narrative-coherence': 'Narrative coherence',
  continuity: 'Continuity',
  'component-variety': 'Component variety',
  'reference-style-match': 'Reference style match',
  'viewport-safety': 'Viewport safety',
  'deterministic-correctness': 'Deterministic correctness',
  'target-clarity': 'Target clarity',
  'formatting-usefulness': 'Formatting usefulness',
  'downstream-readiness': 'Downstream readiness',
};

function signal(
  id: ArtifactQualitySignalTarget['id'],
  target: number,
  weight: number,
): ArtifactQualitySignalTarget {
  return {
    id,
    label: QUALITY_SIGNAL_LABELS[id],
    target,
    weight,
  };
}

function isPremiumRequest(workflow: ArtifactWorkflowPlan): boolean {
  return (
    workflow.requestKind === 'create' ||
    workflow.requestKind === 'batch' ||
    workflow.requestKind === 'queue' ||
    workflow.requestKind === 'rewrite'
  );
}

function resolveTier(input: BuildArtifactQualityBarInput): ArtifactQualityTier {
  if (input.workflow.artifactType === 'spreadsheet') return 'balanced';

  if (!isPremiumRequest(input.workflow)) return 'balanced';

  return input.providerPolicy.tier === 'local-best-effort'
    ? 'structured-premium-lite'
    : 'premium';
}

function thresholdForTier(tier: ArtifactQualityTier): number {
  switch (tier) {
    case 'premium':
      return 86;
    case 'structured-premium-lite':
      return 78;
    case 'balanced':
      return 74;
    case 'fast':
      return 68;
  }
}

function polishingBudgetForTier(tier: ArtifactQualityTier): ArtifactQualityBar['polishingBudget'] {
  switch (tier) {
    case 'premium':
      return {
        deterministicPasses: 1,
        llmPasses: 1,
        maxTotalMs: 120_000,
      };
    case 'structured-premium-lite':
      return {
        deterministicPasses: 1,
        llmPasses: 0,
        maxTotalMs: 90_000,
      };
    case 'balanced':
      return {
        deterministicPasses: 1,
        llmPasses: 0,
        maxTotalMs: 75_000,
      };
    case 'fast':
      return {
        deterministicPasses: 0,
        llmPasses: 0,
        maxTotalMs: 45_000,
      };
  }
}

function buildDocumentQualityBar(input: BuildArtifactQualityBarInput, tier: ArtifactQualityTier): ArtifactQualityBar {
  const isPremium = tier === 'premium';
  const isLite = tier === 'structured-premium-lite';
  const minimumScore = thresholdForTier(tier);
  const referenceStylePackId = resolveReferenceQualityProfileId({
    artifactType: 'document',
    outputMode: input.guidedOutputMode,
    requestedReferenceStylePackId: input.workflow.templateGuidance.referenceStylePackId,
  });

  return {
    artifactType: 'document',
    ...(input.guidedOutputMode ? { outputMode: input.guidedOutputMode } : {}),
    tier,
    expectedDepth: {
      minWords: isPremium ? 900 : isLite ? 650 : 500,
      minModuleWords: isPremium ? 140 : 100,
      minModules: isPremium ? 4 : 3,
    },
    requiredComponentVariety: [
      'hero or strong opening summary',
      'summary or recommendation block',
      'KPI, proof, or evidence strip',
      'comparison, timeline, sidebar, or table rhythm',
    ],
    ...(referenceStylePackId
      ? { referenceStylePackId }
      : {}),
    polishingBudget: polishingBudgetForTier(tier),
    acceptanceThresholds: {
      minimumScore,
      excellenceTriggersPolishBelow: Math.max(0, minimumScore - 6),
      safetyBlocksOutput: true,
    },
    signals: [
      signal('content-depth', isPremium ? 86 : 78, 1.35),
      signal('component-variety', isPremium ? 82 : 74, 1),
      signal('narrative-coherence', isPremium ? 82 : 76, 1),
      signal('visual-richness', isPremium ? 78 : 70, 0.8),
      signal('reference-style-match', isPremium ? 78 : 70, 0.75),
      signal('viewport-safety', 90, 1.1),
    ],
  };
}

function buildPresentationQualityBar(input: BuildArtifactQualityBarInput, tier: ArtifactQualityTier): ArtifactQualityBar {
  const slideCount = Math.max(
    1,
    input.workflow.queuedWorkItems.filter((item) => item.targetType === 'slide').length,
  );
  const isPremium = tier === 'premium';
  const minimumScore = thresholdForTier(tier);
  const referenceStylePackId = resolveReferenceQualityProfileId({
    artifactType: 'presentation',
    outputMode: input.guidedOutputMode,
    requestedReferenceStylePackId: input.workflow.templateGuidance.referenceStylePackId,
  });

  return {
    artifactType: 'presentation',
    ...(input.guidedOutputMode ? { outputMode: input.guidedOutputMode } : {}),
    tier,
    expectedDepth: {
      minSlides: slideCount,
      minLayoutRoles: isPremium ? Math.min(4, Math.max(2, slideCount)) : Math.min(3, Math.max(2, slideCount)),
      minIntegratedVisuals: isPremium ? Math.min(slideCount, Math.max(1, Math.ceil(slideCount / 2))) : 1,
    },
    requiredComponentVariety: [
      'strong title or opening scene',
      'varied slide roles',
      'integrated visual, diagram, scene, or motif',
      'continuity tokens across the deck',
    ],
    ...(referenceStylePackId
      ? { referenceStylePackId }
      : {}),
    polishingBudget: polishingBudgetForTier(tier),
    acceptanceThresholds: {
      minimumScore,
      excellenceTriggersPolishBelow: Math.max(0, minimumScore - 6),
      safetyBlocksOutput: true,
    },
    signals: [
      signal('visual-richness', isPremium ? 86 : 78, 1.25),
      signal('narrative-coherence', isPremium ? 84 : 76, 1.1),
      signal('continuity', isPremium ? 82 : 74, 1),
      signal('component-variety', isPremium ? 82 : 72, 1),
      signal('reference-style-match', isPremium ? 78 : 70, 0.8),
      signal('viewport-safety', 90, 1.15),
    ],
  };
}

function buildSpreadsheetQualityBar(input: BuildArtifactQualityBarInput, tier: ArtifactQualityTier): ArtifactQualityBar {
  const minimumScore = thresholdForTier(tier);

  return {
    artifactType: 'spreadsheet',
    ...(input.guidedOutputMode ? { outputMode: input.guidedOutputMode } : {}),
    tier,
    expectedDepth: {
      minSheets: 1,
      summaryRequired: true,
    },
    requiredComponentVariety: [
      'deterministic action summary',
      'clear target sheet or output sheet',
      'useful formatting or chart spec when applicable',
      'downstream refresh summary',
    ],
    polishingBudget: polishingBudgetForTier(tier),
    acceptanceThresholds: {
      minimumScore,
      excellenceTriggersPolishBelow: Math.max(0, minimumScore - 6),
      safetyBlocksOutput: true,
    },
    signals: [
      signal('deterministic-correctness', 92, 1.4),
      signal('target-clarity', 80, 1),
      signal('formatting-usefulness', 72, 0.8),
      signal('downstream-readiness', 74, 0.8),
    ],
  };
}

export function buildArtifactQualityBar(input: BuildArtifactQualityBarInput): ArtifactQualityBar {
  const tier = resolveTier(input);

  switch (input.workflow.artifactType) {
    case 'presentation':
      return buildPresentationQualityBar(input, tier);
    case 'document':
      return buildDocumentQualityBar(input, tier);
    case 'spreadsheet':
      return buildSpreadsheetQualityBar(input, tier);
  }
}
