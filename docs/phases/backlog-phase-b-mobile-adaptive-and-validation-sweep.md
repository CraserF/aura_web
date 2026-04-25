# Backlog Phase B: Mobile-Adaptive Artifact Completion and Validation Sweep

This document tracks Backlog Phase B progress for Workstream F mobile-adaptive artifact completion, representative fixture hardening, lightweight mobile-hostile quality checks, and manual validation debt reduction across earlier implemented phases.

## Goal

Finish Workstream F Phase F3/F4 without inventing a new canonical phase, and use the same execution window to close as much tracked manual validation debt as the current repo state honestly supports.

## Progress

| Stream | Owner | Write Set | Depends On | Status | Validation | Commit |
| --- | --- | --- | --- | --- | --- | --- |
| Bootstrap | Codex | `docs/phases/backlog-phase-b-mobile-adaptive-and-validation-sweep.md`, `docs/implementation-plan-multi-agent.md`, `docs/program-status.md`, `docs/workstream-f-mobile-adaptive-artifacts.md` | None | `committed` | Tracked in repo; later branch validation passed via `npm test` and `npm run build`; `npm run lint` blocked by missing `eslint.config.*` | `0ceb26b` |
| Stream A: Workstream F F3 generation guidance | Codex | `src/services/ai/prompts/composer.ts`, `src/services/ai/workflow/document.ts`, `src/services/ai/templates/document-blueprints.ts`, mobile-hostile QA hooks | Bootstrap | `committed` | `npm test` passed; `npm run build` passed; `npm run lint` blocked by missing `eslint.config.*` | `26fee79` |
| Stream B: F4 hardening + fixture set | Codex | `src/test/fixtures/workstream-f.ts`, focused QA tests, viewport checklist docs, any frame-shell follow-up fixes required by validation | Stream A | `committed` | `npm test` passed; `npm run build` passed; `npm run lint` blocked by missing `eslint.config.*` | `26fee79` |
| Stream C: Validation sweep | Codex | `docs/program-status.md`, relevant phase docs, `docs/implementation-plan-multi-agent.md` evidence updates, validation protocol docs, case registry coverage tests | Streams A-B | `in_progress` | Partial presentation-shell viewport evidence is logged; the fresh-server scoped document-creation blocker is cleared, the major-change validation protocol now defines the remaining case families, and the top-level implementation checklist has been reconciled to distinguish implemented-vs-unvalidated work; the broader sweep remains incomplete | — |
| Stream E: Workflow quality research + planner hardening | Codex | `docs/research/*`, `docs/validation/workflow-quality-benchmark.md`, `src/services/workflowPlanner/*`, workflow handlers/prompts/tests | Stream C | `in_progress` | Research docs landed; shared workflow-plan contracts and queue-aware prompt guidance landed; presentation multi-slide add requests can now flow through the sequential queue path; broader backlog sweep and full benchmark backfill remain incomplete | — |
| Stream D: Wrap-up | Codex | final tracker updates, build/test evidence, blocker notes | Streams A-C | `planned` | Pending metadata update | — |

## Validation Log

- Date: 2026-04-23
- Agent: Codex
- Scope: Backlog Phase B bootstrap docs and tracker wiring
- Build (`npm run build`): Passed later on the branch after implementation landed
- Tests (`npm test`): Passed later on the branch after implementation landed
- Lint (`npm run lint`): Blocked by pre-existing ESLint 9 config gap (`eslint.config.*` missing)
- Manual validation: Pending viewport matrix and legacy validation sweep
- Commit: `0ceb26b`
- Result: Committed

- Date: 2026-04-23
- Agent: Codex
- Scope: Mobile-safe document/presentation generation guidance, lightweight mobile-hostile QA checks, representative Workstream F fixtures, and regression coverage
- Build (`npm run build`): Passed
- Tests (`npm test`): Passed
- Lint (`npm run lint`): Blocked by pre-existing ESLint 9 config gap (`eslint.config.*` missing)
- Manual validation: Pending Workstream F viewport matrix and broader legacy manual sweep
- Commit: `26fee79`
- Result: Committed

