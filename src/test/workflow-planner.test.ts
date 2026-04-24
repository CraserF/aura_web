import { describe, expect, it } from 'vitest';

import { buildArtifactWorkflowPlan } from '@/services/workflowPlanner';

describe('buildArtifactWorkflowPlan', () => {
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
});
