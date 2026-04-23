# Artifact Case Matrix

This matrix defines the minimum manual regression families for major workflow changes. The source registry lives in `src/test/fixtures/major-change-cases.ts`.

## Document

Required families:

- **Create**
  - long-form report
  - executive brief
  - visually dense framed document
- **Content edit**
  - small targeted text edit
  - section rewrite
  - add or remove subsection
  - headline or title change
- **Style edit**
  - typography change
  - spacing or density change
  - card or callout restyling
- **Theme change**
  - palette or visual theme shift
- **Structural edit**
  - reorder sections
  - insert comparison, table, or chart block
  - convert dense layout to more mobile-tolerant layout
- **Large rewrite**
  - explicit full rewrite
  - keep structure, change content
  - keep content, change look
- **Validation and export**
  - readiness panel
  - blocked export
  - override export
  - standalone artifact checks where applicable
- **Explain and dry-run**
  - explain mode
  - dry-run with no mutation
- **Viewport**
  - mobile narrow portrait
  - mobile landscape
  - tablet portrait
  - desktop standard
  - desktop wide

## Presentation

Required families:

- **Create**
  - keynote or narrative deck
  - metrics-heavy deck
  - comparison or multi-panel deck
- **Content edit**
  - title or card text update
  - speaker-message rewrite while preserving design
  - add or remove one slide
- **Style edit**
  - palette shift
  - typography change
  - card or frame restyling
- **Theme change**
  - density reduction for small viewport readability
- **Structural edit**
  - slide reorder
  - layout change for one slide
  - convert a slide to a different visual pattern
- **Large rewrite**
  - explicit full deck rewrite
  - preserve deck design while replacing content
  - preserve content while changing visual direction
- **Validation and export**
  - readiness panel
  - blocked export
  - override export
  - standalone artifact checks
- **Explain and dry-run**
  - explain mode
  - dry-run where the shared pipeline supports it
- **Viewport**
  - mobile narrow portrait
  - mobile landscape
  - tablet portrait
  - desktop standard
  - desktop wide

## Spreadsheet

Spreadsheets use equivalent edit families rather than document-style labels.

Required families:

- **Create**
  - workbook from prompt
  - starter analysis sheet
- **Content and data operations**
  - row or column scoped action
  - range update
  - sort or filter change
- **Formula change**
  - computed column
  - ratio or arithmetic formula
  - aggregation or conditional formula
- **Query change**
  - create query-derived sheet
  - update derived query view
- **Schema and layout**
  - add, remove, or relabel column
  - named sheet vs active-sheet targeting
- **Dependency refresh**
  - linked-table refresh
  - spreadsheet-driven document or presentation refresh
  - broken dependency surfaced clearly
- **Validation and publish**
  - readiness state
  - export or data compatibility checks
  - lifecycle or policy visibility after validation or publish
- **Explain and dry-run**
  - explain mode
  - dry-run with no workbook mutation
- **Performance-sensitive**
  - larger data scenario for responsiveness and deterministic completion

## Shared Cross-Artifact Cases

Rerun these when a change affects shared workflow seams:

- routing and artifact selection
- explain or dry-run mode
- readiness or publish gating
- lifecycle or policy behavior
- project augmentation or dependency refresh

Minimum shared checks:

- one document explain case
- one spreadsheet dry-run case
- one project-level summary, review, or readiness case
- one consistency comparison against a previously validated case of the same family

## Execution Notes

- Use the registry in `src/test/fixtures/major-change-cases.ts` as the canonical list of prompts and expected outcomes.
- Use the existing Workstream F representative fixtures as the seed set for viewport-sensitive document and presentation behavior.
- If a case fails, leave the relevant phase `implemented` and log the exact blocker rather than downgrading the matrix itself.
