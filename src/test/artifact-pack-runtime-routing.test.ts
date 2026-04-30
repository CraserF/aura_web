import { describe, expect, it, vi } from 'vitest';
import type { LanguageModel } from 'ai';
import type { PlanResult } from '@/services/ai/workflow/agents/planner';

import { detectAnimationLevel, getTemplateBlueprint, resolveTemplatePlan } from '@/services/ai/templates';
import { buildArtifactRunPlan } from '@/services/artifactRuntime/build';
import { buildSlideBriefsFromRunPlan } from '@/services/artifactRuntime/presentation';

const batchQueueMocks = vi.hoisted(() => ({
  runBatchQueue: vi.fn(),
}));

vi.mock('@/services/ai/workflow/batchQueue', () => ({
  runBatchQueue: batchQueueMocks.runBatchQueue,
}));

const { runQueuedPresentationRuntime } = await import('@/services/artifactRuntime/presentationRuntime');

function createPlanResult(): PlanResult {
  const prompt = 'Create 2 slides: opening thesis, next move';
  const templatePlan = resolveTemplatePlan(prompt);
  const blueprint = getTemplateBlueprint(templatePlan.style);

  return {
    intent: 'batch_create',
    blocked: false,
    style: templatePlan.style,
    selectedTemplate: templatePlan.templateId,
    exemplarPackId: templatePlan.exemplarPackId,
    animationLevel: detectAnimationLevel(prompt),
    blueprint,
    enhancedPrompt: prompt,
    slideBriefs: [
      {
        index: 1,
        title: 'Opening thesis',
        contentGuidance: 'State the argument for the focused launch.',
      },
      {
        index: 2,
        title: 'Next move',
        contentGuidance: 'Close with the decision and action.',
      },
    ],
    styleManifest: templatePlan.styleManifest,
  };
}

describe('artifact pack presentation runtime routing', () => {
  it('selects the editorial-stage artifact pack without enabling the legacy scaffold path', () => {
    const runPlan = buildArtifactRunPlan({
      runId: 'artifact-pack-routing',
      prompt: 'Create 2 slides: opening thesis, next move',
      artifactType: 'presentation',
      operation: 'create',
      activeDocument: null,
      providerId: 'openai',
      providerModel: 'gpt-4o',
      allowFullRegeneration: false,
    });

    expect(runPlan.artifactPackId).toBe('presentation/editorial-stage-v1');
    expect(runPlan.artifactPackVersion).toBe('1.0.0');
    expect(runPlan.presentationScaffoldId).toBeUndefined();
    expect(runPlan.workflow.artifactPackId).toBe('presentation/editorial-stage-v1');
    expect(buildSlideBriefsFromRunPlan(runPlan)).toHaveLength(2);
  });

  it('uses the pack compiler runtime instead of batch freeform slide generation', async () => {
    batchQueueMocks.runBatchQueue.mockReset();
    const runPlan = buildArtifactRunPlan({
      runId: 'artifact-pack-runtime',
      prompt: 'Create 2 slides: opening thesis, next move',
      artifactType: 'presentation',
      operation: 'create',
      activeDocument: null,
      providerId: 'openai',
      providerModel: 'gpt-4o',
      allowFullRegeneration: false,
    });

    const output = await runQueuedPresentationRuntime({
      runPlan,
      planResult: createPlanResult(),
      model: {} as LanguageModel,
      input: {
        prompt: 'Create 2 slides: opening thesis, next move',
        chatHistory: [],
      },
      onEvent: vi.fn(),
      isEdit: false,
    });

    expect(batchQueueMocks.runBatchQueue).not.toHaveBeenCalled();
    expect(output.html).toContain('data-pack="presentation/editorial-stage-v1"');
    expect(output.html).not.toContain('data-scaffold=');
    expect(output.artifactManifest).toEqual(expect.objectContaining({
      packId: 'presentation/editorial-stage-v1',
      packVersion: '1.0.0',
      renderer: 'presentation',
    }));
    expect(output.artifactSourcePayload).toEqual(expect.objectContaining({
      packId: 'presentation/editorial-stage-v1',
      packVersion: '1.0.0',
    }));
    expect(output.runtime?.runMode).toBe('queued-create');
  });
});
