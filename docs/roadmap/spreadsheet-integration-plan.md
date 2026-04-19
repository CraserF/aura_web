# Spreadsheet Integration — Implementation Plan

> Status: planning (no implementation in this document)  
> Scope: prompt-first spreadsheets, DuckDB-WASM data engine, linked tables/charts, grid rendering  
> Last updated: 2026-04-19  
> Depends on: Charts M2 (DuckDB Foundation — shared data layer)

## 1) Goals

- Deliver Aura spreadsheets as a prompt-first but manually editable data workspace.
- Ingest CSV/XLSX/JSON efficiently without full-token ingestion.
- Support linked tables embedded in documents/presentations and charts derived from spreadsheet data.
- Outperform traditional spreadsheets on analytical operations by leveraging DuckDB-WASM as the computational backend.
- Support multi-tab workbooks.

## 2) Current-State Summary

- Spreadsheet mode is on roadmap but **nothing is implemented yet**.
- Chart infrastructure is substantially complete and reusable.
- Project document architecture (`ProjectDocument` type) supports adding a `'spreadsheet'` document type.
- `.aura` multi-document packaging can host spreadsheet artifacts.
- **DuckDB-WASM** will be introduced in Charts M2 — the spreadsheet feature builds on this shared data layer.

## 3) Architecture

### 3.1 Data Runtime (shared with charts)

```
┌─────────────────────────────────────────────────┐
│                src/services/data/                │
│                                                  │
│  duckdb.ts      — lazy singleton, Web Worker     │
│  persistence.ts — Parquet ↔ IndexedDB round-trip │
│  extract.ts     — schema/sample/aggregate APIs   │
│  ingest.ts      — CSV/JSON/XLSX → DuckDB tables  │
└──────────────────────┬──────────────────────────┘
                       │
            ┌──────────┼──────────┐
            │          │          │
         Charts    Spreadsheets  AI Agent
         (query)   (read/write)  (extract tools)
```

- **DuckDB-WASM** is the single source of truth for all tabular data.
- Charts query DuckDB tables via SQL for data binding.
- Spreadsheets read/write DuckDB tables directly for cell values.
- The AI agent uses extract APIs (schema, sample, aggregate) to avoid consuming raw data tokens.

### 3.2 Spreadsheet Document Model

New document type added to `ProjectDocument`:

```typescript
interface SpreadsheetDocument extends ProjectDocument {
  type: 'spreadsheet';
  workbook: WorkbookMeta;
}

interface WorkbookMeta {
  sheets: SheetMeta[];
  activeSheetIndex: number;
}

interface SheetMeta {
  id: string;
  name: string;
  tableName: string;        // DuckDB table name
  schema: ColumnSchema[];   // Column names, types, constraints
  frozenRows: number;       // Header rows frozen during scroll
  frozenCols: number;       // Columns frozen during scroll
  columnWidths: Record<string, number>;
  formulas: FormulaEntry[]; // Computed columns/cells
  sortState?: SortState;
  filterState?: FilterState;
}

interface ColumnSchema {
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean';
  nullable: boolean;
  format?: string;          // Display format (currency, percentage, date pattern)
}

interface FormulaEntry {
  id: string;
  column: string;           // Target column name
  expression: string;       // DuckDB SQL expression
  dependsOn: string[];      // Column names this formula reads
}
```

### 3.3 Prompt-First Interaction Model

The user interacts primarily through natural language:

| User says | AI does |
|-----------|---------|
| "Import this CSV and show me a summary" | Ingest → describeTable → format summary |
| "Add a column for profit margin" | Generate FormulaEntry with SQL expression |
| "Show the top 10 products by revenue" | Generate SQL query → display as sorted/filtered view |
| "Create a chart from this data" | Generate ChartSpec with `dataSource: { kind: 'table-ref' }` |
| "Clean up the dates column" | Generate SQL UPDATE or CAST expression |

**Manual editing is secondary but available**: users can click cells to edit values, drag to select ranges, use keyboard shortcuts for copy/paste.

