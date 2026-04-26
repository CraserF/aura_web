import type { PlanResult, SlideBrief } from '@/services/ai/workflow/agents/planner';
import type { ArtifactRunPlan } from '@/services/artifactRuntime/types';

function shouldUseQueuedSlides(runPlan: ArtifactRunPlan): boolean {
  return (
    runPlan.artifactType === 'presentation' &&
    runPlan.queueMode === 'sequential' &&
    runPlan.workQueue.some((part) => part.kind === 'slide')
  );
}

export function buildSlideBriefsFromRunPlan(runPlan: ArtifactRunPlan): SlideBrief[] {
  if (!shouldUseQueuedSlides(runPlan)) return [];

  return runPlan.workQueue
    .filter((part) => part.kind === 'slide')
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((part, index) => ({
      index: index + 1,
      title: part.title,
      contentGuidance: part.brief,
      visualGuidance: [
        part.recipeId ? `Use the ${part.recipeId} slide recipe.` : undefined,
        `Stay inside the ${runPlan.designManifest.family} deck design manifest.`,
      ].filter(Boolean).join(' '),
    }));
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
    `Design family: ${runPlan.designManifest.family}`,
    `Provider mode: ${runPlan.providerPolicy.mode}`,
    `Validation gate: ${runPlan.validationGates[0]?.label ?? 'presentation quality'}`,
  ].join('\n');

  if (slideBriefs.length > 0) {
    return {
      ...planResult,
      intent: isEdit ? 'add_slides' : 'batch_create',
      slideBriefs,
      enhancedPrompt: `${planResult.enhancedPrompt}\n\n${runtimeNotes}`,
    };
  }

  return {
    ...planResult,
    enhancedPrompt: `${planResult.enhancedPrompt}\n\n${runtimeNotes}`,
  };
}
