import { describe, expect, it } from 'vitest';
import {
  buildDocumentRuntimeTelemetry,
  estimateRuntimePromptTokens,
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
});
