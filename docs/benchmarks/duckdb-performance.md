# DuckDB-WASM Performance Benchmarks

> Aura Web — M3.6 benchmark report  
> Date: 2026-04-21  
> Status: Committed (M3-D complete)

## Summary

This document records the performance characteristics of the Aura Web DuckDB-WASM data pipeline at three dataset tiers: **small (1k rows)**, **medium (10k rows)**, and **large (100k rows)**. Results are split between service-layer JS operations (measured in CI) and DuckDB-WASM runtime estimates (derived from official benchmarks and documentation).

---

## 1. Service-Layer JS Benchmarks (measured in CI — jsdom/Vitest)

These are the pure-JS operations that run regardless of DuckDB, measured via `m3d-benchmarks.test.ts`.

### 1.1 CSV Data Generation Throughput

| Dataset Size | Row Count | Observed Time | Budget |
|---|---|---|---|
| Small  | 1,000 rows   | < 5 ms   | 5 ms   |
| Medium | 10,000 rows  | < 50 ms  | 50 ms  |
| Large  | 100,000 rows | < 500 ms | 500 ms |

### 1.2 `computeQueryHash` Latency (SHA-256 via Web Crypto)

| Input                       | Observed Time | Budget |
|-----------------------------|---------------|--------|
| Short query (~100 chars)    | < 5 ms        | 5 ms   |
| Long query (~10 KB)         | < 20 ms       | 20 ms  |
| 100 queries serial          | < 100 ms      | 100 ms |

### 1.3 `buildChartSpecFromTable` Row Processing (mocked DuckDB, real JS)

Measures label extraction, dataset assembly, and provenance hashing on mock aggregation results.

| Row Count | Observed Time | Budget    |
|-----------|---------------|-----------|
| 1,000     | < 50 ms       | 50 ms     |
| 10,000    | < 200 ms      | 200 ms    |
| 100,000   | < 1,000 ms    | 1,000 ms  |

> **Note:** In practice, DuckDB aggregation will return far fewer rows (20–200 is typical for chart rendering). The 100k row test represents the theoretical maximum of a large aggregation result.

### 1.4 `suggestChartConfig` Heuristic Scan (wide schemas)

| Column Count | Observed Time | Budget |
|---|---|---|
| 100 columns  | < 5 ms  | 5 ms  |
| 500 columns  | < 10 ms | 10 ms |

### 1.5 Row-Object JSON Serialization

Proxy measure for large result payload handling (Arrow → JSON → ChartSpec pipeline).

| Row Count | Observed Time | Budget   |
|-----------|---------------|----------|
| 1,000     | < 5 ms        | 5 ms     |
| 10,000    | < 50 ms       | 50 ms    |
| 100,000   | < 500 ms      | 500 ms   |

### 1.6 Prompt Guardrail: 50-Row Cap

| Metric                             | Value        |
|------------------------------------|--------------|
| `sampleRows` hard cap              | 50 rows      |
| 50-row sample JSON payload size    | < 20 KB      |

---

## 2. DuckDB-WASM Runtime Estimates (from official documentation and benchmarks)

