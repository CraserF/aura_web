import { describe, expect, it } from 'vitest';
import type { ProjectDocument } from '@/types/project';

import { validateSpreadsheetAgainstProfile } from '@/services/validation/spreadsheetValidation';

function makeSpreadsheet(overrides: Partial<ProjectDocument> = {}): ProjectDocument {
  return {
    id: 'sheet-1',
    title: 'Sheet',
    type: 'spreadsheet',
    contentHtml: '',
    themeCss: '',
    slideCount: 0,
    chartSpecs: {},
    workbook: {
      activeSheetIndex: 0,
      sheets: [{
        id: 's1',
        name: 'Sheet 1',
        tableName: 'table_1',
        schema: [{ name: 'Amount', type: 'number', nullable: false }],
        frozenRows: 0,
        frozenCols: 0,
        columnWidths: {},
        formulas: [],
      }],
    },
    order: 0,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe('spreadsheet validation', () => {
  it('reports missing workbook metadata as blocking', () => {
    const result = validateSpreadsheetAgainstProfile({
      document: makeSpreadsheet({
        workbook: undefined,
      }),
    });

    expect(result.passed).toBe(false);
    expect(result.blockingIssues.map((issue) => issue.code)).toContain('missing-workbook');
  });

  it('promotes empty-workbook warnings under publish-ready', () => {
    const result = validateSpreadsheetAgainstProfile({
      document: makeSpreadsheet({
        workbook: {
          activeSheetIndex: 0,
          sheets: [],
        },
      }),
      profileId: 'publish-ready',
    });

    expect(result.blockingIssues.map((issue) => issue.code)).toContain('empty-workbook');
  });
});
