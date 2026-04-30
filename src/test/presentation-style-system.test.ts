import { describe, expect, it } from 'vitest';

import { validateSlides } from '@/services/ai/workflow/agents/qa-validator';
import {
  applyProjectColorsToPresentationHtml,
  parseColorThemeFromRulesBlock,
  parseVisualVariantIdFromRulesBlock,
  resolvePresentationStyleSystem,
} from '@/services/artifactRuntime';
import { validatePresentationAgainstProfile } from '@/services/validation/presentationValidation';
import { deriveLifecycleFromValidation } from '@/services/lifecycle/state';
import type { ProjectDocument } from '@/types/project';
import type { ArtifactRunPlan } from '@/services/artifactRuntime/types';

const BROKEN_LAUNCH_DECK = `<style>
</style>
<section class="launch-slide" data-background-color="#f7f4ee">
  <div class="launch-field"><svg viewBox="0 0 100 100"><path class="launch-wave" d="M0 50 C30 0 70 100 100 50"/></svg></div>
  <div class="launch-content"><h1 class="launch-title">EY Consulting Launch Plan</h1></div>
</section>
<section class="launch-slide" data-background-color="#f7f4ee">
  <div class="launch-grid"><h2>Consulting Focus</h2><p>Transformation, assurance, and advisory priorities.</p></div>
</section>`;

function makePresentation(contentHtml: string): ProjectDocument {
  return {
    id: 'launch-deck',
    title: 'Launch Plan',
    type: 'presentation',
    contentHtml,
    themeCss: '',
    slideCount: 2,
    chartSpecs: {},
    order: 0,
    createdAt: 1,
    updatedAt: 1,
  };
}

describe('presentation deterministic style recovery', () => {
  it('blocks empty style systems so broken launch decks cannot be approved', () => {
    const qa = validateSlides(BROKEN_LAUNCH_DECK, {
      expectedSlideCount: 2,
      isCreate: true,
    });
    const validation = validatePresentationAgainstProfile({
      document: makePresentation(BROKEN_LAUNCH_DECK),
    });
    const lifecycle = deriveLifecycleFromValidation(validation);

    expect(qa.passed).toBe(false);
    expect(qa.violations.map((violation) => violation.rule)).toContain('style-block');
    expect(validation.passed).toBe(false);
    expect(validation.blockingIssues.map((issue) => issue.code)).toContain('style-block');
    expect(lifecycle.lifecycleState).not.toBe('approved');
  });

  it('resolves the launch style shell from project rules and selected colours', async () => {
    const rules = '## Visual Direction: Launch\nColor palette - background: #d6d6d6; primary: #0056d6; accent: #669c35.';
    const styleSystem = await resolvePresentationStyleSystem({
      projectRulesBlock: rules,
    });

    expect(parseVisualVariantIdFromRulesBlock(rules)).toBe('launch');
    expect(parseColorThemeFromRulesBlock(rules)).toEqual({
      background: '#d6d6d6',
      primary: '#0056d6',
      accent: '#669c35',
    });
    expect(styleSystem.templateId).toBe('launch-narrative-light');
    expect(styleSystem.styleBlock).toContain('launch-slide');
    expect(styleSystem.styleBlock).toContain('--launch-primary: #0056d6;');
    expect(styleSystem.styleBlock).toContain('--launch-accent: #669c35;');
  });

  it('lets explicit project visual direction override a mismatched run-plan template', async () => {
    const styleSystem = await resolvePresentationStyleSystem({
      projectRulesBlock: '## Visual Direction: Launch\nColor palette - background: #0f0f1a; primary: #ffffff; accent: #f59e0b.',
      runPlan: {
        designManifest: {
          templateId: 'executive-briefing-light',
        },
        templateGuidance: {
          selectedTemplateId: 'executive-briefing-light',
        },
      } as ArtifactRunPlan,
    });

    expect(styleSystem.templateId).toBe('launch-narrative-light');
    expect(styleSystem.styleBlock).toContain('launch-slide');
    expect(styleSystem.styleBlock).not.toContain('aura-exec');
  });

  it('rehydrates an empty-style active deck while preserving slide content', async () => {
    const recovered = await applyProjectColorsToPresentationHtml({
      html: BROKEN_LAUNCH_DECK,
      colorTheme: {
        background: '#d6d6d6',
        primary: '#0056d6',
        accent: '#669c35',
      },
      visualVariantId: 'launch',
    });
    const validation = validatePresentationAgainstProfile({
      document: makePresentation(recovered.html),
    });

    expect(recovered.changed).toBe(true);
    expect(recovered.html.match(/<style\b/gi)).toHaveLength(1);
    expect(recovered.html).toContain('EY Consulting Launch Plan');
    expect(recovered.html).toContain('data-background-color="#d6d6d6"');
    expect(validation.blockingIssues.map((issue) => issue.code)).not.toContain('style-block');
  });
});
