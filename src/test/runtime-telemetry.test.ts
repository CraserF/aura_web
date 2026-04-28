import { describe, expect, it } from 'vitest';
import {
  buildDocumentRuntimeTelemetry,
  estimateRuntimePromptTokens,
  formatRuntimeQualityDiagnostics,
  summarizeRuntimeDiagnostics,
} from '@/services/artifactRuntime';
import type { DocumentRuntimeValidationResult } from '@/services/artifactRuntime';

const passingValidation: DocumentRuntimeValidationResult = {
  passed: true,
  score: 100,
  blockingCount: 0,
  advisoryCount: 0,
  summary: 'Passed.',
};

const repairedValidation: DocumentRuntimeValidationResult = {
  passed: true,
  score: 92,
  blockingCount: 0,
  advisoryCount: 1,
  summary: 'Passed after repair.',
};

describe('runtime telemetry diagnostics', () => {
  it('records first-preview and total runtime from deterministic timestamps', () => {
    expect(buildDocumentRuntimeTelemetry({
      runtimeStartMs: 100,
      firstPreviewAtMs: 148,
      nowMs: 640,
      validation: passingValidation,
      repairCount: 0,
      runMode: 'single-stream',
    })).toEqual({
      timeToFirstPreviewMs: 48,
      totalRuntimeMs: 540,
      validationPassed: true,
      validationBlockingCount: 0,
      validationAdvisoryCount: 0,
      repairCount: 0,
      runMode: 'single-stream',
    });
  });

  it('records queued create and edit part counts without timing sensitivity', () => {
    expect(buildDocumentRuntimeTelemetry({
      runtimeStartMs: 10,
      firstPreviewAtMs: 30,
      nowMs: 90,
      validation: passingValidation,
      repairCount: 0,
      runMode: 'queued-create',
      queuedPartCount: 4,
      completedPartCount: 4,
      repairedPartCount: 0,
    })).toEqual(expect.objectContaining({
      runMode: 'queued-create',
      queuedPartCount: 4,
      completedPartCount: 4,
      repairedPartCount: 0,
      timeToFirstPreviewMs: 20,
      totalRuntimeMs: 80,
    }));

    expect(buildDocumentRuntimeTelemetry({
      runtimeStartMs: 10,
      nowMs: 55,
      validation: passingValidation,
      repairCount: 0,
      runMode: 'queued-edit',
      queuedPartCount: 1,
      completedPartCount: 1,
    })).toEqual(expect.objectContaining({
      runMode: 'queued-edit',
      queuedPartCount: 1,
      completedPartCount: 1,
      totalRuntimeMs: 45,
    }));
  });

  it('records generic document quality diagnostics when runtime HTML is available', () => {
    const telemetry = buildDocumentRuntimeTelemetry({
      runtimeStartMs: 0,
      nowMs: 120,
      validation: passingValidation,
      repairCount: 0,
      runMode: 'queued-create',
      queuedPartCount: 2,
      completedPartCount: 2,
      html: `<style>
        body { font-size: 16px; }
        .doc-section p, .doc-section li { font-size: 16px; }
        img, table { max-width: 100%; }
        @media print { .doc-section { break-inside: avoid; } }
      </style>
      <main class="doc-shell"><section class="doc-section"><h2>Summary</h2><p>Readable document copy.</p></section></main>`,
      promptText: 'Create a concise executive document.',
    });

    expect(telemetry).toEqual(expect.objectContaining({
      qualityPassed: true,
      qualityBlockingCount: 0,
      qualityAdvisoryCount: 0,
      promptTokenEstimate: estimateRuntimePromptTokens('Create a concise executive document.'),
    }));
    expect(telemetry.qualityChecks?.map((check) => check.id)).toEqual([
      'iframe-contract',
      'typography',
      'mobile-safety',
      'print-safety',
      'prompt-estimate',
    ]);
  });

  it('distinguishes total repair attempts from part-level repairs', () => {
    expect(buildDocumentRuntimeTelemetry({
      runtimeStartMs: 200,
      nowMs: 380,
      validation: repairedValidation,
      repairCount: 2,
      runMode: 'queued-create',
      queuedPartCount: 3,
      completedPartCount: 3,
      repairedPartCount: 1,
    })).toEqual({
      totalRuntimeMs: 180,
      validationPassed: true,
      validationBlockingCount: 0,
      validationAdvisoryCount: 1,
      repairCount: 2,
      runMode: 'queued-create',
      queuedPartCount: 3,
      completedPartCount: 3,
      repairedPartCount: 1,
    });
  });

  it('summarizes benchmark diagnostics by artifact type', () => {
    const summary = summarizeRuntimeDiagnostics([
      {
        artifactType: 'document',
        promptText: 'Create an executive document from the supplied source material.',
        telemetry: buildDocumentRuntimeTelemetry({
          runtimeStartMs: 0,
          firstPreviewAtMs: 24,
          nowMs: 120,
          validation: passingValidation,
          repairCount: 0,
          runMode: 'queued-create',
          queuedPartCount: 3,
          completedPartCount: 3,
        }),
      },
      {
        artifactType: 'document',
        promptChars: 400,
        telemetry: buildDocumentRuntimeTelemetry({
          runtimeStartMs: 0,
          nowMs: 200,
          validation: {
            passed: false,
            score: 72,
            blockingCount: 1,
            advisoryCount: 1,
            summary: 'Needs repair.',
          },
          repairCount: 2,
          runMode: 'single-stream',
          repairedPartCount: 1,
        }),
      },
      {
        artifactType: 'presentation',
        promptChars: 800,
        telemetry: {
          timeToFirstPreviewMs: 40,
          totalRuntimeMs: 160,
          validationPassed: true,
          validationBlockingCount: 0,
          validationAdvisoryCount: 0,
          repairCount: 1,
          runMode: 'queued-create',
          queuedPartCount: 4,
          completedPartCount: 4,
        },
      },
    ]);

    expect(summary.artifactTypes).toEqual(['document', 'presentation']);
    expect(summary.sampleCount).toBe(3);
    expect(summary.firstPreviewCount).toBe(2);
    expect(summary.validationPassRate).toBe(0.67);
    expect(summary.totalRepairCount).toBe(3);
    expect(summary.totalQueuedPartCount).toBe(7);
    expect(summary.totalRepairedPartCount).toBe(1);
    expect(summary.estimatedPromptTokens).toBe(
      estimateRuntimePromptTokens('Create an executive document from the supplied source material.') + 100 + 200,
    );
    expect(summary.byArtifactType.document).toEqual(expect.objectContaining({
      sampleCount: 2,
      validationPassRate: 0.5,
      totalRepairCount: 2,
      totalQueuedPartCount: 3,
      totalRepairedPartCount: 1,
    }));
    expect(summary.byArtifactType.presentation).toEqual(expect.objectContaining({
      sampleCount: 1,
      validationPassRate: 1,
      averageFirstPreviewMs: 40,
      totalRepairCount: 1,
      totalQueuedPartCount: 4,
    }));
  });

  it('summarizes generic quality and spreadsheet runtime diagnostics', () => {
    const summary = summarizeRuntimeDiagnostics([
      {
        artifactType: 'spreadsheet',
        telemetry: {
          timeToFirstPreviewMs: 0,
          totalRuntimeMs: 24,
          validationPassed: true,
          validationBlockingCount: 0,
          validationAdvisoryCount: 0,
          repairCount: 0,
          runMode: 'deterministic-action',
          queuedPartCount: 3,
          completedPartCount: 3,
          qualityPassed: true,
          qualityScore: 88,
          qualityGrade: 'strong',
          qualityBlockingCount: 0,
          qualityAdvisoryCount: 0,
          spreadsheetActionKind: 'create-formula-column',
          changedSheetCount: 1,
          refreshedSheetCount: 2,
        },
      },
      {
        artifactType: 'document',
        telemetry: {
          totalRuntimeMs: 50,
          validationPassed: false,
          validationBlockingCount: 1,
          validationAdvisoryCount: 0,
          repairCount: 1,
          qualityPassed: false,
          qualityScore: 62,
          qualityGrade: 'needs-polish',
          qualityBlockingCount: 1,
          qualityAdvisoryCount: 2,
        },
      },
    ]);

    expect(summary.qualitySampleCount).toBe(2);
    expect(summary.qualityPassRate).toBe(0.5);
    expect(summary.averageQualityScore).toBe(75);
    expect(summary.qualityGradeCounts).toEqual({
      strong: 1,
      'needs-polish': 1,
    });
    expect(summary.qualityBlockingIssueCount).toBe(1);
    expect(summary.qualityAdvisoryIssueCount).toBe(2);
    expect(summary.spreadsheetActionKinds).toEqual(['create-formula-column']);
    expect(summary.changedSheetCount).toBe(1);
    expect(summary.refreshedSheetCount).toBe(2);
  });

  it('formats quality diagnostics for advanced summaries without changing default content', () => {
    expect(formatRuntimeQualityDiagnostics({
      totalRuntimeMs: 50,
      validationPassed: false,
      validationBlockingCount: 1,
      validationAdvisoryCount: 1,
      repairCount: 0,
      qualityPassed: false,
      qualityBlockingCount: 1,
      qualityAdvisoryCount: 2,
      qualityChecks: [
        {
          id: 'iframe-contract',
          label: 'Iframe contract',
          passed: false,
          blockingCount: 1,
          advisoryCount: 0,
        },
        {
          id: 'mobile-safety',
          label: 'Mobile safety',
          passed: true,
          blockingCount: 0,
          advisoryCount: 2,
        },
      ],
    })).toEqual([
      {
        severity: 'blocking',
        message: 'Quality blocked by 1 issue across Iframe contract.',
      },
      {
        severity: 'advisory',
        message: 'Quality advisories: 2 issues across Mobile safety.',
      },
    ]);

    expect(formatRuntimeQualityDiagnostics({
      totalRuntimeMs: 20,
      validationPassed: true,
      validationBlockingCount: 0,
      validationAdvisoryCount: 0,
      repairCount: 0,
      qualityPassed: true,
      qualityBlockingCount: 0,
      qualityAdvisoryCount: 0,
      qualityChecks: [{
        id: 'typography',
        label: 'Typography',
        passed: true,
        blockingCount: 0,
        advisoryCount: 0,
      }],
    })).toEqual([{
      severity: 'pass',
      message: 'Quality passed across 1 check.',
    }]);
  });
});
