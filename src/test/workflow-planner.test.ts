import { describe, expect, it } from 'vitest';

import { buildArtifactWorkflowPlan } from '@/services/workflowPlanner';

describe('buildArtifactWorkflowPlan', () => {
  it('selects a polished title-opening recipe and style pack for opening slides', () => {
    const plan = buildArtifactWorkflowPlan({
      prompt: 'Create a polished opening title slide for a strategic transformation briefing.',
      artifactType: 'presentation',
      operation: 'create',
      activeDocument: null,
      mode: 'execute',
      providerId: 'openai',
      providerModel: 'gpt-4o',
      allowFullRegeneration: false,
    });

    expect(plan.requestKind).toBe('create');
    expect(plan.presentationRecipeId).toBe('title-opening');
    expect(plan.templateGuidance.selectedTemplateId).toBe('launch-narrative-light');
    expect(plan.templateGuidance.referenceStylePackId).toBe('presentation-launch-narrative');
  });

  it('selects the premium executive starter family for leadership briefings', () => {
    const plan = buildArtifactWorkflowPlan({
      prompt: 'Create an executive briefing deck for a leadership review with recommendations and priorities.',
      artifactType: 'presentation',
      operation: 'create',
      activeDocument: null,
      mode: 'execute',
      providerId: 'openai',
      providerModel: 'gpt-4o',
      allowFullRegeneration: false,
    });

    expect(plan.presentationRecipeId).toBe('general-polished');
    expect(plan.templateGuidance.selectedTemplateId).toBe('executive-briefing-light');
    expect(plan.templateGuidance.referenceStylePackId).toBe('presentation-executive-starter');
  });

  it('selects a stage-setting recipe for context slides', () => {
    const plan = buildArtifactWorkflowPlan({
      prompt: 'Create a setting-the-stage slide that explains why the current shift matters.',
      artifactType: 'presentation',
      operation: 'create',
      activeDocument: null,
      mode: 'execute',
      providerId: 'openai',
      providerModel: 'gpt-4o',
      allowFullRegeneration: false,
    });

    expect(plan.presentationRecipeId).toBe('stage-setting');
    expect(plan.templateGuidance.selectedTemplateId).toBe('stage-setting-light');
    expect(plan.templateGuidance.referenceStylePackId).toBe('presentation-stage-setting');
  });

  it('selects a finance-grid recipe for infographic finance prompts', () => {
    const plan = buildArtifactWorkflowPlan({
      prompt: 'Create a finance-grid explainer slide with layered support mechanics and a refined light visual system.',
      artifactType: 'presentation',
      operation: 'create',
      activeDocument: null,
      mode: 'execute',
      providerId: 'openai',
      providerModel: 'gpt-4o',
      allowFullRegeneration: false,
    });

    expect(plan.presentationRecipeId).toBe('finance-grid');
    expect(plan.templateGuidance.selectedTemplateId).toBe('finance-grid-light');
    expect(plan.templateGuidance.exemplarPackId).toBe('finance-grid-light');
    expect(plan.templateGuidance.referenceStylePackId).toBe('presentation-finance-grid-light');
  });

  it('classifies queued multi-slide presentation creation and generates ordered work items', () => {
    const plan = buildArtifactWorkflowPlan({
      prompt: 'Create 3 slides: opening thesis, market gap, next steps',
      artifactType: 'presentation',
      operation: 'create',
      activeDocument: null,
      mode: 'execute',
      providerId: 'openai',
      providerModel: 'gpt-4o',
      allowFullRegeneration: false,
    });

    expect(plan.requestKind).toBe('batch');
    expect(plan.queueMode).toBe('sequential');
    expect(plan.queuedWorkItems).toHaveLength(3);
    expect(plan.queuedWorkItems[0]?.targetLabel).toContain('Opening thesis');
    expect(plan.queuedWorkItems[0]?.recipeId).toBe('general-polished');
    expect(plan.templateGuidance.providerTier).toBe('frontier');
  });

  it('classifies multi-slide additions on an existing deck as queued work', () => {
    const plan = buildArtifactWorkflowPlan({
      prompt: 'Add 2 slides: customer proof, implementation timeline',
      artifactType: 'presentation',
      operation: 'edit',
      activeDocument: {
        id: 'deck-1',
        title: 'Deck',
        type: 'presentation',
        contentHtml: '<section>Existing</section>',
        themeCss: '',
        slideCount: 1,
        chartSpecs: {},
        lifecycleState: 'draft',
        order: 0,
        createdAt: 1,
        updatedAt: 1,
      },
      mode: 'execute',
      providerId: 'openai',
      providerModel: 'gpt-4o',
      allowFullRegeneration: false,
    });

    expect(plan.requestKind).toBe('queue');
    expect(plan.queuedWorkItems).toHaveLength(2);
    expect(plan.preservationIntent).toBe('content');
  });

  it('tightens guidance for local-model presentation runs', () => {
    const plan = buildArtifactWorkflowPlan({
      prompt: 'Restyle this deck into a cleaner executive theme with shorter headings',
      artifactType: 'presentation',
      operation: 'edit',
      activeDocument: null,
      mode: 'execute',
      providerId: 'ollama',
      providerModel: 'gemma4:e2b',
      editStrategyHint: 'style-token',
      allowFullRegeneration: false,
    });

    expect(plan.requestKind).toBe('restyle');
    expect(plan.templateGuidance.providerTier).toBe('local-best-effort');
    expect(plan.templateGuidance.designConstraints.some((constraint) => constraint.includes('1-3 major layout zones'))).toBe(true);
  });

  it('marks explain and dry-run flows as explain-style workflow plans', () => {
    const plan = buildArtifactWorkflowPlan({
      prompt: 'Explain what would change if you rewrote this document as an executive brief',
      artifactType: 'document',
      operation: 'edit',
      activeDocument: null,
      mode: 'explain',
      providerId: 'openai',
      providerModel: 'gpt-4o',
      allowFullRegeneration: true,
    });

    expect(plan.requestKind).toBe('explain');
    expect(plan.queueMode).toBe('none');
  });

  it('selects a proposal-light family for strategy proposal documents', () => {
    const plan = buildArtifactWorkflowPlan({
      prompt: 'Create a strategy proposal board with a cleaner professional light theme.',
      artifactType: 'document',
      operation: 'create',
      activeDocument: null,
      mode: 'execute',
      providerId: 'openai',
      providerModel: 'gpt-4o',
      allowFullRegeneration: false,
    });

    expect(plan.documentThemeFamily).toBe('proposal-light');
    expect(plan.templateGuidance.documentThemeFamily).toBe('proposal-light');
    expect(plan.templateGuidance.referenceStylePackId).toBe('document-professional-light');
    expect(plan.templateGuidance.designConstraints.some((constraint) => constraint.includes('proposal board'))).toBe(true);
  });

  it('selects a research-light family for research summary documents', () => {
    const plan = buildArtifactWorkflowPlan({
      prompt: 'Create a research summary with a refined light editorial system and tidy findings modules.',
      artifactType: 'document',
      operation: 'create',
      activeDocument: null,
      mode: 'execute',
      providerId: 'openai',
      providerModel: 'gpt-4o',
      allowFullRegeneration: false,
    });

    expect(plan.documentThemeFamily).toBe('research-light');
    expect(plan.templateGuidance.referenceStylePackId).toBe('document-professional-light');
  });
});
