# Phase 5: Template-First Bootstrapping

## Goal

Turn the existing presentation templates, document blueprints, spreadsheet starter logic, and project-rules defaults into a shared bootstrap layer that can seed starter kits, create new projects from those kits, and rerun initialization safely without duplicating or overwriting user-authored work.

## Scope

- Add shared bootstrap contracts and starter registries under `src/services/bootstrap/*`
- Add idempotent `initProject()` behavior with a structured `InitReport`
- Add a project-level `NewProjectDialog` with blank, starter-kit, and single-artifact quick-start modes
- Preserve existing project save/open/version-history behavior for starter-created artifacts

Out of scope:

- Workstream F delivery
- Backlog Phase A manual validation debt
- Phase 4 manual validation debt
- ESLint 9 config migration

## Progress

| Stream | Owner | Write Set | Depends On | Status | Validation | Commit |
| --- | --- | --- | --- | --- | --- | --- |
| Bootstrap | Codex | `docs/phases/phase-5-template-first-bootstrapping.md`, `docs/implementation-plan-multi-agent.md`, `docs/program-status.md`, `src/services/bootstrap/*` scaffolds | None | `planned` | Pending | Pending |
| Stream A: Shared Bootstrap Contracts | Codex | `src/services/bootstrap/types.ts`, `initReport.ts`, `projectStarter.ts` | Bootstrap | `planned` | Pending | Pending |
| Stream B: Artifact Starter Registries | Codex | `src/services/bootstrap/documentStarters.ts`, `spreadsheetStarters.ts`, presentation registry adapter | Stream A | `planned` | Pending | Pending |
| Stream C: Project Starter Kits + Init Engine | Codex | `src/services/bootstrap/starterKits.ts`, `defaultRules.ts`, `initProject.ts`, project persistence metadata | Streams A-B | `planned` | Pending | Pending |
| Stream D: New Project UI + Validation | Codex | `src/components/NewProjectDialog.tsx`, toolbar wiring, bootstrap tests, phase tracker updates | Streams A-C | `planned` | Pending | Pending |

## Validation Log

- Date: Pending
- Agent: Codex
- Scope: Pending
- Build (`npm run build`): Pending
- Tests (`npm test`): Pending
- Manual validation: Pending
- Result: Pending

## Notes

- Starter registries stay static and in-code in this phase.
- `initProject()` should fill missing starter-managed structure and report `created`, `updated`, or `skipped` without overwriting user-authored artifact content.
- Starter-created artifacts need stable metadata so reruns can match them deterministically after save/open and version-history restores.
