# Chart Selection Guide

## When to use each chart type

| Data pattern | Recommended chart | Avoid |
|---|---|---|
| Parts of a whole (<=6 categories) | doughnut | bar |
| Trend over time | line or area | doughnut |
| Ranked comparisons | bar or horizontal-bar | line |
| Long category names | horizontal-bar | bar |
| Multiple series comparison | grouped bar | doughnut |
| Cumulative totals | stacked-bar | line |
| Inline metric accent | sparkline | full chart |

## Rules

- Never use doughnut with more than 7 categories.
- Never use doughnut with multiple datasets.
- Prefer line over area unless emphasizing magnitude/volume.
- Use horizontal-bar when average label length is greater than 15 characters.
- Always set illustrative: true for synthetic/example data.
- Set unit when values represent currency, percentages, or counts.
