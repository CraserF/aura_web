import type { ProviderConfig } from '@/types';
import type { ProjectData } from '@/types/project';
import type { DoctorReport } from '@/services/diagnostics/types';
import { runProviderDiagnostics } from '@/services/diagnostics/checks/provider';
import { runProjectDiagnostics } from '@/services/diagnostics/checks/project';
import { runExportDiagnostics } from '@/services/diagnostics/checks/exports';
import { runMemoryDiagnostics } from '@/services/diagnostics/checks/memory';
import { runDataDiagnostics } from '@/services/diagnostics/checks/data';
import { runDependencyDiagnostics } from '@/services/diagnostics/checks/dependencies';

export interface RunDoctorInput {
  project: ProjectData;
  providerConfig: ProviderConfig;
}

export function runDoctor(input: RunDoctorInput): DoctorReport {
  const checks = [
    runProviderDiagnostics(input.providerConfig),
    runProjectDiagnostics(input.project),
    runExportDiagnostics(input.project),
    runMemoryDiagnostics(input.project),
    runDataDiagnostics(input.project),
    runDependencyDiagnostics(),
  ];

  const blockingCount = checks.reduce((count, check) => count + check.diagnostics.filter((diagnostic) => diagnostic.severity === 'error').length, 0);
  const warningCount = checks.reduce((count, check) => count + check.diagnostics.filter((diagnostic) => diagnostic.severity === 'warning').length, 0);
  const overallStatus =
    blockingCount > 0 ? 'fail' : warningCount > 0 ? 'warning' : 'pass';

  return {
    ranAt: Date.now(),
    overallStatus,
    checks,
    blockingCount,
    warningCount,
  };
}
