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

Last updated: 2026-04-25.

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

### Validation Completed
- `npm test -- artifact-runtime workflow-planner run-request run-dry-run run-explain structured-run-outputs external-adapter-contracts run-events workflow-benchmark-cases`
  - Passed: 9 files, 23 tests.
- `npm test`
  - Passed: 93 files, 507 tests.
- `npm run typecheck`
  - Passed.
- `npm run build`
  - Passed.
  - Existing Vite warnings remain for chunk size, `crypto` externalization from `isomorphic-git`, and mixed static/dynamic imports.
- Changed-file ESLint
  - Passed.

### Current Open State
- The active runtime now has an internal plan object, but presentation generation still delegates most actual generation to the existing presentation workflow.
- `ArtifactRunPlan` currently wraps the existing `ArtifactWorkflowPlan`; the next slice should make the runtime plan the primary planner output rather than an adapter around the older plan.
- Legacy external execution-spec files still exist in the repository as quarantined code, but active chat generation no longer imports them.
- Starter-kit generation still needs to be moved onto the runtime path.
- Documents and spreadsheets still use their current handlers, though they now receive run requests that include `artifactRunPlan`.
- Workflow presets still exist in the advanced UI and storage model. They are hidden from the default user surface but not removed yet.
- Production templates are still mixed with legacy templates; routing has not yet been fully reduced to production families only.

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
3. In progress: Rebuild presentation generation around the new run engine while keeping the current UI entry point.
4. In progress: Replace presentation prompt composition with compact prompt packs and design manifests.
5. Next: Convert starter kits to use the same presentation runtime and production design families.
6. Partially done: Simplify user-facing project settings into guided style/preferences, with current technical controls moved to Advanced.
7. Next: Move document generation onto the same run engine.
8. Next: Keep spreadsheet execution deterministic but emit the same run events and validation summaries.
9. Later: Delete or convert legacy templates after production routing is stable.
10. Later: Add benchmark and viewport validation harnesses for presentations first, then documents and spreadsheets.

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
- Add a presentation runtime orchestrator that owns:
  - intent summary;
  - outline;
  - design manifest;
  - queued slide parts;
  - per-slide validation;
  - targeted repair;
  - final assembly.
- Keep the current UI entry point, but move orchestration out of `src/services/ai/workflow/presentation.ts` over time.
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
- Replace the separate starter presentation path with deterministic runtime plans.
- Generate starter decks through the same presentation runtime parts used by normal generation.
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
- Build `src/services/artifactRuntime/presentationRuntime.ts`.
- Move queued slide generation control from `src/services/ai/workflow/presentation.ts` into the runtime layer.
- Add per-slide runtime validation and repair stubs, even if the first implementation calls existing validators underneath.
- Convert starter presentation generation to create `ArtifactRunPlan` instances and use the new runtime.
- Add starter-runtime tests before changing document or spreadsheet workflows.

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
