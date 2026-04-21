/**
 * persistence.ts — Parquet ↔ IndexedDB round-trip for DuckDB tables.
 *
 * DuckDB-WASM has no built-in persistence. This module serialises tables to
 * Parquet (columnar, compact) and stores them in IndexedDB via idb-keyval.
 * On next load, the Parquet bytes are fed back into DuckDB.
 *
 * Key naming: `aura_duckdb_table_{tableName}`
 */

import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import { openConnection } from './duckdb';

const KEY_PREFIX = 'aura_duckdb_table_';

function tableKey(tableName: string): string {
  return `${KEY_PREFIX}${tableName}`;
}

/**
 * Persist a DuckDB table to IndexedDB as a Parquet buffer.
 *
 * This uses DuckDB's COPY … TO … (FORMAT PARQUET) statement with the
 * duckdb_wasm file-system, then reads the bytes back via db.copyFileToBuffer.
 */
export async function saveTableToIndexedDB(tableName: string): Promise<void> {
  const conn = await openConnection();
  const db = conn['_db' as keyof typeof conn] as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  const tmpFile = `${tableName}_export.parquet`;
  try {
    await conn.query(`COPY "${tableName}" TO '${tmpFile}' (FORMAT PARQUET)`);
    const buf = await db.copyFileToBuffer(tmpFile);
    await idbSet(tableKey(tableName), buf);
  } finally {
    try { await db.dropFile(tmpFile); } catch { /* best-effort */ }
    await conn.close();
  }
}

/**
 * Restore a DuckDB table from IndexedDB Parquet bytes.
 *
 * Returns true if data was found and the table was created, false if no
 * persisted data exists for the given table name.
 */
export async function loadTableFromIndexedDB(tableName: string): Promise<boolean> {
  const buf = await idbGet<Uint8Array>(tableKey(tableName));
  if (!buf) return false;

  const conn = await openConnection();
  const db = conn['_db' as keyof typeof conn] as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  const tmpFile = `${tableName}_import.parquet`;
  try {
    await db.registerFileBuffer(tmpFile, buf);
    await conn.query(`CREATE OR REPLACE TABLE "${tableName}" AS SELECT * FROM '${tmpFile}'`);
    return true;
  } finally {
    try { await db.dropFile(tmpFile); } catch { /* best-effort */ }
    await conn.close();
  }
}

/**
 * Remove the persisted Parquet snapshot for a table from IndexedDB.
 */
export async function deleteTableFromIndexedDB(tableName: string): Promise<void> {
  await idbDel(tableKey(tableName));
}

/**
 * List all table names that have a Parquet snapshot persisted in IndexedDB.
 * Relies on iterating known keys; returns an empty array in environments
 * where IndexedDB is unavailable.
 */
export async function listPersistedTables(): Promise<string[]> {
  try {
    const { keys } = await import('idb-keyval');
    const allKeys = await keys();
    return allKeys
      .filter((k): k is string => typeof k === 'string' && k.startsWith(KEY_PREFIX))
      .map((k) => k.slice(KEY_PREFIX.length));
  } catch {
    return [];
  }
}
