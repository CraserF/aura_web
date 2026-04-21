/**
 * chartDataTools.ts — AI SDK tool() definitions for chart data extraction.
 *
 * These tools wrap the DuckDB extract API (M2-C) for use with ToolLoopAgent
 * in the presentation and document workflows. They enforce the token guardrails
 * defined in charts-integration-plan.md §4.2:
 * - describeTable: schema + row count + column profiles (always safe)
 * - sampleRows: up to 50 rows (hard-capped in the extract API itself)
 * - aggregateQuery: runs an aggregation SQL fragment
 *
 * Usage (M3-B wiring):
 *   import { chartDataTools } from '@/services/ai/tools/chartDataTools';
 *   // Pass inside ToolLoopAgent `tools:` map alongside other tools.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { describeTable, sampleRows, aggregateQuery } from '../../data/extractApi';

// ── describeTable tool ────────────────────────────────────────────────────────

export const describeTableTool = tool({
  description:
    'Describe a DuckDB table: returns schema (column names + types), row count, and per-column profiles (null count, unique count, min/max/mean). Use this to understand a dataset before building a ChartSpec.',
  inputSchema: z.object({
    tableName: z.string().min(1).describe('Name of the DuckDB table to describe'),
  }),
  execute: async ({ tableName }) => {
    try {
      const desc = await describeTable(tableName);
      return { success: true, ...desc };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
});

// ── sampleRows tool ───────────────────────────────────────────────────────────

export const sampleRowsTool = tool({
  description:
    'Return a random sample of rows from a DuckDB table as JSON. Hard-capped at 50 rows to respect LLM token limits. Use for pattern recognition before writing aggregation queries.',
  inputSchema: z.object({
    tableName: z.string().min(1).describe('Name of the DuckDB table to sample'),
    n: z
      .number()
      .int()
      .min(1)
      .max(50)
      .default(10)
      .describe('Number of rows to return (1–50; capped at 50)'),
  }),
  execute: async ({ tableName, n }) => {
    try {
      const rows = await sampleRows(tableName, n);
      return { success: true, tableName, rowsReturned: rows.length, rows };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
});

// ── aggregateQuery tool ───────────────────────────────────────────────────────

export const aggregateQueryTool = tool({
  description:
    'Run an aggregation SQL fragment against a DuckDB table and return results as JSON. The fragment is the SELECT body, e.g. "region, SUM(sales) AS total GROUP BY region ORDER BY total DESC LIMIT 10". Use this to extract the specific data points needed for a ChartSpec.',
  inputSchema: z.object({
    tableName: z.string().min(1).describe('Name of the DuckDB table to query'),
    sqlFragment: z
      .string()
      .min(1)
      .describe(
        'SELECT body fragment, e.g. "category, COUNT(*) AS n GROUP BY category ORDER BY n DESC LIMIT 20"',
      ),
  }),
  execute: async ({ tableName, sqlFragment }) => {
    try {
      const rows = await aggregateQuery(tableName, sqlFragment);
      return { success: true, tableName, rowsReturned: rows.length, rows };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
});

// ── Bundled export ────────────────────────────────────────────────────────────

/**
 * All chart data tools bundled for use in ToolLoopAgent `tools:` maps.
 *
 * @example
 * ```typescript
 * const agent = new ToolLoopAgent({
 *   tools: {
 *     ...chartDataTools,
 *     submitFinalSlide: tool({ ... }),
 *   },
 * });
 * ```
 */
export const chartDataTools = {
  describeTable: describeTableTool,
  sampleRows: sampleRowsTool,
  aggregateQuery: aggregateQueryTool,
} as const;
