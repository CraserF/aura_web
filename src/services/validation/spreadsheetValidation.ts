import type { ProjectDocument } from '@/types/project';

import {
  buildValidationResult,
  createValidationIssue,
  getDefaultValidationProfileId,
} from '@/services/validation/profiles';
import type { ValidationProfileId, ValidationResult } from '@/services/validation/types';

export interface SpreadsheetValidationInput {
  document: ProjectDocument;
  profileId?: ValidationProfileId;
}

export function validateSpreadsheetAgainstProfile(input: SpreadsheetValidationInput): ValidationResult {
  const { document } = input;
  const profileId = input.profileId ?? getDefaultValidationProfileId('spreadsheet');
  const issues = [];

  if (!document.workbook) {
    issues.push(createValidationIssue(
      'blocking',
      'missing-workbook',
      `Spreadsheet "${document.title || document.id}" is missing workbook metadata.`,
      {
        targetDocumentId: document.id,
        source: 'spreadsheet-validation',
      },
    ));
  } else {
    if (!document.workbook.sheets.length) {
      issues.push(createValidationIssue(
        'warning',
        'empty-workbook',
        `Spreadsheet "${document.title || document.id}" has no sheets.`,
        {
          targetDocumentId: document.id,
          source: 'spreadsheet-validation',
        },
      ));
    }

    if (document.workbook.activeSheetIndex < 0 || document.workbook.activeSheetIndex >= document.workbook.sheets.length) {
      issues.push(createValidationIssue(
        'warning',
        'invalid-active-sheet',
        `Spreadsheet "${document.title || document.id}" points to a missing active sheet index.`,
        {
          targetDocumentId: document.id,
          source: 'spreadsheet-validation',
        },
      ));
    }

    const seenTableNames = new Set<string>();
    for (const sheet of document.workbook.sheets) {
      if (!sheet.tableName.trim()) {
        issues.push(createValidationIssue(
          'blocking',
          'missing-table-name',
          `Sheet "${sheet.name}" is missing a table name for data/export operations.`,
          {
            targetDocumentId: document.id,
            targetSheetId: sheet.id,
            source: 'spreadsheet-validation',
          },
        ));
      } else if (seenTableNames.has(sheet.tableName)) {
        issues.push(createValidationIssue(
          'blocking',
          'duplicate-table-name',
          `Sheet "${sheet.name}" reuses table name "${sheet.tableName}".`,
          {
            targetDocumentId: document.id,
            targetSheetId: sheet.id,
            source: 'spreadsheet-validation',
          },
        ));
      } else {
        seenTableNames.add(sheet.tableName);
      }

      if (sheet.schema.length === 0) {
        issues.push(createValidationIssue(
          'warning',
          'empty-sheet-schema',
          `Sheet "${sheet.name}" has no schema yet.`,
          {
            targetDocumentId: document.id,
            targetSheetId: sheet.id,
            source: 'spreadsheet-validation',
          },
        ));
      }
    }
  }

  return buildValidationResult(profileId, [{
    documentId: document.id,
    artifactType: 'spreadsheet',
  }], issues);
}
