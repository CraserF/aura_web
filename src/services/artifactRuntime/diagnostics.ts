import type { DocumentType } from '@/types/project';
import type { ArtifactRuntimeTelemetry } from '@/services/ai/workflow/types';

export interface RuntimeDiagnosticSample {
  artifactType: DocumentType;
  telemetry: ArtifactRuntimeTelemetry;
  promptText?: string;
  promptChars?: number;
}

export interface RuntimeArtifactDiagnosticSummary {
  sampleCount: number;
  firstPreviewCount: number;
  averageFirstPreviewMs?: number;
  averageTotalRuntimeMs: number;
  validationPassRate: number;
  totalRepairCount: number;
  totalQueuedPartCount: number;
  totalRepairedPartCount: number;
  estimatedPromptTokens: number;
  viewportContractSampleCount: number;
  viewportContractPassRate: number;
  viewportBlockingIssueCount: number;
  viewportAdvisoryIssueCount: number;
  qualitySampleCount: number;
  qualityPassRate: number;
  averageQualityScore?: number;
  qualityGradeCounts: Partial<Record<NonNullable<ArtifactRuntimeTelemetry['qualityGrade']>, number>>;
  qualityBlockingIssueCount: number;
  qualityAdvisoryIssueCount: number;
  spreadsheetActionKinds: string[];
  changedSheetCount: number;
  refreshedSheetCount: number;
}

export interface RuntimeDiagnosticSummary extends RuntimeArtifactDiagnosticSummary {
  artifactTypes: DocumentType[];
  byArtifactType: Partial<Record<DocumentType, RuntimeArtifactDiagnosticSummary>>;
}

function roundMetric(value: number): number {
  return Math.round(value * 100) / 100;
}

function estimateTokensFromChars(charCount: number): number {
  if (charCount <= 0) return 0;
  return Math.max(1, Math.round(charCount / 4));
}

export function estimateRuntimePromptTokens(input: string | { text?: string; chars?: number }): number {
  if (typeof input === 'string') return estimateTokensFromChars(input.length);
  return estimateTokensFromChars(input.chars ?? input.text?.length ?? 0);
}

function summarizeRuntimeDiagnosticGroup(samples: RuntimeDiagnosticSample[]): RuntimeArtifactDiagnosticSummary {
  const firstPreviewValues = samples
    .map((sample) => sample.telemetry.timeToFirstPreviewMs)
    .filter((value): value is number => typeof value === 'number');
  const totalRuntimeMs = samples.reduce((sum, sample) => sum + sample.telemetry.totalRuntimeMs, 0);
  const validationPassCount = samples.filter((sample) => sample.telemetry.validationPassed).length;
  const estimatedPromptTokens = samples.reduce(
    (sum, sample) => sum + (
      sample.telemetry.promptTokenEstimate ??
      estimateRuntimePromptTokens({
        text: sample.promptText,
        chars: sample.promptChars,
      })
    ),
    0,
  );
  const viewportSamples = samples.filter((sample) => typeof sample.telemetry.viewportContractPassed === 'boolean');
  const viewportPassCount = viewportSamples.filter((sample) => sample.telemetry.viewportContractPassed).length;
  const qualitySamples = samples.filter((sample) => typeof sample.telemetry.qualityPassed === 'boolean');
  const qualityPassCount = qualitySamples.filter((sample) => sample.telemetry.qualityPassed).length;
  const qualityScores = samples
    .map((sample) => sample.telemetry.qualityScore)
    .filter((score): score is number => typeof score === 'number');
  const qualityGradeCounts: RuntimeArtifactDiagnosticSummary['qualityGradeCounts'] = {};
  for (const sample of samples) {
    const grade = sample.telemetry.qualityGrade;
    if (!grade) continue;
    qualityGradeCounts[grade] = (qualityGradeCounts[grade] ?? 0) + 1;
  }
  const spreadsheetActionKinds = Array.from(new Set(
    samples
      .map((sample) => sample.telemetry.spreadsheetActionKind)
      .filter((kind): kind is string => typeof kind === 'string' && kind.length > 0),
  )).sort();

  return {
    sampleCount: samples.length,
    firstPreviewCount: firstPreviewValues.length,
    ...(firstPreviewValues.length > 0
      ? {
          averageFirstPreviewMs: roundMetric(
            firstPreviewValues.reduce((sum, value) => sum + value, 0) / firstPreviewValues.length,
          ),
        }
      : {}),
    averageTotalRuntimeMs: samples.length > 0 ? roundMetric(totalRuntimeMs / samples.length) : 0,
    validationPassRate: samples.length > 0 ? roundMetric(validationPassCount / samples.length) : 0,
    totalRepairCount: samples.reduce((sum, sample) => sum + sample.telemetry.repairCount, 0),
    totalQueuedPartCount: samples.reduce((sum, sample) => sum + (sample.telemetry.queuedPartCount ?? 0), 0),
    totalRepairedPartCount: samples.reduce((sum, sample) => sum + (sample.telemetry.repairedPartCount ?? 0), 0),
    estimatedPromptTokens,
    viewportContractSampleCount: viewportSamples.length,
    viewportContractPassRate: viewportSamples.length > 0 ? roundMetric(viewportPassCount / viewportSamples.length) : 0,
    viewportBlockingIssueCount: samples.reduce((sum, sample) => sum + (sample.telemetry.viewportBlockingCount ?? 0), 0),
    viewportAdvisoryIssueCount: samples.reduce((sum, sample) => sum + (sample.telemetry.viewportAdvisoryCount ?? 0), 0),
    qualitySampleCount: qualitySamples.length,
    qualityPassRate: qualitySamples.length > 0 ? roundMetric(qualityPassCount / qualitySamples.length) : 0,
    ...(qualityScores.length > 0
      ? {
          averageQualityScore: roundMetric(
            qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length,
          ),
        }
      : {}),
    qualityGradeCounts,
    qualityBlockingIssueCount: samples.reduce((sum, sample) => sum + (sample.telemetry.qualityBlockingCount ?? 0), 0),
    qualityAdvisoryIssueCount: samples.reduce((sum, sample) => sum + (sample.telemetry.qualityAdvisoryCount ?? 0), 0),
    spreadsheetActionKinds,
    changedSheetCount: samples.reduce((sum, sample) => sum + (sample.telemetry.changedSheetCount ?? 0), 0),
    refreshedSheetCount: samples.reduce((sum, sample) => sum + (sample.telemetry.refreshedSheetCount ?? 0), 0),
  };
}

export function summarizeRuntimeDiagnostics(samples: RuntimeDiagnosticSample[]): RuntimeDiagnosticSummary {
  const byArtifactType: Partial<Record<DocumentType, RuntimeArtifactDiagnosticSummary>> = {};
  const artifactTypes = Array.from(new Set(samples.map((sample) => sample.artifactType))).sort();

  for (const artifactType of artifactTypes) {
    byArtifactType[artifactType] = summarizeRuntimeDiagnosticGroup(
      samples.filter((sample) => sample.artifactType === artifactType),
    );
  }

  return {
    ...summarizeRuntimeDiagnosticGroup(samples),
    artifactTypes,
    byArtifactType,
  };
}
