import { describe, expect, it } from 'vitest';

import {
  getTemplateHtml,
  isProductionPresentationTemplate,
  isLegacyPresentationTemplate,
  LEGACY_PRESENTATION_TEMPLATE_IDS,
  listLegacyPresentationTemplateAudit,
  PRESENTATION_TEMPLATE_AUDIT,
  PRODUCTION_PRESENTATION_TEMPLATE_IDS,
  resolveTemplatePlan,
  selectTemplate,
  TEMPLATE_REGISTRY,
  toProductionPresentationTemplate,
  type TemplateId,
} from '@/services/ai/templates';
import {
  buildArtifactRunPlan,
  buildPresentationQualityChecklist,
  PRESENTATION_VIEWPORT_MATRIX,
  validatePresentationViewportContract,
} from '@/services/artifactRuntime';
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
  it('partitions presentation templates into explicit production and legacy audit groups', () => {
    const allTemplateIds = Object.keys(TEMPLATE_REGISTRY).sort();
    const auditedTemplateIds = [
      ...PRESENTATION_TEMPLATE_AUDIT.production,
      ...PRESENTATION_TEMPLATE_AUDIT.legacy,
    ].slice().sort();

    expect(auditedTemplateIds).toEqual(allTemplateIds);
    expect(PRODUCTION_PRESENTATION_TEMPLATE_IDS.some((id) => isLegacyPresentationTemplate(id))).toBe(false);
    expect(LEGACY_PRESENTATION_TEMPLATE_IDS.some((id) => isProductionPresentationTemplate(id))).toBe(false);
    for (const legacyTemplateId of LEGACY_PRESENTATION_TEMPLATE_IDS) {
      expect(isLegacyPresentationTemplate(legacyTemplateId)).toBe(true);
      expect(isProductionPresentationTemplate(toProductionPresentationTemplate(legacyTemplateId))).toBe(true);
    }
  });

  it('records remaining legacy templates as converted to production routing', () => {
    const audit = listLegacyPresentationTemplateAudit();

    expect(audit.map((entry) => entry.templateId).sort()).toEqual(
      [...LEGACY_PRESENTATION_TEMPLATE_IDS].sort(),
    );
    for (const entry of audit) {
      expect(isLegacyPresentationTemplate(entry.templateId)).toBe(true);
      expect(isProductionPresentationTemplate(entry.productionReplacement)).toBe(true);
      expect(entry.chunkSizeNote.length).toBeGreaterThan(12);
      expect(entry.decision).toBe('converted to production routing');
    }
    expect(audit.some((entry) => entry.decision.includes('archive'))).toBe(false);
  });

  it('removes legacy cleanup candidates from the registry while preserving production routing', () => {
    const removedTemplateIds = [
      'minimal',
      'comparison',
      'pitch-deck',
      'tech-architecture',
      'data-dashboard',
      'sci-fi',
      'creative-portfolio',
      'storytelling',
      'cinematic',
      'workshop',
      'code-walkthrough',
      'timeline',
      'editorial-magazine',
    ];
    const auditIds = listLegacyPresentationTemplateAudit().map((entry) => entry.templateId);

    for (const templateId of removedTemplateIds) {
      expect(templateId in TEMPLATE_REGISTRY).toBe(false);
      expect(auditIds).not.toContain(templateId);
    }
    expect(selectTemplate('Create a minimal clean quick update')).toBe('executive-briefing-light');
    expect(selectTemplate('Create a comparison deck with two options')).toBe('split-world');
    expect(selectTemplate('Create an investor pitch deck for a seed round')).toBe('launch-narrative-light');
    expect(selectTemplate('Create a cloud architecture review deck')).toBe('stage-setting-light');
    expect(selectTemplate('Create a dashboard metrics report')).toBe('finance-grid-light');
    expect(selectTemplate('Create a sci-fi cyber strategy deck')).toBe('split-world');
    expect(selectTemplate('Create a creative portfolio deck')).toBe('launch-narrative-light');
    expect(selectTemplate('Create a narrative case study deck')).toBe('editorial-light');
    expect(selectTemplate('Create a cinematic visual story deck')).toBe('launch-narrative-light');
    expect(selectTemplate('Create a workshop exercise deck')).toBe('stage-setting-light');
    expect(selectTemplate('Create a code walkthrough deck')).toBe('editorial-light');
    expect(selectTemplate('Create a timeline roadmap deck')).toBe('stage-setting-light');
    expect(selectTemplate('Create a magazine editorial deck')).toBe('editorial-light');
  });

  it('falls back to a production starter template for removed stored template ids', async () => {
    const html = await getTemplateHtml('creative-portfolio' as TemplateId);

    expect(html.trim().startsWith('<style>')).toBe(true);
    expect(html).toContain('exec-stage');
  });

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

  it('passes the static viewport contract for production canvases', async () => {
    for (const templateId of PRODUCTION_RECIPE_TEMPLATES) {
      const html = await getTemplateHtml(templateId);
      const validation = validatePresentationViewportContract(html);
      const checklist = buildPresentationQualityChecklist({
        html,
        promptText: `Production template ${templateId}`,
        allowTemplateTokens: true,
      });

      expect(validation.checkedViewports.map((viewport) => viewport.id)).toEqual(
        PRESENTATION_VIEWPORT_MATRIX.map((viewport) => viewport.id),
      );
      expect(validation.blockingCount).toBe(0);
      expect(checklist.ready).toBe(true);
      expect(checklist.viewportContractPassed).toBe(true);
      expect(checklist.promptTokenEstimate).toBeGreaterThan(0);
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
