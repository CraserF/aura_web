import type { ProjectData } from '@/types/project';
import type { ConfigDiagnostic } from '@/services/configValidate/types';
import { validateContextPolicy } from '@/services/configValidate/contextPolicy';
import { validateProjectRules } from '@/services/configValidate/projectRules';
import { validateWorkflowPresets } from '@/services/configValidate/presets';
import type { DoctorCheckResult } from '@/services/diagnostics/types';

function toStatus(diagnostics: ConfigDiagnostic[]): DoctorCheckResult['status'] {
  if (diagnostics.some((item) => item.severity === 'error')) return 'fail';
  if (diagnostics.some((item) => item.severity === 'warning')) return 'warning';
  return 'pass';
}

export function runProjectDiagnostics(project: ProjectData): DoctorCheckResult {
  const diagnostics: ConfigDiagnostic[] = [
    ...validateProjectRules(project.projectRules),
    ...validateContextPolicy(project.contextPolicy),
    ...validateWorkflowPresets(project.workflowPresets),
  ];

  if (project.activeDocumentId && !project.documents.some((document) => document.id === project.activeDocumentId)) {
    diagnostics.push({
      source: 'doctor',
      path: 'project.activeDocumentId',
      severity: 'warning',
      code: 'missing-active-document',
      message: 'The active document reference does not point to an existing document.',
      suggestion: 'Select another active document or clear the saved reference.',
    });
  }

  const status = toStatus(diagnostics);
  return {
    id: 'project',
    label: 'Project',
    status,
    summary: diagnostics.length > 0
      ? `${diagnostics.length} project diagnostic${diagnostics.length === 1 ? '' : 's'} found.`
      : 'Project configuration looks healthy.',
    diagnostics,
  };
}
