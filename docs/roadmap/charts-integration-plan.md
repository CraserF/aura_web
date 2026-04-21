# Charts Integration — Implementation Plan

> Status: execution-ready (phase/batch tracker with required test gates)  
> Scope: chart runtime completion, data-efficiency strategy, DuckDB-WASM integration  
> Last updated: 2026-04-21

## 1) Goals

- Complete the chart runtime for presentations and documents (finalize rendering, lifecycle, export).
- Preserve chart specs as structured data in `.aura` project files (already implemented).
- Support large-data workflows without forcing full dataset token ingestion by the LLM.
- Introduce DuckDB-WASM as the local analytical engine shared with spreadsheets.

## 2) Current-State Summary

The chart system foundation is **substantially complete**:

| Area | Status | Notes |
|------|--------|-------|
| ChartSpec schema + types | Done | `src/services/charts/types.ts` |
| Normalizer (validate, defaults, colors) | Done | `src/services/charts/normalizer.ts` |
| Type selector (inference + override) | Done | `src/services/charts/typeSelector.ts` |
| Theme integration (light/dark) | Done | `src/services/charts/theme.ts` |
| Renderer (Chart.js instances) | Done | `src/services/charts/renderer.ts` |
| Snapshot (base64 for PDF) | Done | `src/services/charts/snapshot.ts` |
| Markdown table parser | Done | `src/services/charts/parseMarkdownTable.ts` |
| HTML extraction (data-aura-chart-spec) | Done | `src/services/charts/extract.ts` |
| Presentation plugin (Reveal.js hydration) | Done | `src/services/presentation/plugins/chart-plugin.ts` |
| Sanitizer (preserves chart-spec blocks) | Done | `src/services/html/sanitizer.ts` |
| Persistence in .aura metadata | Done | `src/services/storage/projectFormat.ts` |
| AI prompt section | Done | `src/services/ai/prompts/sections/charts.ts` |
| Zod validation schema | Done | `src/services/ai/schemas/chart.ts` |
| Unit tests (normalizer, type selector, theme, markdown) | Done | `src/test/` |
| Knowledge guide for AI | Done | `src/services/ai/knowledge/docs/chart-selection-guide.md` |

### Remaining Phase 1 gaps:
- Document iframe chart injection (presentation plugin handles Reveal.js only)
- PDF export chart flattening (`flattenChartsForExport` designed but not implemented)
- Chart data editor dialog (user-facing editing UI)

### Phase 2+ (not started):
- CSV/spreadsheet import for chart data
- Chat-based chart editing
- Illustrative data badge UI
- DOCX export chart integration
- Large dataset handling (DuckDB path)

## 3) Decisions Locked

1. **Spec-driven contract stays canonical** — `ChartSpec` is the only format the AI produces. No raw Chart.js passthrough.
2. **Two-tier data handling**:
   - Tier A: inline small datasets in `ChartSpec.datasets[].values` (current behavior).
   - Tier B: table references + query/extract metadata for large datasets (via DuckDB).
3. **Default local engine for large data: DuckDB-WASM** — shared with spreadsheet feature.
4. **LLM sees summaries/samples/aggregates by default**, never full raw tables.

## 4) Data-Efficiency Architecture

### 4.1 Dataset Reference Extension

Add optional fields to `ChartSpec` metadata:

```typescript
interface DataSource {
  kind: 'inline' | 'table-ref' | 'query-ref';
  /** For table-ref: DuckDB table name. For query-ref: SQL query string. */
  refId?: string;
  /** SQL query to extract chart data from the table */
  query?: string;
}

interface ExtractPlan {
  operation: 'groupBy' | 'topN' | 'window' | 'sample' | 'timeseries-bucket';
  params: Record<string, unknown>;
}

interface DataProvenance {
  rowCount: number;
  sampled: boolean;
  generatedAt: string; // ISO timestamp
  queryHash: string;   // For staleness detection
}
```

