import { describe, expect, it } from 'vitest';

import { buildArtifactRunPlan } from '@/services/artifactRuntime';
import {
  artifactRunEventToWorkflowEvent,
  createArtifactRunEvent,
} from '@/services/artifactRuntime/events';
import {
  finalizeStaticPresentationRuntime,
  repairPresentationFragmentHtml,
  validatePresentationRuntimeOutput,
} from '@/services/artifactRuntime/presentationRuntime';
import { buildSlideBriefsFromRunPlan } from '@/services/artifactRuntime/presentation';
import type { PlanResult } from '@/services/ai/workflow/agents/planner';

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
    expect(plan.requestKind).toBe('batch');
    expect(plan.queueMode).toBe('sequential');
    expect(plan.templateGuidance).toBe(plan.workflow.templateGuidance);
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

  it('validates queued presentation runtime output without requiring an LLM repair pass', () => {
    const planResult = {
      intent: 'batch_create',
      blueprint: {
        palette: {
          bg: '#ffffff',
        },
      },
    } as PlanResult;
    const html = `<style>
      :root { --bg: #ffffff; --accent: #245c5f; }
      @keyframes fade { from { opacity: .9; } to { opacity: 1; } }
      @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
      .title { font-size: 80px; animation: fade 1s ease both; }
    </style>
    <section data-background-color="#ffffff"><h1 class="title">Opening Thesis</h1></section>
    <section data-background-color="#ffffff"><h2>Market Gap</h2></section>`;

    const validation = validatePresentationRuntimeOutput(html, planResult, 2);

    expect(validation.passed).toBe(true);
    expect(validation.blockingCount).toBe(0);
    expect(validation.summary).toContain('Queued presentation runtime');
  });

  it('finalizes deterministic starter-style presentation HTML with scoped CSS and telemetry', () => {
    const finalized = finalizeStaticPresentationRuntime({
      title: 'Starter Deck',
      slideCount: 1,
      rawHtml: `<style>
        :root { --bg: #ffffff; --accent: #245c5f; }
        @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
        .title { font-size: 84px; }
      </style>
      <section data-background-color="#ffffff"><h1 class="title">Starter Deck</h1></section>`,
    });

    expect(finalized.html).toContain('@scope (.reveal .slides)');
    expect(finalized.slideCount).toBe(1);
    expect(finalized.runtime?.timeToFirstPreviewMs).toBe(0);
    expect(finalized.runtime?.repairCount).toBe(0);
  });

  it('adapts runtime part events into current workflow step updates', () => {
    const runtimeEvent = createArtifactRunEvent({
      runId: 'run-1',
      type: 'runtime.part-started',
      role: 'generator',
      message: 'Creating slide part',
      partId: 'design',
      pct: 25,
    });

    expect(runtimeEvent.id).toBeTruthy();
    expect(artifactRunEventToWorkflowEvent(runtimeEvent)).toEqual({
      type: 'step-update',
      stepId: 'design',
      label: 'Creating slide part',
      status: 'active',
    });
  });

  it('repairs presentation fragments without preserving unsafe wrappers or assets', () => {
    const repaired = repairPresentationFragmentHtml(`
      <!doctype html>
      <html>
        <head>
          <link rel="stylesheet" href="https://example.com/fonts.css">
          <style>
            .hero { animation: glow 1s ease; background-image: url("https://example.com/bg.png"); }
            @keyframes glow { from { opacity: .8; } to { opacity: 1; } }
          </style>
        </head>
        <body>
          <div class="reveal">
            <div class="slides">
              <section>
                <div class="slide-content"><div></div><h1>Runtime repair</h1><p></p></div>
                <img src="https://example.com/photo.png" alt="">
              </section>
            </div>
          </div>
          <script>window.bad = true;</script>
        </body>
      </html>
    `);

    expect(repaired.changed).toBe(true);
    expect(repaired.html).toContain('<style>');
    expect(repaired.html).toContain('<section data-background-color="#ffffff">');
    expect(repaired.html).toContain('prefers-reduced-motion');
    expect(repaired.html).toContain('class="slide-content"');
    expect(repaired.html).not.toMatch(/<html|<body|<script|<link|https?:\/\//i);
    expect(repaired.html).not.toContain('<p></p>');
  });
});
