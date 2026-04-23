# Phase 6: Project Augmentation and Events

This document tracks Phase 6 implementation progress for project-level augmentation, dependency graphs, and typed run events.

## Goal

Add the first explicit whole-project workflow path on top of the current intent/run/result seams, with a lightweight dependency graph and in-memory typed events so project-wide runs are inspectable and testable.

## Progress

| Stream | Owner | Write Set | Depends On | Status | Validation | Commit |
| --- | --- | --- | --- | --- | --- | --- |
| Bootstrap | Codex | `docs/phases/phase-6-project-augmentation-and-events.md`, `docs/implementation-plan-multi-agent.md`, `docs/program-status.md`, `src/services/projectGraph/*`, `src/services/events/*`, `src/services/ai/workflow/project.ts` scaffolds | None | `planned` | Pending | Pending |
| Stream A: Contracts + Intent | Codex | intent types, run contracts, registry metadata, routing tests | Bootstrap | `planned` | Pending | Pending |
| Stream B: Dependency Graph | Codex | `src/services/projectGraph/*`, graph tests | Stream A | `planned` | Pending | Pending |
| Stream C: Project Workflow | Codex | `src/services/ai/workflow/project.ts`, `submitPrompt.ts`, project augmentation tests | Streams A-B | `planned` | Pending | Pending |
| Stream D: Events + Validation | Codex | `src/services/events/*`, registry enrichment, tracker updates, regression coverage | Streams A-C | `planned` | Pending | Pending |

## Validation Log

- Date: Pending
- Agent: Codex
- Scope: Pending
- Build (`npm run build`): Pending
- Tests (`npm test`): Pending
- Manual validation: Pending
- Result: Pending

## Status Values

- `planned`
- `in_progress`
- `blocked`
- `validated`
- `committed`

## Notes

- Phase 6 should not absorb Backlog Phase A, Phase 4, or Phase 5 manual validation debt.
- The dependency graph stays minimal and derived from existing project state in this phase.
- Events and run metadata remain in-memory only in this phase.
