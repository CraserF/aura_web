import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  buildPresentationBatchSlidePrompt,
  buildPresentationCreateSystemPrompt,
  buildPresentationEditSystemPrompt,
  buildPresentationRevisionSystemPrompt,
  buildArtifactRunPlan,
  buildCoreArtifactContractPack,
  buildPresentationFragmentContractPack,
} from '@/services/artifactRuntime';
import { getTemplateBlueprint, resolveTemplatePlan } from '@/services/ai/templates';
import type { PlanResult, SlideBrief } from '@/services/ai/workflow/agents/planner';

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), 'src', relativePath), 'utf8');
}

function makePresentationPromptInputs(prompt = 'Create a 3 slide executive briefing about market expansion') {
  const runPlan = buildArtifactRunPlan({
    runId: 'prompt-contract-run',
    prompt,
    artifactType: 'presentation',
    operation: 'create',
    activeDocument: null,
    mode: 'execute',
    providerId: 'openai',
    providerModel: 'gpt-4o',
    allowFullRegeneration: false,
  });
  const templatePlan = resolveTemplatePlan(prompt);
  const planResult = {
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

  return { runPlan, planResult };
}

describe('artifact prompt contracts', () => {
  it('keeps the presentation fragment contract strict and canvas-safe', () => {
    const contract = buildPresentationFragmentContractPack({
      artifactType: 'presentation',
      intentFamily: 'create',
      providerTier: 'frontier',
      selectedTemplateId: 'executive-briefing-light',
      presentationRecipeId: 'general-polished',
      referenceStylePackId: 'presentation-executive-starter',
      designConstraints: ['Use a production design family.'],
      antiPatterns: ['Avoid generic card walls.'],
    });

    expect(contract).toContain('Return only <style> plus one or more <section> elements.');
    expect(contract).toContain('No <!DOCTYPE>, <html>, <head>, <body>, scripts, external images, or remote assets.');
    expect(contract).toContain('Use class-based CSS');
    expect(contract).toContain('Include reduced-motion handling');
    expect(contract).toContain('Template family: executive-briefing-light');
    expect(contract).toContain('Slide recipe: general-polished');
  });

  it('does not reintroduce wrapper or link output in final runtime designer rules', () => {
    const { runPlan, planResult } = makePresentationPromptInputs();
    const prompt = buildPresentationEditSystemPrompt({ runPlan, planResult });

    expect(buildCoreArtifactContractPack()).toContain('small artifact part');
    expect(prompt).toContain('Return only <style> plus one or more <section> elements.');
    expect(prompt).toContain('Do not output `<!DOCTYPE>`, `<html>`, `<head>`, `<body>`, `<link>`');
    expect(prompt).not.toContain('`<link>` (if present)');
    expect(prompt).not.toContain('`<link>` (if fonts needed)');
  });

  it('builds compact runtime presentation prompts from the design manifest', () => {
    const { runPlan, planResult } = makePresentationPromptInputs();
    const createPrompt = buildPresentationCreateSystemPrompt({ runPlan, planResult });
    const editPrompt = buildPresentationEditSystemPrompt({ runPlan, planResult });
    const revisionPrompt = buildPresentationRevisionSystemPrompt({
      runPlan,
      planResult,
      feedback: ['Slide 1 is missing data-background-color.'],
    });
    const followUpBrief: SlideBrief = {
      index: 2,
      title: 'Decision Summary',
      contentGuidance: 'Summarize the decision and tradeoffs.',
      visualGuidance: 'Use the established executive design language.',
    };
    const followUpPrompt = buildPresentationBatchSlidePrompt({
      runPlan,
      planResult,
      brief: followUpBrief,
      totalSlides: 3,
      sharedStyleBlock: '<style>.slide-shell{font-size:28px}.headline{font-size:72px}</style>',
    });

    expect(createPrompt).toContain('DESIGN MANIFEST');
    expect(createPrompt).toContain(`Family: ${runPlan.designManifest.family}`);
    expect(createPrompt).toContain('fixed 16:9 Reveal stage');
    expect(createPrompt).toContain('reduced-motion CSS is required');
    expect(createPrompt.length).toBeLessThanOrEqual(6500);
    expect(editPrompt.length).toBeLessThanOrEqual(6500);
    expect(followUpPrompt.length).toBeLessThanOrEqual(3500);
    expect(revisionPrompt.length).toBeLessThanOrEqual(3500);

    for (const prompt of [createPrompt, editPrompt, followUpPrompt, revisionPrompt]) {
      expect(prompt).not.toContain('Google Fonts');
      expect(prompt).not.toContain('ADDITIONAL REFERENCE MATERIAL');
      expect(prompt).not.toContain('TEMPLATE EXAMPLES');
      expect(prompt).not.toContain('Output a <link>');
    }
  });

  it('keeps active presentation generation off the legacy prompt composer', () => {
    const activeSources = [
      'services/ai/workflow/agents/designer.ts',
      'services/ai/workflow/agents/evaluator.ts',
      'services/ai/workflow/batchQueue.ts',
      'services/artifactRuntime/presentationRuntime.ts',
      'services/ai/prompts/index.ts',
    ].map(readSource).join('\n');

    expect(activeSources).not.toMatch(/ai\/prompts\/composer|from ['"][./]*prompts['"]/);
    expect(activeSources).not.toMatch(/buildDesignerPrompt|buildEditDesignerPrompt|buildBatchSlidePrompt|buildRevisionSystemPrompt/);
    expect(activeSources).not.toMatch(/PromptComposer/);
    expect(activeSources).not.toMatch(/Google Fonts `<link>`|Output a <link>|including <link>/);
  });
});
