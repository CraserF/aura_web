import type { ProjectDocument } from '@/types/project';

import { getDefaultValidationProfileId } from '@/services/validation/profiles';
import { validateDocumentAgainstProfile } from '@/services/validation/documentValidation';
import { validatePresentationAgainstProfile } from '@/services/validation/presentationValidation';
import { validateSpreadsheetAgainstProfile } from '@/services/validation/spreadsheetValidation';
import type { ValidationProfileId, ValidationResult } from '@/services/validation/types';

export {
  VALUE_REALIGNMENT_RELEASE_GATES,
  summarizeReleaseGateDefinitions,
  type ReleaseGateDefinition,
  type ReleaseGateMode,
  type ReleaseGateSummary,
  type ReleaseValidationLevel,
} from '@/services/validation/releaseGates';

export function validateArtifactAgainstProfile(
  document: ProjectDocument,
  profileId: ValidationProfileId = getDefaultValidationProfileId(document.type),
): ValidationResult {
  switch (document.type) {
    case 'presentation':
      return validatePresentationAgainstProfile({ document, profileId });
    case 'spreadsheet':
      return validateSpreadsheetAgainstProfile({ document, profileId });
    case 'document':
    default:
      return validateDocumentAgainstProfile({ document, profileId });
  }
}
