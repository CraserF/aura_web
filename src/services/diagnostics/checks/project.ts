import type { ProjectData } from '@/types/project';
import type { DoctorCheckResult } from '@/services/diagnostics/types';

export function runProjectDiagnostics(_project: ProjectData): DoctorCheckResult {
  return {
    id: 'project',
    label: 'Project',
    status: 'pass',
    summary: 'Project diagnostics not implemented yet.',
    diagnostics: [],
  };
}
