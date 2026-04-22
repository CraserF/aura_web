import { describeTable, ingestCsv, ingestJson, ingestXlsx, openConnection } from '@/services/data';
import type { ColumnSchema, FilterState, SheetMeta, SortState } from '@/types/project';

export interface SpreadsheetViewportRow {
  rowid: number;
  values: Record<string, unknown>;
}

export interface SpreadsheetViewport {
  columns: string[];
  rows: SpreadsheetViewportRow[];
  totalRows: number;
}

export function createDefaultSheet(name = 'Sheet 1'): SheetMeta {
  return {
    id: crypto.randomUUID(),
    name,
    tableName: `sheet_${crypto.randomUUID().replace(/-/g, '')}`,
    schema: [
      { name: 'A', type: 'text', nullable: true },
      { name: 'B', type: 'text', nullable: true },
      { name: 'C', type: 'text', nullable: true },
    ],
    frozenRows: 1,
    frozenCols: 0,
    columnWidths: {},
    formulas: [],
  };
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.split('"').join('""')}"`;
}

function sqlLiteral(value: string): string {
  return `'${value.split("'").join("''")}'`;
}

function sqlValue(value: unknown, type: ColumnSchema['type']): string {
  if (value == null || value === '') {
    return 'NULL';
  }

  if (type === 'number') {
    const numeric = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numeric) ? String(numeric) : 'NULL';
  }

  if (type === 'boolean') {
    if (typeof value === 'boolean') {
      return value ? 'TRUE' : 'FALSE';
    }

    const normalized = String(value).trim().toLowerCase();
    if (normalized === 'true' || normalized === 'yes') return 'TRUE';
    if (normalized === 'false' || normalized === 'no') return 'FALSE';
    return 'NULL';
  }

  return sqlLiteral(String(value));
}

function columnSqlType(type: ColumnSchema['type']): string {
  switch (type) {
    case 'number':
      return 'DOUBLE';
    case 'boolean':
      return 'BOOLEAN';
    case 'date':
      return 'VARCHAR';
    case 'text':
    default:
      return 'VARCHAR';
  }
}

type DuckDbFileApi = {
  copyFileToBuffer?: (fileName: string) => Promise<Uint8Array>;
  registerFileBuffer?: (fileName: string, data: Uint8Array) => Promise<void>;
  dropFile?: (fileName: string) => Promise<void>;
};

function getDuckDbFileApi(connection: object): DuckDbFileApi {
  return ((connection as { _db?: DuckDbFileApi })._db) ?? {};
}

function mapDuckTypeToSchemaType(type: string): ColumnSchema['type'] {
  const normalized = type.toUpperCase();
  if (normalized.includes('INT') || normalized.includes('DECIMAL') || normalized.includes('DOUBLE') || normalized.includes('FLOAT')) {
    return 'number';
  }
  if (normalized.includes('DATE') || normalized.includes('TIME')) {
    return 'date';
  }
  if (normalized === 'BOOLEAN' || normalized === 'BOOL') {
    return 'boolean';
  }
  return 'text';
}

export async function ensureSheetTable(sheet: SheetMeta): Promise<ColumnSchema[]> {
  const conn = await openConnection();
  try {
    try {
      await conn.query(`SELECT * FROM ${quoteIdentifier(sheet.tableName)} LIMIT 0`);
      const description = await describeTable(sheet.tableName);
      return description.columns.map((column) => ({
        name: column.name,
        type: mapDuckTypeToSchemaType(column.type),
        nullable: true,
      }));
    } catch {
      const schema = sheet.schema.length > 0 ? sheet.schema : createDefaultSheet(sheet.name).schema;
      const columnSql = schema
        .map((column) => `${quoteIdentifier(column.name)} VARCHAR`)
        .join(', ');
      await conn.query(`CREATE OR REPLACE TABLE ${quoteIdentifier(sheet.tableName)} (${columnSql})`);
      return schema;
    }
  } finally {
    await conn.close();
  }
}

