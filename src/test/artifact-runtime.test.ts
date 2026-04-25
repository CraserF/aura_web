import { describe, expect, it } from 'vitest';

import { buildArtifactRunPlan } from '@/services/artifactRuntime';
import { buildSlideBriefsFromRunPlan } from '@/services/artifactRuntime/presentation';

describe('ArtifactRuntime plan', () => {
  it('creates one authoritative presentation run plan with design manifest, parts, and gates', () => {
    const plan = buildArtifactRunPlan({
      runId: 'run-1',
      prompt: 'Create 3 slides: opening thesis, market gap, next steps',
      artifactType: 'presentation',
      operation: 'create',
      activeDocument: null,
      mode: 'execute',
      providerId: 'openai',
      providerModel: 'gpt-4o',
      allowFullRegeneration: false,
    });

    expect(plan.version).toBe(1);
    expect(plan.workflow.requestKind).toBe('batch');
    expect(plan.roles).toEqual(['planner', 'design-director', 'generator', 'validator', 'repairer', 'finalizer']);
    expect(plan.providerPolicy.mode).toBe('frontier-quality');
    expect(plan.designManifest.typography.coverH1Px).toBe('76-96');
    expect(plan.designManifest.motionBudget.reducedMotionRequired).toBe(true);
    expect(plan.workQueue).toHaveLength(3);
    expect(plan.validationGates[0]?.checks).toContain('Slide count matches assembled section count.');

    expect(buildSlideBriefsFromRunPlan(plan).map((brief) => brief.title)).toEqual([
      'Opening thesis',
      'Market gap',
      'Next steps',
    ]);
  });

  it('uses constrained provider policy for local presentation generation', () => {
    const plan = buildArtifactRunPlan({
      runId: 'run-local',
      prompt: 'Create a polished title slide about the launch plan',
      artifactType: 'presentation',
      operation: 'create',
      activeDocument: null,
      mode: 'execute',
      providerId: 'ollama',
      providerModel: 'llama3.2',
      allowFullRegeneration: false,
    });

    expect(plan.providerPolicy).toMatchObject({
      tier: 'local-best-effort',
      mode: 'local-constrained',
      secondaryEvaluation: 'skip',
      generationGranularity: 'part',
    });
    expect(plan.designManifest.motionBudget.maxAnimatedSystems).toBe(1);
    expect(plan.cancellation.source).toBe('user-only');
  });
});
