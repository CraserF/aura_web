# Phase 3: Explicit Context Control and Context Compaction

This document tracks Phase 3 implementation progress for inspectable context selection, deterministic compaction, and runtime context controls.

## Goal

Make context assembly visible and user-steerable, while adding deterministic compaction that explains what was preserved, downgraded, or summarized.

## Progress

| Stream | Owner | Write Set | Depends On | Status | Validation | Commit |
| --- | --- | --- | --- | --- | --- | --- |
| Bootstrap | Codex | `docs/phases/phase-3-explicit-context-control-and-compaction.md`, `docs/program-status.md`, `docs/implementation-plan-multi-agent.md`, context scaffolds | None | `validated` | `npm test` passed; `npm run build` passed; `npm run lint` blocked by missing `eslint.config.*` | Pending |
| Stream A: Context Contracts + Store State | Codex | `src/services/context/*`, `src/stores/chatStore.ts`, contract tests | Bootstrap | `planned` | Pending | Pending |
| Stream B: Selection + Compaction Services | Codex | `src/services/context/select.ts`, `compact.ts`, `compressionBudget.ts`, `compactionPolicy.ts`, `src/services/chat/buildRunRequest.ts` | Stream A | `planned` | Pending | Pending |
| Stream C: Context UI | Codex | `src/components/ContextChips.tsx`, `src/components/ContextPanel.tsx`, `src/components/ChatBar.tsx` | Streams A + B | `planned` | Pending | Pending |
| Stream D: Memory Alignment + Validation | Codex | `src/services/memory/retrieval.ts`, handler warnings, tests, tracker updates | Streams B + C | `planned` | Pending | Pending |

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
- Scope: Phase 3 coordination docs, progress backfill, and context-compaction service scaffolds
- Build (`npm run build`): Passed
- Tests (`npm test`): Passed
- Lint (`npm run lint`): Blocked by pre-existing ESLint 9 config gap (`eslint.config.*` missing)
- Result: Ready to commit