export async function loadViewport(sheet: SheetMeta, offset: number, limit: number): Promise<SpreadsheetViewport> {
  const conn = await openConnection();
  try {
    const whereClause = sheet.filterState?.query?.trim()
      ? ` WHERE ${sheet.filterState.query.trim()}`
      : '';
    const orderClause = sheet.sortState
      ? ` ORDER BY ${quoteIdentifier(sheet.sortState.column)} ${sheet.sortState.direction.toUpperCase()}`
      : '';

    const [countResult, pageResult] = await Promise.all([
      conn.query(`SELECT COUNT(*) AS n FROM ${quoteIdentifier(sheet.tableName)}${whereClause}`),
      conn.query(`SELECT rowid AS __rowid__, * FROM ${quoteIdentifier(sheet.tableName)}${whereClause}${orderClause} LIMIT ${limit} OFFSET ${offset}`),
    ]);

    const totalRows = Number((countResult.toArray()[0]?.toJSON() as { n: number } | undefined)?.n ?? 0);
    const rows = pageResult.toArray().map((row) => {
      const json = row.toJSON() as Record<string, unknown>;
      const rowid = Number(json.__rowid__ ?? 0);
      const values: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(json)) {
        if (key !== '__rowid__') values[key] = value;
      }
      return { rowid, values };
    });

    const columns = sheet.schema.map((column) => column.name);

    return {
      columns,
      rows,
      totalRows,
    };
  } finally {
    await conn.close();
  }
}

export function applySortState(sheet: SheetMeta, sort: SortState | undefined): SheetMeta {
  return {
    ...sheet,
    sortState: sort,
  };
}

export function applyFilterState(sheet: SheetMeta, filter: FilterState | undefined): SheetMeta {
  return {
    ...sheet,
    filterState: filter,
  };
}

export async function updateCellValue(sheet: SheetMeta, rowid: number, columnName: string, value: string): Promise<void> {
  const conn = await openConnection();
  try {
    await conn.query(
      `UPDATE ${quoteIdentifier(sheet.tableName)} SET ${quoteIdentifier(columnName)} = ${sqlLiteral(value)} WHERE rowid = ${rowid}`,
    );
  } finally {
    await conn.close();
  }
}

export async function appendEmptyRow(sheet: SheetMeta): Promise<void> {
  const conn = await openConnection();
  try {
    const columnNames = sheet.schema.map((column) => quoteIdentifier(column.name));
    if (columnNames.length === 0) return;
    const values = columnNames.map(() => 'NULL');
    await conn.query(
      `INSERT INTO ${quoteIdentifier(sheet.tableName)} (${columnNames.join(', ')}) VALUES (${values.join(', ')})`,
    );
  } finally {
    await conn.close();
  }
}

export async function replaceSheetData(
  sheet: SheetMeta,
  schema: ColumnSchema[],
  rows: Array<Record<string, unknown>>,
): Promise<ColumnSchema[]> {
  const conn = await openConnection();

  try {
    const nextSchema = schema.length > 0 ? schema : createDefaultSheet(sheet.name).schema;
    const columnSql = nextSchema
      .map((column) => `${quoteIdentifier(column.name)} ${columnSqlType(column.type)}${column.nullable ? '' : ' NOT NULL'}`)
      .join(', ');

    await conn.query(`CREATE OR REPLACE TABLE ${quoteIdentifier(sheet.tableName)} (${columnSql})`);

    if (rows.length > 0) {
      const columnNames = nextSchema.map((column) => quoteIdentifier(column.name)).join(', ');
      const valuesSql = rows
        .map((row) => `(${nextSchema.map((column) => sqlValue(row[column.name], column.type)).join(', ')})`)
        .join(', ');

      await conn.query(
        `INSERT INTO ${quoteIdentifier(sheet.tableName)} (${columnNames}) VALUES ${valuesSql}`,
      );
    }

    return nextSchema;
  } finally {
    await conn.close();
  }
}