- Date: 2026-04-23
- Agent: Codex
- Scope: Backlog Phase B continuation manual sweep kickoff, Workstream F viewport checks, and legacy validation evidence backfill
- Build (`npm run build`): Passed
- Tests (`npm test`): Passed
- Lint (`npm run lint`): Blocked by pre-existing ESLint 9 config gap (`eslint.config.*` missing)
- Manual validation:
  - Existing `Strategy & Execution` presentation shell remained visibly framed and readable in desktop standard mode.
  - Safari Responsive Design Mode spot-check passed for the same presentation shell at `390x844` (mobile narrow portrait) and `844x390` (mobile landscape); frame bounds remained visible and controls remained reachable after closing the sidebar.
  - Tablet portrait and desktop wide viewport checks are still pending.
  - Document-side fixture validation is currently blocked in this session: a request to create `Operating Model Review` stalled at `Applying changes…` around 30% both before and after enabling `Multi-doc`, and only exited after manual cancellation.
  - Because no document artifact was created, the Backlog Phase A document export checks and later document-heavy manual sweeps remain unvalidated.
- Commit: Pending
- Result: Blocked

- Date: 2026-04-23
- Agent: Codex
- Scope: Backlog Phase B continuation, document-creation unblock isolation and fresh-server revalidation
- Build (`npm run build`): Passed
- Tests (`npm test`): Passed
- Lint (`npm run lint`): Blocked by pre-existing ESLint 9 config gap (`eslint.config.*` missing)
- Manual validation:
  - Root cause isolated in product code: presentation-scoped prompts like `Create a long-form document called Operating Model Review in this project...` could be misrouted because intent resolution treated the prompt as a project review when the title contained `Review`, and `buildRunRequest()` was resolving intent from the context-augmented prompt instead of the raw user prompt.
  - Landed a narrow routing fix so explicit artifact-create prompts use the raw prompt, bypass project-review detection, and can escape an active presentation when the requested artifact type is a document.
  - Fresh Safari validation against `http://127.0.0.1:4175/` with the Ollama provider confirmed the original blocked scenario now succeeds: from a seeded presentation-only project, the scoped prompt created a new document instead of stalling or creating another presentation.
  - The created document rendered as a framed artifact and added a second sidebar item (`Operational Intelligence: 2024`) alongside the seeded presentation, which is sufficient to resume document-side Backlog Phase A and Workstream F checks.
  - A later `Multi-doc` experiment from an already-active document updated the current document instead of serving as a clean presentation-only validation case; that result is not being counted as evidence for the original blocker.
  - Broader legacy validation remains incomplete: tablet portrait and desktop wide Workstream F checks are still pending, and the remaining Backlog Phase A / Phase 4-10 manual scenarios have not yet been re-run in this slice.
- Commit: Pending
- Result: Validated

- Date: 2026-04-23
- Agent: Codex
- Scope: Backlog Phase B extension, major workflow change validation protocol, case matrix, scorecard template, and case-registry integrity coverage
- Build (`npm run build`): Passed
- Tests (`npm test`): Passed; targeted protocol integrity test also passed (`src/test/major-change-protocol.test.ts`)
- Lint (`npm run lint`): Blocked by pre-existing ESLint 9 config gap (`eslint.config.*` missing)
- Manual validation:
  - Added a canonical workflow-change validation protocol in `docs/validation/major-change-protocol.md`.
  - Added a full artifact case matrix in `docs/validation/artifact-case-matrix.md` covering numerous document, presentation, and spreadsheet case families.
  - Added a reusable scorecard in `docs/validation/scorecard-template.md`.
  - Added a case registry in `src/test/fixtures/major-change-cases.ts` and integrity coverage to stop the matrix from collapsing back into smoke-test-only checks.
  - Existing Backlog Phase A and Phase 4-10 validation debt remains pending and must now be backfilled through this protocol rather than ad hoc notes.
- Commit: Pending
- Result: Committed

- Date: 2026-04-23
- Agent: Codex
- Scope: Backlog closure tracking reconciliation plus Ollama baseline stabilization scaffolding
- Build (`npm run build`): Passed
- Tests (`npm test`): Passed; targeted doctor/provider coverage also passed (`npm test -- --run src/test/doctor.test.ts`)
- Lint (`npm run lint`): Blocked by pre-existing ESLint 9 config gap (`eslint.config.*` missing)
- Manual validation:
  - Reconciled `docs/implementation-plan-multi-agent.md` so stale unchecked top-level items now read as implemented-but-pending-validation instead of implying missing feature work.
  - Added an Ollama baseline validation checklist and scorecard centered on `gemma4:e2b`.
  - Added a small provider capability profile so the Doctor and provider settings UI can explain that Ollama is treated as a generation-first path with reduced structured-review loops.
  - Added a quieter presentation-workflow fallback that skips the secondary evaluator on local models instead of attempting the same structured-review path used for cloud providers.
  - Safari in-app spot-check on the local app confirmed the provider modal now shows the recommended `gemma4:e2b` baseline plus the new local-model guidance, and the Doctor panel shows the new informational Ollama capability note while keeping the provider check in a healthy state.
  - Broader manual backlog validation and the Ollama local scorecard pass are still pending.
