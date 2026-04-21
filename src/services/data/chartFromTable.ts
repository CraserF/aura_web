/**
 * chartFromTable.ts — Chart-from-table workflow (M3.4).
 *
 * Orchestrates the flow:
 *   1. User selects a DuckDB table (loaded via ingest or persistence)
 *   2. `describeTable` produces a schema + profile (token-efficient)
 *   3. AI picks the best chart type and aggregation (via `suggestChartFromTable`)
 *   4. `buildChartSpecFromTable` runs the aggregation and returns a ready ChartSpec
 *      with populated dataSource, extractPlan, and provenance fields
 *
 * The AI suggestion step is optional: callers can skip it and provide
 * the aggregation parameters directly via `ChartFromTableOptions`.
 */

import type { ChartSpec, DataSource, ExtractPlan, DataProvenance } from '../charts/types';
import { describeTable, aggregateQuery, type TableDescription } from './extractApi';
import { computeQueryHash } from './staleness';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ChartFromTableOptions {
  /** DuckDB table name to chart from */
  tableName: string;
  /** SELECT fragment for aggregation, e.g. "region, SUM(sales) GROUP BY region" */
  sqlFragment: string;
  /** Column to use as chart labels (categorical axis) */
  labelColumn: string;
  /** Column(s) to use as dataset values (numeric) */
  valueColumns: string[];
  /** Optional series labels (defaults to valueColumns names) */
  seriesLabels?: string[];
  /** Chart title */
  title?: string;
  /** Unit suffix (e.g. "$K", "%") */
  unit?: string;
  /** Explicit extract operation type for metadata */
  extractOperation?: ExtractPlan['operation'];
  /** Extra params for the extract plan metadata */
  extractParams?: Record<string, unknown>;
}

export interface ChartFromTableResult {
  spec: ChartSpec;
  tableDescription: TableDescription;
}

// ── buildChartSpecFromTable ────────────────────────────────────────────────────

/**
 * Run an aggregation against a DuckDB table and return a fully-populated
 * ChartSpec with dataSource, extractPlan, and provenance fields.
 *
 * Inline `datasets[].values` contain the aggregated numbers so the chart
 * renders immediately without a live DuckDB connection.
 */
export async function buildChartSpecFromTable(
  opts: ChartFromTableOptions,
): Promise<ChartFromTableResult> {
  const {
    tableName,
    sqlFragment,
    labelColumn,
    valueColumns,
    seriesLabels,
    title,
    unit,
    extractOperation = 'groupBy',
    extractParams = {},
  } = opts;

  // 1. Describe table for metadata
  const tableDescription = await describeTable(tableName);

  // 2. Run the aggregation
  const rows = await aggregateQuery(tableName, sqlFragment);

  // 3. Extract labels
  const labels = rows.map((row) => String(row[labelColumn] ?? ''));

  // 4. Extract datasets
  const datasets = valueColumns.map((col, i) => ({
    label: (seriesLabels && seriesLabels[i]) ? seriesLabels[i]! : col,
    values: rows.map((row) => Number(row[col] ?? 0)),
  }));

  // 5. Build data source metadata
  const query = `SELECT ${sqlFragment} FROM "${tableName}"`;
  const dataSource: DataSource = {
    kind: 'table-ref',
    refId: tableName,
    query,
  };

  const extractPlan: ExtractPlan = {
    operation: extractOperation,
    params: {
      labelColumn,
      valueColumns,
      ...extractParams,
    },
  };

  // 6. Compute provenance hash
  const generatedAt = new Date().toISOString();
  const queryHash = await computeQueryHash(tableName, query, tableDescription.rowCount);

  const provenance: DataProvenance = {
    rowCount: tableDescription.rowCount,
    sampled: false,
    generatedAt,
    queryHash,
  };

  // 7. Assemble ChartSpec
  const spec: ChartSpec = {
    id: `chart-${tableName}-${Date.now()}`,
    title,
    labels,
    datasets,
    unit,
    illustrative: false,
    dataSource,
    extractPlan,
    provenance,
  };

  return { spec, tableDescription };
}

// ── suggestChartConfig ────────────────────────────────────────────────────────

/**
 * Given a table description, produce a basic chart configuration suggestion
 * by heuristic (no LLM call). Picks the first categorical column as labels,
 * first numeric column as values.
 *
 * For AI-driven suggestions, use the chartDataTools in a ToolLoopAgent.
 */
export function suggestChartConfig(
  desc: TableDescription,
): Pick<ChartFromTableOptions, 'labelColumn' | 'valueColumns' | 'sqlFragment' | 'extractOperation'> | null {
  const categoricalCols = desc.columns.filter(
    (c) => c.type.toUpperCase().startsWith('VARCHAR') || c.type.toUpperCase().startsWith('TEXT'),
  );
  const numericCols = desc.columns.filter((c) => {
    const t = c.type.toUpperCase();
    return (
      t.startsWith('BIGINT') ||
      t.startsWith('INTEGER') ||
      t.startsWith('DOUBLE') ||
      t.startsWith('FLOAT') ||
      t.startsWith('DECIMAL')
    );
  });

  if (categoricalCols.length === 0 || numericCols.length === 0) return null;

  const labelColumn = categoricalCols[0]!.name;
  const valueCol = numericCols[0]!.name;
  const limit = Math.min(20, desc.rowCount);

  return {
    labelColumn,
    valueColumns: [valueCol],
    sqlFragment: `"${labelColumn}", SUM("${valueCol}") AS "${valueCol}" GROUP BY "${labelColumn}" ORDER BY "${valueCol}" DESC LIMIT ${limit}`,
    extractOperation: 'groupBy',
  };
}
