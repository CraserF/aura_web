import type { ProjectData } from '@/types/project';
import type { DoctorCheckResult } from '@/services/diagnostics/types';

export function runDataDiagnostics(_project: ProjectData): DoctorCheckResult {
  return {
    id: 'data',
    label: 'Data',
    status: 'pass',
    summary: 'Data diagnostics not implemented yet.',
    diagnostics: [],
  };
}