- Commit: Pending
- Result: Committed

- Date: 2026-04-23
- Agent: Codex
- Scope: Backlog refinement, context-policy warning noise removal during Ollama hardening
- Build (`npm run build`): Passed
- Tests (`npm test`): Passed; targeted doctor/config validation coverage also passed (`npm test -- --run src/test/doctor.test.ts`)
- Lint (`npm run lint`): Still blocked by pre-existing ESLint 9 config gap (`eslint.config.*` missing)
- Manual validation:
  - Root cause isolated in `validateContextPolicy()`: the shared override validator was still warning on top-level `version` and `artifactOverrides` keys even though they are part of the supported context-policy shape.
  - Landed a narrow validator fix plus regression coverage so supported top-level context-policy keys no longer emit false `unknown-key` warnings.
  - Post-fix in-app browser verification confirmed the Doctor panel now reports `Project configuration looks healthy.` for a fresh project instead of surfacing the old `Unknown context policy key "version"` / `artifactOverrides` warnings.
  - Remaining backlog work is unchanged: Workstream F tablet portrait and desktop wide checks, protocol backfill for Backlog Phase A and Phase 4-10, and the first full Ollama baseline scorecard pass are still pending.
- Commit: Pending
- Result: Committed

- Date: 2026-04-24
- Agent: Codex
- Scope: Research-first workflow redesign slice, shared artifact workflow-plan contracts, queue-aware presentation hardening, and workflow-quality benchmark scaffolding
- Build (`npm run build`): Pending
- Tests (`npm test`): Pending
- Lint (`npm run lint`): Pending; still expected to be blocked by the pre-existing ESLint 9 config gap (`eslint.config.*` missing)
- Manual validation:
  - Added external benchmark research docs for Crush, Claw Code, Codex, OpenCode, `wshobson/agents`, and Dyad.
  - Added a focused Aura workflow gap analysis plus a workflow-quality benchmark loop to guide future quality tuning instead of ad hoc prompt churn.
  - Added shared `ArtifactWorkflowPlan`, `QueuedWorkItem`, `TemplateGuidanceProfile`, and `WorkflowBenchmarkResult` contracts.
  - Added queue-aware workflow planning to `RunRequest` and structured run outputs.
  - Extended the presentation queue path so multi-slide add requests can be staged sequentially against an existing deck, not only fresh batch-create flows.
  - Added provider-aware prompt guidance so local-model presentation and document runs get stricter design constraints than frontier-model paths.
- Commit: Pending
- Result: Committed

- Date: 2026-04-23
- Agent: Codex
- Scope: Ollama baseline smoke pass continuation, explicit document-title hardening
- Build (`npm run build`): Passed
- Tests (`npm test`): Passed; targeted document-title plus doctor coverage passed (`npm test -- --run src/test/document-title.test.ts src/test/doctor.test.ts`)
- Lint (`npm run lint`): Still blocked by pre-existing ESLint 9 config gap (`eslint.config.*` missing)
- Manual validation:
  - Started the first real in-app browser Ollama baseline smoke case using the recommended `gemma4:e2b` local model.
  - A long-form document create eventually produced a document artifact, but the generated title drifted away from the explicit requested title (`North Star Expansion Plan`), which is not acceptable for the baseline scorecard.
  - Classified the failure as a prompt-tuning and local-model consistency issue, then landed a narrow hardening fix: explicit requested titles extracted from prompts like `called ...` / `titled ...` are now treated as deterministic constraints in the document workflow and enforced into the final document title/H1.
  - This is partial Ollama baseline evidence only; the broader document/presentation create-edit-style-rewrite scorecard is still pending.
- Commit: Pending
- Result: Committed

- Date: 2026-04-24
- Agent: Codex
- Scope: Long-running document/presentation progress heartbeat hardening plus validation-bar documentation
- Build (`npm run build`): Passed
- Tests (`npm test`): Passed
- Lint (`npm run lint`): Still blocked by pre-existing ESLint 9 config gap (`eslint.config.*` missing)
- Manual validation:
  - Added narrow progress heartbeats to the long-running document generation/edit stream and presentation design/edit step so the UI no longer sits on a stale status during local-model or slower runs.
  - Fresh in-app browser verification against `http://127.0.0.1:4175/` confirmed a presentation edit no longer remained frozen at `Applying changes…` and `30%`; after roughly 10 seconds it advanced to `Still applying slide changes…` at `36%`.
  - Captured the current acceptance bar in the validation docs: roughly 90 seconds for generation is acceptable when progress stays visible, and up to 2 minutes for design is acceptable when the step keeps communicating and the quality justifies it.
  - This improves trust during longer local or design-heavy runs, but it does not close the remaining Workstream F viewport checks or the broader manual protocol backfill.
