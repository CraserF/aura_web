# Ollama Baseline Validation

This document defines the first supported local-model stabilization pass for Aura.

## Baseline

- Provider: `ollama`
- Recommended model: `gemma4:e2b`
- Model label for scorecards: `gemma4:e2b (gemma4 · 5.1B · Q4_K_M)`

This is the only local-model baseline that should be treated as the supported reference during the first hardening pass. Other Ollama models may still work, but they should be logged as best-effort rather than used as the main quality target.

## Scope

Use this checklist after:

- workflow-affecting provider changes
- prompt changes likely to affect local-model quality
- document or presentation generation changes
- local-provider routing, validation, quality scoring, or polishing changes
- legacy explain/dry-run changes only when the changed code explicitly touches those compatibility paths

Do not treat this as a replacement for the major workflow change protocol. This checklist sits beside it and adds a provider-specific local-model pass.

## Capability Defaults

- Ollama is treated as a local, generation-first provider.
- Aura uses the Ollama OpenAI-compatible chat-completions path.
- Secondary structured review loops are reduced for local models when they are likely to produce noisy failures.
- Documents and presentations are the primary quality focus in this first pass.
- Spreadsheet checks remain correctness, routing, and deterministic-execution checks.

## Required Local Cases

### Documents

- long-form report create
- executive brief create
- dense framed document create
- targeted content edit
- typography or theme change
- explicit full rewrite
- readiness or export check
- quality-bar score and polishing diagnostics

### Presentations

- keynote or narrative deck create
- metrics-heavy deck create
- title or card text edit
- palette or theme shift
- slide layout conversion
- explicit full deck rewrite
- readiness or export check
- quality-bar score and polishing diagnostics

### Spreadsheets

- workbook creation
- computed column
- query-derived sheet
- deterministic correctness and craft telemetry

## Failure Classification

Classify each local-model issue as one of:

- routing bug
- workflow bug
- provider capability mismatch
- model-quality limitation
- prompt tuning issue

Do not collapse these into a single “Ollama is flaky” note. The point of the baseline pass is to make the failure mode legible.

## Quality Bar

Judge quality against the supported local baseline, not a frontier cloud model.

The target is:

- stable
- coherent
- visually strong
- workflow-correct

The target is not “match GPT-4o output in every case.”

## Logging Rule

For each run, link:

- the active phase or backlog doc
- `docs/program-status.md` if blocker state changes
- [ollama-scorecard-template.md](./ollama-scorecard-template.md)

Record:

- model id
- time to first visible progress
- time to completion
- whether progress stayed continuous during long-running design or generation work
- quality result
- consistency result
- failure classification
- final status

## Speed and Feedback Bar

Use these defaults when judging the first Ollama baseline pass:

- up to roughly **90 seconds** for generation is acceptable when the app keeps showing progress
- up to **2 minutes** for a design step is acceptable when the output quality justifies it
- long-running steps should keep refreshing the visible progress state instead of appearing frozen on one percentage or one message

Treat "slow but clearly alive" differently from "stalled and untrustworthy." The first is usually a warning; the second is a blocker.
