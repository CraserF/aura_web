# Program Status

This document records shipped workflow-upgrade progress across the phased implementation program.

## Shipped Phases

| Phase | Status | Commits | Notes |
| --- | --- | --- | --- |
| Phase 0: Baseline Hardening | `shipped` | `1e17977` | Baseline routing/tests/docs foundations landed. |
| Phase 1: Explicit Workflow Contracts | `shipped` | `6fa8083`, `42baaec`, `4ee1add` | Contracts, submit boundary, run registry skeleton, parity harness skeleton landed. |
| Phase 2: Runtime Project Rules and Diagnostics | `shipped` | `42bf419`, `75b255d`, `8beb1ec` | Project rules persistence, doctor workflow, config validation, and sidebar panels landed. |
| Phase 3: Explicit Context Control and Context Compaction | `shipped` | `eeffb20`, `d6e5d9b` | Runtime context controls, inspectable source inventory, deterministic compaction, memory detail alignment, and composer context UI landed. |

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

## Current Focus

- Phase 4 targeted editing is tracked in [phase-4-unified-targeted-editing.md](./phases/phase-4-unified-targeted-editing.md).
