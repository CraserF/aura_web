# Charts Integration — Implementation Plan

> Status: planning (no implementation in this document)  
> Scope: presentation + document chart rendering, chart authoring contract, and data-efficiency strategy

## 1) Goals

- Ship a deterministic, theme-aware chart system across presentations and documents.
- Preserve chart specs as structured data in `.aura` project files.
- Support large-data workflows without forcing full dataset token ingestion by the LLM.
- Define a practical path for DuckDB-WASM and Polars-WASM usage.

## 2) Current-State Findings (repo investigation)

- Chart schema/normalization/theming/rendering utilities already exist under `src/services/charts/*`.
- Chart specs are already persisted on `ProjectDocument.chartSpecs` and in project format metadata.
- HTML extraction for embedded `data-aura-chart-spec` JSON blocks already exists (`extract.ts`).
- Sanitizer already preserves chart-spec script tags with strict allowlist behavior.
- A detailed design doc exists: `docs/chart-system-design.md`.

## 3) Decisions to Lock

1. **Spec-driven contract stays canonical** (`ChartSpec`), no raw Chart.js passthrough.
2. **Two-tier data handling**:
   - Tier A: inline small datasets in `ChartSpec`.
   - Tier B: external/local table references + query/extract metadata for large datasets.
3. **Default local engine for large data: DuckDB-WASM**, with **Polars-WASM optional compute companion**.
4. **LLM sees summaries/samples/aggregates by default**, not full raw tables.

## 4) Data-Efficiency Architecture

### 4.1 Dataset Reference Extension (phase addition)

Add planned optional fields to chart metadata model:

- `dataSource`: `{ kind: 'inline' | 'table-ref' | 'query-ref', refId?: string }`
- `extractPlan`: `{ operation: 'groupBy' | 'topN' | 'window' | 'sample' | 'timeseries-bucket', ... }`
- `provenance`: `{ rowCount, sampled, generatedAt, queryHash }`

This keeps the chart spec lightweight while enabling reproducible extraction.

### 4.2 LLM Token Guardrails

- Hard cap direct data serialization into prompts.
- Prefer structured previews:
  - schema summary
  - null/unique/min/max profile
  - top-N categories
  - sampled rows
- Add explicit prompt policy: "use extraction instructions; never request full table unless user asks".

### 4.3 DuckDB + Polars Positioning

- **DuckDB-WASM**: ingestion + SQL + joins + aggregations + persistent local snapshots.
- **Polars-WASM/JS**: fast dataframe transforms and expression pipelines where ergonomic.
- Start with DuckDB-only path; add Polars adapter only if benchmark shows clear benefit.

## 5) Milestones

### M1 — Chart Runtime Completion
- Finalize Reveal plugin and iframe hydration wiring.
- Add chart lifecycle cleanup and rerender invalidation.
- Validate export behavior with static image snapshot fallback.

### M2 — Data Connector Layer
- Add local table registry and dataset reference metadata.
- Add extraction APIs (schema/profile/sample/aggregate).
- Add prompt integration to request extracts instead of full data.

### M3 — Large Data UX + Reliability
- CSV/XLSX/JSON ingestion to local storage engine.
- Build extract preview UI and refresh controls.
- Add observability: extract latency, token budget impact, render timing.

## 6) Validation Requirements

- Unit tests: schema validation, type inference overrides, extract planner behavior.
- Integration tests: chart re-open persistence, chart rendering in both surfaces, export snapshot integrity.
- Manual checks: light/dark theme parity, large dataset responsiveness, empty/invalid data fallback.

## 7) Risks & Mitigations

- **WASM bundle growth** → lazy-load data engines and split chunks.
- **Prompt drift into full-table mode** → strict composer policies + QA checks on prompt payload size.
- **Spec/query mismatch** → versioned extract metadata + provenance hash validation.

## 8) Deliverables

- Updated chart architecture spec (delta from current doc).
- Data extraction API contract.
- Benchmarks doc (small/medium/large datasets).
- Contributor-ready implementation checklist per milestone.