- Commit: Pending
- Result: Committed

- Date: 2026-04-24
- Agent: Codex
- Scope: Backlog Phase B validation continuation, presentation viewport backfill, and Ollama presentation persistence hardening
- Build (`npm run build`): Passed
- Tests (`npm test`): Passed; targeted regression coverage also passed (`npm test -- --run src/test/extractHtml.test.ts src/test/presentation-validation.test.ts`)
- Lint (`npm run lint`): Still blocked by pre-existing ESLint 9 config gap (`eslint.config.*` missing)
- Manual validation:
  - Safari Responsive Design Mode validation passed for the seeded `Market Expansion Snapshot` presentation at `768x1024` (tablet portrait) and `1440x1024` (desktop wide). The slide remained framed, readable, and did not stretch into the extra viewport width.
  - The presentation readiness path opened successfully from the toolbar and surfaced meaningful warnings without blocking export outright, which is partial Phase 7 evidence for the existing validation/publish surface.
  - Continued Ollama (`gemma4:e2b`) presentation-edit validation confirmed the long-running design step still emits continuous feedback on the live path, advancing from `Applying changes…` at `30%` to `Finishing the current slide draft…` at `54%` with updated status copy.
  - Root cause isolated for one repeated readiness inconsistency: `extractHtmlFromResponse()` was stripping Google Fonts `<link>` tags out of persisted slide HTML and only injecting them into the live page head, which could make stored/exported artifacts look like they lacked font source declarations.
  - A follow-up live Ollama edit reduced copy density from 96 words to 82 words and removed the earlier placeholder-token warning, but still reported a missing custom-font source declaration for `inter, space grotesk`; this is now classified as a real local-model output issue rather than a false validation result.
  - Landed a narrow persistence fix so emitted Google Fonts links remain in saved slide HTML while still being exposed for live injection, tightened the presentation self-check/edit prompt to explicitly reject unresolved placeholder tokens in final slide copy, and added a palette-font fallback that restores the expected Google Fonts link when a local-model slide uses custom palette fonts but omits the source declaration.
  - Broader validation remains incomplete: the document-side Workstream F viewport matrix, Backlog Phase A export/media cases, and the full Ollama baseline scorecard still need to be backfilled through the protocol.
- Commit: Pending
- Result: Committed

- Date: 2026-04-24
- Agent: Codex
- Scope: Ollama baseline continuation, in-app browser presentation edit timing validation, and local-model stream-budget hardening
- Build (`npm run build`): Passed after each code change
- Tests (`npm test`): Passed after each code change
- Lint (`npm run lint`): Still blocked by pre-existing ESLint 9 config gap (`eslint.config.*` missing)
- Manual validation:
  - In-app browser baseline validation on the seeded `Expansion Scorecard` presentation confirmed the progress UX stays alive throughout the local-model edit path: the run advanced from `Applying changes…` to `Still applying slide changes…`, then `Refining the updated slide composition…`, then `Finishing the current slide draft…`.
  - A broader local-model palette/style edit remained active after ~90 seconds and was still unfinished after ~150 seconds, which exceeds the agreed design-step budget even though progress stayed visible.
  - A much smaller subtitle-only edit showed the same pattern: it progressed normally through the same status messages but still had not completed after ~70 seconds, which rules out “only large style rewrites are slow” as the sole explanation.
  - Landed two narrow hardening attempts on the presentation designer path:
    - capped streamed presentation draft output to reduce trailing local-model verbosity
    - added an Ollama-only soft stream timeout intended to let edit flows finalize from a valid partial draft or patch set instead of waiting indefinitely for stream completion
  - The live in-app rerun still did not finish inside the 90-second validation window, so the Ollama presentation-edit path remains blocked. Current classification: `workflow bug` with possible `provider capability mismatch` contributing.
  - The latest successful local evidence remains partial: the edited slide content improved and progress stayed continuous, but the completion-time bar for presentation edits is still not met.
- Commit: Pending
- Result: Blocked