### 3.4 Token-Efficient Data Handling

Same extract API as charts (defined in Charts M2):

| Tool | Purpose | Token cost |
|------|---------|------------|
| `describeTable` | Schema + profile | ~200 tokens |
| `sampleRows` | N random rows | ~50 tokens/row |
| `aggregateQuery` | SQL aggregation result | Variable, small |
| `uniqueValues` | Distinct values for a column | Variable |

**Hard rule**: The AI agent never receives more than 50 rows of raw data in a single prompt. For operations requiring full-table scans (filtering, sorting, formula computation), the agent generates SQL that DuckDB executes directly.

## 4) Grid Rendering

### 4.1 Library Selection

**Decision required**: Choose a virtualized grid renderer.

| Candidate | Bundle size | Virtualization | License | Notes |
|-----------|------------|----------------|---------|-------|
| AG Grid (Community) | ~300 KB | Yes (row + column) | MIT | Industry standard, feature-rich |
| TanStack Table | ~15 KB | DIY (headless) | MIT | Headless — full control but more work |
| Glide Data Grid | ~100 KB | Canvas-based | MIT | Fast rendering, good for large datasets |
| Custom (canvas) | 0 | DIY | — | Maximum control, maximum effort |

**Decision: Glide Data Grid** — canvas-based rendering handles 100k+ rows smoothly, MIT licensed, smaller than AG Grid, purpose-built for data grid UX.

### 4.2 Rendering Architecture

```
DuckDB table → SQL query (with LIMIT/OFFSET for viewport) → Arrow result → Grid renderer
```

- Only fetch rows visible in the viewport (virtualized query).
- Viewport pagination: `SELECT * FROM sheet_table ORDER BY rowid LIMIT 100 OFFSET {scrollPosition}`.
- Column sorting/filtering generates SQL `ORDER BY` / `WHERE` clauses, not in-memory sorts.
- This means 1M-row sheets render as fast as 100-row sheets — only the visible window is materialized.

## 5) Linked Content Model

### 5.1 Tables in Documents/Presentations

Spreadsheet data can be embedded as linked views:

```html
<!-- In document/presentation HTML -->
<div data-aura-linked-table="spreadsheet-id:sheet-id" 
     data-query="SELECT product, revenue FROM sales ORDER BY revenue DESC LIMIT 10"
     data-style="compact">
</div>
```

Hydrated at render time by querying DuckDB and rendering a styled HTML table.

### 5.2 Charts Bound to Spreadsheet Data

Charts can reference spreadsheet tables via `dataSource`:

```typescript
const chartSpec: ChartSpec = {
  // ... other fields
  dataSource: {
    kind: 'table-ref',
    refId: 'sales_q1',  // DuckDB table name
    query: 'SELECT month, SUM(revenue) as revenue FROM sales_q1 GROUP BY month ORDER BY month'
  }
};
```

### 5.3 Refresh Semantics

- **Manual refresh**: user clicks refresh on linked table/chart.
- **Auto-refresh on source change**: configurable per link. When enabled, linked content updates when the source spreadsheet is modified.
- **Staleness indicator**: if source data changes after link creation, show visual indicator.

## 6) .aura File Packaging

Spreadsheet data stored in the .aura zip:

```
project.aura (zip)
├── manifest.json
├── documents/
│   ├── {spreadsheet-id}.meta.json    # WorkbookMeta + SheetMeta[]
│   └── {spreadsheet-id}.parquet      # DuckDB table data exported as Parquet
├── ...
```

On save: `COPY table TO parquet` → include in zip.  
On load: extract Parquet → `CREATE TABLE FROM parquet` into DuckDB.

Parquet is chosen because:
- Columnar compression (much smaller than CSV/JSON for numeric data).
- DuckDB-native format (zero-copy import).
- Self-describing (schema embedded in file).

## 7) Milestones

