import type { DocumentType } from '@/types/project';

import type { ValidationProfileId } from '@/services/validation/types';

export interface ValidationProfile {
  id: ValidationProfileId;
  label: string;
  description: string;
}

export const VALIDATION_PROFILES: ValidationProfile[] = [
  { id: 'document-standard', label: 'Document Standard', description: 'Default validation for documents.' },
  { id: 'presentation-standard', label: 'Presentation Standard', description: 'Default validation for presentations.' },
  { id: 'spreadsheet-standard', label: 'Spreadsheet Standard', description: 'Default validation for spreadsheets.' },
  { id: 'executive-pack', label: 'Executive Pack', description: 'Stricter validation for executive-facing artifacts.' },
  { id: 'research-pack', label: 'Research Pack', description: 'Validation for research-heavy projects and artifacts.' },
  { id: 'publish-ready', label: 'Publish Ready', description: 'Strict shared readiness profile for export and publish flows.' },
];

export function getDefaultValidationProfileId(artifactType: DocumentType): ValidationProfileId {
  switch (artifactType) {
    case 'presentation':
      return 'presentation-standard';
    case 'spreadsheet':
      return 'spreadsheet-standard';
    case 'document':
    default:
      return 'document-standard';
  }
}

// TODO(phase-7): Add profile lookups and precedence rules once validators and
// publish gating are wired to the shared profile registry.
