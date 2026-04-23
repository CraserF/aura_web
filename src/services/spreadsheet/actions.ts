/**
 * Deterministic spreadsheet action planner.
 * Maps natural language prompts to structured sheet operations without AI calls.
 */

import type { ColumnSchema, SheetMeta } from '@/types/project';
import {
  addColumn,
  removeColumn,
  renameColumn,
  addComputedColumn,
  appendEmptyRow,
  applyFilterState,
  applySortState,
} from './workbook';
import { describeTable } from '@/services/data';

// ── Action types ──────────────────────────────────────────────────────────────

export type SheetAction =
  | { type: 'sort'; column: string; direction: 'asc' | 'desc' }
  | { type: 'addColumn'; name: string; columnType: ColumnSchema['type'] }
  | { type: 'removeColumn'; name: string }
  | { type: 'renameColumn'; from: string; to: string }
  | { type: 'addComputedColumn'; name: string; expression: string }
  | { type: 'addRows'; count: number }
  | { type: 'summarise' }
  | { type: 'filter'; query: string }
  | { type: 'clearFilter' };

export interface SheetActionResult {
  action: SheetAction;
  updatedSchema?: ColumnSchema[];
  sortState?: SheetMeta['sortState'];
  filterState?: SheetMeta['filterState'];
  userMessage: string;
}

// ── Detection regexes ─────────────────────────────────────────────────────────

