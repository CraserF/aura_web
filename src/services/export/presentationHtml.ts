import type { ProjectData, ProjectDocument } from '@/types/project';
import type { StandaloneArtifactExport } from '@/services/export/standalone';

export interface PresentationStandaloneHtmlInput {
  project: ProjectData;
  document: ProjectDocument;
}

// TODO(backlog-phase-a): Build read-only standalone presentation HTML exports with packaged media.
export function exportPresentationStandaloneHtml(_input: PresentationStandaloneHtmlInput): StandaloneArtifactExport {
  throw new Error('Not implemented');
}
