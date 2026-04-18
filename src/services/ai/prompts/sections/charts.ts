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
