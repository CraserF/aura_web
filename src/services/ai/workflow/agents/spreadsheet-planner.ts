import type { ColumnSchema, QueryViewFilter, SheetMeta, WorkbookMeta } from '@/types/project';

import { detectSheetAction, matchColumn } from '@/services/spreadsheet/actions';
import type { SpreadsheetPlan, SpreadsheetQueryViewPlan } from '@/services/spreadsheet/plans';
import { canCreateSpreadsheetFromPrompt, planSpreadsheetStarter } from '@/services/spreadsheet/starter';

const CHART_INTENT_RE = /\b(chart|graph|visuali[sz]e|plot|diagram)\b/i;
const QUERY_INTENT_RE = /\b(query\s+view|derived\s+sheet|view\b|summary\s+sheet|summari[sz]e\s+.+\s+by)\b/i;
const FORMULA_INTENT_RE = /\b(?:computed|formula)\s+column\b|\b(?:add|create|make|compute|calculate|derive)\b.+\b(?:column)\b.+\b(?:as|using|from)\b/i;
const GROUP_SUMMARY_RE = /\b(?:sum|total|average|avg|count|min|max)\s+["']?([A-Za-z0-9_ ]+?)["']?\s+by\s+["']?([A-Za-z0-9_ ]+?)["']?\b/i;
const SELECT_COLUMNS_RE = /\b(?:select|show|with columns?|selecting)\s+([^.;\n]+?)(?=\s+\b(?:where|group by|sorted by|sort by|called|named|as)\b|$)/i;
const SOURCE_SHEET_RE = /\bfrom\s+["']?([A-Za-z0-9_ ]+?)["']?(?=\s+\b(?:select|show|with|where|group by|sorted by|sort by|called|named|as)\b|$)/i;
const OUTPUT_SHEET_RE = /\b(?:called|named|as)\s+["']?([A-Za-z0-9_ ]+?)["']?(?=\s+\b(?:from|select|show|with|where|group by|sorted by|sort by)\b|$)/i;
const SORT_RE = /\b(?:sort(?:ed)?\s+by|ordered\s+by)\s+["']?([A-Za-z0-9_ ]+?)["']?\s*(asc|ascending|desc|descending)?\b/i;
const WHERE_RE = /\bwhere\s+["']?([A-Za-z0-9_ ]+?)["']?\s*(=|!=|>=|<=|>|<|contains)\s*["']?([^"'\n]+?)["']?(?=\s+\b(?:and|or|group by|sort by|sorted by|called|named|as)\b|$)/ig;
const GROUP_BY_RE = /\bgroup\s+by\s+([^.;\n]+?)(?=\s+\b(?:sort by|sorted by|called|named|as)\b|$)/i;
const COLUMN_NAME_RE = /(?:called|named)\s+["']?([A-Za-z0-9_ ]+?)["']?(?=\s+\b(?:as|using|from)\b|$)/i;
const IF_THEN_ELSE_RE = /\bif\s+["']?([A-Za-z0-9_ ]+?)["']?\s*(=|!=|>=|<=|>|<)\s*["']?([^"']+?)["']?\s+then\s+([-+]?\d+(?:\.\d+)?)\s+else\s+([-+]?\d+(?:\.\d+)?)\b/i;
const BINARY_RE = /\b["']?([A-Za-z0-9_ ]+?)["']?\s+(plus|minus|times|multiplied by|x|divided by|over)\s+["']?([A-Za-z0-9_ ]+?)["']?\b/i;
const RAW_EXPRESSION_RE = /^[A-Za-z0-9_ "()*/+\-.,]+$/;

function parseColumnList(fragment: string, schema: ColumnSchema[]): string[] {
  return fragment
    .split(/,|\band\b/ig)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => matchColumn(schema, part) ?? part.trim())
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index);
}

function findActiveSheet(workbook: WorkbookMeta | null): SheetMeta | null {
  if (!workbook) return null;
  return workbook.sheets[workbook.activeSheetIndex] ?? null;
}

function findSheetByName(workbook: WorkbookMeta, fragment: string): SheetMeta | null {
  const normalized = fragment.trim().toLowerCase();
  return workbook.sheets.find((sheet) => sheet.name.toLowerCase() === normalized)
    ?? workbook.sheets.find((sheet) => sheet.name.toLowerCase().includes(normalized))
    ?? null;
}

function inferFormulaExpression(rawExpression: string, schema: ColumnSchema[]): {
  expression: string;
  dependsOn: string[];
  expressionLabel: string;
} | null {
  const conditional = IF_THEN_ELSE_RE.exec(rawExpression);
  if (conditional) {
    const column = matchColumn(schema, conditional[1] ?? '');
    if (!column) return null;
    const comparator = conditional[2] ?? '=';
    const rawValue = (conditional[3] ?? '').trim();
    const thenValue = conditional[4] ?? '';
    const elseValue = conditional[5] ?? '';
    const value = Number(rawValue);
    const sqlValue = Number.isFinite(value) ? String(value) : `'${rawValue.replace(/'/g, "''")}'`;
    return {
      expression: `CASE WHEN "${column}" ${comparator} ${sqlValue} THEN ${thenValue} ELSE ${elseValue} END`,
      dependsOn: [column],
      expressionLabel: rawExpression.trim(),
    };
  }

  const binary = BINARY_RE.exec(rawExpression);
  if (binary) {
    const left = matchColumn(schema, binary[1] ?? '');
    const operatorRaw = (binary[2] ?? '').toLowerCase();
    const right = matchColumn(schema, binary[3] ?? '');
    if (!left || !right) return null;
    const operator = operatorRaw.includes('minus')
      ? '-'
      : operatorRaw.includes('times') || operatorRaw === 'x'
        ? '*'
        : operatorRaw.includes('divided') || operatorRaw === 'over'
          ? '/'
          : '+';
    const expression = operator === '/'
      ? `CASE WHEN "${right}" IS NULL OR "${right}" = 0 THEN NULL ELSE "${left}" / "${right}" END`
      : `"${left}" ${operator} "${right}"`;
    return {
      expression,
      dependsOn: [left, right],
      expressionLabel: rawExpression.trim(),
    };
  }

  const lower = rawExpression.toLowerCase();
  if (lower.startsWith('sum of ') || lower.startsWith('average of ')) {
    const operation = lower.startsWith('average of ') ? 'avg' : 'sum';
    const fragment = rawExpression.replace(/^(sum|average) of /i, '');
    const columns = parseColumnList(fragment, schema);
    if (columns.length >= 2) {
      const expression = operation === 'avg'
        ? `(${columns.map((column) => `"${column}"`).join(' + ')}) / ${columns.length}`
        : columns.map((column) => `"${column}"`).join(' + ');
      return {
        expression,
        dependsOn: columns,
        expressionLabel: rawExpression.trim(),
      };
    }
  }

  if (RAW_EXPRESSION_RE.test(rawExpression.trim())) {
    const dependsOn = schema
      .map((column) => column.name)
      .filter((column) => new RegExp(`\\b${column.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(rawExpression));
    if (dependsOn.length > 0) {
      let expression = rawExpression.trim();
      for (const column of dependsOn) {
        expression = expression.replace(new RegExp(`\\b${column.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'), `"${column}"`);
      }
      return {
        expression,
        dependsOn,
        expressionLabel: rawExpression.trim(),
      };
    }
  }

  return null;
}

function planFormulaColumn(prompt: string, activeSheet: SheetMeta): SpreadsheetPlan | null {
  if (!FORMULA_INTENT_RE.test(prompt)) {
    return null;
  }

  const nameMatch = COLUMN_NAME_RE.exec(prompt);
  const expressionMatch = prompt.match(/\b(?:as|using|from)\s+(.+)$/i);
  const outputColumnName = (nameMatch?.[1] ?? '').trim();
  const rawExpression = (expressionMatch?.[1] ?? '').trim();

  if (!outputColumnName || !rawExpression) {
    return {
      kind: 'create-formula-column',
      targets: [{
        sheetId: activeSheet.id,
        sheetName: activeSheet.name,
      }],
      requiresClarification: true,
      clarification: 'Tell me the new column name and the formula to calculate.',
      canAugmentProject: false,
    };
  }

  const formula = inferFormulaExpression(rawExpression, activeSheet.schema);
  if (!formula) {
    return {
      kind: 'create-formula-column',
      targets: [{
        sheetId: activeSheet.id,
        sheetName: activeSheet.name,
        columnName: outputColumnName,
      }],
      requiresClarification: true,
      clarification: 'I can create formulas for arithmetic, ratios, conditional numeric flags, and row-wise sums/averages over existing columns. Please restate the formula in that form.',
      canAugmentProject: false,
    };
  }

  return {
    kind: 'create-formula-column',
    targets: [{
      sheetId: activeSheet.id,
      sheetName: activeSheet.name,
      columnName: outputColumnName,
    }],
    requiresClarification: false,
    canAugmentProject: true,
    formula: {
      outputColumnName,
      ...formula,
    },
  };
}

function coerceFilterValue(raw: string, column?: ColumnSchema): string | number | boolean {
  if (column?.type === 'number') {
    const value = Number(raw);
    if (Number.isFinite(value)) return value;
  }
  if (column?.type === 'boolean') {
    if (/^(true|yes)$/i.test(raw)) return true;
    if (/^(false|no)$/i.test(raw)) return false;
  }
  return raw.trim();
}

function buildQueryPlan(prompt: string, workbook: WorkbookMeta, activeSheet: SheetMeta): SpreadsheetPlan | null {
  if (!QUERY_INTENT_RE.test(prompt)) {
    return null;
  }

  const sourceSheet = (() => {
    const sourceMatch = SOURCE_SHEET_RE.exec(prompt);
    if (!sourceMatch?.[1]) return activeSheet;
    return findSheetByName(workbook, sourceMatch[1]) ?? activeSheet;
  })();

  const outputSheetName = (OUTPUT_SHEET_RE.exec(prompt)?.[1] ?? '').trim()
    || `${sourceSheet.name} View`;

  const selectColumns = (() => {
    const match = SELECT_COLUMNS_RE.exec(prompt);
    if (!match?.[1]) return sourceSheet.schema.map((column) => column.name);
    const resolved = parseColumnList(match[1], sourceSheet.schema);
    return resolved.length > 0 ? resolved : sourceSheet.schema.map((column) => column.name);
  })();

  const filters: QueryViewFilter[] = [];
  for (const match of prompt.matchAll(WHERE_RE)) {
    const column = matchColumn(sourceSheet.schema, match[1] ?? '');
    if (!column) continue;
    const schemaColumn = sourceSheet.schema.find((entry) => entry.name === column);
    filters.push({
      column,
      operator: (match[2] ?? '=') as QueryViewFilter['operator'],
      value: coerceFilterValue(match[3] ?? '', schemaColumn),
    });
  }

  const sortMatch = SORT_RE.exec(prompt);
  const sortColumn = sortMatch?.[1] ? matchColumn(sourceSheet.schema, sortMatch[1]) : null;
  const sort = sortColumn
    ? {
        column: sortColumn,
        direction: /desc/i.test(sortMatch?.[2] ?? '') ? 'desc' as const : 'asc' as const,
      }
    : undefined;

  const groupBy = (() => {
    const groupMatch = GROUP_BY_RE.exec(prompt);
    if (!groupMatch?.[1]) {
      const summaryMatch = GROUP_SUMMARY_RE.exec(prompt);
      if (!summaryMatch?.[2]) return undefined;
      const groupColumn = matchColumn(sourceSheet.schema, summaryMatch[2]);
      return groupColumn ? [groupColumn] : undefined;
    }
    const columns = parseColumnList(groupMatch[1], sourceSheet.schema);
    return columns.length > 0 ? columns : undefined;
  })();

  const aggregates = (() => {
    const summaryMatch = GROUP_SUMMARY_RE.exec(prompt);
    if (!summaryMatch) return undefined;
    const targetColumn = matchColumn(sourceSheet.schema, summaryMatch[1] ?? '');
    const groupingColumn = matchColumn(sourceSheet.schema, summaryMatch[2] ?? '');
    if (!targetColumn || !groupingColumn) return undefined;
    return [{
      operation: 'sum' as const,
      column: targetColumn,
      alias: `Total ${targetColumn}`,
    }];
  })();

  const queryView: SpreadsheetQueryViewPlan = {
    sourceSheetId: sourceSheet.id,
    sourceSheetName: sourceSheet.name,
    outputSheetName,
    selectColumns,
    filters,
    ...(groupBy?.length ? { groupBy } : {}),
    ...(aggregates?.length ? { aggregates } : {}),
    ...(sort ? { sort } : {}),
  };

  return {
    kind: 'create-query-view',
    targets: [{
      sheetId: sourceSheet.id,
      sheetName: sourceSheet.name,
      sourceSheetId: sourceSheet.id,
    }],
    requiresClarification: false,
    canAugmentProject: true,
    queryView,
  };
}

export interface SpreadsheetPlannerInput {
  prompt: string;
  activeWorkbook: WorkbookMeta | null;
  activeDocumentId: string | null;
  isDefaultSheet: boolean;
}

export function planSpreadsheetWorkflow(input: SpreadsheetPlannerInput): SpreadsheetPlan | null {
  const { prompt, activeWorkbook, activeDocumentId, isDefaultSheet } = input;
  const activeSheet = findActiveSheet(activeWorkbook);
  const activeSheetIsPopulated = !!activeWorkbook && !isDefaultSheet && !!activeSheet;

  if (CHART_INTENT_RE.test(prompt) && activeSheetIsPopulated && activeSheet) {
    return {
      kind: 'create-chart-pack',
      targets: [{
        documentId: activeDocumentId ?? undefined,
        sheetId: activeSheet.id,
        sheetName: activeSheet.name,
      }],
      requiresClarification: false,
      canAugmentProject: true,
      chartTarget: {
        sheetId: activeSheet.id,
        sheetName: activeSheet.name,
      },
    };
  }

  if (activeSheetIsPopulated && activeWorkbook && activeSheet) {
    const queryPlan = buildQueryPlan(prompt, activeWorkbook, activeSheet);
    if (queryPlan) {
      return queryPlan;
    }

    const formulaPlan = planFormulaColumn(prompt, activeSheet);
    if (formulaPlan) {
      return formulaPlan;
    }

    const action = detectSheetAction(prompt, activeSheet.schema);
    if (action) {
      return {
        kind: action.type === 'summarise' ? 'summarize-sheet' : 'sheet-action',
        targets: [{
          documentId: activeDocumentId ?? undefined,
          sheetId: activeSheet.id,
          sheetName: activeSheet.name,
        }],
        requiresClarification: false,
        canAugmentProject: action.type !== 'summarise',
        action,
        ...(action.type === 'summarise'
          ? {
              summaryTarget: {
                sheetId: activeSheet.id,
                sheetName: activeSheet.name,
              },
            }
          : {}),
      };
    }
  }

  if (!canCreateSpreadsheetFromPrompt(prompt)) {
    return null;
  }

  const starterPlan = planSpreadsheetStarter(prompt);
  return {
    kind: 'create-workbook',
    targets: [],
    requiresClarification: false,
    canAugmentProject: true,
    starterPlan,
    starterKind: starterPlan.starterKind,
  };
}
