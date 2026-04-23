import type { ProjectData } from '@/types/project';
import type { ProjectGraph } from './types';

// TODO(phase-6): Build deterministic graph nodes/edges from project artifacts.
export function buildProjectGraph(_project: ProjectData): ProjectGraph {
  return {
    nodes: [],
    edges: [],
  };
}
