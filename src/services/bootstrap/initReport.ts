import type { InitReport } from './types';

// TODO(phase-5): Add report builder helpers.
export function createEmptyInitReport(projectId: string): InitReport {
  return {
    ranAt: Date.now(),
    projectId,
    items: [],
    createdCount: 0,
    updatedCount: 0,
    skippedCount: 0,
  };
}
