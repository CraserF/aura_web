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
- deterministic correctness and craft telemetry

## Record For Every Run

- time to first visible progress
- time to first usable output
- total completion time
- whether progress stayed continuous
- quality score
- quality grade
- failed quality signals, if any
- polishing skipped or triggered reason
- consistency score
- failure classification:
  - routing bug
  - workflow bug
  - provider capability mismatch
  - prompt/design-system issue
  - model-quality limitation
  - quality-depth
  - quality-visual
  - quality-continuity

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
- documents should meet target depth and component rhythm rather than collapsing into short generic prose
- document edits should preserve user intent more reliably
- spreadsheet work should remain deterministic while reporting craft/readiness signals
- explain and dry-run compatibility checks are not active benchmark gates unless the changed code directly touches those legacy paths

## Quality Recovery Validation Targets

The presentation quality recovery plan (Steps 1–10) is fully implemented as of 2026-04-28. Manual visual evidence is the remaining gate before the recovery can be declared complete.

### Minimum Evidence Required

- One frontier single-slide presentation (title or narrative) scoring above the old baseline.
- One frontier queued deck (3–5 slides) with varied slide roles, design continuity, and no repeated-grid advisory.
- One Ollama single-slide result scoring at or above the local quality threshold (`structured-premium-lite`), or a documented `safe-budget-exhausted` outcome with a valid failure classification.
- One Ollama queued deck result or `npm run benchmark:ollama` scorecard for the same deck case.
- Viewport spot-checks for at least desktop and mobile portrait for each artifact above.

### How To Run

Frontier runs: use the app in normal create mode. Capture quality telemetry from advanced diagnostics (run history panel → advanced diagnostics). Record `qualityDecision`, `qualityScore`, `failedSignals`, and whether a polish pass ran or was skipped.

Ollama runs: `npm run benchmark:ollama` uses `WORKFLOW_BENCHMARK_CASES` fixture cases with a local Ollama instance. See `scripts/benchmark-ollama.ts` for env vars. Scorecard is written to `logs/ollama-benchmark/<timestamp>/scorecard.md`.

### Scoring vs Human Judgment

Any case where a high deterministic quality score produces output a human reviewer would rate as boring, incomplete, or not premium should be logged as a scoring bug candidate in this document. That gap is the primary signal the scoring system is miscalibrated and needs adjustment before the recovery is closed.

## Release Gate Registry

The W9 release process is codified in `src/services/validation/releaseGates.ts` as `VALUE_REALIGNMENT_RELEASE_GATES`.

The registry covers:

- Level 1 unit guardrails: scaffold, motion, SVG, and document section registry tests.
- Level 2 integration smoke: starter, queued presentation, benchmark matrix, and harness tests.
- Level 3 render contracts: viewport, quality checklist, and static render checks.
- Level 4 product benchmarks: benchmark typecheck plus `npm run benchmark:ollama`.
- Level 5 agent-in-app visual QA: frontier/Ollama captures, diagnostics, and viewport screenshots.

Workstream 9 is complete when the process and gates are testable. M5/M6 product release remains blocked until the Level 4/5 evidence passes or records an accepted failure classification.

## Latest Benchmark Evidence

### 2026-04-30 Focused Local Run

Command:

```bash
AURA_OLLAMA_CASES=presentation-title-opening,spreadsheet-create AURA_OLLAMA_RERUNS=1 npm run benchmark:ollama
```

Output:

- `logs/ollama-benchmark/2026-04-30T15-47-06-278Z/scorecard.md`
- `logs/ollama-benchmark/2026-04-30T15-47-06-278Z/summary.json`

Key findings:

- `presentation-title-opening` completed with visible progress (`firstProgressMs: 11`) and first usable output at ~40.0s (`firstUsableOutputMs: 40036`), but failed local quality threshold (`qualityScore: 57`, threshold 78).
- Failed quality signals: `visual-richness`, `continuity`, `reference-style-match`, `viewport-safety`.
- Failure classification: `quality-continuity`.
- `spreadsheet-create` is now explicitly marked `SKIP` in Node benchmark runs because browser `Worker` is unavailable in this runner context.

Follow-up:

- Keep Node benchmark runner for presentation/document local-model checks.
- Run spreadsheet benchmark cases through in-app/browser QA where `Worker` is available.
- Capture one additional Ollama queued-deck case and one frontier run to close the manual visual gate.
- Use `VALUE_REALIGNMENT_RELEASE_GATES` as the source of truth for required W9 release evidence.

## Related Docs

- [major-change-protocol.md](./major-change-protocol.md)
- [scorecard-template.md](./scorecard-template.md)
- [ollama-gemma4-baseline.md](./ollama-gemma4-baseline.md)
- [Combined Presentation Quality Recovery Plan.md](../reachitecture/Combined%20Presentation%20Quality%20Recovery%20Plan.md)
