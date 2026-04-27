import { describe, expect, it } from 'vitest';

import {
  PRODUCTION_PRESENTATION_TEMPLATE_IDS,
  getTemplateHtml,
} from '@/services/ai/templates';
import { buildPresentationQualityChecklist } from '@/services/artifactRuntime';
import { buildStarterArtifact } from '@/services/bootstrap/projectStarter';
import { listProjectStarterKits } from '@/services/bootstrap/starterKits';
import type { ProjectStarterArtifact } from '@/services/bootstrap/types';

const VALID_STYLE = `<style>
  :root { --bg: #ffffff; --ink: #142033; --accent: #245c5f; }
  @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
  .slide-title { color: var(--ink); font-size: 84px; line-height: .96; }
  .slide-body { color: #314158; font-size: 28px; line-height: 1.28; }
  .slide-label { color: var(--accent); font-size: 18px; text-transform: uppercase; }
</style>`;

function getPresentationStarterArtifact(starterKitId: string): ProjectStarterArtifact {
  const kit = listProjectStarterKits().find((entry) => entry.id === starterKitId);
  const artifact = kit?.artifacts.find((entry) => entry.type === 'presentation');
  if (!artifact) {
    throw new Error(`Missing presentation starter artifact for ${starterKitId}`);
  }
  return artifact;
}

describe('presentation quality checklist', () => {
  it('reports readiness for every production presentation template', async () => {
    for (const templateId of PRODUCTION_PRESENTATION_TEMPLATE_IDS) {
      const html = await getTemplateHtml(templateId);
      const checklist = buildPresentationQualityChecklist({
        html,
        promptText: `Review production template ${templateId}`,
        allowTemplateTokens: true,
      });

      expect(checklist.ready).toBe(true);
      expect(checklist.slideCount).toBeGreaterThanOrEqual(1);
      expect(checklist.viewportContractPassed).toBe(true);
      expect(checklist.viewportBlockingCount).toBe(0);
      expect(checklist.promptTokenEstimate).toBeGreaterThan(0);
    }
  });

  it('reports readiness for deterministic executive and launch starter decks', async () => {
    for (const starterKitId of ['executive-briefing', 'launch-plan']) {
      const artifact = getPresentationStarterArtifact(starterKitId);
      const result = await buildStarterArtifact(artifact, starterKitId);
      const checklist = buildPresentationQualityChecklist({
        html: result.contentHtml,
        promptText: result.runtimePlan?.userIntent ?? result.title,
      });

      expect(result.runtime?.viewportContractPassed).toBe(true);
      expect(result.runtime?.promptTokenEstimate).toBeGreaterThan(0);
      expect(checklist.ready).toBe(true);
      expect(checklist.slideCount).toBe(result.slideCount);
    }
  });

  it('flags generated output that breaks the static viewport contract', () => {
    const riskyHtml = `${VALID_STYLE}
      <section data-background-color="#ffffff">
        <h1 class="slide-title">Viewport Risk</h1>
        <p class="slide-body">This deck uses a style block that breaks the Aura source-space contract.</p>
      </section>
      <style>.bad-layout { width: 100vw; font-size: 12px; }</style>`;
    const checklist = buildPresentationQualityChecklist({
      html: riskyHtml,
      promptText: 'Create a deck with risky viewport CSS',
    });

    expect(checklist.ready).toBe(false);
    expect(checklist.viewportContractPassed).toBe(false);
    expect(checklist.viewportBlockingCount).toBeGreaterThan(0);
    expect(checklist.checks.some((check) => check.id === 'viewport-contract' && !check.passed)).toBe(true);
  });
});
