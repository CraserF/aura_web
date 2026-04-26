import { describe, expect, it } from 'vitest';

import {
  getTemplateHtml,
  isProductionPresentationTemplate,
  PRODUCTION_PRESENTATION_TEMPLATE_IDS,
  resolveTemplatePlan,
  type TemplateId,
} from '@/services/ai/templates';
import { buildArtifactRunPlan } from '@/services/artifactRuntime';
import { validatePresentationRuntimeOutput } from '@/services/artifactRuntime/presentationRuntime';
import { plan, type PlanResult } from '@/services/ai/workflow/agents/planner';
import type { PresentationRecipeId } from '@/services/artifactRuntime/types';

const STARTER_GRADE_TEMPLATES: TemplateId[] = [
  'executive-briefing-light',
  'launch-narrative-light',
];

const PRODUCTION_RECIPE_TEMPLATES: TemplateId[] = [
  ...PRODUCTION_PRESENTATION_TEMPLATE_IDS,
];

const PRODUCTION_ROUTE_CASES: Array<{
  prompt: string;
  recipeHint: PresentationRecipeId;
  expectedTemplate: TemplateId;
}> = [
  {
    prompt: 'Create an executive briefing deck for a leadership review',
    recipeHint: 'general-polished',
    expectedTemplate: 'executive-briefing-light',
  },
  {
    prompt: 'Create a launch plan deck for a market rollout',
    recipeHint: 'title-opening',
    expectedTemplate: 'launch-narrative-light',
  },
  {
    prompt: 'Create a setting the stage slide about why this market matters',
    recipeHint: 'stage-setting',
    expectedTemplate: 'stage-setting-light',
  },
  {
    prompt: 'Create a blended finance grid and capital stack explainer',
    recipeHint: 'finance-grid',
    expectedTemplate: 'finance-grid-light',
  },
  {
    prompt: 'Create an editorial explainer deck for a market insight',
    recipeHint: 'editorial-explainer',
    expectedTemplate: 'editorial-light',
  },
  {
    prompt: 'Create a quiz reveal slide for a workshop knowledge check',
    recipeHint: 'quiz-reveal',
    expectedTemplate: 'interactive-quiz',
  },
  {
    prompt: 'Create a comparison deck for two strategic options',
    recipeHint: 'comparison',
    expectedTemplate: 'split-world',
  },
];

describe('production presentation templates', () => {
  it('routes generated presentation plans through production template families', async () => {
    for (const routeCase of PRODUCTION_ROUTE_CASES) {
      const templatePlan = resolveTemplatePlan(routeCase.prompt, { recipeHint: routeCase.recipeHint });
      const workflowPlan = buildArtifactRunPlan({
        runId: `route-${routeCase.recipeHint}`,
        prompt: routeCase.prompt,
        artifactType: 'presentation',
        operation: 'create',
        activeDocument: null,
        mode: 'execute',
        providerId: 'openai',
        providerModel: 'gpt-4o',
        allowFullRegeneration: false,
      });
      const plannerResult = await plan(routeCase.prompt, false);

      expect(templatePlan.templateId).toBe(routeCase.expectedTemplate);
      expect(workflowPlan.templateGuidance.selectedTemplateId).toBe(routeCase.expectedTemplate);
      expect(plannerResult.selectedTemplate).toBe(routeCase.expectedTemplate);
      expect(isProductionPresentationTemplate(templatePlan.templateId)).toBe(true);
      expect(isProductionPresentationTemplate(workflowPlan.templateGuidance.selectedTemplateId!)).toBe(true);
      expect(isProductionPresentationTemplate(plannerResult.selectedTemplate)).toBe(true);
    }
  });

  it('ship in production slide format without unsupported wrappers or inline styles', async () => {
    for (const templateId of PRODUCTION_RECIPE_TEMPLATES) {
      const html = await getTemplateHtml(templateId);
      const sectionCount = html.match(/<section\b/gi)?.length ?? 0;
      const dataBackgroundCount = html.match(/data-background-color=["']#[0-9a-f]{6}["']/gi)?.length ?? 0;

      expect(html.trim().startsWith('<style>')).toBe(true);
      expect(sectionCount).toBeGreaterThanOrEqual(1);
      expect(sectionCount).toBeLessThanOrEqual(5);
      expect(dataBackgroundCount).toBe(sectionCount);
      expect(html).toMatch(/@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/i);
      expect(html).not.toMatch(/<(?:html|body|script)\b/i);
      expect(html).not.toMatch(/class=["'][^"']*\b(?:reveal|slides)\b/i);
      expect(html).not.toMatch(/\sstyle=/i);
      expect(html).not.toMatch(/https?:\/\/|mailto:|presented by|[$€£]\s?\d/i);
    }
  });

  it('passes the runtime fragment contract without blocking validation issues', async () => {
    for (const templateId of PRODUCTION_RECIPE_TEMPLATES) {
      const html = await getTemplateHtml(templateId);
      const sectionCount = html.match(/<section\b/gi)?.length ?? 0;
      const validation = validatePresentationRuntimeOutput(
        html,
        {
          intent: 'create',
          blueprint: {
            palette: {},
          },
        } as PlanResult,
        sectionCount,
      );

      expect(validation.blockingCount).toBe(0);
      expect(validation.validationByPart.filter((part) => part.partId.startsWith('slide-'))).toHaveLength(sectionCount);
    }
  });

  it('keeps essential source typography above the minimum readable floor', async () => {
    for (const templateId of PRODUCTION_RECIPE_TEMPLATES) {
      const html = await getTemplateHtml(templateId);
      const smallCssFontSizes = Array.from(html.matchAll(/font-size\s*:\s*(\d+(?:\.\d+)?)px/gi))
        .map(([, size]) => Number.parseFloat(size ?? '0'))
        .filter((size) => size > 0 && size < 16);

      expect(smallCssFontSizes).toEqual([]);
    }
  });

  it('keeps starter templates as multi-slide starter decks', async () => {
    for (const templateId of STARTER_GRADE_TEMPLATES) {
      const html = await getTemplateHtml(templateId);
      const sectionCount = html.match(/<section\b/gi)?.length ?? 0;

      expect(sectionCount).toBeGreaterThanOrEqual(3);
      expect(sectionCount).toBeLessThanOrEqual(5);
    }
  });
});
