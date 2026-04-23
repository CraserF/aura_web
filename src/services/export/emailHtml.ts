import type { ProjectData, ProjectDocument } from '@/types/project';
import type { StandaloneArtifactExport } from '@/services/export/standalone';

export interface DocumentEmailHtmlInput {
  project: ProjectData;
  document: ProjectDocument;
}

// TODO(backlog-phase-a): Build conservative document email HTML exports with inline styles.
export function exportDocumentEmailHtml(_input: DocumentEmailHtmlInput): StandaloneArtifactExport {
  throw new Error('Not implemented');
}
