export function buildChartGuidanceSection(): string {
  return `## CHART PLACEHOLDER FORMAT

When the slide benefits from a chart, do NOT draw chart data as inline SVG bars/lines.
Use Aura chart placeholders so runtime can hydrate Chart.js safely:

\`\`\`html
<script type="application/json" data-aura-chart-spec>
{
  "id": "chart-unique-id",
  "type": "bar",
  "title": "Revenue by Quarter",
  "labels": ["Q1", "Q2", "Q3", "Q4"],
  "datasets": [{ "label": "Revenue", "values": [120, 145, 167, 190] }],
  "unit": "$M",
  "illustrative": true
}
</script>
<div data-aura-chart="chart-unique-id" style="width:100%; max-width:720px; aspect-ratio:2; margin:24px auto;"></div>
\`\`\`

Rules:
- The script tag must use type="application/json" and data-aura-chart-spec.
- The id in JSON must exactly match data-aura-chart.
- Keep 2-30 labels and 1-8 datasets.
- Set illustrative: true for synthetic/example values.`;
}

/**
 * Returns the data-efficiency guardrails section for AI prompts that involve
 * large datasets or table-referenced chart data.
 *
 * Token guardrails (per charts-integration-plan.md §4.2):
 * - Hard cap: never embed more than 50 rows of raw data in a prompt.
 * - Default: send structured previews (schema summary, stats profile, top-N, 10 sampled rows).
 * - Instruct: use extraction tools; never request the full table unless the user explicitly asks.
 */
export function buildChartDataGuardrailsSection(): string {
  return `## CHART DATA — TOKEN GUARDRAILS

When working with table-referenced or large-dataset charts, follow these rules strictly:

### Data representation in prompts
- NEVER embed more than 50 rows of raw data inline in a ChartSpec or message.
- Instead, use structured previews:
  - Schema summary: column names, types, nullable flags
  - Statistical profile: null count, unique count, min/max/mean per numeric column
  - Top-N categories per categorical column (max 10)
  - 10 sampled rows for pattern recognition
- If the user has not explicitly requested the full table, do NOT request or reproduce it.

### Extraction tools
Use the extraction tools to work with large datasets:
- \`describeTable(tableName)\` — returns schema + row count + column profiles
- \`sampleRows(tableName, n)\` — returns up to 50 random rows as JSON (hard-capped at 50)
- \`aggregateQuery(tableName, sqlFragment)\` — runs an aggregation, returns results

### ChartSpec for table-referenced data
When a chart is derived from a DuckDB table, populate the dataSource field:
\`\`\`json
{
  "id": "chart-id",
  "type": "bar",
  "labels": ["..."],
  "datasets": [{ "label": "Series", "values": [/* aggregated subset */] }],
  "dataSource": {
    "kind": "table-ref",
    "refId": "tableName",
    "query": "SELECT category, SUM(value) AS total FROM tableName GROUP BY category ORDER BY total DESC LIMIT 20"
  },
  "extractPlan": {
    "operation": "groupBy",
    "params": { "groupCol": "category", "aggCol": "value", "agg": "sum", "limit": 20 }
  }
}
\`\`\`

Set \`illustrative: false\` when values are derived from real data.
Populate \`provenance\` with rowCount, generatedAt (ISO 8601), and queryHash when available.`;
}
