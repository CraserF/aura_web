# Automated Ollama Artifact Benchmark Harness

## Summary

Build a local, opt-in benchmark runner that generates Aura artifacts with Ollama, evaluates them in an isolated sandbox, and writes repeatable scorecards. Use deterministic quality checks as the pass/fail source of truth; use an optional Ollama judge only for rubric notes like “premium feel” and “usefulness.”

The first target is a local CLI script, not CI or in-app UI.

## Key Changes

- Add an opt-in benchmark command:
  - `npm run benchmark:ollama`
  - optional env: `AURA_OLLAMA_MODEL=gemma4:e2b`, `AURA_OLLAMA_BASE_URL=http://127.0.0.1:11434`, `AURA_OLLAMA_CASES=...`, `AURA_OLLAMA_RERUNS=1`, `AURA_OLLAMA_JUDGE=1`
- Add a benchmark runner that:
  - uses existing `WORKFLOW_BENCHMARK_CASES`;
  - builds normal `ArtifactRunPlan`s through the active app planner;
  - runs document, presentation, and spreadsheet workflows with provider `ollama`;
  - stores output only under ignored `logs/ollama-benchmark/<timestamp>/`.
- Score each case with:
  - runtime `qualityScore`, `qualityGrade`, and failed quality signals;
  - document/presentation/spreadsheet deterministic quality telemetry;
  - validation profile score;
  - timing metrics: first progress, first usable output, total completion;
  - optional consistency score across reruns.
- Optional Ollama judge:
  - never gates pass/fail by itself;
  - returns JSON rubric notes for `looksPremium`, `contentDepth`, `notBoring`, `starterSimilarity`, and `userUsefulness`;
  - if judge JSON is invalid, record `judgeUnavailable` and keep deterministic scoring.

## Interfaces

- Add a benchmark result type with fields matching the existing docs:
  - case id, artifact type, provider/model, timing, quality score/grade, failed signals, consistency score, failure classification, result, notes.
- Generate:
  - `summary.json`
  - `scorecard.md`
  - per-case `output.html` or workbook JSON
  - per-case `telemetry.json`
  - per-case `events.json`
  - optional `judge.json`
- Keep provider locked to Ollama for this command. No frontier model keys are used.

## Scoring Rules

- Primary score:
  - 55% runtime/deterministic quality score
  - 25% validation profile score
  - 10% performance score
  - 10% consistency score
- Classify failures as:
  - `routing-bug`
  - `workflow-bug`
  - `provider-capability-mismatch`
  - `model-quality-limitation`
  - `prompt-tuning-issue`
  - `quality-depth`
  - `quality-visual`
  - `quality-continuity`
- Treat human/model disagreement as a scoring bug candidate, not an automatic benchmark failure.

## Test Plan

- Unit-test the deterministic scorer with fixed document, deck, and spreadsheet fixtures.
- Unit-test failure classification from synthetic telemetry.
- Unit-test scorecard generation without Ollama.
- Keep real Ollama runs opt-in so normal `npm test` stays fast and stable.
- Validate manually once with:
  - document long-form create;
  - executive brief create;
  - narrative deck create;
  - metrics-heavy deck create;
  - spreadsheet create.

## Assumptions

- First supported local baseline remains `gemma4:e2b`.
- Local benchmark artifacts are synthetic and safe to persist under ignored `logs/`.
- Deterministic checks are authoritative; Ollama judging is useful commentary, not a stable oracle.
