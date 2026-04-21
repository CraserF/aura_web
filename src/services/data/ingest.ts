/**
 * ingest.ts — CSV / JSON / XLSX ingestion pipeline for DuckDB.
 *
 * - CSV and JSON are handled natively by DuckDB via registerFileText().
 * - XLSX requires SheetJS (xlsx) to pre-parse to CSV, since DuckDB doesn't
 *   support XLSX natively.
 *
 * All functions create a new DuckDB table (or replace an existing one) with
 * the provided `tableName` using the ingested data.
 */

import { openConnection } from './duckdb';

// ── CSV ────────────────────────────────────────────────────────────────────────

/**
 * Ingest a CSV string into DuckDB as table `tableName`.
 * DuckDB auto-detects column types, delimiters, and headers.
 */
export async function ingestCsv(tableName: string, csvContent: string): Promise<void> {
  const conn = await openConnection();
  const db = conn['_db' as keyof typeof conn] as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  const fileName = `${tableName}_import.csv`;
  try {
    await db.registerFileText(fileName, csvContent);
    await conn.query(
      `CREATE OR REPLACE TABLE "${tableName}" AS SELECT * FROM read_csv_auto('${fileName}')`,
    );
  } finally {
    try { await db.dropFile(fileName); } catch { /* best-effort */ }
    await conn.close();
  }
}

// ── JSON ───────────────────────────────────────────────────────────────────────

/**
 * Ingest a JSON string (array of objects) into DuckDB as table `tableName`.
 * The JSON must be an array at the top level.
 */
export async function ingestJson(tableName: string, jsonContent: string): Promise<void> {
  const conn = await openConnection();
  const db = conn['_db' as keyof typeof conn] as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  const fileName = `${tableName}_import.json`;
  try {
    await db.registerFileText(fileName, jsonContent);
    await conn.query(
      `CREATE OR REPLACE TABLE "${tableName}" AS SELECT * FROM read_json_auto('${fileName}')`,
    );
  } finally {
    try { await db.dropFile(fileName); } catch { /* best-effort */ }
    await conn.close();
  }
}

// ── XLSX ───────────────────────────────────────────────────────────────────────

/**
 * Ingest an XLSX ArrayBuffer into DuckDB by pre-parsing to CSV via SheetJS.
 * SheetJS (xlsx) is loaded lazily to keep the initial bundle small.
 *
 * @param tableName  Target DuckDB table name.
 * @param buffer     Raw XLSX bytes as ArrayBuffer.
 * @param sheetName  Worksheet name. Defaults to the first sheet.
 */
export async function ingestXlsx(
  tableName: string,
  buffer: ArrayBuffer,
  sheetName?: string,
): Promise<void> {
  // Lazy-load SheetJS to avoid bundling it unless XLSX is actually used.
  const XLSX = await import('xlsx');

  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = sheetName
    ? workbook.Sheets[sheetName]
    : workbook.Sheets[workbook.SheetNames[0] ?? ''];

  if (!sheet) {
    throw new Error(`XLSX sheet "${sheetName ?? '(first)'}" not found in workbook.`);
  }

  const csv = XLSX.utils.sheet_to_csv(sheet, { FS: ',', blankrows: false });
  await ingestCsv(tableName, csv);
}
