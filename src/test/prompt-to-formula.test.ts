import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/spreadsheet/workbook', () => ({
  createDefaultSheet: vi.fn((name = 'Sheet 1') => ({
    id: `sheet-${name}`,
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
  replaceSheetData: vi.fn(),
}));

vi.mock('@/services/spreadsheet/actions', () => ({
  matchColumn: (schema: Array<{ name: string }>, fragment: string) =>
    schema.find((column) => column.name.toLowerCase() === fragment.trim().toLowerCase())?.name ?? null,
  detectSheetAction: vi.fn(() => null),
  executeSheetAction: vi.fn(async (_action, sheet) => ({
    action: _action,
    updatedSchema: [...sheet.schema, { name: 'Margin', type: 'number', nullable: true }],
    userMessage: 'Added computed column.',
  })),
}));

const workbook = {
  activeSheetIndex: 0,
  sheets: [{
    id: 'sheet-1',
    name: 'Sales Data',
    tableName: 'sales_table',
    schema: [
      { name: 'Revenue', type: 'number' as const, nullable: false },
      { name: 'Cost', type: 'number' as const, nullable: false },
    ],
    frozenRows: 0,
    frozenCols: 0,
    columnWidths: {},
    formulas: [],
  }],
};

describe('prompt to formula workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds a computed column from a deterministic arithmetic prompt', async () => {
    const { runSpreadsheetWorkflow } = await import('@/services/ai/workflow/spreadsheet');

    const result = await runSpreadsheetWorkflow({
      prompt: 'Add a computed column called Margin as Revenue minus Cost',
      activeWorkbook: workbook,
      activeDocumentId: 'sheet-doc',
      projectDocumentCount: 1,
      isDefaultSheet: false,
    });

    expect(result.kind).toBe('formula-column-created');
    if (result.kind !== 'formula-column-created') return;

    expect(result.updatedSheets[0]?.schema.map((column) => column.name)).toContain('Margin');
    expect(result.updatedSheets[0]?.formulas[0]?.dependsOn).toEqual(['Revenue', 'Cost']);
    expect(result.plan?.formula?.expression).toContain('"Revenue" - "Cost"');
  });

  it('returns clarification for unsupported formula phrasing', async () => {
    const { runSpreadsheetWorkflow } = await import('@/services/ai/workflow/spreadsheet');

    const result = await runSpreadsheetWorkflow({
      prompt: 'Add a computed column called FancyScore as a weighted sentiment blend with seasonality',
      activeWorkbook: workbook,
      activeDocumentId: 'sheet-doc',
      projectDocumentCount: 1,
      isDefaultSheet: false,
    });

    expect(result.kind).toBe('clarification-needed');
  });
});
