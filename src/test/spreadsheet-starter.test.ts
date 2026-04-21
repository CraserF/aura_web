import { describe, expect, it } from 'vitest';
import { canCreateSpreadsheetFromPrompt, planSpreadsheetStarter } from '@/services/spreadsheet/starter';

describe('spreadsheet starter planner', () => {
  it('recognizes create-style spreadsheet prompts', () => {
    expect(canCreateSpreadsheetFromPrompt('Create a budget tracker')).toBe(true);
    expect(canCreateSpreadsheetFromPrompt('Make a table with columns name, amount, status')).toBe(true);
    expect(canCreateSpreadsheetFromPrompt('Summarize this spreadsheet')).toBe(false);
  });

  it('builds a budget starter with numeric example rows', () => {
    const plan = planSpreadsheetStarter('Create a budget tracker for monthly expenses');

    expect(plan.workbookTitle).toBe('Budget Tracker');
    expect(plan.schema.map((column) => column.name)).toEqual(['Category', 'Planned', 'Actual', 'Difference', 'Notes']);
    expect(plan.rows.length).toBeGreaterThan(0);
    expect(plan.rows[0]?.Category).toBe('Payroll');
  });

  it('creates a chart-friendly sales table when prompted for graphable sample data', () => {
    const plan = planSpreadsheetStarter('Generate sample sales data that I can graph');

    expect(plan.sheetName).toBe('Sales Data');
    expect(plan.chartHint).toContain('chart');
    expect(plan.rows.length).toBe(6);
    expect(plan.schema.some((column) => column.name === 'Revenue' && column.type === 'number')).toBe(true);
  });

  it('uses explicit column descriptions for custom table designs', () => {
    const plan = planSpreadsheetStarter('Design a table with columns name, amount, status and add sample data');

    expect(plan.schema.map((column) => column.name)).toEqual(['Name', 'Amount', 'Status']);
    expect(plan.rows.length).toBe(3);
    expect(plan.rows[0]?.Name).toBe('Name 1');
  });
});
