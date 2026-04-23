# Phase 8: Presets, Lifecycle, and Policy

This document tracks Phase 8 implementation progress for workflow presets, artifact lifecycle states, run-registry hardening, and deterministic policy evaluation.

## Goal

Turn the existing preset, validation, and run-event seams into a reusable workflow system with explicit lifecycle metadata, inspectable policy actions, and stronger run recovery behavior.

## Progress

| Stream | Owner | Write Set | Depends On | Status | Validation | Commit |
| --- | --- | --- | --- | --- | --- | --- |
| Bootstrap | Codex | `docs/phases/phase-8-presets-lifecycle-and-policy.md`, `docs/implementation-plan-multi-agent.md`, `docs/program-status.md`, `src/services/presets/*`, `src/services/policy/*`, `src/services/runs/outputBuffer.ts`, `src/services/runs/recovery.ts` scaffolds | None | `planned` | Pending | Pending |
| Stream A: Presets + RunRequest integration | Codex | preset services, project-rules snapshot expansion, run-request contract updates | Bootstrap | `planned` | Pending | Pending |
| Stream B: Lifecycle persistence | Codex | `ProjectDocument` lifecycle fields, transitions, storage/version-history wiring | Stream A | `planned` | Pending | Pending |
| Stream C: Run registry + Policy engine | Codex | run status expansion, output buffering, retry/recovery, policy evaluation hooks | Streams A-B | `planned` | Pending | Pending |
| Stream D: UI + Validation | Codex | preset selector/save flow, lifecycle badges, run-history/readiness surface, tests, tracker updates | Streams A-C | `planned` | Pending | Pending |

## Validation Log

- Date: Pending
- Agent: Codex
- Scope: Pending
- Build (`npm run build`): Pending
- Tests (`npm test`): Pending
- Lint (`npm run lint`): Pending
- Commit: Pending
- Result: Pending

## Status Values

- `planned`
- `in_progress`
- `blocked`
- `validated`
- `committed`

## Notes

- Phase 8 should reuse `project.workflowPresets` rather than introducing a second preset persistence model.
- Backlog Phase A, Workstream F, and Phase 4-7 manual validation debt remain tracked separately.
- `npm run lint` remains non-gating until the repo has a valid ESLint 9 config.
