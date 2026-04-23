import type { ProjectData } from '@/types/project';
import type { DoctorCheckResult } from '@/services/diagnostics/types';

export function runMemoryDiagnostics(_project: ProjectData): DoctorCheckResult {
  return {
    id: 'memory',
    label: 'Memory',
    status: 'pass',
    summary: 'Memory diagnostics not implemented yet.',
    diagnostics: [],
  };
}
