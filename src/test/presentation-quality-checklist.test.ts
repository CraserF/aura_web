import { describe, expect, it } from 'vitest';

import {
  PRODUCTION_PRESENTATION_TEMPLATE_IDS,
  getTemplateHtml,
} from '@/services/ai/templates';
import { buildArtifactRunPlan, buildPresentationQualityChecklist } from '@/services/artifactRuntime';
import { collectPresentationNamedFailures } from '@/services/artifactRuntime/presentationQualityChecklist';
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

  it('scores boring repeated-grid decks below the premium excellence bar', () => {
    const plan = buildArtifactRunPlan({
      runId: 'deck-quality-bar',
      prompt: 'Create 3 slides: opening, market proof, next steps',
      artifactType: 'presentation',
      operation: 'create',
      activeDocument: null,
      mode: 'execute',
      providerId: 'openai',
      providerModel: 'gpt-4o',
      allowFullRegeneration: false,
    });
    const repeatedGridDeck = `${VALID_STYLE}
      <section data-background-color="#ffffff">
        <h1 class="slide-title">Market Plan</h1>
        <div class="card-grid"><article class="card">A</article><article class="card">B</article><article class="card">C</article><article class="card">D</article></div>
      </section>
      <section data-background-color="#ffffff">
        <h2 class="slide-title">Proof</h2>
        <div class="card-grid"><article class="card">A</article><article class="card">B</article><article class="card">C</article><article class="card">D</article></div>
      </section>
      <section data-background-color="#ffffff">
        <h2 class="slide-title">Next Steps</h2>
        <div class="card-grid"><article class="card">A</article><article class="card">B</article><article class="card">C</article><article class="card">D</article></div>
      </section>`;
    const checklist = buildPresentationQualityChecklist({
      html: repeatedGridDeck,
      promptText: plan.userIntent,
      qualityBar: plan.qualityBar,
    });

    expect(checklist.ready).toBe(false);
    expect(checklist.qualityScore).toBeLessThan(plan.qualityBar.acceptanceThresholds.minimumScore);
    expect(checklist.qualitySignals?.find((signal) => signal.id === 'visual-richness')?.passed).toBe(false);
    expect(checklist.qualitySignals?.find((signal) => signal.id === 'reference-style-match')?.detail)
      .toContain('Launch Narrative rhythm and density traits');
    expect(checklist.checks.map((check) => check.id)).toContain('excellence-visual');
    expect(checklist.checks.find((check) => check.id === 'excellence-pattern-advisories')).toEqual(expect.objectContaining({
      passed: false,
      advisoryCount: expect.any(Number),
      details: expect.arrayContaining([
        expect.stringContaining('Repeated card grid risk'),
        expect.stringContaining('No integrated visuals detected'),
      ]),
    }));
  });

  it('detects missing-reduced-motion as a named CSS failure', () => {
    const animated = `<style>
      :root { --bg: #fff; }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      .slide-shell { animation: fadeIn 0.6s ease; }
    </style>
    <section data-background-color="#ffffff"><h1>Test</h1></section>`;
    const checklist = buildPresentationQualityChecklist({ html: animated });
    const cssCheck = checklist.checks.find((c) => c.id === 'css-design-contract');

    expect(cssCheck).toBeDefined();
    expect(cssCheck?.passed).toBe(false);
    expect(cssCheck?.namedIssues?.some((i) => i.id === 'missing-reduced-motion')).toBe(true);
    const feedback = collectPresentationNamedFailures(checklist.checks);
    expect(feedback.filter((f) => f.includes('missing-reduced-motion'))).toHaveLength(1);
    expect(feedback.some((f) => f.startsWith('[css-design-contract]'))).toBe(false);
  });

  it('detects viewport-unit-layout as a named CSS failure', () => {
    const vpCss = `<style>
      :root { --bg: #fff; }
      @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
      .hero { width: 100vw; font-size: 5vw; }
    </style>
    <section data-background-color="#ffffff"><h1>Test</h1></section>`;
    const checklist = buildPresentationQualityChecklist({ html: vpCss });
    const cssCheck = checklist.checks.find((c) => c.id === 'css-design-contract');

    expect(cssCheck?.namedIssues?.some((i) => i.id === 'viewport-unit-layout')).toBe(true);
    expect(collectPresentationNamedFailures(checklist.checks).some((f) => f.includes('viewport-unit-layout'))).toBe(true);
  });

  it('detects duplicate-root-style-system as a named CSS failure', () => {
    const dupRoot = `<style>:root { --primary: #245c5f; --heading-font: 'Inter'; } .s { color: var(--primary); }</style>
    <section data-background-color="#ffffff"><h1>Slide 1</h1></section>
    <style>:root { --primary: #245c5f; --heading-font: 'Inter'; } .s2 { color: var(--primary); }</style>
    <section data-background-color="#ffffff" style="--primary:#245c5f; --heading-font:'Inter'"><h2>Slide 2</h2></section>`;
    const checklist = buildPresentationQualityChecklist({ html: dupRoot });
    const cssCheck = checklist.checks.find((c) => c.id === 'css-design-contract');

    expect(cssCheck?.namedIssues?.some((i) => i.id === 'duplicate-root-style-system')).toBe(true);
    expect(cssCheck?.namedIssues?.some((i) => i.id === 'append-slide-style-reset')).toBe(true);
    expect(cssCheck?.namedIssues?.some((i) => i.id === 'unscoped-extension-style')).toBe(true);
    expect(collectPresentationNamedFailures(checklist.checks).some((f) => f.includes('duplicate-root-style-system'))).toBe(true);
  });

  it('detects missing style, inline styles, and external assets as named CSS failures', () => {
    const unsafe = `<section data-background-color="#ffffff" style="color:#111">
      <img src="https://example.com/chart.png" alt="remote chart">
      <h1>Unstyled slide</h1>
    </section>`;
    const checklist = buildPresentationQualityChecklist({ html: unsafe });
    const issueIds = checklist.checks
      .find((c) => c.id === 'css-design-contract')
      ?.namedIssues
      ?.map((issue) => issue.id);

    expect(issueIds).toEqual(expect.arrayContaining([
      'missing-style-system',
      'inline-style-leak',
      'external-css-or-asset',
    ]));
  });

  it('detects clamp-based tiny type and excessive animation as named CSS failures', () => {
    const manyAnimations = Array.from({ length: 11 }, (_, index) =>
      `@keyframes drift${index} { from { opacity: .8; } to { opacity: 1; } }`,
    ).join('\n');
    const risky = `<style>
      :root { --bg: #fff; }
      ${manyAnimations}
      @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
      .label { font-size: clamp(12px, 1rem, 18px); animation: drift0 1s ease both; }
    </style>
    <section data-background-color="#ffffff"><h1 class="label">Tiny motion label</h1></section>`;
    const checklist = buildPresentationQualityChecklist({ html: risky });
    const issueIds = checklist.checks
      .find((c) => c.id === 'css-design-contract')
      ?.namedIssues
      ?.map((issue) => issue.id);

    expect(issueIds).toEqual(expect.arrayContaining([
      'tiny-source-type',
      'animation-budget-risk',
    ]));
  });

  it('detects weak class continuity as a named CSS failure', () => {
    const weakContinuity = `<style>.alpha { color: #111; } .beta { color: #222; }</style>
    <section data-background-color="#ffffff"><h1 class="alpha">Slide 1</h1></section>
    <section data-background-color="#ffffff"><h2 class="beta">Slide 2</h2></section>`;
    const checklist = buildPresentationQualityChecklist({ html: weakContinuity });
    const cssCheck = checklist.checks.find((c) => c.id === 'css-design-contract');

    expect(cssCheck?.namedIssues?.some((i) => i.id === 'weak-class-continuity')).toBe(true);
  });

  it('does not raise CSS contract failures for a clean well-formed slide', () => {
    const clean = `${VALID_STYLE}
    <section data-background-color="#ffffff"><h1 class="slide-title">Clean Slide</h1></section>`;
    const checklist = buildPresentationQualityChecklist({ html: clean });
    const cssCheck = checklist.checks.find((c) => c.id === 'css-design-contract');

    expect(cssCheck?.passed).toBe(true);
    expect(cssCheck?.namedIssues).toBeUndefined();
  });
});
