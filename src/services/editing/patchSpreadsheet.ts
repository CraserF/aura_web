import type { ProjectDocument, SheetMeta } from '@/types/project';

import type { ResolvedTarget, TargetSelector } from '@/services/editing/types';

function matchSheetName(sheet: SheetMeta, needle: string): boolean {
  return sheet.name.toLowerCase().includes(needle.toLowerCase());
}

export function resolveSpreadsheetTargets(
  document: ProjectDocument,
  selectors: TargetSelector[],
): ResolvedTarget[] {
  if (document.type !== 'spreadsheet' || !document.workbook) {
    return [];
  }

  const activeSheet = document.workbook.sheets[document.workbook.activeSheetIndex];
  const resolved: ResolvedTarget[] = [];

  for (const selector of selectors) {
    if (selector.type === 'active-sheet' && activeSheet) {
      resolved.push({
        selector,
        artifactType: 'spreadsheet',
        sheetId: activeSheet.id,
        label: selector.label ?? `Sheet ${activeSheet.name}`,
        matchedText: activeSheet.name,
      });
      continue;
    }

    if (selector.type === 'sheet-name' && selector.value) {
      const matchedSheet = document.workbook.sheets.find((sheet) => matchSheetName(sheet, selector.value!));
      if (matchedSheet) {
        resolved.push({
          selector,
          artifactType: 'spreadsheet',
          sheetId: matchedSheet.id,
          label: selector.label ?? `Sheet ${matchedSheet.name}`,
          matchedText: matchedSheet.name,
        });
      }
      continue;
    }

    if ((selector.type === 'column' || selector.type === 'formula-column') && selector.value) {
      const sheets = selector.type === 'formula-column'
        ? document.workbook.sheets.filter((sheet) => sheet.formulas.some((formula) => formula.column.toLowerCase() === selector.value!.toLowerCase()))
        : document.workbook.sheets.filter((sheet) => sheet.schema.some((column) => column.name.toLowerCase() === selector.value!.toLowerCase()));
      sheets.forEach((sheet) => {
        resolved.push({
          selector,
          artifactType: 'spreadsheet',
          sheetId: sheet.id,
          label: selector.label ?? `${sheet.name} → ${selector.value}`,
          matchedText: selector.value,
        });
      });
      continue;
    }

    if (selector.type === 'range' || selector.type === 'filter-state' || selector.type === 'sort-state') {
      const sheet = activeSheet;
      if (sheet) {
        resolved.push({
          selector,
          artifactType: 'spreadsheet',
          sheetId: sheet.id,
          label: selector.label ?? `${sheet.name} → ${selector.value ?? selector.type}`,
          matchedText: selector.value,
        });
      }
    }
  }

  return resolved;
}