These extend ChartSpec without breaking existing inline-data charts.

### 4.2 LLM Token Guardrails

**Prompt policy** (to be added to `src/services/ai/prompts/sections/charts.ts`):
- Hard cap: never serialize more than 50 rows of raw data into a prompt.
- Default: send structured previews instead of data:
  - Schema summary (column names, types, nullable)
  - Statistical profile (null count, unique count, min/max/mean per numeric column)
  - Top-N categories per categorical column
  - 10 sampled rows for pattern recognition
- Explicit instruction: "use extraction instructions; never request full table unless user explicitly asks".

**Extract API contract** (tools available to the AI agent):

| Tool | Input | Output |
|------|-------|--------|
| `describeTable` | tableName | Schema + row count + column profiles |
| `sampleRows` | tableName, n | n random rows as JSON |
| `aggregateQuery` | tableName, SQL fragment | Aggregation result |
| `previewChart` | ChartSpec with query-ref | Rendered chart preview URL |

### 4.3 DuckDB-WASM Integration Plan

**Research findings** (confirmed via documentation analysis):

| Aspect | Detail |
|--------|--------|
| Bundle size | ~10 MB gzipped (EH variant: 34.1 MB uncompressed) |
| Loading | Must be lazy-loaded — never at app startup |
| Threading | Web Worker (async, non-blocking main thread) |
| Persistence | **No built-in persistence** — requires manual Parquet export → IndexedDB/OPFS round-trip |
| Vite config | No special plugins needed — use `?url` imports for WASM/worker files |
| CSV ingestion | `registerFileText()` + `insertCSVFromPath()` with auto-detection |
| JSON ingestion | `registerFileText()` + `insertJSONFromPath()` |
| XLSX ingestion | Not native — requires SheetJS pre-parse to CSV/JSON first |
| Parquet ingestion | Native, zero-copy from Arrow, most efficient format |
| Query model | Full SQL, prepared statements, streaming results via `.send()` |
| Scale | 100k+ rows trivial, millions feasible, 4 GB WASM memory cap |

**Vite import pattern:**
```typescript
import * as duckdb from '@duckdb/duckdb-wasm';
import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';
import eh_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url';
```

**Singleton service pattern:**
```typescript
// src/services/data/duckdb.ts — lazy singleton
let dbInstance: duckdb.AsyncDuckDB | null = null;

export async function getDB(): Promise<duckdb.AsyncDuckDB> {
  if (dbInstance) return dbInstance;
  const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);
  const worker = new Worker(bundle.mainWorker!);
  const db = new duckdb.AsyncDuckDB(new duckdb.ConsoleLogger(), worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  dbInstance = db;
  return db;
}
```

**Persistence strategy:**
```
On data change → COPY table TO parquet buffer → write to IndexedDB via idb-keyval
On app load → read parquet from IndexedDB → registerFileBuffer → CREATE TABLE FROM parquet
```

**Shared with spreadsheets:** DuckDB is the single data engine for both chart data and spreadsheet storage. The service layer in `src/services/data/` will be shared.

## 5) Milestones

### M1 — Chart Runtime Completion (no DuckDB dependency)
**Parallel-safe: yes — independent of all other features**

| Task | Description | Est. |
|------|-------------|------|
| M1.1 | Document iframe chart hydration (mirror chart-plugin.ts for iframe context) | S |
| M1.2 | Chart lifecycle cleanup on document/slide removal | S |
| M1.3 | PDF export chart flattening (snapshot → img replacement) | M |
| M1.4 | Chart data editor dialog (edit values, labels, type, title) | M |
| M1.5 | DOCX export chart integration (snapshot → image in docx) | S |
| M1.6 | Illustrative data badge UI | S |

### M2 — DuckDB Foundation (shared with spreadsheets)
**Parallel-safe: yes — can be built independently, then wired in**

