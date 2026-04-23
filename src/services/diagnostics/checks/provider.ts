import type { ProviderConfig } from '@/types';
import type { DoctorCheckResult } from '@/services/diagnostics/types';

export function runProviderDiagnostics(_providerConfig: ProviderConfig): DoctorCheckResult {
  return {
    id: 'provider',
    label: 'Provider',
    status: 'pass',
    summary: 'Provider diagnostics not implemented yet.',
    diagnostics: [],
  };
}
