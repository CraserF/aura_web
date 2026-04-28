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
  buildDocumentRuntimeModuleUserPrompt,
  buildDocumentRuntimeOutlineUserPrompt,
  buildDocumentRuntimeRepairUserPrompt,
  buildDocumentRuntimeSingleStreamSystemPrompt,
  buildDocumentRuntimeSingleStreamUserPrompt,
  buildDocumentRuntimeSystemPrompt,
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
    expect(createPrompt).toContain('QUALITY BAR');
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

  it('builds compact runtime document prompts for queued create, edit, and repair', () => {
    const part = {
      id: 'document-module-1',
      artifactType: 'document' as const,
      kind: 'document-module' as const,
      orderIndex: 1,
      title: 'Executive summary',
      brief: 'Summarize the core decision and evidence.',
      status: 'pending' as const,
    };
    const systemPrompt = buildDocumentRuntimeSystemPrompt({
      documentType: 'brief',
      designFamily: 'executive-light',
      blueprintLabel: 'Executive Brief',
      mode: 'queued-create',
    });
    const outlinePrompt = buildDocumentRuntimeOutlineUserPrompt({
      taskBrief: 'Create a board-ready market expansion brief.',
      documentType: 'brief',
      blueprintLabel: 'Executive Brief',
      parts: [part],
      designFamily: 'executive-light',
    });
    const modulePrompt = buildDocumentRuntimeModuleUserPrompt({
      taskBrief: 'Create a board-ready market expansion brief.',
      documentType: 'brief',
      outline: 'Thesis sentence\n- Executive summary',
      part,
      designFamily: 'executive-light',
    });
    const repairPrompt = buildDocumentRuntimeRepairUserPrompt({
      taskBrief: 'Create a board-ready market expansion brief.',
      documentType: 'brief',
      part,
      issues: [{
        partId: part.id,
        title: part.title,
        severity: 'blocking',
        reason: 'missing',
        summary: 'Executive summary is missing its runtime module wrapper.',
      }],
      designFamily: 'executive-light',
    });

    for (const prompt of [systemPrompt, outlinePrompt, modulePrompt, repairPrompt]) {
      expect(prompt).toMatch(/no .*remote assets/i);
      expect(prompt).toMatch(/no .*JavaScript/i);
      expect(prompt).not.toContain('Google Fonts');
      expect(prompt).not.toContain('TEMPLATE EXAMPLES');
      expect(prompt).not.toContain('ADDITIONAL REFERENCE MATERIAL');
      expect(prompt.length).toBeLessThanOrEqual(4500);
    }
    expect(systemPrompt).toContain('DOCUMENT IFRAME CONTRACT');
    expect(systemPrompt).toContain('no <script>');
    expect(modulePrompt).toContain(`data-runtime-part="${part.id}"`);
    expect(modulePrompt).toContain('mobile-safe');
    expect(buildDocumentRuntimeSystemPrompt({
      documentType: 'brief',
      designFamily: 'executive-light',
      blueprintLabel: 'Executive Brief',
      mode: 'queued-create',
      qualityBar: buildArtifactRunPlan({
        runId: 'doc-prompt-quality',
        prompt: 'Create a premium executive brief',
        artifactType: 'document',
        operation: 'create',
        activeDocument: null,
        mode: 'execute',
        providerId: 'openai',
        providerModel: 'gpt-4o',
        allowFullRegeneration: false,
      }).qualityBar,
    })).toContain('QUALITY BAR');
    expect(repairPrompt).toContain('VALIDATOR FEEDBACK');
    expect(repairPrompt).toContain('fix only the failed module issues');
  });

  it('builds compact runtime document single-stream prompts without the old broad composer surface', () => {
    const part = {
      id: 'document-module-1',
      artifactType: 'document' as const,
      kind: 'document-module' as const,
      orderIndex: 1,
      title: 'Decision summary',
      brief: 'Summarize the recommended path and tradeoffs.',
      status: 'pending' as const,
    };
    const systemPrompt = buildDocumentRuntimeSingleStreamSystemPrompt({
      documentType: 'brief',
      designFamily: 'executive-light',
      blueprintLabel: 'Executive Brief',
      mode: 'edit',
      projectRulesBlock: 'Audience: board reviewers.',
    });
    const userPrompt = buildDocumentRuntimeSingleStreamUserPrompt({
      taskBrief: 'Tighten the recommendation and keep the document concise.',
      documentType: 'brief',
      blueprintLabel: 'Executive Brief',
      artDirection: 'polished',
      preferHtml: true,
      requestedTitle: 'Market Expansion Brief',
      existingDocumentSummary: '# Old brief\n\nExisting content.',
      targetSummary: ['Recommendation section'],
      runtimeParts: [part],
      memoryContext: 'The organization prefers evidence-led recommendations.',
      projectLinks: [{ id: 'source-doc', title: 'Research Notes', type: 'document' }],
      allowFullRegeneration: false,
    });

    expect(systemPrompt).toContain('DOCUMENT SINGLE-STREAM ROLE');
    expect(systemPrompt).toContain('DOCUMENT IFRAME CONTRACT');
    expect(systemPrompt).toContain('Audience: board reviewers.');
    expect(userPrompt).toContain('Existing Document');
    expect(userPrompt).toContain('Targeted Edit Scope');
    expect(userPrompt).toContain('DOCUMENT RUNTIME PART QUEUE');
    expect(userPrompt).toContain(`data-runtime-part="..."`);
    expect(userPrompt).toContain('Market Expansion Brief');
    expect(userPrompt).toContain('<a href="#source-doc">Research Notes</a>');
    expect(`${systemPrompt}\n${userPrompt}`).not.toContain('synthetic style example');
    expect(`${systemPrompt}\n${userPrompt}`).not.toContain('TEMPLATE EXAMPLES');
    expect(`${systemPrompt}\n${userPrompt}`).not.toContain('ADDITIONAL REFERENCE MATERIAL');
    expect(`${systemPrompt}\n${userPrompt}`).not.toContain('Google Fonts');
    expect(systemPrompt.length).toBeLessThanOrEqual(3200);
    expect(userPrompt.length).toBeLessThanOrEqual(4500);
  });
});
