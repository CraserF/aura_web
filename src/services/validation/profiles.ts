import type { DocumentType } from '@/types/project';

import type {
  ArtifactValidationTarget,
  ValidationIssue,
  ValidationProfileId,
  ValidationResult,
  ValidationSeverity,
} from '@/services/validation/types';

export interface ValidationProfile {
  id: ValidationProfileId;
  label: string;
  description: string;
  strictWarningCodes?: string[];
}

export const VALIDATION_PROFILES: ValidationProfile[] = [
  { id: 'document-standard', label: 'Document Standard', description: 'Default validation for documents.' },
  { id: 'presentation-standard', label: 'Presentation Standard', description: 'Default validation for presentations.' },
  { id: 'spreadsheet-standard', label: 'Spreadsheet Standard', description: 'Default validation for spreadsheets.' },
  {
    id: 'executive-pack',
    label: 'Executive Pack',
    description: 'Stricter validation for executive-facing artifacts.',
    strictWarningCodes: ['literal-markdown', 'low-contrast-theme', 'slide-count', 'style-block'],
  },
  {
    id: 'research-pack',
    label: 'Research Pack',
    description: 'Validation for research-heavy projects and artifacts.',
    strictWarningCodes: ['missing-workbook', 'empty-workbook', 'broken-linked-table'],
  },
  {
    id: 'publish-ready',
    label: 'Publish Ready',
    description: 'Strict shared readiness profile for export and publish flows.',
    strictWarningCodes: [
      'literal-markdown',
      'low-contrast-theme',
      'slide-count',
      'style-block',
      'empty-workbook',
      'missing-project-title',
      'missing-document-title',
      'broken-linked-table',
      'clean-env-load-failed',
    ],
  },
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

export function getValidationProfile(profileId: ValidationProfileId): ValidationProfile {
  const profile = VALIDATION_PROFILES.find((entry) => entry.id === profileId);
  if (!profile) {
    throw new Error(`Unknown validation profile: ${profileId}`);
  }
  return profile;
}

function scoreIssues(issues: ValidationIssue[]): number {
  let score = 100;
  for (const issue of issues) {
    score -= issue.severity === 'blocking' ? 20 : 8;
  }
  return Math.max(0, Math.min(100, score));
}

export function summarizeValidationResult(result: ValidationResult): string {
  if (result.passed) {
    return `Validation passed under ${result.profileId} (score ${result.score}).`;
  }

  const blockingCount = result.blockingIssues.length;
  const warningCount = result.warnings.length;
  return `${blockingCount} blocking issue${blockingCount === 1 ? '' : 's'} and ${warningCount} warning${warningCount === 1 ? '' : 's'} under ${result.profileId}.`;
}

export function createValidationIssue(
  severity: ValidationSeverity,
  code: string,
  message: string,
  extra: Omit<ValidationIssue, 'severity' | 'code' | 'message'> = {},
): ValidationIssue {
  return {
    severity,
    code,
    message,
    ...extra,
  };
}

export function buildValidationResult(
  profileId: ValidationProfileId,
  artifactTargets: ArtifactValidationTarget[],
  issues: ValidationIssue[],
): ValidationResult {
  const profile = getValidationProfile(profileId);
  const blockingIssues: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  for (const issue of issues) {
    const promoted = issue.severity === 'warning' && profile.strictWarningCodes?.includes(issue.code);
    if (issue.severity === 'blocking' || promoted) {
      blockingIssues.push(promoted ? { ...issue, severity: 'blocking' } : issue);
    } else {
      warnings.push(issue);
    }
  }

  return {
    passed: blockingIssues.length === 0,
    blockingIssues,
    warnings,
    score: scoreIssues([...blockingIssues, ...warnings]),
    profileId,
    artifactTargets,
  };
}
