import type { ProjectData, ProjectDocument } from '@/types/project';
import type { StandaloneArtifactExport } from '@/services/export/standalone';

export interface DocumentStandaloneHtmlInput {
  project: ProjectData;
  document: ProjectDocument;
}

// TODO(backlog-phase-a): Build read-only standalone document HTML exports with packaged media.
export function exportDocumentStandaloneHtml(_input: DocumentStandaloneHtmlInput): StandaloneArtifactExport {
  throw new Error('Not implemented');
}