- Date: 2026-04-24
- Agent: Codex
- Scope: Workflow-quality continuation, bounded local presentation edit correction, and local-model throughput hardening
- Build (`npm run build`): Passed
- Tests (`npm test`): Passed; targeted provider capability coverage also passed (`npm test -- --run src/test/doctor.test.ts`)
- Lint (`npm run lint`): Still blocked by pre-existing ESLint 9 config gap (`eslint.config.*` missing)
- Manual validation:
  - Added a provider-aware local edit-correction budget so Ollama presentation edits no longer use the same unlimited correction posture as frontier-model paths.
  - Presentation edit correction now runs with a smaller step budget on local models and will fall back to the streamed draft if the bounded correction window times out, instead of letting the workflow stall indefinitely inside the self-repair loop.
  - Fresh browser verification in this slice confirmed the app reloads cleanly at `http://127.0.0.1:4175/` and the seeded `Expansion Scorecard` shell still renders after the change.
  - A clean in-app re-run of the original long-running Ollama presentation edit scenario was not completed in this slice, so the throughput improvement is currently code-and-test validated rather than fully re-baselined through the manual scorecard.
  - The presentation-edit blocker should remain open until the next manual Ollama scorecard pass confirms that the bounded local path materially improves completion behavior.
- Commit: Pending
- Result: Committed

- Date: 2026-04-24
- Agent: Codex
- Scope: Reference-led visual quality overhaul scaffolding for presentations and documents
- Build (`npm run build`): Passed
- Tests (`npm test`): Passed; targeted planner/benchmark/confidentiality coverage also passed (`npm test -- --run src/test/workflow-planner.test.ts src/test/workflow-benchmark-cases.test.ts src/test/reference-style-packs.test.ts`)
- Lint (`npm run lint`): Still blocked by pre-existing ESLint 9 config gap (`eslint.config.*` missing)
- Manual validation:
  - Added sanitized reference style packs and synthetic exemplar guidance for polished title, stage-setting, editorial-light, finance-grid-light, quiz-show, and professional-light document systems.
  - Added recipe-aware presentation workflow planning so title, stage-setting, finance-grid, and related slide prompts now resolve to explicit recipe/template/style-pack combinations instead of falling back to generic office-style selection.
  - Added new light presentation template families (`editorial-light`, `finance-grid-light`, `stage-setting-light`) and broadened the workflow benchmark fixtures to include the new visual target families.
  - Added document-family guidance and light theme-family overrides for executive, editorial, proposal, research, playbook, and infographic document paths.
  - Added confidentiality-focused regression coverage to ensure the new style-pack and benchmark layer stays synthetic and avoids obvious direct-reference leakage markers.
  - Manual visual benchmark scoring against the live app is still pending; this slice is implemented and test-backed, not yet manually accepted against the new reference-quality bar.
- Commit: Pending
- Result: Committed

## Workstream F Review Checklist

Use this same checklist in both Workstream F validation and the broader backlog sweep.

- Mobile narrow portrait:
  - document frame remains visible and readable
  - presentation stage remains contained and legible
  - no clipped media or overflowing comparison rows
- Mobile landscape:
  - framed artifact still preserves gutters without distortion
  - controls remain reachable and do not overlap core content
- Tablet portrait:
  - dense modules wrap or stack cleanly
  - document metadata, KPI rows, and side rails stay readable
- Desktop standard:
  - mobile-safe guidance does not flatten the artifact into a bland single-column layout
  - presentation density still feels intentional, not sparse
- Desktop wide:
  - extra space becomes gutters around the artifact frame, not stretched artifact surfaces

## Validation Sweep Scope

- Backlog Phase A export/media manual checks
- Phase 2 project rules and doctor checks
- Phase 4 targeted-edit checks
- Phase 5 starter-kit/init checks
- Phase 6 project augmentation checks
- Phase 7 publish/readiness checks
- Phase 8 presets/lifecycle/run-history checks
- Phase 9 spreadsheet workflow checks
- Phase 10 explain/dry-run/spec alignment checks
- Workstream F viewport matrix checks

## Status Values

- `planned`
- `in_progress`
- `blocked`
- `validated`
- `committed`

## Notes

- Backlog Phase B is intentionally a backlog phase, not a new canonical Phase 11.
- Workstream F completion and validation debt reduction are the priorities here; ESLint 9 migration remains out of scope.
- Earlier implemented phases may only move from `implemented` to `shipped` when the tracked manual checks are actually completed and logged.
- Representative Workstream F fixtures currently live in `src/test/fixtures/workstream-f.ts`.
- The major workflow change validation protocol now lives in `docs/validation/major-change-protocol.md`, with case definitions in `src/test/fixtures/major-change-cases.ts`.
