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
| Phase 7: Validation Profiles and Publish | `implemented` | `2ae847a`, `07b0a08`, `736db4e` | Shared validation profiles, artifact/project readiness validation, publish gating panels, and clean-environment checks landed; manual publish/readiness validation is still pending. |
| Phase 8: Presets, Lifecycle, and Policy | `implemented` | `6da7e83`, `5508683` | Preset-aware run requests, lifecycle metadata and persistence, expanded run registry/output buffering, deterministic policy actions, and compact preset/run-history UI landed; manual Phase 8 validation is still pending. |
| Phase 9: Spreadsheet Workflow Deepening | `implemented` | `824e66a`, `52cca18` | Structured spreadsheet planning/validation, deterministic formula-column and query-view flows, spreadsheet-aware dependency graph edges, and richer spreadsheet run outputs landed; manual spreadsheet workflow validation is still pending. |
| Phase 10: API, MCP, and Automation Alignment | `implemented` | `b500fe4`, `d415576`, `310e953` | Serializable run specs, dry-run/explain modes, structured output envelopes, and external adapter seams landed; manual explain/dry-run validation is still pending. |

## Known Blockers

- `npm run lint` is still blocked by the repo-level ESLint 9 migration gap because `eslint.config.*` is missing.
- Manual workflow validation should now use the protocol in `docs/validation/major-change-protocol.md` and the registry in `src/test/fixtures/major-change-cases.ts`; older ad hoc notes should be treated as partial evidence until backfilled through that protocol.
- Latest Ollama baseline note (2026-04-24): in-app browser presentation edits on `gemma4:e2b` keep visible progress alive but still exceed the design-step budget, so local presentation-edit stabilization remains blocked.

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
  - Latest evidence note (2026-04-23): a fresh-server rerun from a seeded presentation-only project now creates a document successfully, so document-side export checks are no longer blocked by the earlier creation stall.
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
  - Latest evidence note (2026-04-24): the presentation readiness modal opened successfully from the toolbar for `Market Expansion Snapshot` and surfaced non-blocking warnings plus a passing artifact readiness state, but the full Phase 7 protocol cases remain unrun.
- Phase 8 manual in-app validation is still pending for:
  - saving and reapplying one document preset and one presentation preset from the composer controls
  - validating an artifact and confirming lifecycle badge transitions survive reload
  - confirming a blocked publish/export shows policy and registry state clearly
  - retrying a failed run and verifying retry/superseded state reads correctly in the run history panel
- Phase 9 manual in-app validation is still pending for:
  - creating one workbook from prompt
  - adding one computed column from prompt
  - creating one query-style derived sheet from prompt
  - confirming one spreadsheet change refreshes a linked document or presentation dependency
  - confirming spreadsheet lifecycle and policy state remain inspectable after validation and publish flows
- Phase 10 manual in-app validation is still pending for:
  - running one document flow in explain mode and verifying the included context and predicted changes are understandable
  - running one spreadsheet flow in dry-run mode and verifying no workbook mutation occurs
  - running one project-wide explain or dry-run and verifying dependency and validation effects are visible
  - confirming a normal execute run still behaves unchanged afterward
- Workstream F manual viewport validation is still pending for:
  - document-side viewport matrix backfill
  - Manual evidence logged on 2026-04-23:
    - presentation shell spot-check passed for desktop standard, mobile narrow portrait (`390x844`), and mobile landscape (`844x390`)
    - fresh-server scoped document creation from a seeded presentation-only project now succeeds, so document-side viewport checks can resume in the next validation slice
  - Manual evidence logged on 2026-04-24:
    - presentation shell spot-check also passed for tablet portrait (`768x1024`) and desktop wide (`1440x1024`), completing the current presentation-side viewport matrix
    - a saved-slide persistence bug was fixed so Google Fonts `<link>` tags are retained in stored presentation HTML instead of existing only as live preview injections

## Current Focus

- Backlog Phase B mobile-adaptive artifact completion and validation sweep is tracked in [backlog-phase-b-mobile-adaptive-and-validation-sweep.md](./phases/backlog-phase-b-mobile-adaptive-and-validation-sweep.md).
- Major workflow changes should be validated through [major-change-protocol.md](./validation/major-change-protocol.md) and the companion [artifact-case-matrix.md](./validation/artifact-case-matrix.md).
- Top-level checklist drift in [implementation-plan-multi-agent.md](./implementation-plan-multi-agent.md) is being reconciled so implemented-vs-unvalidated work is explicit.
- The first local-model hardening pass is centered on [ollama-gemma4-baseline.md](./validation/ollama-gemma4-baseline.md) using `gemma4:e2b` as the supported baseline.