const SORT_RE =
  /\bsort(?:ed)?(?:\s+the\s+table)?\s+(?:by\s+)?["']?([A-Za-z0-9_ ]+?)["']?\s+(?:in\s+)?(asc(?:ending)?|desc(?:ending)?|a[\s-]z|z[\s-]a|low(?:est)?[\s-]first|high(?:est)?[\s-]first)?\b/i;

const SORT_COL_RE =
  /\bsort(?:ed)?(?:\s+the\s+table)?\s+(?:by\s+)?["']?([A-Za-z0-9_ ]+?)["']?\s*$/i;

const ADD_COL_RE =
  /\badd\s+(?:a\s+)?(?:new\s+)?(?:(text|number|numeric|date|boolean|bool)\s+)?column\s+(?:called\s+|named\s+)?["']?([A-Za-z0-9_ ]+?)["']?\s*(?:$|to\s+the\s+sheet)/i;

const REMOVE_COL_RE =
  /\b(?:remove|delete|drop)\s+(?:the\s+)?(?:column\s+)?["']?([A-Za-z0-9_ ]+?)["']?\s+column\b|\b(?:remove|delete|drop)\s+column\s+["']?([A-Za-z0-9_ ]+?)["']?\b/i;

const RENAME_COL_RE =
  /\brename\s+(?:column\s+)?["']?([A-Za-z0-9_ ]+?)["']?\s+to\s+["']?([A-Za-z0-9_ ]+?)["']?\b/i;

const COMPUTE_COL_RE =
  /\b(?:add|compute|calculate|derive)\s+(?:a\s+)?(?:column\s+)?(?:called\s+|named\s+)?["']?([A-Za-z0-9_ ]+?)["']?\s+(?:as|=|:)\s+["']?(.+?)["']?\s*$/i;

const CLEAR_FILTER_RE =
  /\b(?:clear|remove|reset)\s+(?:all\s+)?filter/i;

const FILTER_RE =
  /\bfilter\s+(?:where\s+|rows?\s+where\s+|by\s+)?["']?(.+?)["']?\s*$/i;

const ADD_ROWS_RE =
  /\b(?:add|insert|append)\s+(\d+)\s+(?:new\s+)?rows?\b|\b(?:add|insert|append)\s+(?:a\s+)?(?:new\s+)?row\b/i;

const SUMMARISE_RE =
  /\b(?:summari[sz]e|summary|profile|describe\s+(?:this\s+)?sheet|analy[sz]e\s+(?:this\s+)?sheet)\b/i;

function descDirection(raw: string): 'asc' | 'desc' {
  const lower = raw.toLowerCase().replace(/[\s-]+/g, '');
  if (lower === 'desc' || lower === 'descending' || lower === 'za' || lower === 'highestfirst') {
    return 'desc';
  }
  return 'asc';
}

// ── Column name matching ──────────────────────────────────────────────────────

/** Case-insensitive fuzzy match of a name fragment against column names. */
export function matchColumn(schema: ColumnSchema[], fragment: string): string | null {
  const target = fragment.trim().toLowerCase();
  const exact = schema.find((c) => c.name.toLowerCase() === target);
  if (exact) return exact.name;
  const partial = schema.find(
    (c) => c.name.toLowerCase().includes(target) || target.includes(c.name.toLowerCase()),
  );
  return partial?.name ?? null;
}

// ── Main detect function ──────────────────────────────────────────────────────

export function detectSheetAction(prompt: string, schema: ColumnSchema[]): SheetAction | null {
  // Sort
  const sortMatch = SORT_RE.exec(prompt) ?? SORT_COL_RE.exec(prompt);
  if (sortMatch) {
    const colFragment = (sortMatch[1] ?? '').trim();
    const dirRaw = SORT_RE.exec(prompt)?.[2] ?? '';
    const resolvedCol = matchColumn(schema, colFragment);
    if (resolvedCol) {
      return { type: 'sort', column: resolvedCol, direction: dirRaw ? descDirection(dirRaw) : 'asc' };
    }
  }

  // Rename column (before add, so "rename X to Y" doesn't partially match "add")
  const renameMatch = RENAME_COL_RE.exec(prompt);
  if (renameMatch) {
    const from = (renameMatch[1] ?? '').trim();
    const to = (renameMatch[2] ?? '').trim();
    const resolvedFrom = matchColumn(schema, from);
    if (resolvedFrom) {
      return { type: 'renameColumn', from: resolvedFrom, to };
    }
  }

  // Add computed column (before plain add column)
  const computeMatch = COMPUTE_COL_RE.exec(prompt);
  if (computeMatch) {
    const name = (computeMatch[1] ?? '').trim();
    const expression = (computeMatch[2] ?? '').trim();
    return { type: 'addComputedColumn', name, expression };
  }

  // Add column
  const addColMatch = ADD_COL_RE.exec(prompt);
  if (addColMatch) {
    const typeHint = addColMatch[1]?.toLowerCase();
    const name = (addColMatch[2] ?? '').trim();
    let columnType: ColumnSchema['type'] = 'text';
    if (typeHint === 'number' || typeHint === 'numeric') columnType = 'number';
    else if (typeHint === 'date') columnType = 'date';
    else if (typeHint === 'boolean' || typeHint === 'bool') columnType = 'boolean';
    return { type: 'addColumn', name, columnType };
  }

  // Add rows
  const addRowsMatch = ADD_ROWS_RE.exec(prompt);
  if (addRowsMatch) {
    const parsed = Number(addRowsMatch[1] ?? 1);
    const count = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 500) : 1;
    return { type: 'addRows', count };
  }

  // Remove column
  const removeMatch = REMOVE_COL_RE.exec(prompt);
  if (removeMatch) {
    const colFragment = (removeMatch[1] ?? removeMatch[2] ?? '').trim();
    const resolvedCol = matchColumn(schema, colFragment);
    if (resolvedCol) {
      return { type: 'removeColumn', name: resolvedCol };
    }
  }

  // Clear filter
  if (CLEAR_FILTER_RE.test(prompt)) {
    return { type: 'clearFilter' };
  }

  // Filter
  const filterMatch = FILTER_RE.exec(prompt);
  if (filterMatch) {
    return { type: 'filter', query: (filterMatch[1] ?? '').trim() };
  }

  // Summarise sheet
  if (SUMMARISE_RE.test(prompt)) {
    return { type: 'summarise' };
  }

  return null;
}

// ── Execute ───────────────────────────────────────────────────────────────────

export async function executeSheetAction(
  action: SheetAction,
  sheet: SheetMeta,
): Promise<SheetActionResult> {
  switch (action.type) {
    case 'sort': {
      const sortState = applySortState(sheet, { column: action.column, direction: action.direction }).sortState;
      return {
        action,
        sortState,
        userMessage: `Sorted by **${action.column}** (${action.direction === 'asc' ? 'A → Z' : 'Z → A'}).`,
      };
    }

    case 'addRows': {
      for (let i = 0; i < action.count; i += 1) {
        await appendEmptyRow(sheet);
      }
      return {
        action,
        userMessage: `Added ${action.count} row${action.count === 1 ? '' : 's'}.`,
      };
    }

    case 'summarise': {
      const desc = await describeTable(sheet.tableName);
      const cols = desc.columns.map((c) => `${c.name} (${c.type})`).join(', ');
      return {
        action,
        userMessage: `Sheet summary: ${desc.rowCount} rows, ${desc.columns.length} columns. Columns: ${cols}`,
      };
    }

    case 'addColumn': {
      const col: ColumnSchema = { name: action.name, type: action.columnType, nullable: true };
      await addColumn(sheet, col);
      const updatedSchema = [...sheet.schema, col];
      return {
        action,
        updatedSchema,
        userMessage: `Added column **${action.name}** (${action.columnType}).`,
      };
    }

    case 'removeColumn': {
      await removeColumn(sheet, action.name);
      const updatedSchema = sheet.schema.filter((c) => c.name !== action.name);
      return {
        action,
        updatedSchema,
        userMessage: `Removed column **${action.name}**.`,
      };
    }

    case 'renameColumn': {
      await renameColumn(sheet, action.from, action.to);
      const updatedSchema = sheet.schema.map((c) =>
        c.name === action.from ? { ...c, name: action.to } : c,
      );
      return {
        action,
        updatedSchema,
        userMessage: `Renamed column **${action.from}** to **${action.to}**.`,
      };
    }

    case 'addComputedColumn': {
      await addComputedColumn(sheet, action.name, action.expression);
      const col: ColumnSchema = { name: action.name, type: 'number', nullable: true };
      const updatedSchema = [...sheet.schema, col];
      return {
        action,
        updatedSchema,
        userMessage: `Added computed column **${action.name}** = \`${action.expression}\`.`,
      };
    }

    case 'filter': {
      const filterState = applyFilterState(sheet, { query: action.query }).filterState;
      return {
        action,
        filterState,
        userMessage: `Filter applied: ${action.query}`,
      };
    }

    case 'clearFilter': {
      return {
        action,
        filterState: applyFilterState(sheet, undefined).filterState,
        userMessage: 'Filter cleared.',
      };
    }
  }
}
