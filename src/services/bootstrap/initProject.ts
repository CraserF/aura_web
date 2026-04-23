import type { ProjectData } from '@/types/project';
import { createEmptyInitReport } from './initReport';
import type { InitReport, ProjectStarterKit } from './types';

// TODO(phase-5): Implement idempotent starter-kit init.
export function initProject(
  project: ProjectData,
  _starterKitOrOptions?: ProjectStarterKit | null,
): { project: ProjectData; report: InitReport } {
  return {
    project,
    report: createEmptyInitReport(project.id),
  };
}
