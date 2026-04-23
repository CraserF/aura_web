import type { DoctorCheckResult } from '@/services/diagnostics/types';

export function runDependencyDiagnostics(): DoctorCheckResult {
  return {
    id: 'dependencies',
    label: 'Dependencies',
    status: 'pass',
    summary: 'Dependency diagnostics not implemented yet.',
    diagnostics: [],
  };
}
