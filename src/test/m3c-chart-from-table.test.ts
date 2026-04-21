/**
 * M3-C — Chart-from-table workflow + staleness detection tests
 *
 * Covers:
 * - computeQueryHash: deterministic hash for same inputs
 * - checkChartStaleness: fresh/stale/no-provenance/no-table-ref detection
 * - buildChartSpecFromTable: end-to-end ChartSpec assembly from aggregation
 * - suggestChartConfig: heuristic column-picking logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock crypto.subtle for jsdom ──────────────────────────────────────────────
// jsdom does not implement crypto.subtle SHA-256 in all environments,
// so we provide a deterministic stub.

const cryptoSubtleMock = {
  digest: vi.fn(async (_algo: string, data: BufferSource) => {
    // Return a simple deterministic buffer: first 32 bytes of input XOR'd with index
    const input = data instanceof ArrayBuffer ? new Uint8Array(data) : new Uint8Array((data as ArrayBufferView).buffer);
    const out = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      out[i] = (input[i % input.length] ?? 0) ^ i;
    }
    return out.buffer;
  }),
};

Object.defineProperty(globalThis, 'crypto', {
  value: { subtle: cryptoSubtleMock },
  writable: true,
  configurable: true,
});

// ── Mock extract API ──────────────────────────────────────────────────────────

const mockTableDescription = {
  tableName: 'sales',
  rowCount: 5000,
  columnCount: 3,
  columns: [
    { name: 'region', type: 'VARCHAR', nullCount: 0, uniqueCount: 4, min: 'East', max: 'West', mean: null },
    { name: 'amount', type: 'DOUBLE', nullCount: 0, uniqueCount: 100, min: 0, max: 9999.0, mean: 500.0 },
    { name: 'period', type: 'VARCHAR', nullCount: 0, uniqueCount: 12, min: '2026-01', max: '2026-12', mean: null },
  ],
};

const mockAggregationRows = [
  { region: 'North', amount: 1200 },
  { region: 'South', amount: 900 },
  { region: 'East', amount: 1400 },
  { region: 'West', amount: 700 },
];

vi.mock('@/services/data/extractApi', () => ({
  describeTable: vi.fn(async () => mockTableDescription),
  aggregateQuery: vi.fn(async () => mockAggregationRows),
  sampleRows: vi.fn(async () => []),
}));

// ── computeQueryHash tests ─────────────────────────────────────────────────────

describe('M3-C — computeQueryHash', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cryptoSubtleMock.digest.mockClear();
  });

  it('returns a hex string', async () => {
    const { computeQueryHash } = await import('@/services/data/staleness');
    const hash = await computeQueryHash('sales', 'SELECT * FROM sales', 1000);
    expect(typeof hash).toBe('string');
    expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
  });

  it('returns different hashes for different inputs', async () => {
    const { computeQueryHash } = await import('@/services/data/staleness');
    const h1 = await computeQueryHash('sales', 'SELECT * FROM sales', 1000);
    const h2 = await computeQueryHash('sales', 'SELECT * FROM sales', 2000);
    expect(h1).not.toBe(h2);
  });

  it('returns the same hash for the same inputs', async () => {
    const { computeQueryHash } = await import('@/services/data/staleness');
    const h1 = await computeQueryHash('sales', 'SELECT * FROM sales', 1000);
    const h2 = await computeQueryHash('sales', 'SELECT * FROM sales', 1000);
    expect(h1).toBe(h2);
  });
});

// ── checkChartStaleness tests ──────────────────────────────────────────────────

describe('M3-C — checkChartStaleness: inline chart (no-table-ref)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns no-table-ref for inline ChartSpec', async () => {
    const { checkChartStaleness } = await import('@/services/data/staleness');
    const result = await checkChartStaleness({
      id: 'chart-1',
      labels: ['A', 'B'],
      datasets: [{ label: 'S', values: [1, 2] }],
    });
    expect(result.status).toBe('no-table-ref');
    expect(result.chartId).toBe('chart-1');
  });

  it('returns no-table-ref when dataSource.kind is inline', async () => {
    const { checkChartStaleness } = await import('@/services/data/staleness');
    const result = await checkChartStaleness({
      id: 'chart-2',
      labels: ['A', 'B'],
      datasets: [{ label: 'S', values: [1, 2] }],
      dataSource: { kind: 'inline' },
    });
    expect(result.status).toBe('no-table-ref');
  });
});

describe('M3-C — checkChartStaleness: no provenance', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns no-provenance for table-ref spec without provenance', async () => {
    const { checkChartStaleness } = await import('@/services/data/staleness');
    const result = await checkChartStaleness({
      id: 'chart-3',
      labels: ['A', 'B'],
      datasets: [{ label: 'S', values: [1, 2] }],
      dataSource: { kind: 'table-ref', refId: 'sales', query: 'SELECT region, amount FROM sales' },
    });
    expect(result.status).toBe('no-provenance');
  });
});

describe('M3-C — checkChartStaleness: fresh vs stale', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns fresh when hash matches current state', async () => {
    const { computeQueryHash, checkChartStaleness } = await import('@/services/data/staleness');

    const query = 'SELECT region, SUM(amount) FROM "sales" GROUP BY region';
    const storedHash = await computeQueryHash('sales', query, 5000);

    const result = await checkChartStaleness({
      id: 'chart-4',
      labels: ['North', 'South'],
      datasets: [{ label: 'Sales', values: [1200, 900] }],
      dataSource: { kind: 'table-ref', refId: 'sales', query },
      provenance: {
        rowCount: 5000,
        sampled: false,
        generatedAt: '2026-04-21T00:00:00Z',
        queryHash: storedHash,
      },
    });

    expect(result.status).toBe('fresh');
    expect(result.currentRowCount).toBe(5000);
  });

  it('returns stale when hash does not match', async () => {
    const { checkChartStaleness } = await import('@/services/data/staleness');

    const result = await checkChartStaleness({
      id: 'chart-5',
      labels: ['North', 'South'],
      datasets: [{ label: 'Sales', values: [1200, 900] }],
      dataSource: { kind: 'table-ref', refId: 'sales', query: 'SELECT region FROM sales' },
      provenance: {
        rowCount: 5000,
        sampled: false,
        generatedAt: '2026-04-20T00:00:00Z',
        queryHash: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
      },
    });

    expect(result.status).toBe('stale');
  });

  it('reports rowCountChanged when row count differs', async () => {
    const { computeQueryHash, checkChartStaleness } = await import('@/services/data/staleness');

    // Hash stored at rowCount=1000, but current table has 5000
    const oldHash = await computeQueryHash('sales', 'SELECT * FROM sales', 1000);

    const result = await checkChartStaleness({
      id: 'chart-6',
      labels: ['A'],
      datasets: [{ label: 'S', values: [1] }],
      dataSource: { kind: 'table-ref', refId: 'sales', query: 'SELECT * FROM sales' },
      provenance: {
        rowCount: 1000, // stored row count
        sampled: false,
        generatedAt: '2026-04-01T00:00:00Z',
        queryHash: oldHash,
      },
    });

    expect(result.currentRowCount).toBe(5000); // from mock
    expect(result.storedRowCount).toBe(1000);
    expect(result.rowCountChanged).toBe(true);
  });
});

describe('M3-C — checkChartStaleness: error handling', () => {
  it('returns error status when describeTable throws', async () => {
    const { describeTable } = await import('@/services/data/extractApi');
    vi.mocked(describeTable).mockRejectedValueOnce(new Error('Table not found'));

    const { checkChartStaleness } = await import('@/services/data/staleness');
    const result = await checkChartStaleness({
      id: 'chart-7',
      labels: ['A'],
      datasets: [{ label: 'S', values: [1] }],
      dataSource: { kind: 'table-ref', refId: 'gone', query: 'SELECT * FROM gone' },
      provenance: {
        rowCount: 100,
        sampled: false,
        generatedAt: '2026-04-21T00:00:00Z',
        queryHash: 'abc',
      },
    });

    expect(result.status).toBe('error');
    expect(result.error).toContain('Table not found');
  });
});

// ── buildChartSpecFromTable tests ─────────────────────────────────────────────

describe('M3-C — buildChartSpecFromTable', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns a ChartSpec with inline values from aggregation', async () => {
    const { buildChartSpecFromTable } = await import('@/services/data/chartFromTable');
    const { spec } = await buildChartSpecFromTable({
      tableName: 'sales',
      sqlFragment: '"region", SUM("amount") AS "amount" GROUP BY "region"',
      labelColumn: 'region',
      valueColumns: ['amount'],
    });

    expect(spec.labels).toEqual(['North', 'South', 'East', 'West']);
    expect(spec.datasets).toHaveLength(1);
    expect(spec.datasets[0]!.values).toEqual([1200, 900, 1400, 700]);
    expect(spec.illustrative).toBe(false);
  });

  it('populates dataSource with table-ref kind', async () => {
    const { buildChartSpecFromTable } = await import('@/services/data/chartFromTable');
    const { spec } = await buildChartSpecFromTable({
      tableName: 'sales',
      sqlFragment: '"region", SUM("amount") AS "amount" GROUP BY "region"',
      labelColumn: 'region',
      valueColumns: ['amount'],
    });

    expect(spec.dataSource?.kind).toBe('table-ref');
    expect(spec.dataSource?.refId).toBe('sales');
    expect(spec.dataSource?.query).toContain('sales');
  });

  it('populates extractPlan with operation and params', async () => {
    const { buildChartSpecFromTable } = await import('@/services/data/chartFromTable');
    const { spec } = await buildChartSpecFromTable({
      tableName: 'sales',
      sqlFragment: '"region", SUM("amount") AS "amount" GROUP BY "region"',
      labelColumn: 'region',
      valueColumns: ['amount'],
      extractOperation: 'groupBy',
      extractParams: { limit: 10 },
    });

    expect(spec.extractPlan?.operation).toBe('groupBy');
    expect(spec.extractPlan?.params).toMatchObject({ labelColumn: 'region', limit: 10 });
  });

  it('populates provenance with rowCount and ISO timestamp', async () => {
    const { buildChartSpecFromTable } = await import('@/services/data/chartFromTable');
    const { spec } = await buildChartSpecFromTable({
      tableName: 'sales',
      sqlFragment: '"region", SUM("amount") AS "amount" GROUP BY "region"',
      labelColumn: 'region',
      valueColumns: ['amount'],
    });

    expect(spec.provenance?.rowCount).toBe(5000);
    expect(spec.provenance?.sampled).toBe(false);
    expect(typeof spec.provenance?.generatedAt).toBe('string');
    expect(spec.provenance?.generatedAt).toMatch(/\d{4}-\d{2}-\d{2}T/);
    expect(typeof spec.provenance?.queryHash).toBe('string');
    expect(spec.provenance?.queryHash.length).toBeGreaterThan(0);
  });

  it('uses custom series labels when provided', async () => {
    const { buildChartSpecFromTable } = await import('@/services/data/chartFromTable');
    const { spec } = await buildChartSpecFromTable({
      tableName: 'sales',
      sqlFragment: '"region", SUM("amount") AS "amount" GROUP BY "region"',
      labelColumn: 'region',
      valueColumns: ['amount'],
      seriesLabels: ['Revenue ($K)'],
    });

    expect(spec.datasets[0]!.label).toBe('Revenue ($K)');
  });

  it('returns the table description alongside the spec', async () => {
    const { buildChartSpecFromTable } = await import('@/services/data/chartFromTable');
    const { tableDescription } = await buildChartSpecFromTable({
      tableName: 'sales',
      sqlFragment: '"region", SUM("amount") AS "amount" GROUP BY "region"',
      labelColumn: 'region',
      valueColumns: ['amount'],
    });

    expect(tableDescription.tableName).toBe('sales');
    expect(tableDescription.rowCount).toBe(5000);
  });
});

// ── suggestChartConfig tests ──────────────────────────────────────────────────

describe('M3-C — suggestChartConfig', () => {
  it('picks first categorical and first numeric column', async () => {
    const { suggestChartConfig } = await import('@/services/data/chartFromTable');
    const config = suggestChartConfig(mockTableDescription);
    expect(config).not.toBeNull();
    expect(config!.labelColumn).toBe('region'); // first VARCHAR
    expect(config!.valueColumns).toContain('amount'); // first DOUBLE
  });

  it('returns null when no categorical columns exist', async () => {
    const { suggestChartConfig } = await import('@/services/data/chartFromTable');
    const numericOnlyDesc = {
      ...mockTableDescription,
      columns: [
        { name: 'x', type: 'DOUBLE', nullCount: 0, uniqueCount: 10, min: 0, max: 100, mean: 50 },
        { name: 'y', type: 'INTEGER', nullCount: 0, uniqueCount: 10, min: 0, max: 50, mean: 25 },
      ],
    };
    const config = suggestChartConfig(numericOnlyDesc);
    expect(config).toBeNull();
  });

  it('returns null when no numeric columns exist', async () => {
    const { suggestChartConfig } = await import('@/services/data/chartFromTable');
    const categoricalOnlyDesc = {
      ...mockTableDescription,
      columns: [
        { name: 'name', type: 'VARCHAR', nullCount: 0, uniqueCount: 10, min: 'A', max: 'Z', mean: null },
        { name: 'tag', type: 'VARCHAR', nullCount: 0, uniqueCount: 5, min: 'a', max: 'z', mean: null },
      ],
    };
    const config = suggestChartConfig(categoricalOnlyDesc);
    expect(config).toBeNull();
  });

  it('includes a GROUP BY fragment with DESC LIMIT', async () => {
    const { suggestChartConfig } = await import('@/services/data/chartFromTable');
    const config = suggestChartConfig(mockTableDescription);
    expect(config!.sqlFragment).toContain('GROUP BY');
    expect(config!.sqlFragment).toContain('DESC LIMIT');
    expect(config!.extractOperation).toBe('groupBy');
  });
});
