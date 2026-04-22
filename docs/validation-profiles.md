# Validation Profiles

This Phase 0 baseline records where validation and recovery logic currently lives.

## Current Validation By Artifact

| Artifact | Current validation points |
| --- | --- |
| Presentation | `detectAmbiguity()` preflight in the handler plus planner, evaluator, and QA checks inside the presentation workflow |
| Document | Document rendering checks and QA inside `src/services/ai/workflow/document.ts` |
| Spreadsheet | Intent discrimination between chart, deterministic sheet action, spreadsheet creation, and no-intent responses |

## Recovery Paths In Use

- Retry is user-driven through `ChatPanel`, which stores the last prompt for `ChatBar` to reload.
- Clarifying selections use the same pending-prompt mechanism but auto-submit instead of repopulating input.
- Presentation and document handlers catch aborts and convert them into a `Generation cancelled.` assistant message.
- Spreadsheet workflows return `no-intent` results instead of throwing for unsupported prompts.
- Provider and model issues surface through handler-level error messages today rather than a dedicated diagnostics workflow.

## What Phase 1 Should Replace

- Inline handler success and failure strings with structured run results.
- Handler-owned validation branching with explicit validation profiles.
- Implicit fallback behavior with typed, inspectable contracts.
