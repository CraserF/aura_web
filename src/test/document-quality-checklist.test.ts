import { describe, expect, it } from 'vitest';

import {
  buildArtifactRunPlan,
  buildDocumentQualityChecklist,
  buildDocumentQualityTelemetry,
  finalizeDocumentRuntimeHtml,
} from '@/services/artifactRuntime';

describe('document quality checklist', () => {
  it('passes finalized runtime documents that are iframe, mobile, and print safe', () => {
    const finalized = finalizeDocumentRuntimeHtml({
      title: 'Quality Document',
      html: `<main class="doc-shell">
        <section class="doc-section"><h2>Summary</h2><p>Readable body copy with enough substance.</p></section>
      </main>`,
    });
    const checklist = buildDocumentQualityChecklist({
      html: finalized.html,
      promptText: 'Create a polished executive document.',
    });

    expect(checklist.ready).toBe(true);
    expect(checklist.blockingCount).toBe(0);
    expect(checklist.advisoryCount).toBe(0);
    expect(checklist.promptTokenEstimate).toBeGreaterThan(0);
    expect(checklist.checks.map((check) => check.id)).toEqual([
      'iframe-contract',
      'typography',
      'mobile-safety',
      'print-safety',
      'prompt-estimate',
    ]);

    expect(buildDocumentQualityTelemetry({ html: finalized.html })).toEqual(expect.objectContaining({
      qualityPassed: true,
      qualityBlockingCount: 0,
      qualityAdvisoryCount: 0,
    }));
  });

  it('adds excellence scoring when a runtime quality bar is present', () => {
    const plan = buildArtifactRunPlan({
      runId: 'doc-quality-bar',
      prompt: 'Create a premium executive briefing document',
      artifactType: 'document',
      operation: 'create',
      activeDocument: null,
      mode: 'execute',
      providerId: 'openai',
      providerModel: 'gpt-4o',
      allowFullRegeneration: false,
    });
    const longCopy = Array.from({ length: 930 }, (_, index) => `evidence${index}`).join(' ');
    const checklist = buildDocumentQualityChecklist({
      qualityBar: plan.qualityBar,
      html: `<style>
        body { font-size: 16px; }
        .doc-section p, .doc-section li { font-size: 16px; }
        img, table { max-width: 100%; }
        @media print { .doc-section { break-inside: avoid; } }
      </style>
      <main class="doc-shell">
        <header class="doc-header"><h1>Executive Brief</h1><p class="doc-lead">${longCopy}</p></header>
        <section class="doc-section doc-kpi-row"><h2>Signal</h2><article class="doc-kpi"><strong>92%</strong><span>Confidence</span></article></section>
        <section class="doc-section doc-proof-strip"><h2>Evidence</h2><article class="doc-proof-item"><span>Proof point</span></article></section>
        <section class="doc-section doc-comparison"><h2>Comparison</h2><article class="doc-compare-card"><span>Before</span></article></section>
        <section class="doc-section doc-timeline"><h2>Next Steps</h2><article class="doc-timeline-item"><strong>Now</strong></article></section>
      </main>`,
    });

    expect(checklist.ready).toBe(true);
    expect(checklist.qualityScore).toBeGreaterThanOrEqual(plan.qualityBar.acceptanceThresholds.minimumScore);
    expect(checklist.qualitySignals?.map((signal) => signal.id)).toContain('content-depth');
    expect(checklist.checks.map((check) => check.id)).toContain('excellence-score');
  });

  it('blocks unsafe scripted, wrapped, remote, and fixed-width document output', () => {
    const checklist = buildDocumentQualityChecklist({
      html: `<html><body>
        <script>bad()</script>
        <img src="https://example.com/image.png">
        <section style="width: 1024px"><p style="font-size: 12px">Tiny text.</p></section>
      </body></html>`,
    });

    expect(checklist.ready).toBe(false);
    expect(checklist.blockingCount).toBeGreaterThanOrEqual(4);
    expect(checklist.checks.find((check) => check.id === 'iframe-contract')).toEqual(expect.objectContaining({
      passed: false,
      blockingCount: expect.any(Number),
    }));
    expect(checklist.checks.find((check) => check.id === 'typography')).toEqual(expect.objectContaining({
      passed: false,
      blockingCount: expect.any(Number),
    }));
  });

  it('flags mobile and print advisories without introducing a browser dependency', () => {
    const checklist = buildDocumentQualityChecklist({
      html: `<style>
        body { font-size: 16px; }
        .doc-section p, .doc-section li { font-size: 16px; }
        .cards { display: grid; grid-template-columns: repeat(4, 1fr); }
      </style>
      <main class="doc-shell">
        <section class="doc-section cards"><h2>Dense grid</h2><p>Readable text.</p></section>
      </main>`,
    });

    expect(checklist.ready).toBe(false);
    expect(checklist.checks.find((check) => check.id === 'mobile-safety')).toEqual(expect.objectContaining({
      blockingCount: 1,
    }));
    expect(checklist.checks.find((check) => check.id === 'print-safety')).toEqual(expect.objectContaining({
      advisoryCount: 1,
    }));
  });
});
