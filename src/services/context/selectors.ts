import type { ProjectData, ProjectDocument, WorkbookMeta } from '@/types/project';

export function getActiveWorkbook(activeDocument: ProjectDocument | null): WorkbookMeta | null {
  return activeDocument?.type === 'spreadsheet' ? activeDocument.workbook ?? null : null;
}

export function getExistingArtifactText(activeDocument: ProjectDocument | null): {
  existingContentHtml?: string;
  existingMarkdown?: string;
} {
  if (!activeDocument) {
    return {};
  }

  return {
    existingContentHtml: activeDocument.contentHtml || undefined,
    existingMarkdown: activeDocument.type === 'document' ? activeDocument.sourceMarkdown : undefined,
  };
}

export function getRelatedDocuments(
  project: ProjectData,
  activeDocument: ProjectDocument | null,
): Array<Pick<ProjectDocument, 'id' | 'title' | 'type'>> {
  return project.documents
    .filter((document) => document.id !== activeDocument?.id)
    .map((document) => ({
      id: document.id,
      title: document.title,
      type: document.type,
    }));
}
