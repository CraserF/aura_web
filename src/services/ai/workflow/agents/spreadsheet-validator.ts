import type { ColumnSchema, SheetMeta, WorkbookMeta } from '@/types/project';

import type { SpreadsheetPlan, SpreadsheetValidationResult } from '@/services/spreadsheet/plans';
import { createValidationIssue } from '@/services/validation/profiles';

function findSheet(workbook: WorkbookMeta | null, sheetId?: string): SheetMeta | null {
  if (!workbook || !sheetId) return null;
  return workbook.sheets.find((sheet) => sheet.id === sheetId) ?? null;
}

function hasColumn(schema: ColumnSchema[], columnName: string): boolean {
  return schema.some((column) => column.name === columnName);
}

export interface SpreadsheetPlannerValidationInput {
  prompt: string;
  plan: SpreadsheetPlan;
  workbook: WorkbookMeta | null;
  activeDocumentId?: string | null;
}

export function validateSpreadsheetPlan(
  input: SpreadsheetPlannerValidationInput,
): SpreadsheetValidationResult {
  const { plan, workbook, activeDocumentId } = input;

  if (plan.requiresClarification) {
    return {
      passed: false,
      issues: [
        createValidationIssue(
          'warning',
          'spreadsheet-plan-clarification',
          plan.clarification ?? 'Clarification is required before applying this spreadsheet request.',
          {
            targetDocumentId: activeDocumentId ?? undefined,
            source: 'spreadsheet-planner',
          },
        ),
      ],
      clarification: plan.clarification,
    };
  }

  switch (plan.kind) {
    case 'create-workbook':
      return { passed: true, issues: [] };

    case 'create-chart-pack':
    case 'sheet-action':
    case 'summarize-sheet': {
      const target = findSheet(workbook, plan.targets[0]?.sheetId);
      if (!target) {
        return {
          passed: false,
          issues: [
            createValidationIssue(
              'blocking',
              'missing-target-sheet',
              'The spreadsheet action could not find the target sheet.',
              {
                targetDocumentId: activeDocumentId ?? undefined,
                source: 'spreadsheet-validator',
              },
            ),
          ],
        };
      }
      return { passed: true, issues: [] };
    }

    case 'create-formula-column': {
      const target = findSheet(workbook, plan.targets[0]?.sheetId);
      if (!target || !plan.formula) {
        return {
          passed: false,
          issues: [
            createValidationIssue(
              'blocking',
              'missing-formula-target',
              'The computed column target sheet is missing.',
              {
                targetDocumentId: activeDocumentId ?? undefined,
                targetSheetId: plan.targets[0]?.sheetId,
                source: 'spreadsheet-validator',
              },
            ),
          ],
        };
      }
      const issues = [];
      if (hasColumn(target.schema, plan.formula.outputColumnName)) {
        issues.push(createValidationIssue(
          'blocking',
          'duplicate-formula-column',
          `Sheet "${target.name}" already has a column named "${plan.formula.outputColumnName}".`,
          {
            targetDocumentId: activeDocumentId ?? undefined,
            targetSheetId: target.id,
            source: 'spreadsheet-validator',
          },
        ));
      }
      for (const dependency of plan.formula.dependsOn) {
        if (!hasColumn(target.schema, dependency)) {
          issues.push(createValidationIssue(
            'blocking',
            'missing-formula-source-column',
            `The formula depends on missing column "${dependency}".`,
            {
              targetDocumentId: activeDocumentId ?? undefined,
              targetSheetId: target.id,
              source: 'spreadsheet-validator',
            },
          ));
        }
      }
      return {
        passed: issues.length === 0,
        issues,
      };
    }

    case 'create-query-view': {
      if (!workbook || !plan.queryView) {
        return {
          passed: false,
          issues: [
            createValidationIssue(
              'blocking',
              'missing-query-workbook',
              'The query view needs an existing workbook.',
              {
                targetDocumentId: activeDocumentId ?? undefined,
                source: 'spreadsheet-validator',
              },
            ),
          ],
        };
      }

      const sourceSheet = findSheet(workbook, plan.queryView.sourceSheetId);
      if (!sourceSheet) {
        return {
          passed: false,
          issues: [
            createValidationIssue(
              'blocking',
              'missing-query-source-sheet',
              `The query view source sheet "${plan.queryView.sourceSheetName}" no longer exists.`,
              {
                targetDocumentId: activeDocumentId ?? undefined,
                targetSheetId: plan.queryView.sourceSheetId,
                source: 'spreadsheet-validator',
              },
            ),
          ],
        };
      }

      const issues = [];
      const knownColumns = sourceSheet.schema.map((column) => column.name);
      for (const column of plan.queryView.selectColumns) {
        if (!knownColumns.includes(column)) {
          issues.push(createValidationIssue(
            'blocking',
            'missing-query-select-column',
            `The query view selects missing column "${column}".`,
            {
              targetDocumentId: activeDocumentId ?? undefined,
              targetSheetId: sourceSheet.id,
              source: 'spreadsheet-validator',
            },
          ));
        }
      }
      for (const filter of plan.queryView.filters) {
        if (!knownColumns.includes(filter.column)) {
          issues.push(createValidationIssue(
            'blocking',
            'missing-query-filter-column',
            `The query view filter references missing column "${filter.column}".`,
            {
              targetDocumentId: activeDocumentId ?? undefined,
              targetSheetId: sourceSheet.id,
              source: 'spreadsheet-validator',
            },
          ));
        }
      }
      for (const column of plan.queryView.groupBy ?? []) {
        if (!knownColumns.includes(column)) {
          issues.push(createValidationIssue(
            'blocking',
            'missing-query-group-column',
            `The query view groups by missing column "${column}".`,
            {
              targetDocumentId: activeDocumentId ?? undefined,
              targetSheetId: sourceSheet.id,
              source: 'spreadsheet-validator',
            },
          ));
        }
      }
      for (const aggregate of plan.queryView.aggregates ?? []) {
        if (aggregate.column && !knownColumns.includes(aggregate.column)) {
          issues.push(createValidationIssue(
            'blocking',
            'missing-query-aggregate-column',
            `The query view aggregate references missing column "${aggregate.column}".`,
            {
              targetDocumentId: activeDocumentId ?? undefined,
              targetSheetId: sourceSheet.id,
              source: 'spreadsheet-validator',
            },
          ));
        }
      }
      if (plan.queryView.sort && !knownColumns.includes(plan.queryView.sort.column) && !plan.queryView.aggregates?.some((aggregate) => aggregate.alias === plan.queryView!.sort!.column)) {
        issues.push(createValidationIssue(
          'blocking',
          'missing-query-sort-column',
          `The query view sorts by missing column "${plan.queryView.sort.column}".`,
          {
            targetDocumentId: activeDocumentId ?? undefined,
            targetSheetId: sourceSheet.id,
            source: 'spreadsheet-validator',
          },
        ));
      }
      return {
        passed: issues.length === 0,
        issues,
      };
    }
  }
}
