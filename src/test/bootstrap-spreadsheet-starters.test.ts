import { describe, expect, it } from 'vitest';
import { listSpreadsheetStarters } from '@/services/bootstrap/spreadsheetStarters';
import { planSpreadsheetStarter } from '@/services/spreadsheet/starter';

describe('spreadsheet starter registry', () => {
  it('maps starter entries to deterministic spreadsheet plans', () => {
    const starters = listSpreadsheetStarters();

    expect(starters.length).toBeGreaterThan(0);
    for (const starter of starters) {
      const plan = planSpreadsheetStarter(starter.seedPrompt ?? starter.label);
      expect(plan.workbookTitle).toBeTruthy();
      expect(plan.sheetName).toBeTruthy();
      expect(plan.schema.length).toBeGreaterThan(0);
    }
  });
});
