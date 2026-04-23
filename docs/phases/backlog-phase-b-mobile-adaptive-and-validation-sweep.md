# Backlog Phase B: Mobile-Adaptive Artifact Completion and Validation Sweep

This document tracks Backlog Phase B progress for Workstream F mobile-adaptive artifact completion, representative fixture hardening, lightweight mobile-hostile quality checks, and manual validation debt reduction across earlier implemented phases.

## Goal

Finish Workstream F Phase F3/F4 without inventing a new canonical phase, and use the same execution window to close as much tracked manual validation debt as the current repo state honestly supports.

## Progress

| Stream | Owner | Write Set | Depends On | Status | Validation | Commit |
| --- | --- | --- | --- | --- | --- | --- |
| Bootstrap | Codex | `docs/phases/backlog-phase-b-mobile-adaptive-and-validation-sweep.md`, `docs/implementation-plan-multi-agent.md`, `docs/program-status.md`, `docs/workstream-f-mobile-adaptive-artifacts.md` | None | `planned` | Pending | — |
| Stream A: Workstream F F3 generation guidance | Codex | `src/services/ai/prompts/composer.ts`, `src/services/ai/workflow/document.ts`, `src/services/ai/templates/document-blueprints.ts`, mobile-hostile QA hooks | Bootstrap | `planned` | Pending | — |
| Stream B: F4 hardening + fixture set | Codex | representative Workstream F fixtures, viewport checklist docs, any frame-shell follow-up fixes required by validation | Stream A | `planned` | Pending | — |
| Stream C: Validation sweep | Codex | `docs/program-status.md`, relevant phase docs, `docs/implementation-plan-multi-agent.md` evidence updates | Streams A-B | `planned` | Pending | — |
| Stream D: Wrap-up | Codex | final tracker updates, build/test evidence, blocker notes | Streams A-C | `planned` | Pending | — |

## Validation Log

- Date: Pending
- Agent: Codex
- Scope: Backlog Phase B bootstrap, mobile-adaptive generation guidance, fixture hardening, validation sweep, and wrap-up
- Build (`npm run build`): Pending
- Tests (`npm test`): Pending
- Lint (`npm run lint`): Non-gating; currently blocked by missing `eslint.config.*`
- Manual validation: Pending viewport matrix and legacy validation sweep
- Result: In progress

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
