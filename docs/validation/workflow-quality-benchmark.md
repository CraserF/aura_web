# Workflow Quality Benchmark

Use this benchmark loop after workflow-affecting changes that touch routing, create/edit behavior, templates, prompt packs, queueing, validation, or provider-specific fallbacks.

This benchmark complements the broader major-change protocol. It is the focused loop for “did artifact quality and throughput actually improve?”

## Benchmark Families

### Presentations

- narrative deck create
- metrics-heavy deck create
- style/theme shift
- targeted title or card-text edit
- layout conversion
- explicit full rewrite
- multi-slide queued request

### Documents

- long-form report create
- executive brief create
- targeted content edit
- style/theme change
- structural rewrite
- full rewrite

### Spreadsheets

- workbook create
- formula column
- query-derived sheet
- schema/layout change
- explain and dry-run correctness

## Record For Every Run

- time to first visible progress
- time to first usable output
- total completion time
- whether progress stayed continuous
- quality score
- consistency score
- failure classification:
  - routing bug
  - workflow bug
  - provider capability mismatch
  - prompt/design-system issue
  - model-quality limitation

## Acceptance Defaults

- progress should start quickly
- long-running work should keep updating visible progress
- queued work should expose which item is running and which items remain
- presentation output should feel meaningfully more polished than a generic office deck
- document edits should preserve user intent more reliably
- spreadsheet work should remain deterministic

## Related Docs

- [major-change-protocol.md](./major-change-protocol.md)
- [scorecard-template.md](./scorecard-template.md)
- [ollama-gemma4-baseline.md](./ollama-gemma4-baseline.md)
