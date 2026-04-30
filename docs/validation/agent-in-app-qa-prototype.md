# Agent-In-App QA Prototype

Date: 2026-04-30

Status: Release gate protocol codified for Workstream 9; evidence capture remains active for M5/M6 product release.

## Goal

Provide a repeatable smoke workflow that catches product-feel regressions not visible in deterministic unit tests, especially around progress continuity, runtime quality outcomes, and render safety.

## Prototype Scope

Use a real running app session (desktop browser) with local model routing where feasible.

Primary checks:

- new project creation
- artifact create/edit flow
- visible progress and completion behavior
- quality outcome metadata in run diagnostics
- render sanity across desktop and mobile portrait
- export/readiness behavior for the active artifact

## Current Implementation Path

1. Automated deterministic gates:
   - `src/test/release-smoke.test.ts`
   - `src/test/workflow-benchmark-cases.test.ts`
   - `src/test/benchmark-harness.test.ts`
   - `src/test/m3d-benchmarks.test.ts`
   - `src/test/scaffolding-guardrails.test.ts`
   - `src/test/release-gates.test.ts`
2. Local benchmark harness:
   - `npm run benchmark:ollama`
   - writes `summary.json`, `scorecard.md`, per-case telemetry/events/output files
3. Structured release gate registry:
   - `src/services/validation/releaseGates.ts`
   - `VALUE_REALIGNMENT_RELEASE_GATES` covers W9 levels 1-5
4. Manual in-app pass:
   - run frontier and Ollama cases from `WORKFLOW_BENCHMARK_CASES`
   - collect viewport captures and diagnostics

## 2026-04-30 Evidence

Automated checks passed:

- `npm run typecheck:benchmark`
- `npm run test -- src/test/release-smoke.test.ts src/test/workflow-benchmark-cases.test.ts src/test/benchmark-harness.test.ts src/test/m3d-benchmarks.test.ts src/test/scaffolding-guardrails.test.ts src/test/release-gates.test.ts`
- `AURA_OLLAMA_CASES=__none__ npm run benchmark:ollama` for runner entrypoint smoke without requiring a live model

Focused local benchmark run:

- Command: `AURA_OLLAMA_CASES=presentation-title-opening,spreadsheet-create AURA_OLLAMA_RERUNS=1 npm run benchmark:ollama`
- Output: `logs/ollama-benchmark/2026-04-30T15-47-06-278Z/`
- Presentation case result: `FAIL` (`qualityScore: 57`, failed signals: `visual-richness`, `continuity`, `reference-style-match`, `viewport-safety`)
- Spreadsheet case result: `SKIP` in Node runner (`Worker` API unavailable outside browser context)

## Known Limits

- Spreadsheet benchmark cases require browser `Worker` support and should be validated in-app rather than via the Node benchmark runner.
- Manual frontier/Ollama benchmark captures are still required to close M5/M6 product release gating, even though the W9 process itself is complete.

## Next QA Slice

- Run one Ollama queued-deck case and one frontier queued-deck case in-app.
- Capture desktop, desktop wide, tablet portrait, mobile portrait, and mobile landscape screenshots.
- Attach run diagnostics (`qualityDecision`, `qualityScore`, `failedSignals`, polish action) to scorecard notes.
