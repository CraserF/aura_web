import type { ProjectDocument } from '@/types/project';

import { validateDocument } from '@/services/ai/workflow/agents/document-qa';
import {
  buildValidationResult,
  createValidationIssue,
  getDefaultValidationProfileId,
} from '@/services/validation/profiles';
import type { ValidationProfileId, ValidationResult } from '@/services/validation/types';

export interface DocumentValidationInput {
  document: ProjectDocument;
  profileId?: ValidationProfileId;
}

export function validateDocumentAgainstProfile(input: DocumentValidationInput): ValidationResult {
  const { document } = input;
  const profileId = input.profileId ?? getDefaultValidationProfileId('document');
  const qa = validateDocument(document.contentHtml);
  const issues = qa.violations.map((violation) =>
    createValidationIssue(
      violation.severity === 'error' ? 'blocking' : 'warning',
      violation.rule,
      violation.detail,
      {
        targetDocumentId: document.id,
        source: 'document-qa',
      },
    ),
  );

  const result = buildValidationResult(profileId, [{
    documentId: document.id,
    artifactType: 'document',
  }], issues);

  return {
    ...result,
    score: Math.min(result.score, qa.score),
  };
}
