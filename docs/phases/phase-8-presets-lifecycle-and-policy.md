# Phase 8: Presets, Lifecycle, and Policy

This document tracks Phase 8 implementation progress for workflow presets, artifact lifecycle states, run-registry hardening, and deterministic policy evaluation.

## Goal

Turn the existing preset, validation, and run-event seams into a reusable workflow system with explicit lifecycle metadata, inspectable policy actions, and stronger run recovery behavior.

## Progress

| Stream | Owner | Write Set | Depends On | Status | Validation | Commit |
| --- | --- | --- | --- | --- | --- | --- |
| Bootstrap | Codex | `docs/phases/phase-8-presets-lifecycle-and-policy.md`, `docs/implementation-plan-multi-agent.md`, `docs/program-status.md`, `src/services/presets/*`, `src/services/policy/*`, `src/services/runs/outputBuffer.ts`, `src/services/runs/recovery.ts` scaffolds | None | `committed` | `npm test` passed; `npm run build` passed; `npm run lint` blocked by missing `eslint.config.*` | `6da7e83` |
| Stream A: Presets + RunRequest integration | Codex | preset services, project-rules snapshot expansion, run-request contract updates | Bootstrap | `committed` | `npm test` passed; `npm run build` passed; `npm run lint` blocked by missing `eslint.config.*` | `5508683` |
| Stream B: Lifecycle persistence | Codex | `ProjectDocument` lifecycle fields, transitions, storage/version-history wiring | Stream A | `committed` | `npm test` passed; `npm run build` passed; `npm run lint` blocked by missing `eslint.config.*` | `5508683` |
| Stream C: Run registry + Policy engine | Codex | run status expansion, output buffering, retry/recovery, policy evaluation hooks | Streams A-B | `committed` | `npm test` passed; `npm run build` passed; `npm run lint` blocked by missing `eslint.config.*` | `5508683` |
| Stream D: UI + Validation | Codex | preset selector/save flow, lifecycle badges, run-history/readiness surface, tests, tracker updates | Streams A-C | `committed` | `npm test` passed; `npm run build` passed; `npm run lint` blocked by missing `eslint.config.*` | `5508683` |

## Validation Log

- Date: 2026-04-23
- Agent: Codex
- Scope: Phase 8 coordination docs, implementation-plan/program-status updates, and preset/policy/run scaffolds
- Build (`npm run build`): Passed
- Tests (`npm test`): Passed
- Lint (`npm run lint`): Blocked by pre-existing ESLint 9 config gap (`eslint.config.*` missing)
- Commit: `6da7e83`
- Result: Committed

- Date: 2026-04-23
- Agent: Codex
- Scope: Preset-aware run requests, lifecycle persistence and transitions, run-registry/policy integration, preset and run-history UI, and Phase 8 regression coverage
- Build (`npm run build`): Passed
- Tests (`npm test`): Passed
- Lint (`npm run lint`): Blocked by pre-existing ESLint 9 config gap (`eslint.config.*` missing)
- Manual validation: Pending preset save/reapply checks, lifecycle badge transitions after readiness/export, blocked publish visibility, and retry/supersede in-app verification
- Commit: `5508683`
- Result: Committed

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
