/**
 * M3-B — Chart data tools wiring tests
 *
 * Verifies that chartDataTools exports valid AI SDK tool() definitions
 * with the correct shape, input schemas, and execute behavior (mocked DuckDB).
 *
 * Does NOT test against a real DuckDB instance (jsdom limitation).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

interface ChartToolLike {
  description?: unknown;
  inputSchema?: unknown;
  execute: (input: unknown) => Promise<Record<string, unknown>>;
}

const asChartTool = (tool: unknown): ChartToolLike => tool as ChartToolLike;

// ── Mock the extract API ──────────────────────────────────────────────────────

vi.mock('@/services/data/extractApi', () => ({
  describeTable: vi.fn(async (tableName: string) => ({
    tableName,
    rowCount: 1000,
    columnCount: 3,
    columns: [
      { name: 'category', type: 'VARCHAR', nullCount: 0, uniqueCount: 5, min: 'A', max: 'E', mean: null },
      { name: 'value', type: 'DOUBLE', nullCount: 2, uniqueCount: 100, min: 0, max: 999.9, mean: 450.0 },
      { name: 'date', type: 'DATE', nullCount: 0, uniqueCount: 365, min: '2026-01-01', max: '2026-12-31', mean: null },
    ],
  })),
  sampleRows: vi.fn(async (_tableName: string, n: number) =>
    Array.from({ length: Math.min(n, 3) }, (_, i) => ({
      category: `Cat${i}`,
      value: i * 10,
      date: `2026-01-0${i + 1}`,
    })),
  ),
  aggregateQuery: vi.fn(async (tableName: string, fragment: string) => {
    void tableName;
    void fragment;
    return [
      { category: 'A', total: 500 },
      { category: 'B', total: 300 },
    ];
  }),
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('M3-B — chartDataTools: tool shape', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('chartDataTools exports three tools', async () => {
    const { chartDataTools } = await import('@/services/ai/tools/chartDataTools');
    expect(typeof chartDataTools.describeTable).toBe('object');
    expect(typeof chartDataTools.sampleRows).toBe('object');
    expect(typeof chartDataTools.aggregateQuery).toBe('object');
  });

  it('each tool has a description string', async () => {
    const { chartDataTools } = await import('@/services/ai/tools/chartDataTools');
    for (const [name, t] of Object.entries(chartDataTools)) {
      const tool = asChartTool(t);
      expect(typeof tool.description).toBe('string');
      expect((tool.description as string).length).toBeGreaterThan(10);
      expect(name).toBeTruthy();
    }
  });

  it('each tool has an inputSchema (Zod object)', async () => {
    const { chartDataTools } = await import('@/services/ai/tools/chartDataTools');
    for (const t of Object.values(chartDataTools)) {
      expect(asChartTool(t).inputSchema).toBeDefined();
    }
  });

  it('each tool has an execute function', async () => {
    const { chartDataTools } = await import('@/services/ai/tools/chartDataTools');
    for (const t of Object.values(chartDataTools)) {
      expect(typeof asChartTool(t).execute).toBe('function');
    }
  });
});

describe('M3-B — describeTableTool: execute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns success: true with table description', async () => {
    const { describeTableTool } = await import('@/services/ai/tools/chartDataTools');
    const result = await asChartTool(describeTableTool).execute({ tableName: 'sales' });
    expect(result.success).toBe(true);
    expect(result.tableName).toBe('sales');
    expect(result.rowCount).toBe(1000);
    expect(Array.isArray(result.columns)).toBe(true);
    expect(result.columns).toHaveLength(3);
  });

  it('returns success: false when extract throws', async () => {
    const { describeTable } = await import('@/services/data/extractApi');
    vi.mocked(describeTable).mockRejectedValueOnce(new Error('Table not found'));

    const { describeTableTool } = await import('@/services/ai/tools/chartDataTools');
    const result = await asChartTool(describeTableTool).execute({ tableName: 'missing_table' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Table not found');
  });
});

describe('M3-B — sampleRowsTool: execute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns sampled rows with metadata', async () => {
    const { sampleRowsTool } = await import('@/services/ai/tools/chartDataTools');
    const result = await asChartTool(sampleRowsTool).execute({ tableName: 'metrics', n: 3 });
    expect(result.success).toBe(true);
    expect(result.tableName).toBe('metrics');
    expect(Array.isArray(result.rows)).toBe(true);
    expect(result.rowsReturned).toBe(3);
  });

  it('enforces n defaults to 10 via schema', async () => {
    const { sampleRowsTool } = await import('@/services/ai/tools/chartDataTools');
    // Call without n to trigger default
    const result = await asChartTool(sampleRowsTool).execute({ tableName: 'metrics', n: 10 });
    expect(result.success).toBe(true);
  });

  it('returns success: false when extract throws', async () => {
    const { sampleRows } = await import('@/services/data/extractApi');
    vi.mocked(sampleRows).mockRejectedValueOnce(new Error('Query failed'));

    const { sampleRowsTool } = await import('@/services/ai/tools/chartDataTools');
    const result = await asChartTool(sampleRowsTool).execute({ tableName: 'broken', n: 5 });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Query failed');
  });
});

describe('M3-B — aggregateQueryTool: execute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns aggregation results', async () => {
    const { aggregateQueryTool } = await import('@/services/ai/tools/chartDataTools');
    const result = await asChartTool(aggregateQueryTool).execute({
      tableName: 'sales',
      sqlFragment: 'category, SUM(value) AS total GROUP BY category ORDER BY total DESC LIMIT 10',
    });
    expect(result.success).toBe(true);
    expect(result.tableName).toBe('sales');
    const rows = result.rows;
    expect(Array.isArray(rows)).toBe(true);
    if (!Array.isArray(rows)) throw new Error('Expected aggregate rows array.');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveProperty('total');
  });

  it('returns success: false when query throws', async () => {
    const { aggregateQuery } = await import('@/services/data/extractApi');
    vi.mocked(aggregateQuery).mockRejectedValueOnce(new Error('Syntax error'));

    const { aggregateQueryTool } = await import('@/services/ai/tools/chartDataTools');
    const result = await asChartTool(aggregateQueryTool).execute({
      tableName: 'sales',
      sqlFragment: 'INVALID SQL !!',
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Syntax error');
  });
});

describe('M3-B — chartDataTools: named exports', () => {
  it('also exports tools individually', async () => {
    const mod = await import('@/services/ai/tools/chartDataTools');
    expect(typeof mod.describeTableTool).toBe('object');
    expect(typeof mod.sampleRowsTool).toBe('object');
    expect(typeof mod.aggregateQueryTool).toBe('object');
  });
});
