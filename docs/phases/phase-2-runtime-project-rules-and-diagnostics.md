# Phase 2: Runtime Project Rules and Diagnostics

This document tracks Phase 2 implementation progress for runtime project rules, config validation, and the doctor workflow.

## Goal

Turn the `projectRulesSnapshot` placeholder into a real runtime input, persist project-level rules/policies/presets, and add a first-class doctor workflow for runtime health checks.

## Progress

| Stream | Owner | Write Set | Depends On | Status | Validation | Commit |
| --- | --- | --- | --- | --- | --- | --- |
| Bootstrap | Codex | `docs/phases/phase-2-runtime-project-rules-and-diagnostics.md`, `docs/implementation-plan-multi-agent.md`, project rules/config/diagnostics scaffolds | None | `validated` | `npm test` passed; `npm run build` passed; `npm run lint` blocked by missing `eslint.config.*` | Pending |
| Stream A: Project Model + Persistence | Codex | `src/types/project.ts`, storage/version history, persistence tests | Bootstrap | `planned` | Pending | Pending |
| Stream B: Rules Resolver + Run Request | Codex | `src/services/projectRules/*`, `src/services/chat/buildRunRequest.ts`, prompt injection tests | Stream A | `planned` | Pending | Pending |
| Stream C: Config Validation + Doctor Services | Codex | `src/services/configValidate/*`, `src/services/diagnostics/*`, diagnostics tests | Bootstrap | `planned` | Pending | Pending |
| Stream D: Project Rules + Doctor UI | Codex | `src/components/ProjectRulesPanel.tsx`, `src/components/DoctorPanel.tsx`, `src/App.tsx`, `src/components/ProjectSidebar.tsx` | Streams B + C | `planned` | Pending | Pending |

## Status Values

- `planned`
- `in_progress`
- `blocked`
- `validated`
- `committed`

## Validation Log

### Bootstrap

- Date: 2026-04-23
- Agent: Codex
- Scope: Phase 2 coordination doc and service scaffolds
- Build (`npm run build`): Passed
- Tests (`npm test`): Passed
- Lint (`npm run lint`): Blocked by pre-existing ESLint 9 config gap (`eslint.config.*` missing)
- Result: Ready to commit
