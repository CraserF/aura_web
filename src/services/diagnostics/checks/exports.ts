import type { ProjectData } from '@/types/project';
import type { DoctorCheckResult } from '@/services/diagnostics/types';

export function runExportDiagnostics(_project: ProjectData): DoctorCheckResult {
  return {
    id: 'exports',
    label: 'Exports',
    status: 'pass',
    summary: 'Export diagnostics not implemented yet.',
    diagnostics: [],
  };
}
