import type { ProjectData } from '@/types/project';
import type { ConfigDiagnostic } from '@/services/configValidate/types';
import type { DoctorCheckResult } from '@/services/diagnostics/types';

export function runMemoryDiagnostics(project: ProjectData): DoctorCheckResult {
  const diagnostics: ConfigDiagnostic[] = [];
  const memoryTree = project.memoryTree;

  if (!memoryTree) {
    diagnostics.push({
      source: 'doctor',
      path: 'project.memoryTree',
      severity: 'warning',
      code: 'missing-memory-tree',
      message: 'Memory tree is missing; retrieval and extraction will be limited.',
    });
  } else if (!Array.isArray(memoryTree.subdirs)) {
    diagnostics.push({
      source: 'doctor',
      path: 'project.memoryTree.subdirs',
      severity: 'error',
      code: 'invalid-memory-tree',
      message: 'Memory tree structure is invalid.',
    });
  }

  const status = diagnostics.some((item) => item.severity === 'error')
    ? 'fail'
    : diagnostics.length > 0
      ? 'warning'
      : 'pass';

  return {
    id: 'memory',
    label: 'Memory',
    status,
    summary: diagnostics.length > 0
      ? `${diagnostics.length} memory diagnostic${diagnostics.length === 1 ? '' : 's'} found.`
      : 'Memory system looks healthy.',
    diagnostics,
  };
}
