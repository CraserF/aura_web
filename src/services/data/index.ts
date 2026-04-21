/**
 * src/services/data/index.ts — Public API for the DuckDB data layer.
 *
 * Exports are split so callers only import what they need, allowing
 * tree-shaking and avoiding premature DuckDB initialization.
 */

export { getDB, openConnection, query, destroyDB } from './duckdb';
export { saveTableToIndexedDB, loadTableFromIndexedDB, deleteTableFromIndexedDB, listPersistedTables } from './persistence';
export { describeTable, sampleRows, aggregateQuery } from './extractApi';
export type { ColumnProfile, TableDescription } from './extractApi';
export { ingestCsv, ingestJson, ingestXlsx } from './ingest';
export { computeQueryHash, checkChartStaleness, checkProjectStaleness } from './staleness';
export type { StalenessStatus, StalenessResult } from './staleness';
export { buildChartSpecFromTable, suggestChartConfig } from './chartFromTable';
export type { ChartFromTableOptions, ChartFromTableResult } from './chartFromTable';

