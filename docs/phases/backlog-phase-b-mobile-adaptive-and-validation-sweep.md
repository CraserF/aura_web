# Backlog Phase B: Mobile-Adaptive Artifact Completion and Validation Sweep

This document tracks Backlog Phase B progress for Workstream F mobile-adaptive artifact completion, representative fixture hardening, lightweight mobile-hostile quality checks, and manual validation debt reduction across earlier implemented phases.

## Goal

Finish Workstream F Phase F3/F4 without inventing a new canonical phase, and use the same execution window to close as much tracked manual validation debt as the current repo state honestly supports.

## Progress

| Stream | Owner | Write Set | Depends On | Status | Validation | Commit |
| --- | --- | --- | --- | --- | --- | --- |
| Bootstrap | Codex | `docs/phases/backlog-phase-b-mobile-adaptive-and-validation-sweep.md`, `docs/implementation-plan-multi-agent.md`, `docs/program-status.md`, `docs/workstream-f-mobile-adaptive-artifacts.md` | None | `committed` | Tracked in repo; later branch validation passed via `npm test` and `npm run build`; `npm run lint` blocked by missing `eslint.config.*` | `0ceb26b` |
| Stream A: Workstream F F3 generation guidance | Codex | `src/services/ai/prompts/composer.ts`, `src/services/ai/workflow/document.ts`, `src/services/ai/templates/document-blueprints.ts`, mobile-hostile QA hooks | Bootstrap | `committed` | `npm test` passed; `npm run build` passed; `npm run lint` blocked by missing `eslint.config.*` | `26fee79` |
| Stream B: F4 hardening + fixture set | Codex | `src/test/fixtures/workstream-f.ts`, focused QA tests, viewport checklist docs, any frame-shell follow-up fixes required by validation | Stream A | `committed` | `npm test` passed; `npm run build` passed; `npm run lint` blocked by missing `eslint.config.*` | `26fee79` |
| Stream C: Validation sweep | Codex | `docs/program-status.md`, relevant phase docs, `docs/implementation-plan-multi-agent.md` evidence updates | Streams A-B | `in_progress` | Legacy manual checks remain pending; no tracked phase was promoted without evidence | — |
| Stream D: Wrap-up | Codex | final tracker updates, build/test evidence, blocker notes | Streams A-C | `planned` | Pending metadata update | — |

## Validation Log

- Date: 2026-04-23
- Agent: Codex
- Scope: Backlog Phase B bootstrap docs and tracker wiring
- Build (`npm run build`): Passed later on the branch after implementation landed
- Tests (`npm test`): Passed later on the branch after implementation landed
- Lint (`npm run lint`): Blocked by pre-existing ESLint 9 config gap (`eslint.config.*` missing)
- Manual validation: Pending viewport matrix and legacy validation sweep
- Commit: `0ceb26b`
- Result: Committed

- Date: 2026-04-23
- Agent: Codex
- Scope: Mobile-safe document/presentation generation guidance, lightweight mobile-hostile QA checks, representative Workstream F fixtures, and regression coverage
- Build (`npm run build`): Passed
- Tests (`npm test`): Passed
- Lint (`npm run lint`): Blocked by pre-existing ESLint 9 config gap (`eslint.config.*` missing)
- Manual validation: Pending Workstream F viewport matrix and broader legacy manual sweep
- Commit: `26fee79`
- Result: Committed

## Workstream F Review Checklist

Use this same checklist in both Workstream F validation and the broader backlog sweep.

- Mobile narrow portrait:
  - document frame remains visible and readable
  - presentation stage remains contained and legible
  - no clipped media or overflowing comparison rows
- Mobile landscape:
  - framed artifact still preserves gutters without distortion
  - controls remain reachable and do not overlap core content
- Tablet portrait:
  - dense modules wrap or stack cleanly
  - document metadata, KPI rows, and side rails stay readable
- Desktop standard:
  - mobile-safe guidance does not flatten the artifact into a bland single-column layout
  - presentation density still feels intentional, not sparse
- Desktop wide:
  - extra space becomes gutters around the artifact frame, not stretched artifact surfaces

## Validation Sweep Scope

- Backlog Phase A export/media manual checks
- Phase 2 project rules and doctor checks
- Phase 4 targeted-edit checks
- Phase 5 starter-kit/init checks
- Phase 6 project augmentation checks
- Phase 7 publish/readiness checks
- Phase 8 presets/lifecycle/run-history checks
- Phase 9 spreadsheet workflow checks
- Phase 10 explain/dry-run/spec alignment checks
- Workstream F viewport matrix checks

## Status Values

- `planned`
- `in_progress`
- `blocked`
- `validated`
- `committed`

## Notes

- Backlog Phase B is intentionally a backlog phase, not a new canonical Phase 11.
- Workstream F completion and validation debt reduction are the priorities here; ESLint 9 migration remains out of scope.
- Earlier implemented phases may only move from `implemented` to `shipped` when the tracked manual checks are actually completed and logged.
- Representative Workstream F fixtures currently live in `src/test/fixtures/workstream-f.ts`.
