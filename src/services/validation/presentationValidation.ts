import type { ProjectDocument } from '@/types/project';

import { validateSlides } from '@/services/ai/workflow/agents/qa-validator';
import {
  buildValidationResult,
  createValidationIssue,
  getDefaultValidationProfileId,
} from '@/services/validation/profiles';
import type { ValidationProfileId, ValidationResult } from '@/services/validation/types';

export interface PresentationValidationInput {
  document: ProjectDocument;
  profileId?: ValidationProfileId;
}

function scorePresentationValidation(blockingCount: number, advisoryCount: number): number {
  return Math.max(0, 100 - (blockingCount * 20) - (advisoryCount * 8));
}

export function validatePresentationAgainstProfile(input: PresentationValidationInput): ValidationResult {
  const { document } = input;
  const profileId = input.profileId ?? getDefaultValidationProfileId('presentation');
  const qa = validateSlides(document.contentHtml, {
    expectedSlideCount: document.slideCount > 0 ? document.slideCount : undefined,
    isCreate: document.slideCount > 0,
  });

  const issues = qa.violations.map((violation) =>
    createValidationIssue(
      violation.tier === 'blocking' || violation.severity === 'error' ? 'blocking' : 'warning',
      violation.rule,
      violation.detail,
      {
        targetDocumentId: document.id,
        source: 'presentation-qa',
      },
    ),
  );

  const result = buildValidationResult(profileId, [{
    documentId: document.id,
    artifactType: 'presentation',
  }], issues);

  return {
    ...result,
    score: Math.min(result.score, scorePresentationValidation(qa.blockingCount, qa.advisoryCount)),
  };
}
