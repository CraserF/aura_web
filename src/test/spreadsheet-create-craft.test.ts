import { beforeEach, describe, expect, it, vi } from 'vitest';

const replaceSheetData = vi.fn(async (_sheet: unknown, schema: unknown, _rows: unknown) => schema);

vi.mock('@/services/spreadsheet/workbook', () => ({
  createDefaultSheet: vi.fn((name = 'Sheet 1') => ({
    id: `sheet-${name.replace(/\s+/g, '-').toLowerCase()}`,
    name,
    tableName: `table_${name.replace(/\s+/g, '_').toLowerCase()}`,
    schema: [],
    frozenRows: 0,
    frozenCols: 0,
    columnWidths: {},
    formulas: [],
  })),
  materializeQueryViewSheet: vi.fn(),
  refreshQueryViewSheets: vi.fn(async (sheets) => ({ sheets, refreshedSheetIds: [] })),
  replaceSheetData,
}));

vi.mock('@/services/spreadsheet/actions', () => ({
  detectSheetAction: vi.fn(() => null),
  executeSheetAction: vi.fn(),
  matchColumn: vi.fn(() => null),
}));

describe('spreadsheet create craft workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates starter workbooks with deterministic formatting metadata and useful summary rows', async () => {
    const { runSpreadsheetWorkflow } = await import('@/services/ai/workflow/spreadsheet');

    const result = await runSpreadsheetWorkflow({
      prompt: 'Create a budget tracker for monthly expenses',
      activeWorkbook: null,
      activeDocumentId: 'sheet-doc',
      projectDocumentCount: 1,
      isDefaultSheet: true,
    });

    expect(result.kind).toBe('spreadsheet-created');
    if (result.kind !== 'spreadsheet-created') return;

    expect(replaceSheetData).toHaveBeenCalledTimes(1);
    const rows = replaceSheetData.mock.calls[0]?.[2] as Array<Record<string, unknown>>;
    expect(rows[rows.length - 1]).toEqual(expect.objectContaining({
      Category: 'Total',
      Planned: 26800,
      Actual: 26290,
      Difference: 510,
    }));
    expect(result.updatedSheets[0]).toEqual(expect.objectContaining({
      frozenRows: 1,
      columnWidths: expect.objectContaining({
        Category: expect.any(Number),
        Planned: expect.any(Number),
        Actual: expect.any(Number),
      }),
    }));
    expect(result.updatedSheets[0]?.schema.find((column) => column.name === 'Planned')?.format).toBe('$#,##0');
    expect(result.summary).toContain('bar chart');
  });
});
