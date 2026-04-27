import { describe, expect, it } from 'vitest';

import {
  buildArtifactRunPlan,
  buildPresentationCreateSystemPrompt,
} from '@/services/artifactRuntime';
import { getTemplateBlueprint, resolveTemplatePlan } from '@/services/ai/templates';
import { listDocumentBlueprints } from '@/services/ai/templates/document-blueprints';
import type { PlanResult } from '@/services/ai/workflow/agents/planner';

function makePresentationPromptInputs(prompt = 'Create an executive briefing slide') {
  const runPlan = buildArtifactRunPlan({
    runId: 'mobile-guidance-run',
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

describe('mobile guidance', () => {
  it('includes contained mobile viewport guidance in presentation runtime prompts', () => {
    const { runPlan, planResult } = makePresentationPromptInputs();
    const prompt = buildPresentationCreateSystemPrompt({ runPlan, planResult });

    expect(prompt).toContain('MOBILE-STAGE READABILITY');
    expect(prompt).toContain('fixed 16:9 Reveal stage');
    expect(prompt).toContain('mobile frames');
  });

  it('bakes narrow-screen stacking guidance into every document blueprint', () => {
    for (const blueprint of listDocumentBlueprints()) {
      const joinedRules = [...blueprint.compositionRules, ...blueprint.componentRules].join(' ');
      expect(joinedRules).toMatch(/narrow screens|mobile/i);
      expect(joinedRules).toMatch(/stack|single-column|fluid/i);
    }
  });
});
