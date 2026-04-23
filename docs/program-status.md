# Program Status

This document records shipped workflow-upgrade progress across the phased implementation program.

## Shipped Phases

| Phase | Status | Commits | Notes |
| --- | --- | --- | --- |
| Phase 0: Baseline Hardening | `shipped` | `1e17977` | Baseline routing/tests/docs foundations landed. |
| Phase 1: Explicit Workflow Contracts | `shipped` | `6fa8083`, `42baaec`, `4ee1add` | Contracts, submit boundary, run registry skeleton, parity harness skeleton landed. |
| Phase 2: Runtime Project Rules and Diagnostics | `shipped` | `42bf419`, `75b255d`, `8beb1ec` | Project rules persistence, doctor workflow, config validation, and sidebar panels landed. |
| Phase 3: Explicit Context Control and Context Compaction | `shipped` | `eeffb20`, `d6e5d9b` | Runtime context controls, inspectable source inventory, deterministic compaction, memory detail alignment, and composer context UI landed. |
| Backlog Phase A: Export and Media | `implemented` | `fc8ebb6`, `4215266`, `9879367` | Standalone artifact export, email HTML, render-vs-context attachments, and media packaging landed; manual export validation is still pending. |
| Phase 4: Unified Targeted Editing | `implemented` | `396920e`, `a66f0b0`, `0bb7057` | Shared editing contracts, bounded target resolution, workflow wiring, and targeted-edit telemetry landed; manual targeted-edit validation is still pending. |
| Phase 5: Template-First Bootstrapping | `implemented` | `c46301e`, `acf61d6` | Starter registries, idempotent project init, and project-level new-project bootstrap UI landed; manual bootstrap validation is still pending. |
| Phase 6: Project Augmentation and Events | `implemented` | `e02dd7f`, `0301a74` | Project-wide routing, dependency graph build/refresh/validate, project summary/review/link/refresh workflow, and in-memory typed run events landed; manual project-workflow validation is still pending. |
| Phase 7: Validation Profiles and Publish | `implemented` | `2ae847a`, `07b0a08` | Shared validation profiles, artifact/project readiness validation, publish gating panels, and clean-environment checks landed; manual publish/readiness validation is still pending. |

## Known Blockers

- `npm run lint` is still blocked by the repo-level ESLint 9 migration gap because `eslint.config.*` is missing.

## Validation Debt

- Phase 2 manual in-app validation is still pending for:
  - Project Rules panel persistence across reload
  - Doctor panel healthy/broken provider checks
  - visible project-rule influence on one document and one presentation generation
- Backlog Phase A manual in-app validation is still pending for:
  - standalone document HTML offline-open check
  - standalone presentation HTML offline-open check
  - email HTML browser/mail-preview check
  - packaged media save/reopen check
  - artifact export menu behavior on desktop and mobile
- Phase 4 manual in-app validation is still pending for:
  - document section edit without unrelated layout drift
  - presentation title/card tweak with untouched slides preserved
  - explicit full-rewrite request using regeneration only in that path
  - spreadsheet scoped action reporting the correct target area
- Phase 5 manual in-app validation is still pending for:
  - blank-project creation path behaving like the prior reset flow
  - each shipped starter kit creating the expected artifacts with sane defaults
  - rerunning init after editing a starter-created artifact without duplicate artifacts or overwritten content
  - save/reopen of a starter-kit project preserving starter-created state
- Phase 6 manual in-app validation is still pending for:
  - project-wide summary requests creating or updating one stable managed summary artifact on rerun
  - project review requests returning findings without mutating artifacts
  - dependency refresh/reporting surfacing a broken linked-table reference clearly
  - a normal artifact-scoped edit still behaving unchanged after a project-wide run
- Phase 7 manual in-app validation is still pending for:
  - validating one document and one presentation from the toolbar readiness path
  - confirming a blocked export does not proceed without explicit override
  - confirming an override export still works and keeps readiness visible
  - running a project-wide readiness check after a Phase 6 augmentation flow and verifying the result is understandable

## Current Focus

- Phase 7 validation/publish work is tracked in [phase-7-validation-profiles-and-publish.md](./phases/phase-7-validation-profiles-and-publish.md).
