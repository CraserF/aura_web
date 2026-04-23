import { describe, expect, it } from 'vitest';

import { planSpreadsheetWorkflow } from '@/services/ai/workflow/agents/spreadsheet-planner';
import type { WorkbookMeta } from '@/types/project';

const workbook: WorkbookMeta = {
  activeSheetIndex: 0,
  sheets: [{
    id: 'sheet-1',
    name: 'Sales Data',
    tableName: 'sales_table',
    schema: [
      { name: 'Region', type: 'text', nullable: false },
      { name: 'Revenue', type: 'number', nullable: false },
      { name: 'Cost', type: 'number', nullable: false },
    ],
    frozenRows: 0,
    frozenCols: 0,
    columnWidths: {},
    formulas: [],
  }],
};

describe('spreadsheet planner', () => {
  it('resolves deterministic action prompts into sheet-action plans', () => {
    const plan = planSpreadsheetWorkflow({
      prompt: 'Sort the table by revenue descending',
      activeWorkbook: workbook,
      activeDocumentId: 'sheet-doc',
      isDefaultSheet: false,
    });

    expect(plan?.kind).toBe('sheet-action');
    expect(plan?.action).toEqual({
      type: 'sort',
      column: 'Revenue',
      direction: 'desc',
    });
  });

  it('resolves computed-column prompts into typed formula plans', () => {
    const plan = planSpreadsheetWorkflow({
      prompt: 'Add a computed column called Margin as Revenue minus Cost',
      activeWorkbook: workbook,
      activeDocumentId: 'sheet-doc',
      isDefaultSheet: false,
    });

    expect(plan?.kind).toBe('create-formula-column');
    expect(plan?.formula?.outputColumnName).toBe('Margin');
    expect(plan?.formula?.dependsOn).toEqual(['Revenue', 'Cost']);
  });

  it('resolves query-view prompts into typed query plans', () => {
    const plan = planSpreadsheetWorkflow({
      prompt: 'Create a query view called Revenue by Region from Sales Data total Revenue by Region sort by Total Revenue desc',
      activeWorkbook: workbook,
      activeDocumentId: 'sheet-doc',
      isDefaultSheet: false,
    });

    expect(plan?.kind).toBe('create-query-view');
    expect(plan?.queryView?.sourceSheetName).toBe('Sales Data');
    expect(plan?.queryView?.groupBy).toEqual(['Region']);
    expect(plan?.queryView?.aggregates?.[0]).toMatchObject({
      operation: 'sum',
      column: 'Revenue',
      alias: 'Total Revenue',
    });
  });

  it('falls back to starter planning for create prompts', () => {
    const plan = planSpreadsheetWorkflow({
      prompt: 'Create a budget spreadsheet with sample data',
      activeWorkbook: null,
      activeDocumentId: null,
      isDefaultSheet: false,
    });

    expect(plan?.kind).toBe('create-workbook');
    expect(plan?.starterKind).toBe('budget');
  });
});
