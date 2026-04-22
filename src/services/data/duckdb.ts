/**
 * duckdb.ts — Lazy DuckDB-WASM singleton.
 *
 * DuckDB-WASM is ~10 MB gzipped. It must NEVER be loaded at app startup.
 * This module is lazy-loaded via dynamic import() the first time getDB() is
 * called. Subsequent calls return the cached instance instantly.
 *
 * We bundle the worker and WASM locally via Vite `?url` imports to avoid
 * cross-origin Worker failures that occur with the CDN bundle approach.
 *
 * Usage:
 *   const db = await getDB();
 *   const conn = await db.connect();
 *   await conn.query("SELECT 42 AS answer");
 *   await conn.close();
 */

import type { AsyncDuckDB, AsyncDuckDBConnection } from '@duckdb/duckdb-wasm';
import duckdbWorkerUrl from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url';
import duckdbWasmUrl from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';

let dbInstance: AsyncDuckDB | null = null;
let initPromise: Promise<AsyncDuckDB> | null = null;

async function initDB(): Promise<AsyncDuckDB> {
  const duckdb = await import('@duckdb/duckdb-wasm');

  const worker = new Worker(duckdbWorkerUrl);
  const logger = new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING);
  const db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(duckdbWasmUrl);

  return db;
}

/**
 * Get the shared DuckDB instance, initializing lazily on first call.
 * Safe to call concurrently — all callers await the same init promise.
 */
export async function getDB(): Promise<AsyncDuckDB> {
  if (dbInstance) return dbInstance;
  if (!initPromise) {
    initPromise = initDB().then((db) => {
      dbInstance = db;
      return db;
    });
  }
  return initPromise;
}

/**
 * Open a new connection to the shared DuckDB instance.
 * Remember to `conn.close()` after use.
 */
export async function openConnection(): Promise<AsyncDuckDBConnection> {
  const db = await getDB();
  return db.connect();
}

/**
 * Execute a SQL statement and return all rows as plain objects.
 * Opens and closes a connection automatically.
 */
export async function query<T = Record<string, unknown>>(sql: string): Promise<T[]> {
  const conn = await openConnection();
  try {
    const result = await conn.query(sql);
    return result.toArray().map((row) => row.toJSON()) as T[];
  } finally {
    await conn.close();
  }
}

/**
 * Destroy the DuckDB instance (useful in tests or on app teardown).
 * After calling this, the next call to getDB() will re-initialize.
 */
export async function destroyDB(): Promise<void> {
  if (dbInstance) {
    await dbInstance.terminate();
    dbInstance = null;
  }
  initPromise = null;
}
