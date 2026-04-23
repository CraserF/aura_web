import type { ProjectData } from '@/types/project';
import type { ConfigDiagnostic } from '@/services/configValidate/types';
import type { DoctorCheckResult } from '@/services/diagnostics/types';

export function runExportDiagnostics(project: ProjectData): DoctorCheckResult {
  const diagnostics: ConfigDiagnostic[] = [];

  if (!project.title.trim()) {
    diagnostics.push({
      source: 'doctor',
      path: 'project.title',
      severity: 'warning',
      code: 'missing-project-title',
      message: 'Project title is empty; exports will use a generic filename.',
    });
  }

  const untitledDocuments = project.documents.filter((document) => !document.title.trim());
  if (untitledDocuments.length > 0) {
    diagnostics.push({
      source: 'doctor',
      path: 'project.documents',
      severity: 'warning',
      code: 'missing-document-title',
      message: `${untitledDocuments.length} document${untitledDocuments.length === 1 ? '' : 's'} have empty titles.`,
      suggestion: 'Rename documents before exporting to keep archive contents readable.',
    });
  }

  return {
    id: 'exports',
    label: 'Exports',
    status: diagnostics.length > 0 ? 'warning' : 'pass',
    summary: diagnostics.length > 0
      ? `${diagnostics.length} export readiness warning${diagnostics.length === 1 ? '' : 's'} found.`
      : 'Project is ready to export.',
    diagnostics,
  };
}
