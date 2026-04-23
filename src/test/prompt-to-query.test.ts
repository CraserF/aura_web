import { beforeEach, describe, expect, it, vi } from 'vitest';

const materializeQueryViewSheet = vi.fn(async () => ([
  { name: 'Region', type: 'text', nullable: false },
  { name: 'Total Revenue', type: 'number', nullable: true },
]));

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
  materializeQueryViewSheet,
  refreshQueryViewSheets: vi.fn(async (sheets) => ({ sheets, refreshedSheetIds: [] })),
  replaceSheetData: vi.fn(),
}));

vi.mock('@/services/spreadsheet/actions', () => ({
  matchColumn: (schema: Array<{ name: string }>, fragment: string) =>
    schema.find((column) => column.name.toLowerCase() === fragment.trim().toLowerCase())?.name ?? null,
  detectSheetAction: vi.fn(() => null),
  executeSheetAction: vi.fn(),
}));

const workbook = {
  activeSheetIndex: 0,
  sheets: [{
    id: 'sheet-1',
    name: 'Sales Data',
    tableName: 'sales_table',
    schema: [
      { name: 'Region', type: 'text' as const, nullable: false },
      { name: 'Revenue', type: 'number' as const, nullable: false },
    ],
    frozenRows: 0,
    frozenCols: 0,
    columnWidths: {},
    formulas: [],
  }],
};

describe('prompt to query workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('materializes a grouped query view as a workbook-backed sheet', async () => {
    const { runSpreadsheetWorkflow } = await import('@/services/ai/workflow/spreadsheet');

    const result = await runSpreadsheetWorkflow({
      prompt: 'Create a query view called Revenue by Region from Sales Data total Revenue by Region sort by Total Revenue desc',
      activeWorkbook: workbook,
      activeDocumentId: 'sheet-doc',
      projectDocumentCount: 1,
      isDefaultSheet: false,
    });

    expect(result.kind).toBe('query-view-created');
    if (result.kind !== 'query-view-created') return;

    expect(materializeQueryViewSheet).toHaveBeenCalledTimes(1);
    expect(result.updatedSheets).toHaveLength(2);
    expect(result.updatedSheets[1]?.queryView?.sourceSheetName).toBe('Sales Data');
    expect(result.updatedSheets[1]?.schema.map((column) => column.name)).toEqual(['Region', 'Total Revenue']);
  });
});
