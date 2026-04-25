import type { DocumentType } from '@/types/project';

export type ValidationProfileId =
  | 'document-standard'
  | 'presentation-standard'
  | 'spreadsheet-standard'
  | 'executive-pack'
  | 'research-pack'
  | 'publish-ready';

export type ValidationSeverity = 'blocking' | 'warning';

export interface ArtifactValidationTarget {
  documentId: string;
  artifactType: DocumentType;
  sheetId?: string;
}

export interface ValidationIssue {
  code: string;
  message: string;
  severity: ValidationSeverity;
  targetDocumentId?: string;
  targetSheetId?: string;
  source?: string;
}

export interface ValidationResult {
  passed: boolean;
  blockingIssues: ValidationIssue[];
  warnings: ValidationIssue[];
  score: number;
  profileId: ValidationProfileId;
  artifactTargets: ArtifactValidationTarget[];
}

export interface PublishReadinessResult {
  profileId: ValidationProfileId;
  artifactValidation?: ValidationResult;
  projectValidation?: ValidationResult;
  exportBlocked: boolean;
  overrideRequired: boolean;
}
