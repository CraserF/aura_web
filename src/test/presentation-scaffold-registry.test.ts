import { describe, expect, it } from 'vitest';

import { buildPresentationBatchSlidePrompt, buildArtifactRunPlan } from '@/services/artifactRuntime';
import {
  buildSlotContractPrompt,
  MOTION_PRESET_REGISTRY,
  resolveTemplatePlan,
  selectLayout,
  SLIDE_LAYOUT_REGISTRY,
  SVG_MOTIF_REGISTRY,
  getTemplateBlueprint,
} from '@/services/ai/templates';
import { validateSlides } from '@/services/ai/workflow/agents/qa-validator';
import type { PlanResult, SlideBrief } from '@/services/ai/workflow/agents/planner';

function makePlanResult(prompt: string): PlanResult {
  const templatePlan = resolveTemplatePlan(prompt);
  return {
    intent: 'create',
    blocked: false,
    style: templatePlan.style,
    selectedTemplate: templatePlan.templateId,
    exemplarPackId: templatePlan.exemplarPackId,
    animationLevel: 2,
    blueprint: getTemplateBlueprint(templatePlan.style),
    styleManifest: templatePlan.styleManifest,
    enhancedPrompt: prompt,
  } as PlanResult;
}

describe('presentation scaffold registry', () => {
  it('defines the planned layout, motion, and SVG scaffold surface', () => {
    expect(Object.keys(SLIDE_LAYOUT_REGISTRY)).toHaveLength(16);
    expect(Object.keys(MOTION_PRESET_REGISTRY)).toHaveLength(5);
    expect(Object.keys(SVG_MOTIF_REGISTRY)).toHaveLength(7);

    for (const layout of Object.values(SLIDE_LAYOUT_REGISTRY)) {
      expect(layout.slots.some((slot) => slot.required)).toBe(true);
      expect(layout.minFontSizePx).toBeGreaterThanOrEqual(20);
      expect(layout.qualityRules.length).toBeGreaterThan(0);
      expect(layout.allowedMotionPresets.every((id) => id in MOTION_PRESET_REGISTRY)).toBe(true);
      expect(layout.allowedSvgMotifs.every((id) => id in SVG_MOTIF_REGISTRY)).toBe(true);
    }
  });

  it('selects concrete layouts from common presentation blueprint language', () => {
    expect(selectLayout('dominant metric/proof strip with one interpretive visual').id).toBe('metric-proof');
    expect(selectLayout('sequence the rollout into clear phases').id).toBe('timeline');
    expect(selectLayout('customer evidence success story').id).toBe('case-study');
  });

  it('maps runtime slide-role layout phrases to the intended scaffold contracts', () => {
    expect(selectLayout('stage-setting split with scene panel, insight stack, and short transition line').id).toBe('intro');
    expect(selectLayout('problem framing spread with focal tension panel and evidence strip').id).toBe('big-statement');
    expect(selectLayout('parallel comparison lanes with a center bridge or verdict').id).toBe('comparison');
    expect(selectLayout('asymmetric mechanism diagram with labeled steps and one narrative takeaway').id).toBe('process');
    expect(selectLayout('recommendation-first layout with proof band and decision/action cue').id).toBe('closing');
  });

  it('serializes slot contracts with targetable slots and bounded motion/SVG details', () => {
    const contract = buildSlotContractPrompt(SLIDE_LAYOUT_REGISTRY['metric-proof']);

    expect(contract).toContain('data-layout="metric-proof"');
    expect(contract).toContain('slot-metric-1-value');
    expect(contract).toContain('48px+');
    expect(contract).toContain('accent-pulse');
    expect(contract).toContain('max 2 elems, 2400ms');
    expect(contract).toContain('Reduced-motion fallback');
    expect(contract).toContain('data-grid');
    expect(contract).toContain('viewBox 0 0 400 240');
    expect(contract).toContain('No other @keyframes');
  });

  it('injects the scaffold contract into queued presentation slide prompts', () => {
    const prompt = 'Create a 4 slide executive board update about launch performance metrics';
    const runPlan = buildArtifactRunPlan({
      runId: 'presentation-scaffold-test',
      prompt,
      artifactType: 'presentation',
      operation: 'create',
      activeDocument: null,
      providerId: 'openai',
      providerModel: 'gpt-4o',
      allowFullRegeneration: false,
    });
    const brief: SlideBrief = {
      index: 2,
      title: 'Launch Proof',
      contentGuidance: 'Show the dominant signals that prove launch traction.',
      visualGuidance: 'Use a metric proof layout with restrained data SVG.',
    };

    const batchPrompt = buildPresentationBatchSlidePrompt({
      runPlan,
      planResult: makePlanResult(prompt),
      brief,
      totalSlides: 4,
      sharedStyleBlock: '<style>:root{--accent:#245c5f}.slide-shell{font-size:28px}.headline{font-size:72px}</style>',
    });

    expect(batchPrompt).toContain('SLOT CONTRACT');
    expect(batchPrompt).toContain('Populate named slots');
    expect(batchPrompt).toContain('Allowed motion presets');
    expect(batchPrompt).toContain('Allowed SVG motif families');
  });

  it('flags custom keyframes outside the approved motion presets', () => {
    const result = validateSlides(`
      <style>
        :root { --bg:#ffffff; --accent:#245c5f; }
        @keyframes wildSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .slide-shell { font-size: 28px; animation: wildSpin 4s linear infinite; }
        @media (prefers-reduced-motion: reduce) { .slide-shell { animation: none; } }
      </style>
      <section data-background-color="#ffffff" data-layout="cover">
        <div class="slide-shell"><h1>Launch proof</h1></div>
      </section>
    `);

    expect(result.violations.map((violation) => violation.rule)).toContain('motion-preset');
  });
});
