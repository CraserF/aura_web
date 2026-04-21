/**
 * duckdb.ts — Lazy DuckDB-WASM singleton.
 *
 * DuckDB-WASM is ~10 MB gzipped. It must NEVER be loaded at app startup.
 * This module is lazy-loaded via dynamic import() the first time getDB() is
 * called. Subsequent calls return the cached instance instantly.
 *
 * Usage:
 *   const db = await getDB();
 *   const conn = await db.connect();
 *   await conn.query("SELECT 42 AS answer");
 *   await conn.close();
 */

import type { AsyncDuckDB, AsyncDuckDBConnection } from '@duckdb/duckdb-wasm';

let dbInstance: AsyncDuckDB | null = null;
let initPromise: Promise<AsyncDuckDB> | null = null;

async function initDB(): Promise<AsyncDuckDB> {
  // Dynamic import — ensures DuckDB WASM is never included in the initial bundle.
  const duckdb = await import('@duckdb/duckdb-wasm');

  // Use CDN bundles for zero Vite config. For self-hosted, replace with ?url imports.
  // jsDelivr bundles are HTTPS-only and safe to use in production.
  const CDN_BUNDLES = duckdb.getJsDelivrBundles();
  const bundle = await duckdb.selectBundle(CDN_BUNDLES);

  const workerUrl = bundle.mainWorker;
  if (!workerUrl) throw new Error('DuckDB: no worker URL in bundle');

  const worker = new Worker(workerUrl);
  const logger = new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING);
  const db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

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