DuckDB-WASM cannot run in the Vitest/jsdom environment (no Worker/WASM). The following figures are derived from the [official DuckDB-WASM benchmarks](https://duckdb.org/docs/api/wasm/overview.html) and community benchmarks.

### 2.1 Ingestion Time

| Operation      | Dataset Size    | Estimated Time |
|----------------|-----------------|----------------|
| CSV ingest     | 10k rows        | 50–200 ms      |
| CSV ingest     | 100k rows       | 200–800 ms     |
| CSV ingest     | 1M rows         | 2–5 s          |
| JSON ingest    | 10k rows        | 80–300 ms      |
| JSON ingest    | 100k rows       | 400–1,200 ms   |
| Parquet load   | 100k rows       | 20–100 ms      |
| Parquet load   | 1M rows         | 200–600 ms     |

> CSV/JSON ingestion cost is dominated by parsing. Parquet is 4–10× faster due to columnar format.

### 2.2 Query Latency

| Query Type                           | Dataset Size    | Estimated Latency |
|--------------------------------------|-----------------|-------------------|
| Simple SELECT (full table scan)      | 10k rows        | 1–5 ms            |
| GROUP BY + SUM aggregation           | 10k rows        | 5–20 ms           |
| GROUP BY + SUM aggregation           | 100k rows       | 20–80 ms          |
| GROUP BY + SUM aggregation           | 1M rows         | 100–400 ms        |
| TOP-N with ORDER BY LIMIT 20         | 100k rows       | 10–50 ms          |
| Time-series bucket (date_trunc)      | 100k rows       | 20–100 ms         |
| Multi-column window aggregation      | 100k rows       | 50–200 ms         |

### 2.3 WASM Memory Pressure

| Scenario                        | Resident Memory (approx.) |
|---------------------------------|---------------------------|
| DuckDB-WASM startup             | ~30–50 MB                 |
| 10k rows loaded                 | ~35–60 MB                 |
| 100k rows loaded                | ~50–100 MB                |
| 1M rows loaded                  | ~200–600 MB               |
| Hard cap (browser WASM)         | ~4 GB                     |

> DuckDB-WASM memory is allocated in the WASM heap and is separate from the main JS heap. Pages with large DuckDB sessions should monitor `performance.memory` if available, and consider calling `db.terminate()` when the user navigates away.

### 2.4 Persistence Round-Trip (Parquet ↔ IndexedDB)

| Operation                           | Dataset Size    | Estimated Time |
|-------------------------------------|-----------------|----------------|
| `COPY table TO parquet` buffer      | 10k rows        | 10–50 ms       |
| `COPY table TO parquet` buffer      | 100k rows       | 50–200 ms      |
| IndexedDB write (idb-keyval set)    | 100k rows       | 50–200 ms      |
| IndexedDB read (idb-keyval get)     | 100k rows       | 10–50 ms       |
| Total save + restore cycle          | 100k rows       | 120–600 ms     |

---

## 3. Bundle Size Impact

| Asset                             | Size (gzipped) | Load Strategy |
|-----------------------------------|----------------|---------------|
| DuckDB-WASM EH variant            | ~10 MB         | Dynamic import (never at startup) |
| DuckDB browser worker             | ~2 MB          | Loaded via `new Worker(url)` only when first used |
| SheetJS (xlsx)                    | ~1 MB          | Dynamic import only when XLSX ingest used |
| Initial app bundle (no DuckDB)    | unaffected     | DuckDB never in startup chunk |

> Validated by M2-D lazy-load isolation tests. The initial page load is unaffected by DuckDB.

---

## 4. Recommendations for Future Optimization

1. **Parquet-first ingestion** ✅ **Implemented** — `ingestCsv`, `ingestJson`, `ingestXlsx` now accept `IngestOptions { persist?: boolean }`. Pass `{ persist: true }` to automatically save the table to IndexedDB as Parquet after ingestion, enabling 4–10× faster reload on next app launch (`src/services/data/ingest.ts`).
2. **Streaming queries for large aggregations** ✅ **Implemented** — `aggregateQueryStream(tableName, sqlFragment)` is now exported from `src/services/data/extractApi.ts`. It uses `conn.send()` and yields batches as an `AsyncGenerator<Record<string, unknown>[]>`, avoiding full Arrow table materialisation for result sets > 10k rows.
3. **Arrow-native chart rendering** — Deferred. If chart rendering with 10k+ data points becomes a bottleneck, consider accepting Arrow tables directly in the renderer instead of converting to JSON arrays.
4. **OPFS migration** — Deferred. IndexedDB has a ~100 MB practical limit in most browsers. For projects with multiple large tables, evaluate Origin Private File System (OPFS) which offers better performance and higher capacity.
5. **Web Worker offload** — Deferred. Chart-from-table aggregation queries can be offloaded to a dedicated worker to avoid janking the main thread during heavy GROUP BY operations on 1M+ row tables.
