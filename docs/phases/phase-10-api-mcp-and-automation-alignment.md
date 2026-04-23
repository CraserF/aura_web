# Phase 10: API, MCP, and Automation Alignment

This document tracks Phase 10 implementation progress for serializable run specs, dry-run and explain execution modes, structured output normalization, and external adapter seams.

## Goal

Make Aura's current workflow runtime externally exposable without another major refactor by adding a serializable execution-spec layer, non-mutating dry-run and explain support, and adapter-facing request and response contracts.

## Progress

| Stream | Owner | Write Set | Depends On | Status | Validation | Commit |
| --- | --- | --- | --- | --- | --- | --- |
| Bootstrap | Codex | `docs/phases/phase-10-api-mcp-and-automation-alignment.md`, `docs/implementation-plan-multi-agent.md`, `docs/program-status.md`, `src/services/executionSpec/*`, `src/services/adapters/*` scaffolds | None | `committed` | `npm test` passed; `npm run build` passed; `npm run lint` blocked by missing `eslint.config.*` | `b500fe4` |
| Stream A: Serializable spec contracts | Codex | execution-spec types/build/serialize/hydrate helpers, run-request contract updates | Bootstrap | `committed` | `npm test` passed; `npm run build` passed; `npm run lint` blocked by missing `eslint.config.*` | `d415576` |
| Stream B: Dry-run and explain execution | Codex | submit/build mode plumbing, explain helpers, non-mutating execution paths | Stream A | `committed` | `npm test` passed; `npm run build` passed; `npm run lint` blocked by missing `eslint.config.*` | `d415576` |
| Stream C: Structured output normalization | Codex | stable artifact/project output envelopes, run-result contract updates, registry/event metadata | Streams A-B | `committed` | `npm test` passed; `npm run build` passed; `npm run lint` blocked by missing `eslint.config.*` | `d415576` |
| Stream D: Adapter seams + validation | Codex | API/MCP/automation request-response mappers, regression coverage, tracker updates | Streams A-C | `committed` | `npm test` passed; `npm run build` passed; `npm run lint` blocked by missing `eslint.config.*` | `d415576` |

## Validation Log

- Date: 2026-04-23
- Agent: Codex
- Scope: Phase 10 bootstrap docs and execution-spec/adapter scaffolds
- Build (`npm run build`): Passed
- Tests (`npm test`): Passed
- Lint (`npm run lint`): Blocked by pre-existing ESLint 9 config gap (`eslint.config.*` missing)
- Commit: `b500fe4`
- Result: Committed

- Date: 2026-04-23
- Agent: Codex
- Scope: Serializable run specs, non-mutating dry-run and explain execution, structured run output envelopes, run-registry/event metadata updates, adapter request/response mappers, and regression coverage
- Build (`npm run build`): Passed
- Tests (`npm test`): Passed
- Lint (`npm run lint`): Blocked by pre-existing ESLint 9 config gap (`eslint.config.*` missing)
- Manual validation: Pending document explain, spreadsheet dry-run, project explain/dry-run, and normal execute regression in-app checks
- Commit: `d415576`
- Result: Committed

## Status Values

- `planned`
- `in_progress`
- `blocked`
- `validated`
- `committed`

## Notes

- Phase 10 should align the current app runtime with future API, MCP, and automation work without implementing those transports or auth systems yet.
- Backlog Phase A, Workstream F, and Phase 2/4/5/6/7/8/9 manual validation debt remain tracked separately.
- `npm run lint` remains non-gating until the repo has a valid ESLint 9 config.
