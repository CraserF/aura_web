import type { InitReport, InitReportItem } from './types';

export function createInitReport(projectId: string, items: InitReportItem[]): InitReport {
  return {
    ranAt: Date.now(),
    projectId,
    items,
    createdCount: items.filter((item) => item.status === 'created').length,
    updatedCount: items.filter((item) => item.status === 'updated').length,
    skippedCount: items.filter((item) => item.status === 'skipped').length,
  };
}
