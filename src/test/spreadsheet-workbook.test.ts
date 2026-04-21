import { describe, expect, it } from 'vitest';
import { createDefaultSheet } from '@/services/spreadsheet/workbook';

describe('spreadsheet workbook helpers', () => {
  it('creates a default sheet with table metadata and starter schema', () => {
    const sheet = createDefaultSheet();

    expect(sheet.id).toBeTruthy();
    expect(sheet.name).toBe('Sheet 1');
    expect(sheet.tableName.startsWith('sheet_')).toBe(true);
    expect(sheet.schema.map((column) => column.name)).toEqual(['A', 'B', 'C']);
    expect(sheet.schema.every((column) => column.type === 'text')).toBe(true);
    expect(sheet.frozenRows).toBe(1);
    expect(sheet.frozenCols).toBe(0);
  });

  it('supports custom default sheet names', () => {
    const sheet = createDefaultSheet('Revenue');
    expect(sheet.name).toBe('Revenue');
  });
});
