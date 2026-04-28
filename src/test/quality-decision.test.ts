import { describe, expect, it } from 'vitest';

import {
  buildArtifactRunPlan,
  buildPresentationQualityTelemetry,
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

  it('produces blocked-by-safety for local runs when validation fails', () => {
    const plan = buildArtifactRunPlan({
      runId: 'local-safety-block',
      prompt: 'Create a launch presentation',
      artifactType: 'presentation',
      operation: 'create',
      activeDocument: null,
      mode: 'execute',
      providerId: 'ollama',
      providerModel: 'llama3.2',
      allowFullRegeneration: false,
    });

    expect(decideArtifactQualityPolish({
      qualityBar: plan.qualityBar,
      validationPassed: false,
      validationBlockingCount: 2,
      qualityPassed: false,
      qualityScore: 55,
      qualityBlockingCount: 0,
      deterministicPolishAvailable: false,
      llmPolishAvailable: false,
    })).toEqual(expect.objectContaining({
      status: 'blocked-by-safety',
      action: 'safety-blocked',
      shouldPolish: false,
    }));
  });

  it('local and frontier presentation plans share quality signal IDs and telemetry shape', () => {
    const baseInput = {
      prompt: 'Create a 3-slide executive deck',
      artifactType: 'presentation' as const,
      operation: 'create' as const,
      activeDocument: null,
      mode: 'execute' as const,
      allowFullRegeneration: false,
    };

    const frontierPlan = buildArtifactRunPlan({ ...baseInput, runId: 'parity-frontier', providerId: 'openai', providerModel: 'gpt-4o' });
    const localPlan = buildArtifactRunPlan({ ...baseInput, runId: 'parity-local', providerId: 'ollama', providerModel: 'llama3.2' });

    const frontierSignalIds = frontierPlan.qualityBar.signals.map((s) => s.id).sort();
    const localSignalIds = localPlan.qualityBar.signals.map((s) => s.id).sort();
    const html = `<style>
      :root { --bg: #ffffff; --accent: #245c5f; }
      @keyframes fade { from { opacity: .9; } to { opacity: 1; } }
      @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
      .slide-title { color: #162235; font-size: 84px; animation: fade 1s ease both; }
      .slide-body { color: #314158; font-size: 28px; }
    </style>
    <section data-background-color="#ffffff"><h1 class="slide-title">Opening thesis</h1><p class="slide-body">Decision-ready opening.</p></section>`;
    const frontierTelemetry = buildPresentationQualityTelemetry({
      html,
      promptText: baseInput.prompt,
      qualityBar: frontierPlan.qualityBar,
    });
    const localTelemetry = buildPresentationQualityTelemetry({
      html,
      promptText: baseInput.prompt,
      qualityBar: localPlan.qualityBar,
    });
    const sharedTelemetryFields = [
      'promptTokenEstimate',
      'qualityPassed',
      'qualityScore',
      'qualityGrade',
      'qualityBlockingCount',
      'qualityAdvisoryCount',
      'qualitySignals',
      'qualityChecks',
      'viewportContractPassed',
      'viewportBlockingCount',
      'viewportAdvisoryCount',
    ] as const;

    expect(localSignalIds).toEqual(frontierSignalIds);
    for (const field of sharedTelemetryFields) {
      expect(localTelemetry).toHaveProperty(field);
      expect(frontierTelemetry).toHaveProperty(field);
    }
    expect(localTelemetry.qualitySignals?.map((s) => s.id).sort()).toEqual(frontierSignalIds);
    expect(frontierTelemetry.qualitySignals?.map((s) => s.id).sort()).toEqual(frontierSignalIds);
    expect(localTelemetry.qualityChecks?.map((check) => check.id)).toEqual(
      frontierTelemetry.qualityChecks?.map((check) => check.id),
    );
    expect(localPlan.qualityBar.acceptanceThresholds.safetyBlocksOutput).toBe(
      frontierPlan.qualityBar.acceptanceThresholds.safetyBlocksOutput,
    );
    // Local threshold is calibrated lower, not equal to frontier
    expect(localPlan.qualityBar.acceptanceThresholds.minimumScore).toBeLessThan(
      frontierPlan.qualityBar.acceptanceThresholds.minimumScore,
    );
  });
});
