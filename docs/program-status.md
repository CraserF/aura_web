# Program Status

This document records shipped workflow-upgrade progress across the phased implementation program.

## Shipped Phases

| Phase | Status | Commits | Notes |
| --- | --- | --- | --- |
| Phase 0: Baseline Hardening | `shipped` | `1e17977` | Baseline routing/tests/docs foundations landed. |
| Phase 1: Explicit Workflow Contracts | `shipped` | `6fa8083`, `42baaec`, `4ee1add` | Contracts, submit boundary, run registry skeleton, parity harness skeleton landed. |
| Phase 2: Runtime Project Rules and Diagnostics | `shipped` | `42bf419`, `75b255d`, `8beb1ec` | Project rules persistence, doctor workflow, config validation, and sidebar panels landed. |

## Known Blockers

- `npm run lint` is still blocked by the repo-level ESLint 9 migration gap because `eslint.config.*` is missing.

## Validation Debt

- Phase 2 manual in-app validation is still pending for:
  - Project Rules panel persistence across reload
  - Doctor panel healthy/broken provider checks
  - visible project-rule influence on one document and one presentation generation

## Next Phase

- Phase 3: Explicit Context Control and Context Compaction
