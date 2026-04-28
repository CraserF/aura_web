import { describe, expect, it } from 'vitest';

import {
  buildArtifactRunPlan,
  decideArtifactQualityPolish,
  formatRuntimeQualityDiagnostics,
} from '@/services/artifactRuntime';

describe('artifact quality polish decisions', () => {
  it('classifies low-scoring safe output as deterministic polish when budget is available', () => {
    const plan = buildArtifactRunPlan({
      runId: 'quality-decision-doc',
      prompt: 'Create a premium executive brief',
      artifactType: 'document',
      operation: 'create',
      activeDocument: null,
      mode: 'execute',
      providerId: 'openai',
      providerModel: 'gpt-4o',
      allowFullRegeneration: false,
    });

    expect(decideArtifactQualityPolish({
      qualityBar: plan.qualityBar,
      validationPassed: true,
      validationBlockingCount: 0,
      qualityPassed: false,
      qualityScore: plan.qualityBar.acceptanceThresholds.minimumScore - 10,
      qualityBlockingCount: 0,
      deterministicPolishAvailable: true,
      llmPolishAvailable: false,
    })).toEqual(expect.objectContaining({
      status: 'safe-needs-polish',
      action: 'deterministic-polish',
      shouldPolish: true,
    }));
  });

  it('does not request LLM polish for local runs without LLM polish budget', () => {
    const plan = buildArtifactRunPlan({
      runId: 'quality-decision-local',
      prompt: 'Create a polished launch presentation',
      artifactType: 'presentation',
      operation: 'create',
      activeDocument: null,
      mode: 'execute',
      providerId: 'ollama',
      providerModel: 'llama3.2',
      allowFullRegeneration: false,
    });

    expect(plan.qualityBar.polishingBudget.llmPasses).toBe(0);
    expect(decideArtifactQualityPolish({
      qualityBar: plan.qualityBar,
      validationPassed: true,
      validationBlockingCount: 0,
      qualityPassed: false,
      qualityScore: plan.qualityBar.acceptanceThresholds.minimumScore - 10,
      qualityBlockingCount: 0,
      deterministicPolishAvailable: false,
      llmPolishAvailable: true,
    })).toEqual(expect.objectContaining({
      status: 'safe-budget-exhausted',
      action: 'skipped-no-budget',
      shouldPolish: false,
    }));
  });

  it('formats quality decision diagnostics for advanced summaries', () => {
    expect(formatRuntimeQualityDiagnostics({
      totalRuntimeMs: 20,
      validationPassed: true,
      validationBlockingCount: 0,
      validationAdvisoryCount: 0,
      repairCount: 0,
      qualityPassed: false,
      qualityScore: 68,
      qualityGrade: 'needs-polish',
      qualityBlockingCount: 0,
      qualityAdvisoryCount: 1,
      qualityDecision: 'safe-needs-polish',
      qualityPolishAction: 'deterministic-polish',
      qualityChecks: [{
        id: 'excellence-score',
        label: 'Excellence score',
        passed: false,
        blockingCount: 0,
        advisoryCount: 1,
      }],
    })).toContainEqual({
      severity: 'advisory',
      message: 'Quality decision: safe-needs-polish; action: deterministic-polish.',
    });
  });
});
