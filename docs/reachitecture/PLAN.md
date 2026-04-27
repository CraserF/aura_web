# Aura Artifact Runtime Rebuild

## Summary
Rebuild Aura around a simpler, presentation-first artifact runtime inspired by Dyad, OpenCode, and Claw Code: explicit planning, small generation steps, typed run events, deterministic validation, and guided defaults for non-technical users.

Research inputs: Dyad’s guided app-generation flow and live preview contract ([dyad](https://github.com/dyad-sh/dyad)), OpenCode’s session/agent/message-part runtime ([opencode](https://github.com/anomalyco/opencode)), and Claw Code’s session/task/permission/prompt-cache patterns ([claw-code](https://github.com/ultraworkers/claw-code)).

Chosen direction:
- Deep rearchitecture.
- Presentations first.
- Frontier-quality generation with local/Ollama fallback.
- No legacy project/export support required.
- Remove external API/MCP/automation seams until the new architecture is complete.
- Simplify the app for non-technical users with guided defaults and hidden advanced controls.

## Progress Tracker

Last updated: 2026-04-27.

### Completed In First Runtime Slice
- Added the internal `ArtifactRuntime` module:
  - `ArtifactRunPlan`;
  - `ArtifactRunEvent`;
  - `ArtifactPart`;
  - `DesignManifest`;
  - `ValidationGate`;
  - provider policy;
  - runtime metrics budget.
- Changed the active chat request path so `buildRunRequest()` now creates one authoritative `artifactRunPlan`.
- Stopped the active app runtime from building or attaching the legacy serializable external execution spec.
- Removed active dry-run/explain branching from `submitPrompt()`.
- Replaced active `run.spec-built` / `run.explained` event flow with `run.plan-built`.
- Routed presentation generation through the new runtime plan:
  - `PresentationInput` now accepts `artifactRunPlan`;
  - the presentation handler passes the run plan into the workflow;
  - queued presentation slides are derived from runtime work parts when available;
  - runtime design manifest details are appended to the presentation plan.
- Added compact prompt packs for:
  - core artifact contract;
  - presentation fragment contract;
  - validator feedback.
- Added those prompt packs to create/edit presentation prompt composition.
- Simplified the visible settings surface:
  - sidebar label changed from `Project Rules` to `Project Style`;
  - normal users now see guided defaults for audience, tone, visual style, quality/speed, source usage, and optional extra guidance;
  - raw rules markdown, context policy, and workflow presets are hidden under `Advanced`.
- Updated tests and benchmark fixtures away from explain/dry-run coverage toward runtime-plan coverage.

### Completed In Second Runtime Slice
- Added `src/services/artifactRuntime/presentationRuntime.ts`.
- Moved queued presentation generation control out of `src/services/ai/workflow/presentation.ts` and into the runtime layer.
- Added queued presentation runtime helpers for:
  - queue eligibility;
  - queued deck execution;
  - runtime output validation;
  - repair handoff/stub;
  - final output assembly.
- Added runtime telemetry to queued presentation output:
  - time to first slide preview;
  - total runtime;
  - validation pass/fail state;
  - blocking/advisory validation counts;
  - repair count.
- Kept the existing batch slide generator as the implementation engine underneath the runtime wrapper for now.
- Added runtime validation for queued decks using the existing programmatic slide validator.
- Added a repair placeholder that records the handoff point without changing output until deterministic/LLM repair is implemented.
- Updated starter presentation artifacts to create an `ArtifactRunPlan` with slide parts, production design family, validation gate, and starter-specific work queue.
- Moved deterministic starter presentation sanitize/validate/finalize behavior behind `finalizeStaticPresentationRuntime()`.
- Added starter coverage proving starter decks expose runtime plans, slide work parts, and production design families.
- Added runtime finalizer coverage proving deterministic starter-style HTML is scoped and telemetry is produced.
- Added runtime policy coverage proving queued generation is owned by `artifactRuntime/presentationRuntime.ts`, not the older presentation workflow file.

### Completed In Third Runtime Slice
- Added a runtime event adapter in `src/services/artifactRuntime/events.ts`.
- Runtime events can now be translated into the current `WorkflowEvent` shape, which keeps the existing UI progress contract alive while generation moves behind `ArtifactRuntime`.
- Expanded presentation runtime ownership beyond queued decks:
  - single-slide create flows now run through `runSinglePresentationRuntime()`;
  - edit flows now run through `runSinglePresentationRuntime()`;
  - the older `presentation.ts` workflow is now mostly a compatibility shell for model setup, plan creation, and dispatch.
- Added runtime telemetry to single-slide create/edit output:
  - time to first preview;
  - total runtime;
  - validation pass/fail state;
  - blocking/advisory validation counts;
  - repair count.
- Exposed presentation runtime telemetry through the output envelope so downstream UI/storage paths can read the same runtime summary as queued decks.
- Moved starter template-to-section assembly into `src/services/artifactRuntime/starterPresentationRuntime.ts`.
- Starter presentation creation is now runtime-owned from deterministic template parsing through runtime plan creation and finalization.
- Preserved starter rendering reset invariants:
  - complete scoped slide HTML is stored in `contentHtml`;
  - `themeCss` remains `''`;
  - starter slide count is derived from actual sections;
  - token replacement and empty optional shell cleanup happen before finalization.
- Added regression coverage for:
  - runtime event adapter behavior;
  - old presentation workflow no longer owning designer/evaluator imports or queued batch execution;
  - runtime-owned presentation generation functions.

### Completed In Fourth Runtime Slice
- Promoted the core workflow decisions onto `ArtifactRunPlan` itself:
  - request kind;
  - preservation intent;
  - presentation recipe;
  - document theme family;
  - queue mode;
  - template guidance.
- Kept the older nested `workflow` object as a compatibility field while active consumers move to the runtime plan as the primary source of truth.
- Updated presentation routing and chat runtime metrics to read from top-level runtime plan fields where possible.
- Replaced the presentation repair placeholder with a deterministic repair pass that:
  - unwraps accidental `<html>` / `<body>` / Reveal wrapper shells;
  - strips scripts, links, metadata, iframes, embeds, and external media/assets;
  - removes external CSS `url(http...)` references;
  - adds concrete `data-background-color` values when missing;
  - adds a reduced-motion fallback when animated CSS lacks one;
  - removes only empty optional `<p>` and leaf `<div>` shells while preserving structural/decorative containers.
- Fixed detached template-clone cleanup so starter/runtime repair cleanup works on cloned sections that are not connected to the document.
- Added prompt contract coverage for the compact artifact/presentation prompt packs.
- Tightened final designer prompt rules so the final required format is `<style>` plus `<section>` elements only, with no `<link>` allowance.
- Added active-generation import boundary coverage proving execution-spec adapters stay out of current chat generation paths.
- Started document runtime V1 by passing the active `ArtifactRunPlan` into document generation and emitting runtime plan/part/validation/finalization events through the shared event adapter.
- Added a spreadsheet runtime bridge that maps deterministic spreadsheet results into shared validation, part-completion, and finalization events without changing workbook execution.

### Completed In Fifth Runtime Slice
- Removed active chat/runtime reliance on `runRequest.workflowPlan`.
- Output envelopes now include `runtimePlan` sourced from `runRequest.artifactRunPlan`.
- The older `workflowPlan` envelope field is still populated for compatibility, but active handlers now derive it from `artifactRunPlan.workflow`.
- Moved the workflow-planning implementation into `src/services/artifactRuntime/planner.ts`.
- Converted `src/services/workflowPlanner/build.ts` into a thin compatibility export from the runtime planner.
- Updated `src/services/artifactRuntime/build.ts` so `ArtifactRunPlan` construction depends on runtime-owned planning code.
- Added document runtime part expansion:
  - document outline part;
  - blueprint-backed document module parts;
  - validation result part.
- Document generation now attaches those runtime parts to the active `ArtifactRunPlan` before generation.
- Added deterministic repair follow-up coverage proving validation is re-run after repair and the repaired validation summary is recorded.
- Added the first bounded LLM repair handoff signal for presentation fragments that deterministic repair cannot recover.
- Added spreadsheet runtime bridge tests for completed and blocked deterministic workbook results.

### Completed In Sixth Runtime Slice
- Executed the bounded LLM presentation repair pass when deterministic repair cannot recover a fragment and a model is available.
- Kept the no-model path as an explicit handoff signal for tests and non-generation contexts.
- Removed `workflowPlan` from the active `RunRequest` shape and from `buildRunRequest()`.
- Preserved `workflowPlan` only as a deprecated output-envelope compatibility field populated from `runtimePlan.workflow`.
- Updated legacy/quarantined explain envelope construction to use `artifactRunPlan`.
- Added shared runtime telemetry to document outputs:
  - first preview time;
  - total runtime;
  - validation pass/fail state;
  - blocking/advisory validation counts;
  - repair count.
- Added runtime telemetry to spreadsheet output envelopes using deterministic workflow timing and validation results.
- Expanded spreadsheet runtime bridge tests across workbook action, formula, query, chart, blocked, and clarification paths.

### Completed In Seventh Runtime Slice
- Removed the deprecated `workflowPlan` field from output envelopes.
- Active envelope builders now expose `runtimePlan` only; `workflowPlan` remains only as legacy type terminology in the quarantined workflow-planner compatibility module and tests.
- Added deterministic document validation/repair hooks in `src/services/artifactRuntime/documentRuntime.ts`.
- Document repair now:
  - strips unsupported document nodes and remote asset references;
  - inserts a missing title when needed;
  - wraps loose body content in a document shell;
  - injects a compact iframe-safe default style block when missing;
  - re-runs document validation and records repair counts.
- Added document runtime telemetry builder coverage.
- Added spreadsheet runtime telemetry builder coverage.
- Added a runtime part prompt section for document generation so the current document stream is explicitly guided by outline/module runtime parts while the deeper queued-document generator is built.
- Added import-boundary coverage proving active handlers and run-request building do not read `runRequest.workflowPlan`.

### Completed In Eighth Runtime Slice
- Added document module-level runtime validation in `src/services/artifactRuntime/documentRuntime.ts`.
- The document runtime part prompt now includes exact runtime ids and asks generated module wrappers to use `data-runtime-part="..."`.
- Added deterministic document module repair that:
  - maps existing generated sections/articles/cards onto missing runtime module ids;
  - appends compact fallback module shells only when the generated document has no suitable block to map;
  - inserts missing module headings;
  - fills empty module shells with the module brief;
  - strips unsupported document nodes before module repair.
- The document workflow now runs module validation/repair before final document QA, so the final validation pass sees the runtime-owned module structure.
- Added a compact document runtime finalizer that normalizes loose generated HTML into a shell/title/style frame before module validation and QA.
- Document runtime telemetry now counts module repair passes alongside document-level repair and targeted-edit fallback repair.
- Added artifact runtime coverage for module prompt ids, missing module wrapper repair, shell finalization, and module validation success after repair.

### Completed In Ninth Runtime Slice
- Added queued document runtime prompt primitives:
  - queue eligibility checks;
  - compact outline prompts;
  - single-module HTML fragment prompts;
  - runtime shell assembly from separately generated module drafts.
- Extended the compact document runtime shell CSS so generated modules can omit repeated shell styling while still rendering with readable header, section, and mobile-safe module defaults.
- Create-mode document generation now uses the runtime queue when a document `ArtifactRunPlan` is available and the request is not an edit or image-based generation:
  - generate outline first;
  - generate each runtime document module separately;
  - assemble modules into one shell;
  - run the existing finalizer, module validation/repair, document QA, and telemetry path.
- Edit and image-heavy document requests intentionally remain on the existing one-stream path for now so the first queued-document landing is scoped and reversible.
- Added artifact runtime coverage for queued-document eligibility, outline prompt contracts, module prompt contracts, and assembled queued module shells.

### Completed In Tenth Runtime Slice
- Opened queued document generation to image-based create requests by sending images only to the outline step, then generating text/HTML modules from the planned outline.
- Updated the outline prompt contract so attached images are used for structure, evidence, labels, and emphasis rather than copied into unsafe document assets.
- Added module-specific document validation issues:
  - missing module wrapper;
  - empty module;
  - headingless module.
- Validation results now carry per-module issue metadata so later repair prompts can target exactly the failed module instead of reworking the whole document.
- Expanded the compact runtime shell/design-system CSS with reusable document module classes:
  - KPI rows;
  - proof strips;
  - comparison blocks;
  - timelines;
  - sidebar layouts;
  - mobile-safe stacking.
- Updated module prompt guidance so generated modules use the shared class vocabulary instead of inventing fresh layout systems.
- Added tests for image-compatible queued eligibility, reusable module prompt classes, runtime shell CSS, and module-specific validation issue reporting.

### Completed In Eleventh Runtime Slice
- Added runtime helpers for targeted document module edits:
  - resolve edit targets to existing `data-runtime-part` module wrappers;
  - score target/module text overlap when direct block ids are unavailable;
  - preserve each matched module's existing HTML as edit context;
  - splice regenerated module fragments back into the existing document shell.
- The document workflow now attempts a guarded queued edit path before the old broad edit stream when:
  - the request is a document edit;
  - the existing document has runtime module wrappers;
  - resolved edit targets map to one or more runtime modules;
  - full regeneration is not requested;
  - no image edit input is present.
- Queued module edits regenerate only the matched modules, preserve untouched modules, and then continue through the same finalizer, module validation/repair, document QA, and telemetry path.
- If a module cannot be resolved safely, the workflow falls back to the existing targeted edit patcher.
- Added artifact runtime coverage proving targeted edit resolution selects the expected module and module-local replacement preserves untouched content.

### Completed In Twelfth Runtime Slice
- Added a module repair prompt contract driven by `DocumentRuntimeModuleIssue` metadata.
- Added a bounded queued module repair pass in the document workflow:
  - groups validation issues by failed module id;
  - regenerates only the failed module fragment;
  - includes issue summaries and existing module HTML when available;
  - splices the repaired module back into the document shell;
  - re-runs module validation after repair.
- Missing modules can now be repaired by appending the regenerated module fragment into the document shell.
- Deterministic whole-module repair remains as the fallback when queued repair is unavailable or does not fully recover validation.
- Added artifact runtime coverage for module repair prompts and missing-module repair insertion.

### Completed In Thirteenth Runtime Slice
- Added workflow-level document runtime orchestration tests using mocked model streaming rather than real providers.
- Covered the active document workflow scenarios from the next-step plan:
  - image-based queued create sends images only to the outline step, then uses text-only module prompts;
  - queued edit falls back to the existing broad targeted edit patcher when no `data-runtime-part` module resolves;
  - queued edit uses module-local regeneration when a runtime module resolves;
  - module validation failure attempts queued per-module repair before deterministic whole-module repair.
- Extended `ArtifactRuntimeTelemetry` with optional diagnostic fields:
  - `runMode`;
  - `queuedPartCount`;
  - `completedPartCount`;
  - `repairedPartCount`.
- Document workflow telemetry now reports:
  - `single-stream`, `queued-create`, or `queued-edit` run mode;
  - queued/completed module counts for queued create and edit;
  - repaired module counts for queued and deterministic module repair.
- Added a deterministic runtime telemetry diagnostic test layer for:
  - first-preview telemetry;
  - total runtime telemetry;
  - queued create/edit part counts;
  - separation of total repair attempts from part-level repairs.
- Audited remaining `workflowPlanner` imports. Compatibility re-exports and shared type imports remain in place for now; this slice did not add new active-generation dependency on workflow-planner implementation files.

### Completed In Fourteenth Runtime Slice
- Moved runtime-owned planner type definitions into `src/services/artifactRuntime/types.ts`.
- Converted `src/services/workflowPlanner/types.ts` into a compatibility re-export from `artifactRuntime/types`.
- Repointed active runtime, AI workflow, template routing, prompt, and designer imports away from `workflowPlanner/types`.
- Extended import-boundary coverage so active generation paths cannot re-import `@/services/workflowPlanner`.
- Added `src/services/artifactRuntime/diagnostics.ts` as the first deterministic benchmark/diagnostic helper layer:
  - prompt token estimation from text or character counts;
  - first-preview sample counts;
  - average first-preview and total runtime summaries;
  - validation pass rate;
  - total repair count;
  - queued and repaired part counts;
  - per-artifact-type summaries.
- Expanded workflow-level document tests to assert queued create emits streaming/first-preview-related workflow events and runtime part progress.
- Moved duplicated document module output guidance into a compact `buildDocumentModuleContractPack()` prompt pack used by both module creation and module repair prompts.

### Completed In Fifteenth Runtime Slice
- Added a production presentation template family list in the template registry:
  - `executive-briefing-light`;
  - `launch-narrative-light`;
  - `editorial-light`;
  - `finance-grid-light`;
  - `stage-setting-light`;
  - `interactive-quiz`;
  - `split-world`.
- Added production-template helpers for routing checks and legacy-template normalization.
- Updated presentation template selection and resolver defaults so generated presentation plans route through production families instead of older legacy template ids.
- Mapped comparison recipe routing to `split-world` and launch-style prompts to `launch-narrative-light`.
- Updated runtime plan application so an authoritative `ArtifactRunPlan` overrides the older presentation planner's selected template and exemplar pack.
- Added production routing tests proving generated presentation planner output, runtime plans, and recipe-hinted template plans use production templates.
- Added runtime fragment-contract coverage for all routed production templates.
- Extended presentation runtime telemetry:
  - `runMode` for single-stream, queued create/edit, and deterministic starter outputs;
  - queued/completed slide counts;
  - per-slide/deck validation summaries in `validationByPart`.
- Starter presentation build results now expose runtime telemetry for diagnostics, while still writing starter artifacts with `themeCss: ''`.
- Added starter runtime diagnostics coverage using the shared benchmark helper to summarize first-preview coverage, queued slide counts, and validation pass rate.

### Completed In Sixteenth Runtime Slice
- Added a deterministic per-slide validation and repair pass for queued presentation decks before final whole-deck validation.
- The queued slide repair pass:
  - splits generated deck output into shared prefix blocks and individual `<section>` fragments;
  - validates each queued slide fragment independently;
  - applies deterministic fragment cleanup only to failing slides while repair budget remains;
  - reassembles the deck before the final deck-level validation gate.
- Queued presentation telemetry now counts per-slide repair passes and repaired slide parts in `repairCount` and `repairedPartCount`.
- Added queued/generated presentation workflow tests using a mocked batch slide generator:
  - first-preview events and queued slide telemetry are covered outside starter decks;
  - deterministic per-slide repair is covered before final deck validation;
  - shared runtime diagnostics summarize generated queued deck telemetry.
- Added artifact runtime coverage for queued per-slide deterministic repair behavior.

### Completed In Nineteenth Runtime Slice
- Stabilized the prompt-cutover release candidate and kept this slice scoped to presentation progress hardening.
- Added a chat workflow-step upsert helper so runtime-owned part ids can appear in the visible generation step list even when they were not part of the original seeded workflow steps.
- Wired presentation workflow events so:
  - `step-start`, `step-done`, `step-skipped`, and `step-update` preserve runtime labels;
  - `progress` events with `partId` create or update visible part-specific steps;
  - slide repair progress such as `slide-1` becomes a user-facing step instead of being dropped behind a generic deck repair message.
- Applied the same optional label/part-id handling to the document handler so queued document modules can benefit from the shared progress behavior without changing public output contracts.
- Added focused UI/progress coverage proving:
  - slide-specific repair progress is inserted before deck evaluation;
  - completed repair labels remain visible;
  - the working indicator renders slide-specific repair labels.
- Collected the first build-output bundle snapshot for presentation template impact. The current production build still emits legacy-template chunks, including larger candidates such as `sidebar-cards` 47.59 kB, `corporate` 47.40 kB, `educational` 40.96 kB, `landscape-illustration` 37.44 kB, `keynote` 35.05 kB, `infographic-grid` 34.69 kB, and `product-demo` 30.16 kB before gzip. This is data only; no archive/delete decision was made in this slice.
- Manual browser/provider smoke is still a deployment gate. It was not completed in this environment because the Browser plugin's Node REPL control surface was unavailable; the release candidate still needs local UI smoke for executive starter, launch starter, fresh 3-slide generation, and one slide edit before production deployment.

### Completed In Twentieth Runtime Slice
- Started the production-readiness smoke gate and confirmed the local Vite app can serve successfully:
  - sandboxed dev-server startup was blocked by `listen EPERM`;
  - the approved escalated dev server started on `http://127.0.0.1:5174/`;
  - an approved local HTTP preflight returned `HTTP/1.1 200 OK`.
- Browser automation remains blocked in this session:
  - the Browser plugin's required Node REPL `js` tool is not exposed;
  - Computer Use app discovery failed with a macOS Apple event permission error;
  - therefore desktop/mobile visual canvas smoke still requires a local manual run before deployment.
- Added `src/test/release-smoke.test.ts` as a deterministic release-smoke layer for the prompt-cutover baseline.
- The deterministic smoke now covers:
  - executive and launch presentation starter initialization through `initProject()` using the kit's presentation artifact and project defaults;
  - starter deck scoped CSS, `themeCss: ''`, slide counts, no unresolved tokens, no wrappers/scripts/links, no inline styles, and no empty paragraph shells;
  - starter runtime plans using the expected production design families and deterministic runtime telemetry;
  - fresh 3-slide queued presentation generation with first-preview events and queued-part telemetry;
  - queued presentation edit with `existingSlidesHtml` passed through and an unaffected slide preserved.
- Full launch-kit browser smoke is still required because the deterministic jsdom smoke intentionally avoids spreadsheet/DuckDB Worker initialization while focusing on the presentation release contract.

### Completed In Twenty-First Runtime Slice
- Re-ran the release-gate preflight without changing the release-candidate scope:
  - `npm test -- release-smoke` still passes the deterministic presentation smoke contract;
  - `npm run typecheck` still passes;
  - local Vite startup still requires sandbox escalation, then serves successfully on `http://127.0.0.1:5173/`;
  - an approved local HTTP preflight returned `HTTP/1.1 200 OK`;
  - the smoke-test dev server was stopped after the preflight.
- Rechecked available browser surfaces for the manual visual gate:
  - Browser plugin automation is still blocked because the required Node REPL `js` tool is not exposed in this session;
  - Computer Use still fails app discovery with macOS Apple event error `-1743`;
  - therefore the desktop/mobile canvas smoke remains a local manual deployment gate.
- No presentation runtime cleanup, legacy-template pruning, document runtime expansion, spreadsheet runtime expansion, or UX simplification was started in this slice, because the plan requires the browser/provider smoke to be recorded first.

### Completed In Twenty-Second Runtime Slice
- Implemented the runtime hardening and quality diagnostics slice while keeping manual browser/provider smoke skipped.
- Added a shared chat workflow event-to-progress helper so presentation, document, and spreadsheet handlers materialize runtime `partId` events into visible steps consistently.
- Runtime progress now preserves stable part labels for `Slide N`, `Document module N`, `Formula`, `Query`, `Chart`, `Workbook action`, `Checking quality`, and `Finishing`, while keeping default generation labels simple.
- Extended `ArtifactRuntimeTelemetry` with optional generic quality fields:
  - `qualityPassed`;
  - `qualityBlockingCount`;
  - `qualityAdvisoryCount`;
  - `qualityChecks`.
- Added spreadsheet-specific runtime diagnostics:
  - `spreadsheetActionKind`;
  - `changedSheetCount`;
  - `refreshedSheetCount`.
- Added a document quality checklist parallel to the presentation quality checklist:
  - iframe-safe markup;
  - no scripts, unsupported wrappers, remote assets, or fixed-width clipping risks;
  - readable 16px+ body/paragraph type;
  - mobile-safe grid/media/table checks;
  - print-safe static structure.
- Extended runtime diagnostics summaries to report generic quality pass rates, quality issue counts, spreadsheet action kinds, changed sheet counts, and refreshed sheet counts.
- Extracted document runtime shell CSS, module wrapper classes, shared module class vocabulary, and module candidate selectors into `src/services/artifactRuntime/documentDesignSystem.ts`.
- Reused the extracted document design-system constants in document prompts, finalization, repair, and tests so prompt guidance and actual rendering stay aligned.
- Spreadsheet deterministic results now populate quality summaries, action kind, changed/refreshed sheet counts, queued/completed part counts, and validation-by-part summaries without adding model calls or dependencies.
- Added explicit legacy-vs-production presentation template metadata:
  - production template ids remain the active generation route;
  - legacy template ids are now auditable archival candidates;
  - tests prove production and legacy groups partition the registry and active routing normalizes legacy ids to production families.
- Recorded the current build-output template bundle snapshot again. Legacy chunks are still emitted, with the same larger archival candidates visible in the Vite output, including `sidebar-cards` 47.59 kB, `corporate` 47.40 kB, `multi-panel-dashboard` 46.43 kB, `educational` 40.96 kB, `landscape-illustration` 37.44 kB, `keynote` 35.05 kB, `infographic-grid` 34.69 kB, and `product-demo` 30.16 kB before gzip. No template was deleted or converted in this slice.

### Validation Completed
- `npm test -- artifact-runtime workflow-planner run-request run-dry-run run-explain structured-run-outputs external-adapter-contracts run-events workflow-benchmark-cases`
  - Passed: 9 files, 23 tests.
- `npm test -- artifact-runtime presentation-runtime-policy project-starter-kits workflow-planner run-request`
  - Passed: 5 files, 21 tests.
- `npm test`
  - Passed: 93 files, 510 tests.
- `npm run typecheck`
  - Passed.
- `npm run build`
  - Passed.
  - Existing Vite warnings remain for chunk size, `crypto` externalization from `isomorphic-git`, and mixed static/dynamic imports.
- Changed-file ESLint
  - Passed.
- Current slice focused validation:
  - `npm run typecheck`
    - Passed.
  - `npm test -- artifact-runtime presentation-runtime-policy project-starter-kits init-project run-request`
    - Passed: 5 files, 14 tests.
  - `npm test`
    - Passed: 93 files, 510 tests.
  - `npm run build`
    - Passed.
    - Existing Vite warnings remain for chunk size, `crypto` externalization from `isomorphic-git`, and mixed static/dynamic imports.
  - Changed-file ESLint
    - Passed.
- Current fourth-slice focused validation:
  - `npm test -- artifact-runtime prompt-contracts presentation-runtime-policy project-starter-kits init-project run-request`
    - Passed: 6 files, 18 tests.
  - `npm run typecheck`
    - Passed.
  - `npm test`
    - Passed: 94 files, 514 tests.
  - `npm run build`
    - Passed.
    - Existing Vite warnings remain for chunk size, `crypto` externalization from `isomorphic-git`, and mixed static/dynamic imports.
  - Changed-file ESLint
    - Passed.
- Current fifth-slice focused validation:
  - `npm run typecheck`
    - Passed.
  - `npm test -- artifact-runtime spreadsheet-runtime prompt-contracts presentation-runtime-policy workflow-planner run-request run-dry-run project-starter-kits`
    - Passed: 8 files, 33 tests.
  - `npm test`
    - Passed: 95 files, 520 tests.
  - `npm run build`
    - Passed.
    - Existing Vite warnings remain for chunk size, `crypto` externalization from `isomorphic-git`, and mixed static/dynamic imports.
  - Changed-file ESLint
    - Passed.
- Current sixth-slice focused validation:
  - `npm run typecheck`
    - Passed.
  - `npm test -- artifact-runtime spreadsheet-runtime prompt-contracts presentation-runtime-policy workflow-planner run-request run-dry-run project-starter-kits project-augmentation`
    - Passed: 9 files, 39 tests.
  - `npm test`
    - Passed: 95 files, 524 tests.
  - `npm run build`
    - Passed.
    - Existing Vite warnings remain for chunk size, `crypto` externalization from `isomorphic-git`, and mixed static/dynamic imports.
  - Changed-file ESLint
    - Passed.
- Current seventh-slice focused validation:
  - `npm run typecheck`
    - Passed.
  - `npm test -- artifact-runtime spreadsheet-runtime prompt-contracts presentation-runtime-policy workflow-planner run-request run-dry-run project-starter-kits project-augmentation`
    - Passed: 9 files, 40 tests.
  - `npm test`
    - Passed: 95 files, 525 tests.
  - `npm run build`
    - Passed.
    - Existing Vite warnings remain for chunk size, `crypto` externalization from `isomorphic-git`, and mixed static/dynamic imports.
  - Changed-file ESLint
    - Passed.
- Current eighth-slice focused validation:
  - `npm run typecheck`
    - Passed.
  - `npm test -- artifact-runtime spreadsheet-runtime prompt-contracts presentation-runtime-policy workflow-planner run-request run-dry-run project-starter-kits project-augmentation`
    - Passed: 9 files, 42 tests.
  - `npm test`
    - Passed: 95 files, 527 tests.
  - `npm run build`
    - Passed.
    - Existing Vite warnings remain for chunk size, `crypto` externalization from `isomorphic-git`, and mixed static/dynamic imports.
  - Changed-file ESLint via `npx eslint src/services/ai/workflow/document.ts src/services/artifactRuntime/documentRuntime.ts src/services/artifactRuntime/index.ts src/test/artifact-runtime.test.ts`
    - Passed.
  - Repo-wide lint through `npm run lint -- ...`
    - Non-gating failure due existing unrelated lint debt outside this slice.
- Current ninth-slice focused validation:
  - `npm run typecheck`
    - Passed.
  - `npm test -- artifact-runtime spreadsheet-runtime prompt-contracts presentation-runtime-policy workflow-planner run-request run-dry-run project-starter-kits project-augmentation`
    - Passed: 9 files, 43 tests.
  - `npm test`
    - Passed: 95 files, 528 tests.
  - `npm run build`
    - Passed.
    - Existing Vite warnings remain for chunk size, `crypto` externalization from `isomorphic-git`, and mixed static/dynamic imports.
  - Changed-file ESLint via `npx eslint src/services/ai/workflow/document.ts src/services/artifactRuntime/documentRuntime.ts src/services/artifactRuntime/index.ts src/test/artifact-runtime.test.ts`
    - Passed.
- Current tenth-slice focused validation:
  - `npm run typecheck`
    - Passed.
  - `npm test -- artifact-runtime spreadsheet-runtime prompt-contracts presentation-runtime-policy workflow-planner run-request run-dry-run project-starter-kits project-augmentation`
    - Passed: 9 files, 44 tests.
  - `npm test`
    - Passed: 95 files, 529 tests.
  - `npm run build`
    - Passed.
    - Existing Vite warnings remain for chunk size, `crypto` externalization from `isomorphic-git`, and mixed static/dynamic imports.
  - Changed-file ESLint via `npx eslint src/services/ai/workflow/document.ts src/services/artifactRuntime/documentRuntime.ts src/services/artifactRuntime/index.ts src/test/artifact-runtime.test.ts`
    - Passed.
- Current eleventh-slice focused validation:
  - `npm run typecheck`
    - Passed.
  - `npm test -- artifact-runtime spreadsheet-runtime prompt-contracts presentation-runtime-policy workflow-planner run-request run-dry-run project-starter-kits project-augmentation`
    - Passed: 9 files, 45 tests.
  - `npm test`
    - Passed: 95 files, 530 tests.
  - `npm run build`
    - Passed.
    - Existing Vite warnings remain for chunk size, `crypto` externalization from `isomorphic-git`, and mixed static/dynamic imports.
  - Changed-file ESLint via `npx eslint src/services/ai/workflow/document.ts src/services/artifactRuntime/documentRuntime.ts src/services/artifactRuntime/index.ts src/test/artifact-runtime.test.ts`
    - Passed.
- Current twelfth-slice focused validation:
  - `npm run typecheck`
    - Passed.
  - `npm test -- artifact-runtime spreadsheet-runtime prompt-contracts presentation-runtime-policy workflow-planner run-request run-dry-run project-starter-kits project-augmentation`
    - Passed: 9 files, 46 tests.
  - `npm test`
    - Passed: 95 files, 531 tests.
  - `npm run build`
    - Passed.
    - Existing Vite warnings remain for chunk size, `crypto` externalization from `isomorphic-git`, and mixed static/dynamic imports.
  - Changed-file ESLint via `npx eslint src/services/ai/workflow/document.ts src/services/artifactRuntime/documentRuntime.ts src/services/artifactRuntime/index.ts src/test/artifact-runtime.test.ts`
    - Passed.
- Current thirteenth-slice focused validation:
  - `npm run typecheck`
    - Passed.
  - `npm test -- artifact-runtime document-runtime-workflow runtime-telemetry workflow-planner run-request run-dry-run project-starter-kits project-augmentation`
    - Passed: 8 files, 42 tests.
  - `npm test`
    - Passed: 97 files, 538 tests.
  - `npm run build`
    - Passed.
    - Existing Vite warnings remain for chunk size, `crypto` externalization from `isomorphic-git`, and mixed static/dynamic imports.
  - Changed-file ESLint via `npx eslint src/services/ai/workflow/document.ts src/services/ai/workflow/types.ts src/services/artifactRuntime/documentRuntime.ts src/test/document-runtime-workflow.test.ts src/test/runtime-telemetry.test.ts`
    - Passed.
- Current fourteenth-slice focused validation:
  - `npm run typecheck`
    - Passed.
  - `npm test -- artifact-runtime document-runtime-workflow runtime-telemetry presentation-runtime-policy workflow-planner run-request run-dry-run project-starter-kits project-augmentation`
    - Passed: 9 files, 46 tests.
  - `npm test`
    - Passed: 97 files, 539 tests.
  - `npm run build`
    - Passed.
    - Existing Vite warnings remain for chunk size, `crypto` externalization from `isomorphic-git`, and mixed static/dynamic imports.
  - Changed-file ESLint across modified runtime, workflow, prompt, compatibility, and test files
    - Passed.
- Current fifteenth-slice focused validation:
  - `npm run typecheck`
    - Passed.
  - `npm test -- presentation-template-design-system project-starter-kits artifact-runtime runtime-telemetry presentation-runtime-policy workflow-planner`
    - Passed: 6 files, 42 tests.
  - `npm test`
    - Passed: 97 files, 541 tests.
  - `npm run build`
    - Passed.
    - Existing Vite warnings remain for chunk size, `crypto` externalization from `isomorphic-git`, and mixed static/dynamic imports.
  - Changed-file ESLint across modified template, runtime, starter, and test files
    - Passed.
- Current sixteenth-slice focused validation:
  - `npm run typecheck`
    - Passed.
  - `npm test -- presentation-runtime-workflow artifact-runtime presentation-template-design-system project-starter-kits runtime-telemetry presentation-runtime-policy workflow-planner`
    - Passed: 7 files, 45 tests.
  - `npm test`
    - Passed: 98 files, 544 tests.
  - `npm run build`
    - Passed.
    - Existing Vite warnings remain for chunk size, `crypto` externalization from `isomorphic-git`, and mixed static/dynamic imports.
  - Changed-file ESLint via `npx eslint src/services/artifactRuntime/index.ts src/services/artifactRuntime/presentationRuntime.ts src/test/artifact-runtime.test.ts src/test/presentation-runtime-workflow.test.ts`
    - Passed.
- Current seventeenth-slice focused validation:
  - `npm run typecheck`
    - Passed.
  - `npm test -- presentation-runtime-workflow artifact-runtime presentation-template-design-system project-starter-kits runtime-telemetry presentation-runtime-policy workflow-planner`
    - Passed: 7 files, 47 tests.
  - `npm test`
    - Passed: 98 files, 546 tests.
  - `npm run build`
    - Passed.
    - Existing Vite warnings remain for chunk size, `crypto` externalization from `isomorphic-git`, and mixed static/dynamic imports.
  - Changed-file ESLint via `npx eslint src/services/ai/workflow/types.ts src/services/artifactRuntime/events.ts src/services/artifactRuntime/index.ts src/services/artifactRuntime/presentationRuntime.ts src/services/artifactRuntime/presentationViewport.ts src/services/artifactRuntime/types.ts src/test/artifact-runtime.test.ts src/test/presentation-runtime-workflow.test.ts src/test/presentation-template-design-system.test.ts`
    - Passed.
  - `git diff --check`
    - Passed.
- Current eighteenth-slice focused validation:
  - `npm run typecheck`
    - Passed.
  - `npm test -- prompt-contracts presentation-runtime-workflow artifact-runtime presentation-template-design-system project-starter-kits presentation-runtime-policy`
    - Passed: 6 files, 37 tests.
  - `npm test`
    - Passed: 98 files, 548 tests.
  - `npm run build`
    - Passed.
    - Existing Vite warnings remain for chunk size, `crypto` externalization from `isomorphic-git`, and mixed static/dynamic imports.
  - Changed-file ESLint via `npx eslint src/services/ai/prompts/index.ts src/services/ai/workflow/agents/designer.ts src/services/ai/workflow/agents/evaluator.ts src/services/ai/workflow/agents/qa-validator.ts src/services/ai/workflow/agents/reviewer.ts src/services/ai/workflow/batchQueue.ts src/services/ai/workflow/skills/design-rules.ts src/services/artifactRuntime/index.ts src/services/artifactRuntime/presentationRuntime.ts src/services/artifactRuntime/presentationPrompts.ts src/test/mobile-guidance.test.ts src/test/project-rules.test.ts src/test/prompt-contracts.test.ts`
    - Passed.
  - `git diff --check`
    - Passed.
- Current nineteenth-slice focused validation:
  - `npm run typecheck`
    - Passed.
  - `npm test -- workflow-progress ai-working-indicator presentation-runtime-workflow`
    - Passed: 3 files, 6 tests.
  - `npm test -- prompt-contracts presentation-runtime-workflow artifact-runtime presentation-template-design-system project-starter-kits presentation-runtime-policy workflow-progress ai-working-indicator`
    - Passed: 8 files, 41 tests.
  - `npm test`
    - Passed: 100 files, 552 tests.
  - `npm run build`
    - Passed.
    - Existing Vite warnings remain for chunk size, `crypto` externalization from `isomorphic-git`, and mixed static/dynamic imports.
  - Changed-file ESLint via `npx eslint src/components/ChatBar.tsx src/components/chat/handlers/documentHandler.ts src/components/chat/handlers/presentationHandler.ts src/services/chat/submitPrompt.ts src/services/chat/workflowProgress.ts src/test/ai-working-indicator.test.tsx src/test/workflow-progress.test.ts`
    - Passed.
  - `git diff --check`
    - Passed.
- Current twentieth-slice focused validation:
  - `npm test -- release-smoke`
    - Passed: 1 file, 3 tests.
  - `npm run typecheck`
    - Passed.
  - `npm test -- release-smoke prompt-contracts presentation-runtime-workflow project-starter-kits presentation-template-design-system presentation-runtime-policy workflow-progress ai-working-indicator`
    - Passed: 8 files, 26 tests.
  - `npm test`
    - Passed on rerun: 101 files, 555 tests.
    - Note: an earlier full-suite run executed concurrently with `npm run build` and hit the existing timing-sensitive `m3d-benchmarks` threshold (`8.68ms` against `<5ms`). The standalone rerun passed.
  - `npm run build`
    - Passed.
    - Existing Vite warnings remain for chunk size, `crypto` externalization from `isomorphic-git`, and mixed static/dynamic imports.
  - Changed-file ESLint via `npx eslint src/test/release-smoke.test.ts`
    - Passed.
  - `git diff --check`
    - Passed.
- Current twenty-first-slice focused validation:
  - `npm test -- release-smoke`
    - Passed: 1 file, 3 tests.
  - `npm run typecheck`
    - Passed.
  - `npm test -- release-smoke prompt-contracts presentation-runtime-workflow project-starter-kits presentation-template-design-system presentation-runtime-policy workflow-progress ai-working-indicator`
    - Passed: 8 files, 26 tests.
  - `npm test`
    - Passed: 101 files, 555 tests.
  - `npm run build`
    - Passed.
  - Changed-file ESLint
    - Not run for this documentation-only change.
  - `git diff --check`
    - Passed.
- Current twenty-second-slice focused validation:
  - `npm test -- workflow-progress artifact-runtime document-runtime-workflow runtime-telemetry spreadsheet-runtime presentation-template-design-system presentation-quality-checklist`
    - Passed: 7 files, 54 tests.
  - `npm run typecheck`
    - Passed.
  - `npm test`
    - Passed: 104 files, 576 tests.
  - `npm run build`
    - Passed.
    - Existing Vite warnings remain for chunk size, `crypto` externalization from `isomorphic-git`, and mixed static/dynamic imports.
  - Changed-file ESLint via `npx eslint` across modified runtime, handler, template, prompt-pack, and test files
    - Passed.
  - `git diff --check`
    - Passed.

### Current Open State
- The active runtime now has an internal plan object, and queued plus single-slide presentation generation are controlled by the runtime layer.
- `ArtifactRunPlan` now exposes the primary planning decisions directly. The nested `workflow` object remains as compatibility scaffolding for envelope compatibility and older tests.
- Runtime-owned planner types now live in `artifactRuntime/types`; `workflowPlanner/types` remains only as a compatibility re-export.
- Active generation paths no longer import `@/services/workflowPlanner`.
- Legacy external execution-spec files still exist in the repository as quarantined code, but active chat generation no longer imports them.
- Starter presentation generation now creates runtime plans and uses runtime-owned template parsing, token replacement, section assembly, sanitize/validate/finalize behavior, and telemetry.
- Active generated presentation routing now normalizes onto the production template family list. Legacy template files still exist in the registry/build output, but generated and starter routing should no longer select them directly.
- Active presentation prompt composition is now runtime-owned through compact prompt builders that read `ArtifactRunPlan.designManifest`. Create, edit, batch slide, and revision prompts use the core artifact contract, presentation fragment contract, design manifest, selected style family, task brief, and validator feedback only.
- The old presentation `PromptComposer` path has been removed from active code. `src/services/ai/prompts/index.ts` no longer exports presentation composer functions, and active designer, batch, evaluator, and prompt tests no longer import `src/services/ai/prompts/composer.ts`.
- Active presentation prompts no longer require Google Fonts links or `<link>` output. Runtime prompt contract tests now enforce compact prompt size ceilings and guard against old broad prompt sections returning to active generation.
- The current presentation repair stage performs queued per-slide deterministic repair before whole-deck validation, then a deck-level deterministic repair pass, then a bounded LLM repair pass when deterministic repair cannot recover the fragment and a model is available. Presentation runtime telemetry now includes run mode, queued/completed slide counts, repaired slide counts, and deck/slide validation summaries. Repair-started workflow progress events now carry `partId` and `runId`, and successful queued slide repairs emit `runtime.repair-completed` as a slide-specific step update.
- The chat progress UI now materializes runtime-owned presentation, document, and spreadsheet part ids into visible workflow steps, preserving slide/module/action-specific labels instead of hiding them behind only the original seeded workflow steps.
- A deterministic release-smoke test now covers the prompt-cutover baseline for starter presentation initialization, fresh 3-slide queued presentation generation, and queued edit preservation. This is not a replacement for the remaining manual browser/provider smoke gate.
- Manual browser/provider smoke is still required before calling a build deploy-ready, but it is no longer blocking architecture implementation slices because the current direction is to keep moving on runtime milestones without the manual smoke gate.
- Presentation production templates now have a static viewport contract harness covering desktop, desktop wide, tablet portrait, mobile portrait, and mobile landscape. The first deterministic checks cover unsafe wrappers, viewport-unit layout/type usage, oversized fixed dimensions, risky large `min-width`, tiny source type, missing section backgrounds, and dense-grid risk. Browser/canvas screenshot automation is still a later layer.
- Create-mode documents with runtime plans now use queued outline/module generation, runtime shell assembly, module validation/repair, document QA, and runtime telemetry. Image-based create requests also use the queued path by planning from images in the outline step. Targeted edit requests use queued module-local regeneration when existing runtime module wrappers can be resolved, with fallback to the existing targeted patcher when they cannot. Module validation failures now attempt queued per-module repair before deterministic module repair. Runtime telemetry now reports document run mode plus queued, completed, repaired module counts, and deterministic document quality summaries. Document module create/repair prompts and single-stream fallback create/edit prompts now share compact runtime prompt packs and a runtime-owned document design-system vocabulary.
- Runtime benchmark diagnostics can now summarize prompt token estimates, first-preview coverage, validation pass rates, repair totals, queued/repaired part counts, generic quality pass rates, quality issue counts, spreadsheet action kinds, changed sheet counts, and refreshed sheet counts by artifact type.
- Spreadsheets still use deterministic workbook execution, but result summaries now map into shared runtime events and telemetry with first-class workbook action, formula, query, chart, validation, and finalization diagnostics.
- Workflow presets still exist in the advanced UI and storage model. They are hidden from the default user surface but not removed yet.
- Legacy templates are still present as files/registry entries for now; deletion or archival remains a later cleanup step after production routing has soaked. The registry now explicitly tags production vs legacy template groups, and tests guard active routing so legacy ids normalize to production families.

## Key Architecture Changes
- Replace today’s scattered workflow path with a single internal `ArtifactRuntime`.
- Remove the external-facing execution-spec layer for now: API/MCP/automation adapter mappers, dry-run/explain plumbing, and serializable external run contracts should be deleted or quarantined.
- Keep only the internal app runtime primitives needed for UX: run id, steps, events, validation, output summary, and cancellation.
- Introduce a new internal `ArtifactRunPlan` as the only source of truth for artifact type, user intent, selected design family, work queue, provider policy, context budget, and validation gates.
- Replace duplicated intent/template decisions inside presentation/document/spreadsheet workflows with planner-produced run plans.
- Model generated artifacts as first-class parts:
  - presentation: deck, slide, section, design manifest, validation result;
  - document: outline, section, module, shell, validation result;
  - spreadsheet: workbook action, formula, query, chart, validation result.
- Add internal role separation, not user-visible complexity:
  - `Planner` decides what to build.
  - `DesignDirector` selects the visual system.
  - `Generator` creates small artifact parts.
  - `Validator` checks render/readability/contracts.
  - `Repairer` fixes only failing parts.
  - `Finalizer` assembles and writes the artifact.

## Presentation Workflow
- Make presentations the first implementation target.
- Replace one-shot deck generation with:
  - user intent summary;
  - slide outline;
  - `DesignManifest`;
  - queued slide generation;
  - per-slide validation;
  - targeted repair;
  - final deck assembly.
- Route default generation only through production template families. Legacy templates do not need compatibility and can be removed, archived, or converted later.
- Standardize slide output to simple fragments: `<style>` plus `<section>` elements, class-based CSS, scoped-safe selectors, no JavaScript, no external images, no unresolved tokens, and reduced-motion support.
- Store complete slide HTML directly in the artifact. Do not preserve old `themeCss` behavior except where still needed internally during the transition.
- Add deterministic starter decks that use the same runtime as generated decks, not a separate one-off path.
- Add a compact `DesignManifest` generated once per deck with typography, colors, layout recipes, component classes, icon/diagram rules, and motion budget. Later slides reuse this manifest to reduce tokens and improve consistency.

## Documents And Spreadsheets
- After presentation runtime lands, move documents onto the same run engine.
- Documents should generate from outline plus section/module queue, using reusable document design modules instead of broad freeform HTML.
- Extract document shell styling into a compact design-system module and keep generated document HTML simple, iframe-safe, mobile-safe, and print-safe.
- Keep spreadsheets deterministic:
  - the model extracts intent and proposes actions;
  - runtime code executes formulas, queries, charts, validation, and workbook updates.
- Use spreadsheets as the reference standard for low-token, high-reliability execution.

## Prompt And Context Strategy
- Replace the large prompt composer with small prompt packs:
  - core artifact contract;
  - canvas/rendering contract;
  - selected design family;
  - task brief;
  - validator feedback.
- Remove contradictory guidance around inline styles, wrappers, external assets, and output format.
- Use one selected style pack or exemplar per run, not the whole template universe.
- Add provider-aware modes:
  - frontier mode can plan and design richer outputs;
  - local mode uses smaller queued tasks, stricter schemas, fewer animations, and shorter repairs.
- Keep context assembly automatic for normal users. Advanced users may inspect context, but should not need to tune token budgets, source counts, or model behavior manually.
- Track token use, cache hits where available, first-preview time, repair count, and validation pass rate as runtime metrics.

## Simplified UX
- Replace “Project Rules” as a visible technical surface with guided “Project Style” and “Output Preferences”.
- Default controls should be understandable to non-technical users:
  - audience;
  - tone;
  - visual style;
  - quality/speed preference;
  - artifact type;
  - source usage.
- Hide advanced controls behind an Advanced area:
  - provider;
  - model;
  - context limits;
  - raw rules markdown;
  - validation details;
  - workflow diagnostics.
- Remove workflow presets as a user-authored technical system. Replace them with curated built-in modes such as Executive, Editorial, Proposal, Research, Launch, Teaching, and Data Story.
- Keep the generation experience simple: “planning”, “designing”, “creating slides”, “checking quality”, “finishing”.
- Show first usable preview early and update progressively.

## Implementation Order
1. Done: Remove/quarantine external API/MCP/automation seams and dry-run/explain complexity from the active runtime.
2. Done: Define the new `ArtifactRunPlan`, `ArtifactRunEvent`, `ArtifactPart`, `DesignManifest`, and `ValidationGate` types.
3. Done for Presentation Runtime V1 ownership: Rebuild presentation generation around the new run engine while keeping the current UI entry point. `runPresentationWorkflow()` is now a provider/model setup shell, while the runtime owns plan interpretation, design-manifest events, queued/single selection, validation, repair, finalization, and telemetry.
4. Done for active presentation generation: Replace presentation prompt composition with compact prompt packs and design manifests. The old presentation composer has been removed from active create/edit/batch/revision paths.
5. Done for presentation starters: Convert starter kits to use the same presentation runtime and production design families. Starter decks now create runtime plans, runtime parts, deterministic section assembly, and runtime finalization.
6. Partially done: Simplify user-facing project settings into guided style/preferences, with current technical controls moved to Advanced. Curated Output Mode now feeds runtime plan defaults for presentation recipes and document design families.
7. Mostly done: Move document generation onto the same run engine. Create-mode documents now generate outline and modules through runtime-owned queued calls; image create, queued module edit, edit fallback, per-module repair, module validation, workflow-level orchestration tests, document design-system constants, and document quality summaries are covered. Outline/module/repair prompts and the remaining single-stream create/edit prompts now compose compact runtime-owned document packs, and the document workflow shell delegates generation selection, fallback edit delegation, structure/module repair, final QA repair, finalization events, and telemetry assembly into `artifactRuntime`.
8. Started: Keep spreadsheet execution deterministic but emit the same run events and validation summaries. Workbook actions, formulas, query views, charts, validation, and finalization now attach as first-class runtime parts and report deterministic runtime telemetry, action kind, changed/refreshed sheet counts, quality summaries, and fallback validation-by-part diagnostics for blocked/clarification/no-intent results. Fallback spreadsheet results now replace the generic default workbook placeholder with concrete runtime parts before telemetry is built.
9. Started: Delete or convert legacy templates after production routing is stable. Production-vs-legacy metadata, routing guards, bundle-size notes, production replacements, and convert/archive/delete recommendations are recorded; the first safe delete-later legacy templates have been removed while production routing and starter ids remain intact.
10. Started for presentations and expanded to documents/spreadsheets: Runtime benchmark diagnostics exist, production presentation templates pass a deterministic static viewport contract, reusable presentation and document quality checklists report readiness, and spreadsheet diagnostics report deterministic action/validation summaries. Manual/browser canvas automation remains skipped for now by request.

## Completed In Current Runtime Hardening Slice
- Added the shared runtime event-to-progress helper and wired it through presentation, document, and spreadsheet handlers.
- Added generic quality telemetry fields plus document and spreadsheet quality/diagnostic population.
- Extracted document runtime design-system constants and reused them across prompts, shell finalization, repair, and tests.
- Added explicit production-vs-legacy template metadata and routing tests while keeping legacy templates in place.
- Added deterministic document quality, runtime telemetry, spreadsheet diagnostics, workflow progress, and template audit coverage.

## Completed In Current Document Ownership Slice
- Added runtime-owned document orchestration helpers for queued edit/create/single-stream draft selection and structure/module repair coordination.
- Reduced `runDocumentWorkflow()` so the shell still handles provider setup and UI wiring, while `artifactRuntime` decides the active document generation mode and repair sequence.
- Added advanced-only quality diagnostic formatting from runtime quality telemetry without adding noisy validation text to default assistant responses.
- Completed spreadsheet fallback diagnostics for blocked, clarification, and no-intent results when no work queue is attached.
- Bound guided Output Mode values into `ArtifactRunPlan` defaults:
  - Executive -> executive/general polished;
  - Editorial -> editorial;
  - Proposal -> proposal/comparison;
  - Research -> research/finance grid;
  - Launch -> launch/title opening;
  - Teaching -> playbook/stage setting;
  - Data Story -> infographic/metrics.
- Added a legacy presentation template audit helper with bundle-size notes, production replacements, and cleanup recommendations.

## Completed In Current Document Runtime V1 Closure Slice
- Added `runDocumentRuntimeOrchestrator()` as the document runtime lifecycle boundary for queued/single generation selection, fallback edit delegation, structure/module repair, final QA repair, finalization events, and telemetry assembly.
- Reduced `runDocumentWorkflow()` further so it handles provider/model setup, context/project wiring, legacy broad prompt construction, abort signal forwarding, and provider-specific streaming callbacks, while the runtime owns the document lifecycle after setup.
- Added advanced runtime quality diagnostics to `structuredStatus.advancedDiagnostics` for presentation, document, and spreadsheet results; default assistant content and status detail remain non-technical.
- Added spreadsheet fallback runtime part attachment so blocked, clarification, and no-intent results use concrete workbook action, validation, and finalization parts instead of the default placeholder work item.
- Added focused coverage for the document orchestrator, advanced diagnostics staying out of default rendered content, and spreadsheet fallback runtime parts.

## Completed In Current Runtime Ownership Before Cleanup Slice
- Moved queued document outline/module streaming, queued module edit streaming, queued module repair streaming, runtime part HTML lookup, and streamed chunk forwarding into runtime-owned document streaming helpers under `artifactRuntime`.
- Kept `runDocumentWorkflow()` focused on provider/model setup, broad fallback prompt construction, abort signal forwarding, context/project wiring, and runtime helper delegation.
- Rendered `structuredStatus.advancedDiagnostics` inside the existing run-history output buffer path as a collapsed `Advanced diagnostics` section, while assistant chat content remains concise.
- Stabilized spreadsheet runtime events so no-intent, blocked, and clarification flows resolve their action events from attached fallback runtime parts instead of the default spreadsheet placeholder.
- Added no-op legacy cleanup verification for the first delete-later candidates: `minimal`, `comparison`, and `pitch-deck`; no templates were removed in this slice.
- Extended UX guard coverage so default Project Style controls stay non-technical and Rules Markdown, Context Policy, and Advanced Workflow Modes remain behind Advanced.

## Completed In Current Controlled Cleanup And Prompt Consolidation Slice
- Removed the first safe legacy presentation template ids/files: `minimal`, legacy template `comparison`, and legacy template `pitch-deck`.
- Preserved the `pitch-deck` starter id and launch starter routing; prompts that previously selected removed legacy styles now route to production families.
- Added runtime-owned compact document prompt builders and switched queued create/edit/module repair streaming onto compact runtime prompts instead of the broad document prompt composer.
- Kept the broad document prompt composer only for the single-stream fallback path in this slice.
- Tightened spreadsheet runtime ownership so planned deterministic actions use concrete runtime parts before event/telemetry emission, with fallback part attachment reserved for no-plan results.
- Extended active-generation import-boundary coverage across runtime builders and chat handlers to keep `services/adapters/*` and `services/executionSpec/*` out of active generation paths.

## Completed In Current Document Prompt Surface Cleanup Slice
- Added compact runtime-owned single-stream document prompt builders for create/edit fallback paths.
- Replaced the old local `DocumentPromptComposer`, document system prompt constants, template style-pack injection, and broad example/style-pack prompt surface in `runDocumentWorkflow()`.
- Kept single-stream behavior intact: fallback edits still receive existing-document summaries, target scopes, runtime part queues, project links, memory context, requested titles, and image parts when provided.
- Extended prompt contract coverage for compact single-stream document prompts and import-boundary coverage proving the active document workflow no longer owns the old broad composer surface.

Legacy template decision table:

| Legacy template | Production replacement | Bundle note | Decision |
| --- | --- | --- | --- |
| `keynote` | `launch-narrative-light` | 35.05 kB before gzip | convert later |
| `corporate` | `executive-briefing-light` | 47.40 kB before gzip | convert later |
| `tech-architecture` | `stage-setting-light` | not singled out | archive later |
| `data-dashboard` | `finance-grid-light` | not singled out | archive later |
| `sci-fi` | `split-world` | not singled out | archive later |
| `creative-portfolio` | `launch-narrative-light` | not singled out | archive later |
| `storytelling` | `editorial-light` | not singled out | archive later |
| `educational` | `stage-setting-light` | 40.96 kB before gzip | convert later |
| `cinematic` | `launch-narrative-light` | not singled out | archive later |
| `workshop` | `stage-setting-light` | not singled out | archive later |
| `code-walkthrough` | `editorial-light` | not singled out | archive later |
| `product-demo` | `launch-narrative-light` | 30.16 kB before gzip | convert later |
| `timeline` | `stage-setting-light` | not singled out | archive later |
| `editorial-magazine` | `editorial-light` | not singled out | archive later |
| `infographic-grid` | `finance-grid-light` | 34.69 kB before gzip | convert later |
| `landscape-illustration` | `editorial-light` | 37.44 kB before gzip | convert later |
| `multi-panel-dashboard` | `finance-grid-light` | 46.43 kB before gzip | convert later |
| `sidebar-cards` | `executive-briefing-light` | 47.59 kB before gzip | convert later |

Removed legacy templates:
- `minimal` -> `executive-briefing-light`;
- template `pitch-deck` -> `launch-narrative-light` (starter id preserved);
- template `comparison` -> `split-world`.

## Validation Completed
- Current controlled-cleanup-and-prompt-consolidation slice:
  - `npm test -- presentation-template-design-system project-starter-kits prompt-contracts document-runtime-workflow artifact-runtime spreadsheet-runtime ux-simplification presentation-runtime-policy`
  - `npm run typecheck`
  - `npm test`
  - `npm run build`
  - Changed-file ESLint across modified template, runtime, workflow, handler, and test files.
  - `git diff --check`
- Current document-prompt-surface-cleanup slice:
  - `npm test -- prompt-contracts document-runtime-workflow artifact-runtime`
    - Passed: 3 files, 32 tests.
  - `npm run typecheck`
    - Passed.
  - `npm test`
    - Passed: 105 files, 589 tests.
  - `npm run build`
    - Passed.
    - Existing Vite warnings remain for DuckDB/export dynamic imports, `crypto` externalization from `isomorphic-git`, and large vendor/document runtime chunks.
  - Changed-file ESLint via `npx eslint src/services/ai/workflow/document.ts src/services/artifactRuntime/documentPrompts.ts src/services/artifactRuntime/index.ts src/test/document-runtime-workflow.test.ts src/test/prompt-contracts.test.ts`
    - Passed.
  - `git diff --check`
    - Passed.
- Current runtime-ownership-before-cleanup slice:
  - `npm test -- document-runtime-workflow artifact-runtime runtime-telemetry spreadsheet-runtime workflow-progress ux-simplification presentation-template-design-system run-result run-history-panel`
  - `npm run typecheck`
  - `npm test`
  - `npm run build`
  - Changed-file ESLint across modified runtime, workflow, run-history, and test files.
- `npm test -- document-runtime-workflow artifact-runtime runtime-telemetry spreadsheet-runtime workflow-progress ux-simplification presentation-template-design-system run-result`
- `npm test -- document-runtime-workflow artifact-runtime runtime-telemetry spreadsheet-runtime presentation-template-design-system ux-simplification`
- `npm test -- presentation-runtime-workflow presentation-runtime-policy presentation-template-design-system presentation-quality-checklist release-smoke artifact-runtime document-runtime-workflow runtime-telemetry spreadsheet-runtime prompt-to-formula prompt-to-query ux-simplification`
- `npm run typecheck`
- `npm test`
- `npm run build`
- Changed-file ESLint passed across modified runtime, workflow, template, chat request, and test files.
- `git diff --check`

Build notes:
- Vite still reports existing non-blocking chunk/dynamic-import warnings for DuckDB/export/data bundles.
- The legacy `minimal`, template `comparison`, and template `pitch-deck` chunks are no longer emitted in the latest build snapshot.
- Manual browser/provider smoke remains intentionally skipped for this slice per request, so this is architecture-progress validation rather than a deploy-ready visual signoff.

## Next Steps

### Step 1: Make `ArtifactRunPlan` The Planner Output
- Move planner ownership into `src/services/artifactRuntime`.
- Stop treating `ArtifactWorkflowPlan` as the primary plan shape.
- Keep a temporary compatibility adapter only where older handlers still expect `workflowPlan`.
- Add tests that prove every prompt creates exactly one authoritative runtime plan.
- Add tests for provider policy selection:
  - frontier mode;
  - local/Ollama constrained mode;
  - queued part granularity;
  - repair/evaluation budget.

### Step 2: Build Presentation Runtime V1
- Continue the presentation runtime orchestrator so it owns:
  - intent summary;
  - outline;
  - design manifest;
  - queued slide parts;
  - per-slide validation;
  - targeted repair;
  - final assembly.
- Keep the current UI entry point, but move single-slide create/edit orchestration out of `src/services/ai/workflow/presentation.ts` over time.
- Emit runtime part events for:
  - planning;
  - designing;
  - creating slide N;
  - validating slide N;
  - repairing slide N;
  - finalizing.
- Store runtime metrics:
  - time to first preview;
  - total generation time;
  - estimated input/output tokens;
  - validation pass rate;
  - repair count.

### Step 3: Convert Starter Kits To Runtime
- Continue replacing the separate starter presentation path with deterministic runtime plans.
- Move starter deck final assembly behind a runtime finalizer while preserving deterministic template rendering.
- Preserve the starter rendering reset invariants:
  - `contentHtml` contains complete scoped slide HTML;
  - `themeCss` is always `''`;
  - no unresolved tokens;
  - no empty hero shells;
  - slide count equals actual section count.
- Add starter tests proving:
  - starter decks contain multiple sections;
  - starter deck parts are created from `ArtifactRunPlan`;
  - executive starter uses the executive production design family;
  - pitch/launch starter uses the launch production design family.

### Step 4: Harden Presentation Template Routing
- Route default generation only through production template families.
- Decide whether each legacy template should be:
  - converted to production format;
  - archived out of active routing;
  - deleted after routing is stable.
- Add production-template tests:
  - no `<html>` / `<body>` wrappers;
  - no JavaScript;
  - no external images;
  - no unresolved tokens;
  - readable source font sizes;
  - reduced-motion support;
  - canvas-safe sizing.

### Step 5: Document Runtime V1
- Introduce document runtime parts:
  - outline;
  - section;
  - module;
  - shell;
  - validation result.
- Extract document shell and module styling into a compact design-system module.
- Replace broad freeform document prompts with module-oriented prompt packs.
- Add iframe/mobile/print validation gates.

### Step 6: Spreadsheet Runtime Events
- Keep spreadsheet execution deterministic.
- Map existing spreadsheet plans/actions into runtime parts:
  - workbook action;
  - formula;
  - query;
  - chart;
  - validation result.
- Emit the same runtime events and validation summaries as presentations/documents.
- Use spreadsheet execution as the low-token reliability benchmark for the rest of the runtime.

### Step 7: Finish UX Simplification
- Replace user-authored workflow presets with curated built-in modes:
  - Executive;
  - Editorial;
  - Proposal;
  - Research;
  - Launch;
  - Teaching;
  - Data Story.
- Keep advanced diagnostics available, but remove technical model/context tuning from the default path.
- Add UX tests for:
  - guided defaults;
  - advanced-only technical controls;
  - simple generation step labels;
  - no visible dry-run/explain/external-spec controls.

### Step 8: Delete Quarantined External Runtime Code
- After presentation runtime and starter kits are stable, remove or archive:
  - API/MCP/automation adapter mappers;
  - serializable external run spec builders;
  - hydrate/serialize helpers;
  - non-mutating explain/dry-run implementation.
- Add a regression test that active generation cannot import these paths.

### Step 9: Add Quality And Benchmark Harnesses
- Add benchmark checks for:
  - first preview time;
  - total generation time;
  - token estimate;
  - validation pass rate;
  - repair count.
- Add viewport validation for:
  - desktop;
  - desktop wide;
  - tablet portrait;
  - mobile portrait;
  - mobile landscape.
- Start with presentations, then extend to documents and spreadsheets.

## Immediate Next Implementation Slice
- Continue spreadsheet runtime consolidation:
  - move spreadsheet planning/part attachment closer to `artifactRuntime` while keeping workbook execution deterministic;
  - keep blocked, clarification, and no-intent paths deterministic and model-free.
- Continue controlled legacy-template cleanup:
  - choose the next archive-later candidate group only after checking active imports and build output;
  - prefer archive/removal of non-starter legacy templates before touching convert-later templates that may need production-format migrations.
- Continue UX simplification:
  - audit default ChatBar and Project Style controls for any remaining technical wording;
  - keep provider/model/context/raw-rule controls Advanced-only while preserving expert access.
- Prepare quarantined external adapter cleanup:
  - audit API/MCP/automation adapter and execution-spec imports;
  - plan the first deletion patch only after active generation import-boundary tests are already green.

## Test Plan
- Add planner tests proving each user prompt produces exactly one authoritative `ArtifactRunPlan`.
- Add presentation runtime tests for outline, manifest, queued slides, validation, repair, and final assembly.
- Add prompt contract tests ensuring generated slide prompts require the new fragment format and do not reintroduce old contradictions.
- Add template tests for all routed production templates: no wrappers, no JavaScript, no external images, no unresolved tokens, readable font sizes, reduced motion, and canvas-safe sizing.
- Add starter-kit tests proving starter decks use the runtime, contain multiple sections, have correct slide counts, and do not write duplicated CSS.
- Add UX tests for guided settings defaults and Advanced-only technical controls.
- Add regression tests proving removed external adapter paths are no longer part of active generation.
- Add benchmark checks for time to first preview, total generation time, token estimate, validation pass rate, and repair count.

## Assumptions
- “Remove API” means remove external API/MCP/automation adapter seams, not provider API access for AI generation.
- Existing Aura projects, old exports, and old template compatibility can be broken or reset.
- The app remains client-side for now.
- No new runtime dependency is required in the first rebuild pass.
- The default product experience should optimize for non-technical users; expert controls remain available only behind Advanced.
