import { describe, expect, it } from 'vitest';

import {
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
