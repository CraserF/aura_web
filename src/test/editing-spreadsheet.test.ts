import { describe, expect, it } from 'vitest';

import { resolveSpreadsheetTargets } from '@/services/editing/patchSpreadsheet';
import type { ProjectDocument } from '@/types/project';

const workbookDocument: ProjectDocument = {
  id: 'sheet-doc-1',
  title: 'Workbook',
  type: 'spreadsheet',
  contentHtml: '',
  themeCss: '',
  slideCount: 0,
  chartSpecs: {},
  workbook: {
    activeSheetIndex: 0,
    sheets: [
      {
        id: 'sheet-1',
        name: 'Revenue',
        tableName: 'revenue_table',
        schema: [
          { name: 'Amount', type: 'number', nullable: false },
          { name: 'Region', type: 'text', nullable: false },
        ],
        frozenRows: 0,
        frozenCols: 0,
        columnWidths: {},
        formulas: [{ id: 'formula-1', column: 'Margin', expression: 'Amount * 0.2', dependsOn: ['Amount'] }],
      },
      {
        id: 'sheet-2',
        name: 'Forecast',
        tableName: 'forecast_table',
        schema: [{ name: 'Pipeline', type: 'number', nullable: false }],
        frozenRows: 0,
        frozenCols: 0,
        columnWidths: {},
        formulas: [],
      },
    ],
  },
  order: 0,
  createdAt: 1,
  updatedAt: 1,
};

describe('spreadsheet target resolution', () => {
  it('resolves active sheet, named sheet, column, and range selectors', () => {
    const active = resolveSpreadsheetTargets(workbookDocument, [{ type: 'active-sheet', label: 'Active sheet' }]);
    const named = resolveSpreadsheetTargets(workbookDocument, [{ type: 'sheet-name', value: 'Forecast', label: 'Sheet "Forecast"' }]);
    const column = resolveSpreadsheetTargets(workbookDocument, [{ type: 'column', value: 'Amount', label: 'Column Amount' }]);
    const range = resolveSpreadsheetTargets(workbookDocument, [{ type: 'range', value: 'A1:B5', label: 'Range A1:B5' }]);

    expect(active[0]?.sheetId).toBe('sheet-1');
    expect(named[0]?.sheetId).toBe('sheet-2');
    expect(column[0]?.sheetId).toBe('sheet-1');
    expect(range[0]?.sheetId).toBe('sheet-1');
  });

  it('resolves formula-column selectors against formula metadata', () => {
    const result = resolveSpreadsheetTargets(workbookDocument, [
      { type: 'formula-column', value: 'Margin', label: 'Formula column Margin' },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]?.sheetId).toBe('sheet-1');
  });
});
