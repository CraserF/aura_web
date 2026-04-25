import type { ConfigDiagnostic } from '@/services/configValidate/types';

export type DoctorCheckStatus = 'pass' | 'warning' | 'fail';

export interface DoctorCheckResult {
  id: string;
  label: string;
  status: DoctorCheckStatus;
  summary: string;
  diagnostics: ConfigDiagnostic[];
}

export interface DoctorReport {
  ranAt: number;
  overallStatus: DoctorCheckStatus;
  checks: DoctorCheckResult[];
  blockingCount: number;
  warningCount: number;
}
