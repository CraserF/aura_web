/**
 * Linked table hydration — replaces `<div data-aura-linked-table="sheetTableName">`
 * placeholders in document HTML with live HTML tables queried from DuckDB.
 *
 * Placeholder format (AI-generated or inserted by the editor):
 *   <div
 *     data-aura-linked-table="sheet_abc123"
 *     data-aura-table-limit="20"
 *     data-aura-table-cols="Name,Amount,Status"
 *   ></div>
 */

import { openConnection } from '@/services/data';
import { useProjectStore } from '@/stores/projectStore';

// ── HTML builder ──────────────────────────────────────────────────────────────

function escapeHtml(value: unknown): string {
  if (value == null) return '';
  return String(value)
    .split('&').join('&amp;')
    .split('<').join('&lt;')
    .split('>').join('&gt;')
    .split('"').join('&quot;');
}

function buildTableHtml(tableName: string, columns: string[], rows: Record<string, unknown>[]): string {
  const thead = columns.map((c) => `<th>${escapeHtml(c)}</th>`).join('');
  const tbody = rows
    .map(
      (row) =>
        `<tr>${columns.map((c) => `<td>${escapeHtml(row[c])}</td>`).join('')}</tr>`,
    )
    .join('\n');

  return `<div class="aura-linked-table" data-aura-linked-table="${escapeHtml(tableName)}">
<table class="aura-table">
<thead><tr>${thead}</tr></thead>
<tbody>${tbody}</tbody>
</table>
</div>`;
}

// ── Query helper ──────────────────────────────────────────────────────────────

async function queryLinkedTable(
  tableName: string,
  requestedCols: string[],
  limit: number,
  customQuery?: string,
): Promise<{ columns: string[]; rows: Record<string, unknown>[] } | null> {
  const conn = await openConnection();
  try {
    // Check table exists
    try {
      await conn.query(`SELECT * FROM "${tableName}" LIMIT 0`);
    } catch {
      return null;
    }

    const query = customQuery?.trim()
      ? customQuery
      : (() => {
        const colList = requestedCols.length > 0
          ? requestedCols.map((c) => `"${c.split('"').join('""')}"`).join(', ')
          : '*';
        return `SELECT ${colList} FROM "${tableName}" LIMIT ${Math.min(limit, 200)}`;
      })();

    const result = await conn.query(query);

    const arr = result.toArray();
    if (arr.length === 0) return { columns: requestedCols, rows: [] };

    const first = arr[0]!.toJSON() as Record<string, unknown>;
    const columns = Object.keys(first);
    const rows = arr.map((r) => r.toJSON() as Record<string, unknown>);
    return { columns, rows };
  } finally {
    await conn.close();
  }
}

function resolveLinkedTableName(ref: string): string | null {
  const trimmed = ref.trim();
  if (!trimmed) return null;

  // Legacy path: already a table name.
  if (!trimmed.includes(':')) {
    return trimmed;
  }

  // New path: "spreadsheetDocId:sheetId"
  const [docId, sheetId] = trimmed.split(':');
  if (!docId || !sheetId) return null;

  const project = useProjectStore.getState().project;
  const spreadsheet = project.documents.find((d) => d.id === docId && d.type === 'spreadsheet');
  if (!spreadsheet?.workbook) return null;
  const sheet = spreadsheet.workbook.sheets.find((s) => s.id === sheetId);
  return sheet?.tableName ?? null;
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Replaces all `data-aura-linked-table` placeholder divs in HTML with live HTML tables.
 * Tables that can't be resolved are left as-is (no DuckDB table found).
 */
export async function hydrateLinkedTables(html: string): Promise<string> {
  // Quick bail-out if no placeholders
  if (!html.includes('data-aura-linked-table')) return html;

  // Parse with DOMParser in browser context, or return unchanged (e.g. in tests)
  if (typeof window === 'undefined') return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<body>${html}</body>`, 'text/html');
  const placeholders = Array.from(
    doc.body.querySelectorAll<HTMLElement>('[data-aura-linked-table]'),
  ).filter((el) => el.children.length === 0); // only un-hydrated placeholders (no inner table)

  for (const placeholder of placeholders) {
    const tableRef = placeholder.getAttribute('data-aura-linked-table') ?? '';
    if (!tableRef) continue;
    const tableName = resolveLinkedTableName(tableRef);
    if (!tableName) continue;

    const limitAttr = placeholder.getAttribute('data-aura-table-limit');
    const limit = limitAttr ? parseInt(limitAttr, 10) || 20 : 20;
    const colsAttr = placeholder.getAttribute('data-aura-table-cols') ?? '';
    const requestedCols = colsAttr ? colsAttr.split(',').map((c) => c.trim()).filter(Boolean) : [];
    const query = placeholder.getAttribute('data-aura-table-query') ?? undefined;

    const data = await queryLinkedTable(tableName, requestedCols, limit, query);
    if (!data || data.columns.length === 0) continue;

    placeholder.outerHTML = buildTableHtml(tableName, data.columns, data.rows);
  }

  return doc.body.innerHTML;
}
