import type { ProjectDocument } from '@/types/project';
import type { ValidationResult } from '@/services/validation/types';

const CONTENT_MUTATION_KEYS: Array<keyof ProjectDocument> = [
  'contentHtml',
  'sourceMarkdown',
  'themeCss',
  'slideCount',
  'title',
  'chartSpecs',
  'workbook',
  'linkedTableRefs',
];

export function normalizeDocumentLifecycle(
  document: ProjectDocument,
): ProjectDocument {
  return {
    ...document,
    lifecycleState: document.lifecycleState ?? 'draft',
  };
}

export function applyDraftLifecycleOnContentUpdate(
  current: ProjectDocument,
  updates: Partial<ProjectDocument>,
): Partial<ProjectDocument> {
  if (updates.lifecycleState) {
    return updates;
  }

  const hasContentMutation = CONTENT_MUTATION_KEYS.some((key) => key in updates);
  if (!hasContentMutation) {
    return updates;
  }

  if (current.lifecycleState === 'approved' || current.lifecycleState === 'published') {
    return {
      ...updates,
      lifecycleState: 'draft',
      staleReason: undefined,
    };
  }

  return updates;
}

export function deriveLifecycleFromValidation(
  result: ValidationResult,
): Pick<ProjectDocument, 'lifecycleState' | 'lastValidationProfileId' | 'staleReason'> {
  const hasDependencyBlock = result.blockingIssues.some((issue) => issue.source === 'dependency-graph');

  if (result.passed) {
    return {
      lifecycleState: 'approved',
      lastValidationProfileId: result.profileId,
      staleReason: undefined,
    };
  }

  return {
    lifecycleState: hasDependencyBlock ? 'stale' : 'reviewing',
    lastValidationProfileId: result.profileId,
    staleReason: hasDependencyBlock ? 'Dependency validation failed.' : undefined,
  };
}

export function markDocumentPublished(
  profileId?: string,
  lastSuccessfulPresetId?: string,
): Pick<ProjectDocument, 'lifecycleState' | 'lastValidationProfileId' | 'lastSuccessfulPresetId' | 'staleReason'> {
  return {
    lifecycleState: 'published',
    lastValidationProfileId: profileId,
    lastSuccessfulPresetId,
    staleReason: undefined,
  };
}

export function markDocumentStale(
  reason: string,
): Pick<ProjectDocument, 'lifecycleState' | 'staleReason'> {
  return {
    lifecycleState: 'stale',
    staleReason: reason,
  };
}
