import type { ConfigDiagnostic } from '@/services/configValidate/types';
import type { DoctorCheckResult } from '@/services/diagnostics/types';

export function runDependencyDiagnostics(): DoctorCheckResult {
  const diagnostics: ConfigDiagnostic[] = [];

  if (typeof window === 'undefined') {
    diagnostics.push({
      source: 'doctor',
      path: 'runtime.window',
      severity: 'warning',
      code: 'missing-window',
      message: 'Doctor is running outside a browser-like environment.',
    });
  }

  if (typeof crypto === 'undefined' || typeof crypto.randomUUID !== 'function') {
    diagnostics.push({
      source: 'doctor',
      path: 'runtime.crypto',
      severity: 'error',
      code: 'missing-crypto',
      message: 'crypto.randomUUID is unavailable in this environment.',
    });
  }

  const status = diagnostics.some((item) => item.severity === 'error')
    ? 'fail'
    : diagnostics.length > 0
      ? 'warning'
      : 'pass';

  return {
    id: 'dependencies',
    label: 'Dependencies',
    status,
    summary: diagnostics.length > 0
      ? `${diagnostics.length} runtime dependency issue${diagnostics.length === 1 ? '' : 's'} found.`
      : 'Browser/runtime dependencies look healthy.',
    diagnostics,
  };
}
