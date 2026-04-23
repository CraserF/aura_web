# Phase 10: API, MCP, and Automation Alignment

This document tracks Phase 10 implementation progress for serializable run specs, dry-run and explain execution modes, structured output normalization, and external adapter seams.

## Goal

Make Aura's current workflow runtime externally exposable without another major refactor by adding a serializable execution-spec layer, non-mutating dry-run and explain support, and adapter-facing request and response contracts.

## Progress

| Stream | Owner | Write Set | Depends On | Status | Validation | Commit |
| --- | --- | --- | --- | --- | --- | --- |
| Bootstrap | Codex | `docs/phases/phase-10-api-mcp-and-automation-alignment.md`, `docs/implementation-plan-multi-agent.md`, `docs/program-status.md`, `src/services/executionSpec/*`, `src/services/adapters/*` scaffolds | None | `validated` | `npm test` passed; `npm run build` passed; `npm run lint` blocked by missing `eslint.config.*` | |
| Stream A: Serializable spec contracts | Codex | execution-spec types/build/serialize/hydrate helpers, run-request contract updates | Bootstrap | `planned` | Pending | |
| Stream B: Dry-run and explain execution | Codex | submit/build mode plumbing, explain helpers, non-mutating execution paths | Stream A | `planned` | Pending | |
| Stream C: Structured output normalization | Codex | stable artifact/project output envelopes, run-result contract updates, registry/event metadata | Streams A-B | `planned` | Pending | |
| Stream D: Adapter seams + validation | Codex | API/MCP/automation request-response mappers, regression coverage, tracker updates | Streams A-C | `planned` | Pending | |

## Validation Log

- Date: 2026-04-23
- Agent: Codex
- Scope: Phase 10 bootstrap docs and execution-spec/adapter scaffolds
- Build (`npm run build`): Passed
- Tests (`npm test`): Passed
- Lint (`npm run lint`): Blocked by pre-existing ESLint 9 config gap (`eslint.config.*` missing)
- Commit:
- Result: Validated, commit pending

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