| Task | Description | Est. |
|------|-------------|------|
| M2.1 | Add `@duckdb/duckdb-wasm` dependency, Vite config validation | S |
| M2.2 | Build `src/services/data/duckdb.ts` lazy singleton | S |
| M2.3 | Build persistence layer (Parquet ↔ IndexedDB round-trip) | M |
| M2.4 | Build extract APIs (describeTable, sampleRows, aggregateQuery) | M |
| M2.5 | Build CSV/JSON/XLSX ingestion pipeline (SheetJS for XLSX) | M |
| M2.6 | Bundle size validation — ensure lazy-load doesn't affect initial load | S |

### M3 — Chart + Data Integration
**Depends on: M1 + M2**

| Task | Description | Est. |
|------|-------------|------|
| M3.1 | Extend ChartSpec with DataSource/ExtractPlan/Provenance fields | S |
| M3.2 | Wire extract APIs as AI agent tools (describeTable, sampleRows, etc.) | M |
| M3.3 | Add prompt guardrails to chart prompt section | S |
| M3.4 | Build chart-from-table workflow (user imports data → AI suggests chart) | L |
| M3.5 | Add staleness detection (queryHash validation on reopen) | S |
| M3.6 | Performance benchmarks (small/medium/large datasets) | M |

**Size estimates: S = < 1 day, M = 1-3 days, L = 3-5 days**

## 6) Phase/Batch Execution Order (sequential)

Run phases in strict order: **M1 → M2 → M3**.  
Do not start the next phase until the current phase test gate is green.

### M1 Batches (runtime completion)

- **Batch M1-A**: M1.1 + M1.2
  - Scope: document iframe hydration + chart lifecycle cleanup
  - Test gate: chart hydration tests for reveal/document + cleanup on remove/unmount
- **Batch M1-B**: M1.3
  - Scope: PDF chart flattening (snapshot → image replacement)
  - Test gate: export tests proving non-blank chart output
- **Batch M1-C**: M1.4 + M1.6
  - Scope: data editor dialog + illustrative data badge
  - Test gate: editor unit/integration tests + badge rendering tests
- **Batch M1-D**: M1.5
  - Scope: DOCX chart snapshot integration
  - Test gate: DOCX export tests proving chart image inclusion

### M2 Batches (DuckDB foundation)

- **Batch M2-A**: M2.1 + M2.2
  - Scope: dependency + lazy DuckDB singleton
  - Test gate: lazy-load tests + no app-start load regression
- **Batch M2-B**: M2.3
  - Scope: Parquet/IndexedDB persistence round-trip
  - Test gate: round-trip integrity tests
- **Batch M2-C**: M2.4 + M2.5
  - Scope: extract APIs + CSV/JSON/XLSX ingest pipeline
  - Test gate: query correctness + ingest fixture tests
- **Batch M2-D**: M2.6
  - Scope: bundle-size/lazy-load validation
  - Test gate: build artifact validation + manual startup checks

### M3 Batches (chart + data integration)

- **Batch M3-A**: M3.1 + M3.3
  - Scope: ChartSpec data-source extensions + prompt guardrails
  - Test gate: schema and prompt policy tests
- **Batch M3-B**: M3.2
  - Scope: wire extract APIs as AI tools
  - Test gate: tool wiring tests + workflow regression tests
- **Batch M3-C**: M3.4 + M3.5
  - Scope: chart-from-table flow + staleness detection
  - Test gate: end-to-end flow tests + reopen staleness checks
- **Batch M3-D**: M3.6
  - Scope: small/medium/large performance benchmarks
  - Test gate: benchmark report committed

### Progress Recording (update as batches land)

