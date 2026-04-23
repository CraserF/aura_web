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
| Stream C: Validation sweep | Codex | `docs/program-status.md`, relevant phase docs, `docs/implementation-plan-multi-agent.md` evidence updates | Streams A-B | `in_progress` | Partial presentation-shell viewport evidence is logged; the fresh-server scoped document-creation blocker is cleared, but the broader sweep remains incomplete | — |
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

- Date: 2026-04-23
- Agent: Codex
- Scope: Backlog Phase B continuation manual sweep kickoff, Workstream F viewport checks, and legacy validation evidence backfill
- Build (`npm run build`): Passed
- Tests (`npm test`): Passed
- Lint (`npm run lint`): Blocked by pre-existing ESLint 9 config gap (`eslint.config.*` missing)
- Manual validation:
  - Existing `Strategy & Execution` presentation shell remained visibly framed and readable in desktop standard mode.
  - Safari Responsive Design Mode spot-check passed for the same presentation shell at `390x844` (mobile narrow portrait) and `844x390` (mobile landscape); frame bounds remained visible and controls remained reachable after closing the sidebar.
  - Tablet portrait and desktop wide viewport checks are still pending.
  - Document-side fixture validation is currently blocked in this session: a request to create `Operating Model Review` stalled at `Applying changes…` around 30% both before and after enabling `Multi-doc`, and only exited after manual cancellation.
  - Because no document artifact was created, the Backlog Phase A document export checks and later document-heavy manual sweeps remain unvalidated.
- Commit: Pending
- Result: Blocked

- Date: 2026-04-23
- Agent: Codex
- Scope: Backlog Phase B continuation, document-creation unblock isolation and fresh-server revalidation
- Build (`npm run build`): Passed
- Tests (`npm test`): Passed
- Lint (`npm run lint`): Blocked by pre-existing ESLint 9 config gap (`eslint.config.*` missing)
- Manual validation:
  - Root cause isolated in product code: presentation-scoped prompts like `Create a long-form document called Operating Model Review in this project...` could be misrouted because intent resolution treated the prompt as a project review when the title contained `Review`, and `buildRunRequest()` was resolving intent from the context-augmented prompt instead of the raw user prompt.
  - Landed a narrow routing fix so explicit artifact-create prompts use the raw prompt, bypass project-review detection, and can escape an active presentation when the requested artifact type is a document.
  - Fresh Safari validation against `http://127.0.0.1:4175/` with the Ollama provider confirmed the original blocked scenario now succeeds: from a seeded presentation-only project, the scoped prompt created a new document instead of stalling or creating another presentation.
  - The created document rendered as a framed artifact and added a second sidebar item (`Operational Intelligence: 2024`) alongside the seeded presentation, which is sufficient to resume document-side Backlog Phase A and Workstream F checks.
  - A later `Multi-doc` experiment from an already-active document updated the current document instead of serving as a clean presentation-only validation case; that result is not being counted as evidence for the original blocker.
  - Broader legacy validation remains incomplete: tablet portrait and desktop wide Workstream F checks are still pending, and the remaining Backlog Phase A / Phase 4-10 manual scenarios have not yet been re-run in this slice.
- Commit: Pending
- Result: Validated

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
