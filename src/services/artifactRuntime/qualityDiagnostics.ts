import type { ArtifactRuntimeTelemetry } from '@/services/ai/workflow/types';

export interface RuntimeQualityDiagnosticLine {
  severity: 'pass' | 'blocking' | 'advisory';
  message: string;
}

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function formatRuntimeQualityDiagnostics(
  telemetry?: ArtifactRuntimeTelemetry,
): RuntimeQualityDiagnosticLine[] {
  if (!telemetry?.qualityChecks?.length) return [];

  const checks = telemetry.qualityChecks;
  const blockingChecks = checks.filter((check) => check.blockingCount > 0);
  const advisoryChecks = checks.filter((check) => check.advisoryCount > 0);
  const passedChecks = checks.filter((check) => check.passed);
  const lines: RuntimeQualityDiagnosticLine[] = [];

  if (telemetry.qualityPassed) {
    lines.push({
      severity: 'pass',
      message: `Quality passed across ${pluralize(passedChecks.length, 'check')}.`,
    });
  } else if (blockingChecks.length > 0) {
    lines.push({
      severity: 'blocking',
      message: `Quality blocked by ${pluralize(telemetry.qualityBlockingCount ?? 0, 'issue')} across ${blockingChecks.map((check) => check.label).join(', ')}.`,
    });
  }

  if (advisoryChecks.length > 0) {
    lines.push({
      severity: 'advisory',
      message: `Quality advisories: ${pluralize(telemetry.qualityAdvisoryCount ?? 0, 'issue')} across ${advisoryChecks.map((check) => check.label).join(', ')}.`,
    });
  }

  return lines;
}
