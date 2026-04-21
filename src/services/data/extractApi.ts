/**
 * extractApi.ts — Analytical extract tools for the DuckDB data layer.
 *
 * These functions are designed to be called by AI agent tools (M3-B) as well
 * as directly from the application. They follow the prompt contract in the
 * charts integration plan: LLM sees summaries/samples/aggregates, never full
 * raw tables.
 *
 * All functions open and close their own connection; callers do not manage
 * connection lifecycle.
 */

import { openConnection } from './duckdb';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ColumnProfile {
  name: string;
  type: string;
  nullCount: number;
  uniqueCount: number;
  min: unknown;
  max: unknown;
  mean: number | null;
}

export interface TableDescription {
  tableName: string;
  rowCount: number;
  columnCount: number;
  columns: ColumnProfile[];
}

// ── describeTable ──────────────────────────────────────────────────────────────

/**
 * Returns schema + row count + per-column profiles for `tableName`.
 * Safe to feed directly into a prompt (compact, token-efficient).
 */
export async function describeTable(tableName: string): Promise<TableDescription> {
  const conn = await openConnection();
  try {
    // Column info via PRAGMA
    const colRows = await conn.query(`PRAGMA table_info('${tableName}')`);
    const columns = colRows.toArray().map((r) => r.toJSON() as { name: string; type: string });

    // Row count
    const countResult = await conn.query(`SELECT COUNT(*) AS n FROM "${tableName}"`);
    const rowCount = Number((countResult.toArray()[0]?.toJSON() as { n: number }).n ?? 0);

    // Per-column profiles (handle both numeric and categorical)
    const profiles: ColumnProfile[] = await Promise.all(
      columns.map(async (col) => {
        const numericTypes = ['BIGINT', 'INTEGER', 'DOUBLE', 'FLOAT', 'DECIMAL', 'HUGEINT', 'SMALLINT', 'TINYINT'];
        const isNumeric = numericTypes.some((t) => col.type.toUpperCase().startsWith(t));

        const nullCountResult = await conn.query(
          `SELECT COUNT(*) AS n FROM "${tableName}" WHERE "${col.name}" IS NULL`,
        );
        const nullCount = Number((nullCountResult.toArray()[0]?.toJSON() as { n: number }).n ?? 0);

        const uniqueResult = await conn.query(
          `SELECT COUNT(DISTINCT "${col.name}") AS n FROM "${tableName}"`,
        );
        const uniqueCount = Number((uniqueResult.toArray()[0]?.toJSON() as { n: number }).n ?? 0);

        let min: unknown = null, max: unknown = null, mean: number | null = null;
        if (isNumeric && rowCount > 0) {
          const statsResult = await conn.query(
            `SELECT MIN("${col.name}") AS mn, MAX("${col.name}") AS mx, AVG("${col.name}") AS av FROM "${tableName}"`,
          );
          const stats = statsResult.toArray()[0]?.toJSON() as { mn: unknown; mx: unknown; av: unknown };
          min = stats?.mn ?? null;
          max = stats?.mx ?? null;
          mean = stats?.av != null ? Number(stats.av) : null;
        } else if (rowCount > 0) {
          const minMaxResult = await conn.query(
            `SELECT MIN("${col.name}") AS mn, MAX("${col.name}") AS mx FROM "${tableName}"`,
          );
          const mm = minMaxResult.toArray()[0]?.toJSON() as { mn: unknown; mx: unknown };
          min = mm?.mn ?? null;
          max = mm?.mx ?? null;
        }

        return { name: col.name, type: col.type, nullCount, uniqueCount, min, max, mean };
      }),
    );

    return {
      tableName,
      rowCount,
      columnCount: columns.length,
      columns: profiles,
    };
  } finally {
    await conn.close();
  }
}

// ── sampleRows ─────────────────────────────────────────────────────────────────

/**
 * Returns up to `n` random rows from `tableName` as plain JSON objects.
 * Capped at 50 rows (the LLM token hard cap defined in the plan).
 */
export async function sampleRows(tableName: string, n: number = 10): Promise<Record<string, unknown>[]> {
  const capped = Math.min(50, Math.max(1, n));
  const conn = await openConnection();
  try {
    const result = await conn.query(
      `SELECT * FROM "${tableName}" USING SAMPLE ${capped} ROWS`,
    );
    return result.toArray().map((row) => row.toJSON() as Record<string, unknown>);
  } finally {
    await conn.close();
  }
}

// ── aggregateQuery ─────────────────────────────────────────────────────────────

/**
 * Run an arbitrary aggregation SQL fragment against `tableName`.
 * The `sqlFragment` is a partial SELECT body, e.g.:
 *   "region, SUM(sales) AS total GROUP BY region ORDER BY total DESC LIMIT 10"
 *
 * Results are returned as plain JSON objects.
 *
 * WARNING: sqlFragment is not sanitised. Only call with AI-generated or
 * internally-constructed fragments — never with raw user input.
 */
export async function aggregateQuery(
  tableName: string,
  sqlFragment: string,
): Promise<Record<string, unknown>[]> {
  const conn = await openConnection();
  try {
    const result = await conn.query(
      `SELECT ${sqlFragment} FROM "${tableName}"`,
    );
    return result.toArray().map((row) => row.toJSON() as Record<string, unknown>);
  } finally {
    await conn.close();
  }
}

// ── aggregateQueryStream ───────────────────────────────────────────────────────

/**
 * Streaming variant of `aggregateQuery` using `conn.send()`.
 *
 * Yields batches of rows as they arrive from DuckDB without materialising
 * the full Arrow table in memory. Use this instead of `aggregateQuery` when
 * the result set may exceed ~10k rows to avoid peak memory spikes.
 *
 * The caller is responsible for consuming (or breaking out of) the async
 * generator. The DuckDB connection is closed after the generator is exhausted
 * or if an error occurs.
 *
 * WARNING: sqlFragment is not sanitised. Only call with AI-generated or
 * internally-constructed fragments — never with raw user input.
 *
 * @example
 * for await (const batch of aggregateQueryStream('sales', 'region, SUM(amount) GROUP BY region')) {
 *   process(batch);
 * }
 */
export async function* aggregateQueryStream(
  tableName: string,
  sqlFragment: string,
): AsyncGenerator<Record<string, unknown>[]> {
  const conn = await openConnection();
  try {
    const iter = await conn.send(`SELECT ${sqlFragment} FROM "${tableName}"`);
    for await (const batch of iter) {
      yield batch.toArray().map((row: { toJSON: () => Record<string, unknown> }) => row.toJSON());
    }
  } finally {
    await conn.close();
  }
}
