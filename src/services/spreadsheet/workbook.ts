import { describeTable, ingestCsv, ingestJson, ingestXlsx, openConnection } from '@/services/data';
import type { ColumnSchema, SheetMeta } from '@/types/project';

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
    const [countResult, pageResult] = await Promise.all([
      conn.query(`SELECT COUNT(*) AS n FROM ${quoteIdentifier(sheet.tableName)}`),
      conn.query(`SELECT rowid AS __rowid__, * FROM ${quoteIdentifier(sheet.tableName)} LIMIT ${limit} OFFSET ${offset}`),
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