export async function ingestFileToSheet(sheet: SheetMeta, file: File): Promise<ColumnSchema[]> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'csv') {
    const text = await file.text();
    await ingestCsv(sheet.tableName, text);
  } else if (extension === 'json') {
    const text = await file.text();
    await ingestJson(sheet.tableName, text);
  } else if (extension === 'xlsx') {
    const buffer = await file.arrayBuffer();
    await ingestXlsx(sheet.tableName, buffer);
  } else {
    throw new Error('Unsupported file type. Use CSV, JSON, or XLSX.');
  }

  const description = await describeTable(sheet.tableName);
  return description.columns.map((column) => ({
    name: column.name,
    type: mapDuckTypeToSchemaType(column.type),
    nullable: true,
  }));
}

// ── Structural column operations ─────────────────────────────────────────────

export async function addColumn(sheet: SheetMeta, column: ColumnSchema): Promise<void> {
  const conn = await openConnection();
  try {
    await conn.query(
      `ALTER TABLE ${quoteIdentifier(sheet.tableName)} ADD COLUMN ${quoteIdentifier(column.name)} ${columnSqlType(column.type)}`,
    );
  } finally {
    await conn.close();
  }
}

export async function removeColumn(sheet: SheetMeta, columnName: string): Promise<void> {
  const conn = await openConnection();
  try {
    await conn.query(
      `ALTER TABLE ${quoteIdentifier(sheet.tableName)} DROP COLUMN ${quoteIdentifier(columnName)}`,
    );
  } finally {
    await conn.close();
  }
}

export async function renameColumn(sheet: SheetMeta, oldName: string, newName: string): Promise<void> {
  const conn = await openConnection();
  try {
    await conn.query(
      `ALTER TABLE ${quoteIdentifier(sheet.tableName)} RENAME COLUMN ${quoteIdentifier(oldName)} TO ${quoteIdentifier(newName)}`,
    );
  } finally {
    await conn.close();
  }
}

export async function addComputedColumn(
  sheet: SheetMeta,
  columnName: string,
  expression: string,
): Promise<void> {
  const conn = await openConnection();
  try {
    // Validate expression before mutating schema.
    await conn.query(
      `EXPLAIN SELECT ${expression} FROM ${quoteIdentifier(sheet.tableName)} LIMIT 1`,
    );

    // Add the column first, then populate it
    await conn.query(
      `ALTER TABLE ${quoteIdentifier(sheet.tableName)} ADD COLUMN ${quoteIdentifier(columnName)} DOUBLE`,
    );
    await conn.query(
      `UPDATE ${quoteIdentifier(sheet.tableName)} SET ${quoteIdentifier(columnName)} = ${expression}`,
    );
  } finally {
    await conn.close();
  }
}

export async function exportSheetParquet(tableName: string): Promise<Uint8Array> {
  const conn = await openConnection();
  const db = getDuckDbFileApi(conn);
  const tempFile = `${tableName}_aura_export.parquet`;

  try {
    await conn.query(`COPY ${quoteIdentifier(tableName)} TO '${tempFile}' (FORMAT PARQUET)`);
    if (!db.copyFileToBuffer) {
      throw new Error('DuckDB file export API is unavailable.');
    }
    return await db.copyFileToBuffer(tempFile);
  } finally {
    try {
      await db.dropFile?.(tempFile);
    } catch {
      // best effort cleanup
    }
    await conn.close();
  }
}

export async function importSheetParquet(tableName: string, bytes: Uint8Array): Promise<void> {
  const conn = await openConnection();
  const db = getDuckDbFileApi(conn);
  const tempFile = `${tableName}_aura_import.parquet`;

  try {
    if (!db.registerFileBuffer) {
      throw new Error('DuckDB file import API is unavailable.');
    }
    await db.registerFileBuffer(tempFile, bytes);
    await conn.query(`CREATE OR REPLACE TABLE ${quoteIdentifier(tableName)} AS SELECT * FROM '${tempFile}'`);
  } finally {
    try {
      await db.dropFile?.(tempFile);
    } catch {
      // best effort cleanup
    }
    await conn.close();
  }
}
