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

      for (const formula of sheet.formulas) {
        if (!sheet.schema.some((column) => column.name === formula.column)) {
          issues.push(createValidationIssue(
            'warning',
            'missing-formula-output-column',
            `Formula "${formula.column}" does not have a matching output column in sheet "${sheet.name}".`,
            {
              targetDocumentId: document.id,
              targetSheetId: sheet.id,
              source: 'spreadsheet-validation',
            },
          ));
        }

        for (const dependency of formula.dependsOn) {
          if (!sheet.schema.some((column) => column.name === dependency)) {
            issues.push(createValidationIssue(
              'blocking',
              'missing-formula-dependency',
              `Formula "${formula.column}" depends on missing column "${dependency}" in sheet "${sheet.name}".`,
              {
                targetDocumentId: document.id,
                targetSheetId: sheet.id,
                source: 'spreadsheet-validation',
              },
            ));
          }
        }
      }

      if (sheet.queryView) {
        const sourceSheet = document.workbook.sheets.find((candidate) => candidate.id === sheet.queryView!.sourceSheetId);
        if (!sourceSheet) {
          issues.push(createValidationIssue(
            'blocking',
            'missing-query-source-sheet',
            `Query view "${sheet.name}" points to missing source sheet "${sheet.queryView.sourceSheetName}".`,
            {
              targetDocumentId: document.id,
              targetSheetId: sheet.id,
              source: 'spreadsheet-validation',
            },
          ));
          continue;
        }

        for (const column of sheet.queryView.selectColumns) {
          if (!sourceSheet.schema.some((entry) => entry.name === column)) {
            issues.push(createValidationIssue(
              'blocking',
              'missing-query-select-column',
              `Query view "${sheet.name}" selects missing source column "${column}".`,
              {
                targetDocumentId: document.id,
                targetSheetId: sheet.id,
                source: 'spreadsheet-validation',
              },
            ));
          }
        }

        for (const filter of sheet.queryView.filters) {
          if (!sourceSheet.schema.some((entry) => entry.name === filter.column)) {
            issues.push(createValidationIssue(
              'blocking',
              'missing-query-filter-column',
              `Query view "${sheet.name}" filters on missing source column "${filter.column}".`,
              {
                targetDocumentId: document.id,
                targetSheetId: sheet.id,
                source: 'spreadsheet-validation',
              },
            ));
          }
        }

        for (const aggregate of sheet.queryView.aggregates ?? []) {
          if (aggregate.column && !sourceSheet.schema.some((entry) => entry.name === aggregate.column)) {
            issues.push(createValidationIssue(
              'blocking',
              'missing-query-aggregate-column',
              `Query view "${sheet.name}" aggregates missing source column "${aggregate.column}".`,
              {
                targetDocumentId: document.id,
                targetSheetId: sheet.id,
                source: 'spreadsheet-validation',
              },
            ));
          }
        }
      }
    }
  }

  return buildValidationResult(profileId, [{
    documentId: document.id,
    artifactType: 'spreadsheet',
  }], issues);
}
