import type { ProjectData } from '@/types/project';
import type { ConfigDiagnostic } from '@/services/configValidate/types';
import type { DoctorCheckResult } from '@/services/diagnostics/types';

export function runDataDiagnostics(project: ProjectData): DoctorCheckResult {
  const diagnostics: ConfigDiagnostic[] = [];
  const spreadsheetDocuments = project.documents.filter((document) => document.type === 'spreadsheet');

  for (const document of spreadsheetDocuments) {
    if (!document.workbook) {
      diagnostics.push({
        source: 'doctor',
        path: `project.documents.${document.id}.workbook`,
        severity: 'error',
        code: 'missing-workbook',
        message: `Spreadsheet "${document.title || document.id}" is missing workbook metadata.`,
      });
      continue;
    }

    if (!document.workbook.sheets.length) {
      diagnostics.push({
        source: 'doctor',
        path: `project.documents.${document.id}.workbook.sheets`,
        severity: 'warning',
        code: 'empty-workbook',
        message: `Spreadsheet "${document.title || document.id}" has no sheets.`,
      });
    }
  }

  const status = diagnostics.some((item) => item.severity === 'error')
    ? 'fail'
    : diagnostics.length > 0
      ? 'warning'
      : 'pass';

  return {
    id: 'data',
    label: 'Data',
    status,
    summary: spreadsheetDocuments.length === 0
      ? 'No spreadsheet-specific data checks were needed.'
      : diagnostics.length > 0
        ? `${diagnostics.length} spreadsheet diagnostic${diagnostics.length === 1 ? '' : 's'} found.`
        : 'Spreadsheet data layer looks healthy.',
    diagnostics,
  };
}
