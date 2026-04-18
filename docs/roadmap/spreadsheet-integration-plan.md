# Spreadsheet Integration — Implementation Plan

> Status: planning (no implementation in this document)  
> Scope: prompt-first spreadsheets, high-performance data engine, linked tables/charts

## 1) Goals

- Deliver Aura spreadsheets as a prompt-first but manually editable data workspace.
- Ingest CSV/XLSX/JSON efficiently without forcing full-token ingestion.
- Support linked tables/charts in docs/presentations.
- Outperform traditional spreadsheet responsiveness on large datasets where feasible.

## 2) Current-State Findings (repo investigation)

- Spreadsheet mode is on roadmap but not implemented yet.
- Chart infrastructure and project document architecture are already in place and reusable.
- `.aura` multi-document packaging can host additional spreadsheet artifacts.

## 3) Architecture Direction

### 3.1 Data Runtime

Primary candidate: **DuckDB-WASM** for storage/query.  
Optional companion: **Polars (JS/WASM)** for dataframe transforms.  
Input parser candidate: **SheetJS** for broad XLSX/CSV compatibility.

### 3.2 Spreadsheet Artifact Model

Planned document type: `spreadsheet` with:
- workbook metadata
- tabs/sheets
- schema + type metadata
- formulas/transform graph
- chart/table link references

### 3.3 Prompt-First Interaction Model

- Natural-language commands generate formulas/transforms/views.
- User can still directly edit cells/ranges when needed.
- Agent operates on extracts (profile/sample/aggregate) unless full scan is explicitly needed.

## 4) Token-Efficient Data Handling

- Persist table in local engine, not in prompt context.
- Expose extract APIs:
  - schema profile
  - sampled rows
  - aggregate summaries
  - anomaly/top-k slices
- Attach extract provenance to generated outputs.

## 5) Linked Content Model

- Tables can be embedded into documents/presentations as linked views.
- Charts can bind to spreadsheet named ranges or query views.
- Refresh semantics:
  - manual refresh
  - auto-refresh on source change (configurable)

## 6) Milestones

### M1 — Ingestion + Core Runtime
- CSV/XLSX/JSON ingestion
- tab model and local storage
- baseline grid rendering

### M2 — Prompted Computation Layer
- prompt-to-formula/transform pipeline
- extraction APIs for low-token operation
- error recovery for malformed formulas

### M3 — Linking + Chart Interop
- linked tables/charts in docs/presentations
- dependency tracking and refresh pipeline
- performance tuning for large-sheet workflows

## 7) Validation Requirements

- Unit tests: parser adapters, formula planner, extraction contracts.
- Performance tests: ingest/query/render budgets on representative dataset sizes.
- Manual tests: multi-tab editing, linked chart refresh, mixed prompt/manual workflows.

## 8) Risks & Mitigations

- **Large bundle/runtime cost** → lazy-load spreadsheet engine and workers.
- **Formula correctness drift** → deterministic formula generation constraints + validation.
- **Link inconsistency** → dependency graph checks and stale-link indicators.
