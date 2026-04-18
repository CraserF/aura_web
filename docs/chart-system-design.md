# Aura Chart System — Technical Design Document

> **Status:** Design  
> **Last updated:** 2026-04-18  
> **Library:** [Chart.js v4](https://www.chartjs.org/docs/latest/) (ESM-only, tree-shakeable)

---

## 1. Problem Statement

Aura generates professional presentations and documents but currently relies on the LLM to hand-author SVG charts inline (donut, bar, sparkline, line). This approach has several limitations:

1. **Inconsistency** — each generation produces different SVG structures, axis scales, and label placement.
2. **No real data binding** — illustrations are baked into the HTML with no editable data layer.
3. **No interactivity** — static SVGs cannot show tooltips, hover states, or animations.
4. **Theme drift** — the model may pick colors that clash with the selected palette.
5. **Export fragility** — SVG charts work for PDF but there is no shared rendering guarantee across surfaces.

### Goal

Introduce a deterministic, theme-aware chart rendering pipeline that:

- Works in both presentations (Reveal.js) and documents (sandboxed iframe).
- Stores chart data as structured metadata so charts are live when reopened.
- Follows the artifact's color palette in both light and dark modes.
- Exports cleanly to PDF via static image fallback.
- Lets the AI agent request charts through validated structured output.
- Lets users edit chart data directly.
- Marks illustrative/synthetic data visually.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         AI Workflow                             │
│                                                                 │
│  Planner ──→ Designer/Generator ──→ QA ──→ Sanitize ──→ Output │
│                   │                                             │
│           emits ChartSpec[]                                     │
│           as structured output                                  │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────┐
│       Chart Normalizer         │
│  (validate, pick type, fill    │
│   defaults, derive series      │
│   colors from palette)         │
└────────────┬───────────────────┘
             │ NormalizedChartSpec
             ▼
┌────────────────────────────────┐
│       Chart Renderer           │
│  (Chart.js: create canvas,     │
│   apply config, snapshot        │
│   to base64 image)             │
└──────┬────────────┬────────────┘
       │            │
       ▼            ▼
  Live <canvas>   Static <img>
  (in-app view)   (PDF export,
                   .aura fallback)
```

### Key Principle: Spec-Driven, Not Config-Driven

The AI agent does **not** produce raw Chart.js configuration. It produces an **Aura ChartSpec** — a smaller, validated schema that the normalizer maps to Chart.js config deterministically. This keeps the LLM's output constrained and testable.

---

## 3. ChartSpec Schema

### 3.1 Canonical Type

```ts
// src/services/charts/types.ts

/** Supported chart types for v1 */
export type AuraChartType =
  | 'bar'
  | 'horizontal-bar'
  | 'stacked-bar'
  | 'line'
  | 'area'          // line with fill
  | 'doughnut'
  | 'sparkline';    // minimal inline line, no axes

/** A single data series */
export interface ChartDataset {
  label: string;
  values: number[];
  /** Optional explicit color override (hex). If omitted, derived from palette. */
  color?: string;
}

/** The canonical chart specification produced by the AI or user */
export interface ChartSpec {
  /** Unique ID for persistence and placeholder matching */
  id: string;
  /** Chart type. If omitted, the normalizer infers from data shape. */
  type?: AuraChartType;
  /** Chart title (rendered above the chart) */
  title?: string;
  /** Subtitle or annotation */
  subtitle?: string;
  /** Category labels for the x-axis (bar/line) or segments (doughnut) */
  labels: string[];
  /** One or more data series */
  datasets: ChartDataset[];
  /** Unit suffix for values (e.g. "%", "$", "M") */
  unit?: string;
  /** Whether the data is illustrative/synthetic (renders a badge) */
  illustrative?: boolean;

  // ── Presentation hints ────────────────────────
  /** Show legend. Default: true when datasets.length > 1 */
  showLegend?: boolean;
  /** Show grid lines. Default: true for bar/line, false for doughnut */
  showGrid?: boolean;
  /** Show data labels on segments/bars. Default: false */
  showDataLabels?: boolean;
  /** Begin y-axis at zero. Default: true */
  beginAtZero?: boolean;
  /** Aspect ratio (width/height). Default: 2 for standard, 4 for sparkline */
  aspectRatio?: number;
  /** Stacking mode for bar/line. Only applies when type is 'stacked-bar'. */
  stacked?: boolean;
  /** Index direction for bar charts. Mapped from 'horizontal-bar' type. */
  indexAxis?: 'x' | 'y';
}
```

### 3.2 Zod Validation Schema

```ts
// src/services/ai/schemas/chart.ts

import { z } from 'zod';

export const ChartDatasetSchema = z.object({
  label: z.string().min(1).max(60).describe('Series name'),
  values: z.array(z.number()).min(1).max(50).describe('Numeric data points'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().describe('Hex color override'),
});

export const ChartSpecSchema = z.object({
  id: z.string().min(1).max(40).describe('Unique chart identifier'),
  type: z.enum([
    'bar', 'horizontal-bar', 'stacked-bar',
    'line', 'area', 'doughnut', 'sparkline',
  ]).optional().describe('Chart type. Omit to auto-detect.'),
  title: z.string().max(100).optional(),
  subtitle: z.string().max(200).optional(),
  labels: z.array(z.string().min(1).max(40)).min(2).max(30).describe('Category labels'),
  datasets: z.array(ChartDatasetSchema).min(1).max(8).describe('Data series'),
  unit: z.string().max(10).optional(),
  illustrative: z.boolean().optional().describe('True if data is synthetic/example'),
  showLegend: z.boolean().optional(),
  showGrid: z.boolean().optional(),
  showDataLabels: z.boolean().optional(),
  beginAtZero: z.boolean().optional().default(true),
  aspectRatio: z.number().min(0.5).max(6).optional(),
  stacked: z.boolean().optional(),
});

export type ChartSpecZ = z.infer<typeof ChartSpecSchema>;
```

### 3.3 Why This Shape

| Decision | Rationale |
|----------|-----------|
| `labels` + `datasets[].values` instead of `{x,y}` pairs | Covers 90% of business charts. Paired-coordinate data (scatter) is phase 2. |
| `type` is optional | Enables hybrid type selection — agent can propose or let the normalizer infer. |
| Max 8 datasets, max 30 labels | Prevents chart overload. More data should be a table. |
| `illustrative` flag | Required per user decision — synthetic data must be visually marked. |
| No raw Chart.js passthrough | Forces all charts through the same validation and theming pipeline. |
| `unit` on spec, not per-dataset | Simplifies tooltip/label formatting. Mixed-unit charts are phase 2. |

---

## 4. Chart Type Selection Rules

When `type` is omitted, the normalizer applies deterministic rules. When the agent provides a type, the normalizer validates it against the data shape and can override obviously wrong choices.

```ts
// src/services/charts/typeSelector.ts

export function inferChartType(spec: ChartSpec): AuraChartType {
  const { labels, datasets } = spec;
  const seriesCount = datasets.length;
  const labelCount = labels.length;

  // Sparkline: single series, no title, small label count
  if (seriesCount === 1 && !spec.title && labelCount <= 12) {
    // Hint: if embedded inside a metric card, treat as sparkline
    if (spec.aspectRatio && spec.aspectRatio >= 3) return 'sparkline';
  }

  // Doughnut: single series, ≤7 categories (part-to-whole)
  if (seriesCount === 1 && labelCount <= 7) {
    const allPositive = datasets[0].values.every((v) => v >= 0);
    if (allPositive) return 'doughnut';
  }

  // Time-series heuristic: labels look like dates/months/quarters
  const timePattern = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|q[1-4]|20\d{2}|week|day)/i;
  const looksLikeTimeSeries = labels.filter((l) => timePattern.test(l)).length > labels.length * 0.5;

  if (looksLikeTimeSeries) return 'line';

  // Multiple series + moderate labels → grouped bar
  if (seriesCount >= 2 && labelCount <= 12) return 'bar';

  // Long category names → horizontal bar
  const avgLabelLength = labels.reduce((sum, l) => sum + l.length, 0) / labelCount;
  if (avgLabelLength > 15) return 'horizontal-bar';

  // Default
  return 'bar';
}
```

### Override Validation

If the agent picks `doughnut` but there are >7 categories or multiple datasets, the normalizer logs a warning and falls back to `bar`. Known misuse patterns:

| Agent picks | Data shape | Normalizer action |
|-------------|------------|-------------------|
| `doughnut` | >7 labels | Override → `bar` |
| `doughnut` | >1 dataset | Override → `bar` |
| `sparkline` | has title + legend | Override → `line` |
| `stacked-bar` | 1 dataset | Override → `bar` |
| `line` | 2 labels | Override → `bar` |

---

## 5. Theme Integration

### 5.1 Palette Source

Charts derive their colors from the **artifact theme**, not the app shell theme or Chart.js defaults.

| Surface | Theme source | Key properties |
|---------|-------------|----------------|
| Presentation | `TemplatePalette` from `palettes.ts` | `primary`, `accent`, `bg`, `heading`, `body`, `muted`, `border`, `surface`, `mode` |
| Document | `DocumentTheme` from `document.ts` | `primary`, `accent`, `bg`, `text`, `muted`, `border`, `surface`, `surfaceAlt` |

Both sources provide `primary`, `accent`, `bg`, `text/body`, `muted`, and `border`. The chart theming layer normalizes them into a shared `ChartTheme`.

### 5.2 ChartTheme Type

```ts
// src/services/charts/theme.ts

export interface ChartTheme {
  /** Whether the artifact background is dark */
  mode: 'light' | 'dark';
  /** Chart canvas background (usually transparent) */
  canvasBg: string;
  /** Text color for titles, labels, tooltips */
  textColor: string;
  /** Muted text for axis labels, tick marks */
  mutedColor: string;
  /** Grid line and border color */
  gridColor: string;
  /** Tooltip background */
  tooltipBg: string;
  /** Tooltip text */
  tooltipText: string;
  /** Ordered series color ramp (primary, accent, then generated) */
  seriesColors: string[];
  /** Font family */
  fontFamily: string;
}
```

### 5.3 Series Color Ramp Generation

```ts
export function buildSeriesColors(
  primary: string,
  accent: string,
  mode: 'light' | 'dark',
  count: number,
): string[] {
  // Start with primary and accent
  const base = [primary, accent];

  // Generate additional colors by rotating hue from primary
  // Uses oklch for perceptual uniformity
  const additional = generateHueRotations(primary, count - 2, mode);

  return [...base, ...additional].slice(0, count);
}
```

The ramp is deterministic for a given palette: same input always produces the same colors. Per-dataset `color` overrides take precedence.

### 5.4 Chart.js Config Mapping

```ts
export function applyTheme(config: ChartConfiguration, theme: ChartTheme): void {
  const { textColor, mutedColor, gridColor, tooltipBg, tooltipText, fontFamily } = theme;

  // Global defaults
  config.options ??= {};
  config.options.color = textColor;
  config.options.font = { family: fontFamily };

  // Scales
  if (config.options.scales) {
    for (const scale of Object.values(config.options.scales)) {
      if (!scale) continue;
      scale.ticks = { ...scale.ticks, color: mutedColor };
      scale.grid = { ...scale.grid, color: gridColor };
      scale.border = { ...scale.border, color: gridColor };
      scale.title = { ...scale.title, color: mutedColor };
    }
  }

  // Legend
  config.options.plugins ??= {};
  config.options.plugins.legend = {
    ...config.options.plugins.legend,
    labels: { color: textColor, font: { family: fontFamily } },
  };

  // Tooltip
  config.options.plugins.tooltip = {
    ...config.options.plugins.tooltip,
    backgroundColor: tooltipBg,
    titleColor: tooltipText,
    bodyColor: tooltipText,
    borderColor: gridColor,
    borderWidth: 1,
  };
}
```

---

## 6. Rendering Architecture

### 6.1 Two Render Surfaces, One Renderer

Both presentations and documents need to render Chart.js charts, but each surface has different constraints:

| | Presentation (Reveal.js) | Document (sandboxed iframe) |
|---|---|---|
| **Execution context** | Main window DOM | Sandboxed iframe (`allow-scripts`, no `allow-same-origin`) |
| **Canvas size** | Fixed 1920×1080, CSS-scaled | Fluid width, scrollable |
| **Script injection** | Not possible (`<script>` stripped by sanitizer) | Script injection via `buildIframeDocument()` |
| **Existing plugin pattern** | Data attributes → Reveal plugin reads → creates DOM | Inline `<script>` in iframe template |

### 6.2 Presentation: Reveal.js Chart Plugin

Follow the established pattern used by `AnimationEnginePlugin` and `ThreeBackgroundPlugin`:

1. The AI (or user) places a `<div data-aura-chart="chartId">` placeholder in the slide HTML.
2. The sanitizer preserves this element (it's a `<div>`, not a blocked tag; `data-*` attributes are not event handlers).
3. A new `ChartPlugin` registers with Reveal.js and, on `ready`/`slidechanged`, scans for `data-aura-chart` containers.
4. For each container, the plugin looks up the chart spec from the document metadata store, creates a `<canvas>`, and instantiates Chart.js.
5. On slide leave, the plugin can optionally pause animations to save resources.
6. On deck destroy, the plugin destroys all Chart.js instances.

```ts
// src/services/presentation/plugins/chart-plugin.ts

import type { PluginFunction } from '../types';

export const ChartPlugin: PluginFunction = () => {
  return {
    id: 'aura-charts',

    init: (reveal) => {
      const chartInstances = new Map<string, Chart>();

      function hydrateCharts() {
        const containers = reveal.getSlidesElement()
          .querySelectorAll<HTMLElement>('[data-aura-chart]');

        for (const container of containers) {
          const chartId = container.dataset.auraChart;
          if (!chartId || chartInstances.has(chartId)) continue;

          const spec = getChartSpec(chartId); // from metadata store
          if (!spec) continue;

          const canvas = document.createElement('canvas');
          container.appendChild(canvas);

          const theme = getCurrentPresentationTheme();
          const config = buildChartConfig(spec, theme);
          const chart = new Chart(canvas, config);
          chartInstances.set(chartId, chart);
        }
      }

      reveal.on('ready', hydrateCharts);
      reveal.on('slidechanged', hydrateCharts);

      return {
        destroy: () => {
          chartInstances.forEach((c) => c.destroy());
          chartInstances.clear();
        },
      };
    },
  };
};
```

### 6.3 Document: Iframe Chart Hydration

Documents render inside a sandboxed iframe. The iframe already supports injected `<script>` blocks (the navigation script is injected via `buildIframeDocument()`).

Strategy:
1. Chart specs are serialized as a JSON blob inside the iframe's `<script>` block.
2. Chart.js is bundled into a small standalone module that the iframe script imports or inlines.
3. On `DOMContentLoaded`, the script scans for `[data-aura-chart]` placeholders and renders each chart.

**Important constraint:** The iframe sandbox has `allow-scripts` but NOT `allow-same-origin`. This means the iframe script cannot access the parent window's stores or imports. Chart.js and chart specs must be self-contained within the iframe document.

Two approaches for getting Chart.js into the iframe:

| Approach | Pros | Cons |
|----------|------|------|
| **A: Inline Chart.js as a data URI script** | Fully self-contained, no network | Increases iframe document size (~60KB gzipped) |
| **B: Blob URL for Chart.js bundle** | Cleaner separation | Blob URLs may be blocked by some CSP; needs lifecycle management |
| **C: Import from CDN** | Simplest | External network dependency; violates Aura's offline-first design |

**Recommendation: Approach A** — inline a pre-built Chart.js bundle into the iframe template. The incremental size (~200KB uncompressed for tree-shaken subset) is acceptable for a rich document viewer. The bundle is generated at build time and included as a string constant, similar to how `NAVIGATION_SCRIPT` is embedded today.

```ts
// In DocumentCanvas.tsx buildIframeDocument():
function buildIframeDocument(bodyHtml: string, pagesEnabled: boolean, chartSpecs?: ChartSpec[]): string {
  const chartScript = chartSpecs?.length
    ? `<script>${CHART_JS_BUNDLE}\n${buildChartHydrationScript(chartSpecs)}<\/script>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  ...
  ${chartScript}
</head>
<body>...</body>
</html>`;
}
```

### 6.4 Presentation Charts — Fixed Canvas Sizing

Reveal.js renders at 1920×1080 and CSS-scales to fit the viewport. Chart containers must use **fixed px dimensions**, not viewport units. The Chart.js `responsive: false` option should be set, with explicit `width` and `height` on the canvas matching the container's fixed px allocation.

```ts
// For presentation charts:
config.options.responsive = false;
config.options.maintainAspectRatio = false;
// Canvas dimensions set explicitly based on container allocation
canvas.width = containerWidth;   // e.g. 800
canvas.height = containerHeight; // e.g. 500
```

This follows the rule documented in repo memory: **NEVER use vw/vh/vmin/vmax in slide CSS**.

### 6.5 Document Charts — Responsive Sizing

For documents, Chart.js runs in responsive mode:

```ts
config.options.responsive = true;
config.options.maintainAspectRatio = true;
config.options.aspectRatio = spec.aspectRatio ?? 2;
```

The chart container is a block-level element that fills the iframe's content width.

---

## 7. Persistence & File Format

### 7.1 Project Document Metadata Extension

Chart specs are stored on the `ProjectDocument` as a dedicated field:

```ts
// Additions to src/types/project.ts

export interface ProjectDocument {
  // ... existing fields ...

  /** Chart specifications keyed by chart ID */
  chartSpecs?: Record<string, ChartSpec>;
}
```

### 7.2 HTML Placeholder Contract

The generated HTML contains lightweight placeholders:

```html
<!-- In slide or document HTML -->
<div data-aura-chart="chart-revenue-2025"
     class="aura-chart-container"
     style="width: 100%; max-width: 800px; aspect-ratio: 2;">
  <!-- Hydrated at runtime by chart plugin/script -->
</div>
```

The `data-aura-chart` attribute is the only coupling between HTML and metadata. If chart metadata is missing (e.g. corrupted file), the container renders empty gracefully.

### 7.3 .aura File Format Extension

The project format in `projectFormat.ts` gains a chart metadata file per document:

```
documents/
  {id}.html              — document/presentation HTML (contains placeholders)
  {id}.css               — theme CSS
  {id}.meta.json         — document metadata (gains chartSpecs field)
  {id}.charts.json       — chart specs (optional, for documents with charts)
```

On save:
```ts
if (doc.chartSpecs && Object.keys(doc.chartSpecs).length > 0) {
  docsFolder.file(`${doc.id}.charts.json`, JSON.stringify(doc.chartSpecs, null, 2));
}
```

On load:
```ts
const chartsJson = await zip.file(`documents/${docId}.charts.json`)?.async('string');
const chartSpecs = chartsJson ? JSON.parse(chartsJson) as Record<string, ChartSpec> : undefined;
// Merge into ProjectDocument
```

When an `.aura` file is reopened, chart specs are loaded from metadata and the chart plugin/script hydrates them into live Chart.js instances. Charts are **live on reopen**, not static images.

### 7.4 Autosave

The autosave system in `autosave.ts` already persists the full `ProjectDocument`. Adding `chartSpecs` to the document type means it's automatically included in IndexedDB persistence with no additional autosave changes.

---

## 8. Export

### 8.1 PDF Export

The PDF pipeline in `pdf.ts` uses `html2pdf.js` which internally uses `html2canvas`. `html2canvas` **cannot render Chart.js `<canvas>` elements** natively — it screenshots the DOM but skips canvas content unless the canvas has been explicitly drawn.

Strategy for PDF export:

1. Before export, iterate all `[data-aura-chart]` containers in the export DOM clone.
2. For each, call `chart.toBase64Image('image/png', 2)` (2x device pixel ratio for print quality).
3. Replace the `<canvas>` with an `<img src="data:image/png;base64,...">` in the export clone.
4. Disable animations: `Chart.defaults.animation = false` before creating export chart instances.
5. Proceed with normal html2pdf pipeline.

```ts
// src/services/export/chartExport.ts

export async function flattenChartsForExport(
  container: HTMLElement,
  chartSpecs: Record<string, ChartSpec>,
  theme: ChartTheme,
): Promise<void> {
  const placeholders = container.querySelectorAll<HTMLElement>('[data-aura-chart]');

  for (const placeholder of placeholders) {
    const chartId = placeholder.dataset.auraChart;
    if (!chartId || !chartSpecs[chartId]) continue;

    const spec = chartSpecs[chartId];
    const canvas = document.createElement('canvas');
    canvas.width = placeholder.offsetWidth * 2;
    canvas.height = placeholder.offsetHeight * 2;

    const config = buildChartConfig(spec, theme);
    config.options!.animation = false;
    config.options!.responsive = false;

    const chart = new Chart(canvas, config);
    const dataUrl = chart.toBase64Image('image/png', 1);
    chart.destroy();

    // Replace canvas with static image
    placeholder.innerHTML = `<img src="${dataUrl}" style="width:100%;height:auto;" alt="${spec.title ?? 'Chart'}" />`;
  }
}
```

### 8.2 DOCX Export

The existing DOCX export (`docx.ts`) can embed the same base64 PNG as an inline image. The `docx` npm package supports `ImageRun` with base64 data.

### 8.3 Illustrative Data Badge

When `spec.illustrative === true`, the chart container renders a small overlay badge:

```html
<div class="aura-chart-container" data-aura-chart="..." data-illustrative="true">
  <canvas>...</canvas>
  <span class="aura-chart-badge">Illustrative data</span>
</div>
```

Styled with reduced opacity and a border treatment. The badge is included in both live and export views.

---

## 9. AI Integration

### 9.1 Designer Tool — Presentation Charts

Following the established pattern in the designer agent (which already uses `ToolLoopAgent` with `tool()` from the AI SDK), add a `requestChart` tool:

```ts
requestChart: tool({
  description: 'Request a data chart to be rendered on a slide. Place a <div data-aura-chart="{id}"> in the HTML where the chart should appear.',
  inputSchema: ChartSpecSchema,
  execute: async (spec) => {
    // Validate and normalize
    const normalized = normalizeChartSpec(spec);
    // Store in workflow context for later persistence
    chartSpecs[normalized.id] = normalized;
    return { success: true, chartId: normalized.id, type: normalized.type };
  },
}),
```

The designer emits both:
1. HTML with `<div data-aura-chart="chartId">` placeholders sized appropriately.
2. One `requestChart` tool call per chart with the full spec.

### 9.2 Document Workflow

The document workflow currently uses `streamText`, not `ToolLoopAgent`. Two options:

| Approach | Effort | Tradeoff |
|----------|--------|----------|
| **A: Embed ChartSpec as JSON in HTML** | Low | Agent writes `<script type="application/json" data-aura-chart-spec>` blocks inline. Post-processing extracts them. |
| **B: Switch document workflow to ToolLoopAgent** | Medium | Adds tool-calling capability, richer agent control; larger refactor. |
| **C: Two-pass: generate HTML, then request charts** | Low | Separate generateObject call scans the document and proposes charts. |

**Recommendation: Approach A for v1.** The document generator already produces HTML with inline `<style>` blocks. Adding `<script type="application/json">` blocks is a natural extension. The sanitizer does NOT strip `<script type="application/json">` because it does not execute — however, the current sanitizer strips ALL `<script>` tags regardless of type. This requires a targeted sanitizer amendment:

```ts
// In sanitizer.ts, when removing <script> tags:
doc.querySelectorAll('script').forEach((el) => {
  // Preserve non-executable data scripts
  if (el.type === 'application/json' && el.dataset.auraChartSpec !== undefined) {
    return; // Keep chart spec blocks
  }
  el.remove();
});
```

The spec blocks are extracted during the post-processing step (after QA, before final output) and moved into `chartSpecs` metadata. The `<script>` block is then removed from the final HTML and replaced with the `<div data-aura-chart>` placeholder.

### 9.3 Chart Type Selection Knowledge

Add a knowledge doc for the AI to reference when deciding chart types:

```markdown
# Chart Selection Guide

## When to use each chart type

| Data pattern | Recommended chart | Avoid |
|---|---|---|
| Parts of a whole (≤6 categories) | doughnut | bar |
| Trend over time | line or area | doughnut |
| Ranked comparisons | bar or horizontal-bar | line |
| Long category names | horizontal-bar | bar |
| Multiple series comparison | grouped bar | doughnut |
| Cumulative totals | stacked-bar | line |
| Inline metric accent | sparkline | any full chart |

## Rules
- Never use doughnut with more than 7 categories
- Never use doughnut with multiple datasets
- Prefer line over area unless showing volume/magnitude
- Use horizontal-bar when label text averages >15 characters
- Always set illustrative: true when using example/made-up data
- Set unit when values represent currency ("$"), percentage ("%"), or counts
```

### 9.4 Prompt Injection

Add chart instructions to the document and presentation prompt composers:

```ts
// In document prompt composer
addChartGuidance(): this {
  this.sections.push(`## Charts
When the content benefits from a data visualization, emit a chart specification block:
\`\`\`html
<script type="application/json" data-aura-chart-spec>
{
  "id": "unique-chart-id",
  "type": "bar",
  "title": "Revenue by Quarter",
  "labels": ["Q1", "Q2", "Q3", "Q4"],
  "datasets": [{ "label": "Revenue", "values": [120, 145, 167, 190] }],
  "unit": "$M",
  "illustrative": true
}
</script>
<div data-aura-chart="unique-chart-id" style="width:100%; max-width:720px; aspect-ratio:2; margin:24px auto;"></div>
\`\`\`
Use chart-selection-guide rules to pick the right chart type.
Mark data as illustrative unless the user provided real numbers.`);
  return this;
}
```

---

## 10. Data Input Modes

### 10.1 Inline JSON Spec (Primary)

The AI or user provides a `ChartSpec` object directly. This is the canonical format.

### 10.2 Markdown Table Conversion

Users may paste or the AI may generate markdown tables. A parser converts:

```markdown
| Quarter | Revenue | Costs |
|---------|---------|-------|
| Q1      | 120     | 80    |
| Q2      | 145     | 95    |
| Q3      | 167     | 110   |
| Q4      | 190     | 125   |
```

Into:
```json
{
  "labels": ["Q1", "Q2", "Q3", "Q4"],
  "datasets": [
    { "label": "Revenue", "values": [120, 145, 167, 110] },
    { "label": "Costs", "values": [80, 95, 110, 125] }
  ]
}
```

```ts
// src/services/charts/parseMarkdownTable.ts

export function markdownTableToChartData(
  markdown: string,
): { labels: string[]; datasets: ChartDataset[] } | null {
  // Parse pipe-delimited rows
  // First column = labels, remaining columns = datasets
  // Column headers = dataset labels
  // Skip separator row (---|---|---)
  // Return null if table has <2 data rows or <2 columns
}
```

### 10.3 Illustrative Synthetic Data

When the AI knows a chart would help but has no real data, it generates plausible synthetic data and sets `illustrative: true`. The normalizer validates that the flag is set.

### 10.4 CSV/Spreadsheet Import (Phase 2)

A file picker allows users to upload `.csv` or paste tab-separated data. The parser normalizes it into `ChartSpec.labels` + `ChartSpec.datasets`.

---

## 11. Chart.js Integration Details

### 11.1 Tree-Shaken Import

Chart.js v4 is ESM-only (matches Aura's `"type": "module"`). Register only the components needed for v1 chart types:

```ts
// src/services/charts/registry.ts

import {
  Chart,
  BarController,
  LineController,
  DoughnutController,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  Filler,
  Legend,
  Tooltip,
  Title,
  Colors,
} from 'chart.js';

Chart.register(
  BarController,
  LineController,
  DoughnutController,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  Filler,
  Legend,
  Tooltip,
  Title,
  Colors,
);

export { Chart };
```

### 11.2 Estimated Bundle Impact

| Component | Approx. size (minified) |
|-----------|------------------------|
| Chart.js core | ~45KB |
| Bar + Line + Doughnut controllers | ~15KB |
| Scales + Elements | ~20KB |
| Plugins (Legend, Tooltip, Title, Filler) | ~15KB |
| **Total** | **~95KB** |

For comparison, Aura already ships `reveal.js` (~80KB) and `html2pdf.js` (~90KB). The chart bundle is comparable and justified by the feature value.

### 11.3 Animation Control

- **In-app live rendering:** Animations enabled, default duration 750ms.
- **Export / snapshot:** `animation: false` globally before creating export instances.
- **Presentation mode:** Animations play on slide enter, controlled by the plugin.

### 11.4 Sparkline Configuration

Sparklines are minimal line charts with no axes, grid, legend, or tooltips:

```ts
function sparklineConfig(spec: ChartSpec, theme: ChartTheme): ChartConfiguration {
  return {
    type: 'line',
    data: {
      labels: spec.labels,
      datasets: [{
        data: spec.datasets[0].values,
        borderColor: theme.seriesColors[0],
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
        tension: 0.3,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: spec.aspectRatio ?? 4,
      animation: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: {
        x: { display: false },
        y: { display: false },
      },
    },
  };
}
```

---

## 12. User Editing Interface

### 12.1 Chart Data Editor (v1 — Minimal)

A dialog accessible from:
- A small edit icon overlaid on chart containers in the app
- A slash command or chat instruction ("edit chart data")

The dialog contains:
- **Type selector** — dropdown of supported chart types
- **Data tab** — JSON editor with the ChartSpec (pre-filled, editable)
- **Table tab** — spreadsheet-like grid for labels + values (bi-directional sync with JSON)
- **Preview** — live Chart.js preview pane
- **Illustrative toggle** — checkbox for marking data as synthetic

### 12.2 Chat-Based Editing

Users can say "update the revenue chart to show Q1=150" and the agent:
1. Finds the existing chart spec by searching for matching title/id.
2. Produces an updated spec.
3. The normalizer validates and re-renders.

---

## 13. Sanitizer Amendments

The HTML sanitizer needs two changes for chart support:

### 13.1 Preserve Chart Spec Script Blocks

```ts
// Current: removes ALL <script> tags
// Required: preserve <script type="application/json" data-aura-chart-spec>

doc.querySelectorAll('script').forEach((el) => {
  const isChartSpec =
    el.getAttribute('type') === 'application/json' &&
    el.hasAttribute('data-aura-chart-spec');
  if (!isChartSpec) {
    el.remove();
  }
});
```

This is safe because `<script type="application/json">` is **never executed** by the browser — it's treated as an opaque data block. The `data-aura-chart-spec` attribute provides an additional safeguard ensuring only chart-related blocks are preserved.

### 13.2 Preserve Canvas Elements

`<canvas>` is already NOT in `BLOCKED_TAGS` — no change needed.

### 13.3 Preserve Data Attributes

`data-aura-chart` and `data-illustrative` are `data-*` attributes, not event handlers. The sanitizer only strips `on*` prefixed attributes. No change needed.

---

## 14. File Structure

```
src/services/charts/
  index.ts                  — public API: renderChart, snapshotChart, normalizeSpec
  types.ts                  — ChartSpec, ChartDataset, AuraChartType, ChartTheme
  registry.ts               — Chart.js import and component registration
  normalizer.ts             — validate, fill defaults, derive colors
  typeSelector.ts           — inferChartType + override validation
  theme.ts                  — ChartTheme builder, buildSeriesColors, applyTheme
  renderer.ts               — create Chart.js instance from NormalizedChartSpec
  snapshot.ts               — toBase64Image wrapper for export
  parseMarkdownTable.ts     — markdown table → ChartDataset[]
  iframe-bundle.ts          — pre-built Chart.js + hydration script for iframe
  
src/services/ai/schemas/
  chart.ts                  — Zod ChartSpecSchema

src/services/ai/knowledge/docs/
  chart-selection-guide.md  — knowledge doc for AI chart type selection

src/services/presentation/plugins/
  chart-plugin.ts           — Reveal.js plugin for live chart hydration

src/services/export/
  chartExport.ts            — flattenChartsForExport (canvas → img for PDF)

src/test/
  chart-normalizer.test.ts
  chart-type-selector.test.ts
  chart-theme.test.ts
  chart-markdown-table.test.ts
```

---

## 15. Delivery Phases

### Phase 1 — Foundation (Current Focus)

| # | Task | Depends on |
|---|------|-----------|
| 1 | Define `ChartSpec` types and Zod schema | — |
| 2 | Chart.js registration with tree-shaking | — |
| 3 | Chart normalizer (validate, defaults, type override) | 1 |
| 4 | Chart type selector (deterministic rules) | 1 |
| 5 | Chart theme builder (palette → ChartTheme → Chart.js config) | 1 |
| 6 | Chart renderer (spec → live Chart.js instance) | 2, 3, 5 |
| 7 | Presentation plugin (`data-aura-chart` → hydrate) | 6 |
| 8 | Document iframe chart injection | 6 |
| 9 | Snapshot utility (toBase64Image) | 6 |
| 10 | PDF export chart flattening | 9 |
| 11 | Sanitizer amendment (preserve chart spec blocks) | — |
| 12 | Persistence: `chartSpecs` on ProjectDocument + .aura format | 1 |
| 13 | AI prompt injection (chart guidance for designer/document agents) | 1, 11 |
| 14 | Chart selection knowledge doc | — |
| 15 | Unit tests (normalizer, type selector, theme, markdown table) | 1-5 |

### Phase 2 — Editing & Input

| # | Task |
|---|------|
| 16 | Chart data editor dialog (JSON + table tabs) |
| 17 | Markdown table → ChartSpec parser |
| 18 | CSV/spreadsheet import |
| 19 | Chat-based chart editing (find + update spec) |
| 20 | Illustrative data badge rendering and export |
| 21 | Sparkline inline mode (embedded in metric cards) |

### Phase 3 — Advanced

| # | Task |
|---|------|
| 22 | Scatter, radar, bubble chart types |
| 23 | Mixed chart types (bar + line) |
| 24 | Annotation plugin (reference lines, bands) |
| 25 | Responsive layout presets for different slide layouts |
| 26 | Chart-aware QA validation rules |
| 27 | DOCX export chart embedding |

---

## 16. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Bundle size increase** | ~95KB added to main bundle | Tree-shake aggressively; lazy-import Chart.js only when first chart is needed |
| **Iframe bundle duplication** | Chart.js duplicated in main app + iframe | Build a standalone minified bundle for iframe use; accept the duplication since contexts are isolated |
| **LLM produces invalid chart specs** | Broken charts or missing data | Zod validation + normalizer defaults + graceful empty-container fallback |
| **Canvas not captured by html2canvas** | Blank charts in PDF | Pre-flatten all charts to `<img>` before PDF pipeline runs |
| **Reveal.js scaling distorts canvas** | Blurry or misaligned charts | Use `responsive: false` + fixed px dimensions in presentations |
| **Sanitizer evolution breaks chart blocks** | Future sanitizer changes strip chart data | Dedicated test case; chart spec extraction runs before general sanitization |
| **Dark/light theme mismatch** | Chart colors clash with slide background | Always derive from artifact palette, never Chart.js defaults |

---

## 17. Open Design Decisions (Resolved)

| Question | Decision | Rationale |
|----------|----------|-----------|
| Where is chart source of truth? | Project metadata + lightweight HTML placeholders | User confirmed. Enables editing and safe persistence. |
| Live vs static on export? | Live in-app, static for export | User confirmed. `toBase64Image` handles export flattening. |
| Theme source? | Artifact theme completely | User confirmed. Charts follow the document/presentation palette. |
| Editing model? | Both chat-based and direct data editor | User confirmed. Data-first editing is the reliable path. |
| Mark illustrative data? | Yes, visual badge | User confirmed. Badge on both live and export views. |

---

## 18. Test Plan

### Unit Tests

| Test file | Coverage |
|-----------|----------|
| `chart-normalizer.test.ts` | Defaults filled, invalid specs rejected, color derivation |
| `chart-type-selector.test.ts` | All inference rules, all override scenarios |
| `chart-theme.test.ts` | Light/dark derivation, series color ramp, each palette family |
| `chart-markdown-table.test.ts` | Valid tables, edge cases (empty cells, non-numeric), malformed input |

### Integration Tests

| Scenario | What to verify |
|----------|----------------|
| Presentation hydration | Plugin finds placeholder, creates canvas, renders chart, destroys on deck destroy |
| Document hydration | Iframe script scans placeholders, renders charts, respects container width |
| PDF export | Charts flattened to `<img>`, no blank areas, correct dimensions |
| .aura round-trip | Save project with charts → reopen → charts render live from metadata |
| Sanitizer safety | `<script type="application/json" data-aura-chart-spec>` preserved; `<script>` without marker still stripped; `<script type="text/javascript" data-aura-chart-spec>` stripped (type must be application/json) |

---

## Appendix A: Example ChartSpec Payloads

### Bar Chart
```json
{
  "id": "revenue-by-region",
  "type": "bar",
  "title": "Revenue by Region",
  "labels": ["North America", "Europe", "Asia Pacific", "Latin America"],
  "datasets": [
    { "label": "2024", "values": [4200, 3100, 2800, 1500] },
    { "label": "2025 (Projected)", "values": [4800, 3600, 3400, 1900] }
  ],
  "unit": "$M",
  "illustrative": true,
  "showLegend": true,
  "beginAtZero": true
}
```

### Doughnut
```json
{
  "id": "market-share",
  "type": "doughnut",
  "title": "Market Share",
  "labels": ["Our Product", "Competitor A", "Competitor B", "Others"],
  "datasets": [
    { "label": "Share", "values": [42, 28, 18, 12] }
  ],
  "unit": "%",
  "illustrative": false,
  "showDataLabels": true
}
```

### Sparkline
```json
{
  "id": "revenue-trend",
  "type": "sparkline",
  "labels": ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"],
  "datasets": [
    { "label": "Revenue", "values": [12, 19, 15, 22, 25, 28, 24, 30, 35, 32, 38, 42] }
  ],
  "aspectRatio": 4
}
```

### Area Chart
```json
{
  "id": "user-growth",
  "type": "area",
  "title": "Monthly Active Users",
  "subtitle": "Steady growth since platform launch",
  "labels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
  "datasets": [
    { "label": "MAU", "values": [1200, 1450, 1800, 2100, 2650, 3200] }
  ],
  "unit": "K",
  "illustrative": true,
  "showGrid": true
}
```