### M1 — Grid Shell + Ingestion (depends on Charts M2 for DuckDB)
**Can begin UI scaffolding in parallel with Charts M2**

| Task | Description | Est. |
|------|-------------|------|
| M1.1 | Add `'spreadsheet'` document type to ProjectDocument + stores | S |
| M1.2 | Build SpreadsheetCanvas component with grid renderer | L |
| M1.3 | CSV/XLSX/JSON ingestion UI (file picker + delimiter config dialog) | M |
| M1.4 | Wire ingestion to DuckDB (via shared `src/services/data/ingest.ts`) | M |
| M1.5 | Virtualized viewport query (LIMIT/OFFSET from DuckDB) | M |
| M1.6 | Cell editing (click-to-edit, keyboard navigation, copy/paste) | L |
| M1.7 | Multi-tab UI (tab bar, add/rename/delete sheets) | M |
| M1.8 | Spreadsheet persistence in .aura format (Parquet export/import) | M |

### M2 — Prompted Computation Layer
**Depends on: M1**

| Task | Description | Est. |
|------|-------------|------|
| M2.1 | Prompt-to-formula pipeline (NL → SQL expression → FormulaEntry) | L |
| M2.2 | Formula dependency tracking and recalculation | M |
| M2.3 | AI extract tools wired for spreadsheet context (describeTable, etc.) | M |
| M2.4 | Column operations (add, remove, rename, retype via prompt) | M |
| M2.5 | Sort/filter via prompt ("show top 10 by revenue") | S |
| M2.6 | Error recovery for malformed formulas (show error in cell) | S |

### M3 — Linking + Chart Interop
**Depends on: M2 + Charts M3**

| Task | Description | Est. |
|------|-------------|------|
| M3.1 | Linked table embedding in documents/presentations | M |
| M3.2 | Chart binding to spreadsheet table references | M |
| M3.3 | Refresh pipeline (manual + auto on source change) | M |
| M3.4 | Staleness detection and visual indicators | S |
| M3.5 | Performance tuning for large-sheet workflows (100k+ rows) | M |

**Size estimates: S = < 1 day, M = 1-3 days, L = 3-5 days**

## 8) Validation Requirements

- **Unit tests**: ingestion parsers (CSV delimiters, XLSX sheets, JSON variants), formula planner, extraction contracts, Parquet round-trip integrity.
- **Performance tests**: ingestion time for 1k/10k/100k/1M rows, viewport query latency, formula recalculation time, memory pressure under large datasets.
- **Integration tests**: spreadsheet save/load in .aura format, linked table refresh, chart-from-spreadsheet flow.
- **Manual tests**: multi-tab editing, mixed prompt/manual workflows, copy/paste behavior, keyboard navigation, large dataset scrolling smoothness.

## 9) Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Large bundle (DuckDB + grid renderer + SheetJS) | Lazy-load all three. Spreadsheet module only loads when user creates/opens a spreadsheet. |
| Formula correctness drift | Formulas are DuckDB SQL expressions — deterministic by nature. Validate with `EXPLAIN` before applying. |
| Link inconsistency | Dependency graph with staleness detection. Show "data changed" indicator on linked views. |
| Grid renderer performance | Canvas-based rendering (Glide) or virtualized DOM. Only query visible viewport from DuckDB. |
| Parquet file size in .aura | Columnar compression keeps Parquet small. For very large datasets (>100 MB), consider external storage reference instead of embedding. |

## 10) Open Questions

1. ~~**Grid library**~~: **Decided — Glide Data Grid.**
2. **Formula language**: Start with pure DuckDB SQL expressions. Add simplified shorthand functions (e.g., `SUM(col)` → `SELECT SUM(col) FROM ...`) as syntactic sugar later. SQL is the foundation; shorthands compile down to SQL.
3. **External data sources**: Should spreadsheets support live connections to external databases/APIs, or only imported snapshots? Deferred to post-M3.
4. **Collaboration on spreadsheets**: Cell-level conflict resolution is hard. Deferred to account/cloud phase.