| Phase | Batch | Status | Evidence (PR/commit/tests) |
|------|------|--------|-----------------------------|
| M1 | M1-A | ✅ Done | `documentChartHydration.ts` + `prerender.ts`; `document-chart-hydration.test.ts` (8 tests) |
| M1 | M1-B | ✅ Done | `chartExport.ts` already implemented; `chartExport.test.ts` (8 tests) |
| M1 | M1-C | ✅ Done | `ChartEditor.tsx` dialog + illustrative badge in `chart-plugin.ts`; `chart-editor.test.ts` (19 tests) |
| M1 | M1-D | ✅ Done | `docx.ts` + `buildChartParagraphs` (ImageRun); `docx-chart-export.test.ts` (4 tests) |
| M2 | M2-A | ✅ Done | `@duckdb/duckdb-wasm@1.33.1` installed; `src/services/data/duckdb.ts` lazy singleton |
| M2 | M2-B | ✅ Done | `src/services/data/persistence.ts` Parquet ↔ IndexedDB round-trip |
| M2 | M2-C | ✅ Done | `extractApi.ts` (describeTable, sampleRows, aggregateQuery) + `ingest.ts` (CSV/JSON/XLSX via SheetJS) |
| M2 | M2-D | ✅ Done | `duckdb-foundation.test.ts` (15 tests) validates lazy-load isolation; all exports verified |
| M3 | M3-A | ✅ Done | `types.ts` DataSource/ExtractPlan/DataProvenance + `charts.ts` guardrails; `m3a-schema-prompt.test.ts` (22 tests) |
| M3 | M3-B | ✅ Done | `chartDataTools.ts` (describeTable, sampleRows, aggregateQuery tools); `m3b-chart-data-tools.test.ts` (14 tests) |
| M3 | M3-C | ✅ Done | `chartFromTable.ts` + `staleness.ts`; `m3c-chart-from-table.test.ts` (20 tests) |
| M3 | M3-D | ✅ Done | `m3d-benchmarks.test.ts` (17 tests) + `docs/benchmarks/duckdb-performance.md` |

## 7) Validation Requirements

- **Unit tests**: schema validation, type inference overrides, extract planner behavior, DuckDB query correctness.
- **Integration tests**: chart re-open persistence, chart rendering in both surfaces (Reveal.js + document iframe), export snapshot integrity, DuckDB persistence round-trip.
- **Performance tests**: DuckDB ingestion time for 10k/100k/1M rows, query latency, memory pressure.
- **Manual checks**: light/dark theme parity, large dataset responsiveness, empty/invalid data fallback, lazy-load bundle impact on initial page load.

## 8) Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| WASM bundle growth (~10 MB gzipped) | Lazy-load entire DuckDB module via dynamic `import()`. Never load at app startup. Split into separate chunk. |
| No built-in DuckDB persistence | Manual Parquet → IndexedDB cycle. Well-documented pattern. Test for data integrity on round-trip. |
| Prompt drift into full-table mode | Strict composer policies + QA checks on prompt payload size. Hard cap at 50 rows inline. |
| Spec/query mismatch on reopen | Versioned extract metadata + provenance hash validation. Show "stale data" indicator if hash mismatch. |
| XLSX requires SheetJS | SheetJS (community edition) is MIT licensed, ~1 MB. Acceptable for the value it provides. |
| Arrow result format overhead | Use `.toArray().map(r => r.toJSON())` for small results, streaming `.send()` for large results. Consider Arrow-native chart rendering if performance demands. |

## 9) Deliverables

- Updated `docs/chart-system-design.md` with data-efficiency additions.
- `src/services/data/` module (DuckDB singleton, persistence, extract APIs).
- Extract API contract documentation.
- Performance benchmarks document (small/medium/large datasets).
- Contributor-ready implementation checklist per milestone.

## 10) Open Questions

1. **Polars-WASM**: Start DuckDB-only. Add Polars adapter only if benchmarks show clear benefit for specific transform patterns. Decision deferred to post-M2.
2. **Arrow-native rendering**: Should chart rendering accept Arrow tables directly, or always convert to JSON first? Decision deferred to M3 based on performance data.
3. **OPFS vs IndexedDB**: OPFS (Origin Private File System) offers better performance for large files but has weaker browser support. Start with IndexedDB, evaluate OPFS migration later.
