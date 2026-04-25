# Workflow Quality Benchmark

Use this benchmark loop after workflow-affecting changes that touch routing, create/edit behavior, templates, prompt packs, queueing, validation, or provider-specific fallbacks.

This benchmark complements the broader major-change protocol. It is the focused loop for “did artifact quality and throughput actually improve?”

## Benchmark Families

### Presentations

- title opening
- stage-setting / context slide
- editorial explainer
- finance / infographic grid
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
- proposal board create
- research summary create
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

## Confidentiality Rules

- treat external visual references as style references only, never as reusable content assets
- keep benchmark prompts, exemplars, and templates synthetic
- do not copy real names, numbers, locations, case details, or narrative claims from confidential examples into committed assets
- if a benchmark fixture or exemplar appears to mirror a real reference too closely, replace it before logging the run as valid

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
