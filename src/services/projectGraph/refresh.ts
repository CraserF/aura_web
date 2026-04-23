import type { ProjectData } from '@/types/project';
import type { ProjectGraphRefreshChange } from './types';

export interface RefreshProjectDependenciesResult {
  project: ProjectData;
  changes: ProjectGraphRefreshChange[];
}

// TODO(phase-6): Refresh graph-backed metadata such as linked table refs and chart specs.
export function refreshProjectDependencies(project: ProjectData): RefreshProjectDependenciesResult {
  return {
    project,
    changes: [],
  };
}
