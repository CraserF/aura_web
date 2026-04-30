import type { PlanResult, SlideBrief } from '@/services/ai/workflow/agents/planner';
import type { ArtifactRunPlan } from '@/services/artifactRuntime/types';

function shouldUseQueuedSlides(runPlan: ArtifactRunPlan): boolean {
  return (
    runPlan.artifactType === 'presentation' &&
    (
      (runPlan.queueMode === 'sequential' && runPlan.workQueue.some((part) => part.kind === 'slide')) ||
      (Boolean(runPlan.artifactPackId) && runPlan.operation === 'create') ||
      (Boolean(runPlan.presentationScaffoldId) && runPlan.operation === 'create')
    )
  );
}

export function buildSlideBriefsFromRunPlan(runPlan: ArtifactRunPlan): SlideBrief[] {
  if (!shouldUseQueuedSlides(runPlan)) return [];

  const slideParts = runPlan.workQueue
    .filter((part) => part.kind === 'slide')
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const effectiveParts = slideParts.length > 0
    ? slideParts
    : runPlan.workQueue.filter((part) => part.kind === 'deck').slice(0, 1);

  return effectiveParts
    .map((part, index) => {
      const blueprint = part.presentationSlideBlueprint;
      return {
        index: index + 1,
        title: part.title,
        contentGuidance: [
          part.brief,
          blueprint ? `Narrative beat: ${blueprint.narrativeBeat}` : undefined,
        ].filter(Boolean).join(' '),
        visualGuidance: [
          part.recipeId ? `Use the ${part.recipeId} slide recipe.` : undefined,
          blueprint ? `Slide role: ${blueprint.role}. Layout: ${blueprint.layoutPattern}.` : undefined,
          blueprint?.motifInstruction,
          blueprint?.continuityInstruction,
          `Stay inside the ${runPlan.designManifest.family} deck design manifest.`,
        ].filter(Boolean).join(' '),
      };
    });
}

export function applyArtifactRunPlanToPresentationPlan(
  planResult: PlanResult,
  runPlan: ArtifactRunPlan | undefined,
  isEdit: boolean,
): PlanResult {
  if (!runPlan || runPlan.artifactType !== 'presentation') {
    return planResult;
  }

  const slideBriefs = buildSlideBriefsFromRunPlan(runPlan);
  const runtimeNotes = [
    'AUTHORITATIVE ARTIFACT RUN PLAN',
    `Intent summary: ${runPlan.intentSummary}`,
    runPlan.artifactPackId
      ? `Artifact pack: ${runPlan.artifactPackId}@${runPlan.artifactPackVersion ?? 'unknown'}`
      : undefined,
    runPlan.designDirectionId
      ? `Design direction: ${runPlan.designDirectionId}`
      : undefined,
    `Design family: ${runPlan.designManifest.family}`,
    `Provider mode: ${runPlan.providerPolicy.mode}`,
    `Validation gate: ${runPlan.validationGates[0]?.label ?? 'presentation quality'}`,
    runPlan.presentationNarrativePlan
      ? `Narrative promise: ${runPlan.presentationNarrativePlan.promise}`
      : undefined,
  ].filter(Boolean).join('\n');
  const selectedTemplate = runPlan.templateGuidance.selectedTemplateId ?? planResult.selectedTemplate;
  const exemplarPackId = runPlan.templateGuidance.exemplarPackId ?? planResult.exemplarPackId;

  if (slideBriefs.length > 0) {
    return {
      ...planResult,
      intent: isEdit ? 'add_slides' : 'batch_create',
      selectedTemplate,
      exemplarPackId,
      slideBriefs,
      enhancedPrompt: `${planResult.enhancedPrompt}\n\n${runtimeNotes}`,
    };
  }

  return {
    ...planResult,
    selectedTemplate,
    exemplarPackId,
    enhancedPrompt: `${planResult.enhancedPrompt}\n\n${runtimeNotes}`,
  };
}
