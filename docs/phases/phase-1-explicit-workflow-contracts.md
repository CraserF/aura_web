# Phase 1: Explicit Workflow Contracts

This document tracks Phase 1 implementation progress for the workflow-contract refactor.

## Goal

Move workflow inference, context assembly, and result shaping out of `ChatBar` and into explicit application services while keeping the underlying artifact engines largely intact.

## Progress

| Stream | Owner | Write Set | Depends On | Status | Validation | Commit |
| --- | --- | --- | --- | --- | --- | --- |
| Bootstrap | Codex | `docs/phases/phase-1-explicit-workflow-contracts.md`, `docs/implementation-plan-multi-agent.md`, contract type files, `src/services/runs/*` | None | `validated` | `npm test` passed; `npm run build` passed | Pending |
| Stream A: Intent | Codex | `src/services/ai/intent/*`, intent tests | Bootstrap | `planned` | Pending | Pending |
| Stream B: Context + Run Request | Codex | `src/services/context/*`, `src/services/chat/buildRunRequest.ts`, request tests | Bootstrap | `planned` | Pending | Pending |
| Stream C: Run Result + Registry | Codex | `src/services/contracts/runResult.ts`, `src/services/chat/renderRunResult.ts`, `src/services/runs/*`, result tests | Bootstrap | `planned` | Pending | Pending |
| Stream D: Integration + Parity Harness | Codex | `src/services/chat/submitPrompt.ts`, `src/components/ChatBar.tsx`, handlers, harness tests | Streams A+B+C | `planned` | Pending | Pending |

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
- Scope: Repo coordination scaffolding and contract skeletons
- Build (`npm run build`): Passed
- Tests (`npm test`): Passed
- Lint (`npm run lint`): Deferred until final phase validation; existing repo-level ESLint 9 config blocker still applies
- Result: Ready for bootstrap commit
