/**
 * staleness.ts — ChartSpec staleness detection for M3.5.
 *
 * When a project is reopened, charts with `dataSource.kind === 'table-ref'`
 * may be stale: the underlying DuckDB table may have changed since the chart
 * was last generated. This module computes a queryHash from the source query
 * + table row count, and compares it against the stored provenance hash to
 * detect drift.
 *
 * Hash algorithm: SHA-256 (via Web Crypto API) of the string:
 *   "{tableName}|{query}|{rowCount}"
 *
 * This is the same contract documented in ChartSpec.provenance.queryHash.
 */

import type { ChartSpec } from '../charts/types';
import { describeTable } from './extractApi';

// ── Hash computation ──────────────────────────────────────────────────────────

/**
 * Compute a deterministic SHA-256 hex hash for a query snapshot.
 * Input string: "{tableName}|{query}|{rowCount}"
 */
export async function computeQueryHash(
  tableName: string,
  query: string,
  rowCount: number,
): Promise<string> {
  const input = `${tableName}|${query}|${rowCount}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ── Staleness check result ────────────────────────────────────────────────────

export type StalenessStatus =
  | 'fresh'        // Hash matches — data is up to date
  | 'stale'        // Hash differs — table has changed since chart was generated
  | 'no-provenance' // ChartSpec has no provenance metadata — cannot check
  | 'no-table-ref' // ChartSpec is not table-referenced — not applicable
  | 'error';       // Could not connect to DuckDB or compute hash

export interface StalenessResult {
  chartId: string;
  status: StalenessStatus;
  /** Current row count in the source table (if reachable). */
  currentRowCount?: number;
  /** Stored row count from provenance metadata. */
  storedRowCount?: number;
  /** True if the row count changed (quick pre-check before hash). */
  rowCountChanged?: boolean;
  error?: string;
}

// ── checkChartStaleness ───────────────────────────────────────────────────────

/**
 * Check whether a ChartSpec is stale by comparing the provenance queryHash
 * against a freshly computed hash from the current DuckDB table state.
 *
 * Returns `no-table-ref` for inline charts (nothing to check).
 * Returns `no-provenance` if the spec lacks provenance metadata.
 */
export async function checkChartStaleness(spec: ChartSpec): Promise<StalenessResult> {
  const base = { chartId: spec.id };

  if (!spec.dataSource || spec.dataSource.kind === 'inline') {
    return { ...base, status: 'no-table-ref' };
  }

  if (!spec.provenance) {
    return { ...base, status: 'no-provenance' };
  }

  const { refId, query } = spec.dataSource;
  const tableName = refId ?? '';
  const effectiveQuery = query ?? '';

  if (!tableName) {
    return { ...base, status: 'no-table-ref' };
  }

  try {
    const tableDesc = await describeTable(tableName);
    const currentRowCount = tableDesc.rowCount;
    const storedRowCount = spec.provenance.rowCount;

    const currentHash = await computeQueryHash(tableName, effectiveQuery, currentRowCount);
    const isStale = currentHash !== spec.provenance.queryHash;

    return {
      ...base,
      status: isStale ? 'stale' : 'fresh',
      currentRowCount,
      storedRowCount,
      rowCountChanged: currentRowCount !== storedRowCount,
    };
  } catch (err) {
    return {
      ...base,
      status: 'error',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ── checkProjectStaleness ─────────────────────────────────────────────────────

/**
 * Check staleness for all charts in a project.
 * Returns only results for table-referenced charts with provenance metadata.
 */
export async function checkProjectStaleness(
  specs: ChartSpec[],
): Promise<StalenessResult[]> {
  const results = await Promise.allSettled(specs.map(checkChartStaleness));
  return results.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : { chartId: specs[i]?.id ?? `unknown-${i}`, status: 'error' as const, error: String(r.reason) },
  );
}
