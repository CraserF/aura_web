import type { ProjectData } from '@/types/project';
import { extractChartSpecsFromHtml } from '@/services/charts';
import { extractLinkedTableRefsFromHtml } from './build';
import type { ProjectGraphRefreshChange } from './types';

export interface RefreshProjectDependenciesResult {
  project: ProjectData;
  changes: ProjectGraphRefreshChange[];
}

export function refreshProjectDependencies(project: ProjectData): RefreshProjectDependenciesResult {
  const changes: ProjectGraphRefreshChange[] = [];
  const documents = project.documents.map((document) => {
    const nextLinkedTableRefs = extractLinkedTableRefsFromHtml(document.contentHtml);
    const nextChartSpecs = extractChartSpecsFromHtml(document.contentHtml);
    const linkedChanged = JSON.stringify(document.linkedTableRefs ?? []) !== JSON.stringify(nextLinkedTableRefs);
    const chartChanged = JSON.stringify(document.chartSpecs ?? {}) !== JSON.stringify(nextChartSpecs);

    if (!linkedChanged && !chartChanged) {
      return document;
    }

    changes.push({
      documentId: document.id,
      action: 'updated',
      reason: linkedChanged && chartChanged
        ? 'Refreshed linked table refs and chart metadata from artifact HTML.'
        : linkedChanged
          ? 'Refreshed linked table refs from artifact HTML.'
          : 'Refreshed chart metadata from artifact HTML.',
    });

    return {
      ...document,
      linkedTableRefs: nextLinkedTableRefs,
      chartSpecs: nextChartSpecs,
      updatedAt: document.updatedAt,
    };
  });

  return {
    project: {
      ...project,
      documents,
    },
    changes,
  };
}
