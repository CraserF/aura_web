# Value-Focused Product Realignment Plan

Date: 2026-04-29

Status: Planning document

Scope: Product direction, codebase cleanup, documentation refresh, starter kit variants, interface simplification, project-scoped version control, presentation and document workflow recovery, and design-system tooling.

Primary constraint for this document: This is a planning artifact only. It does not implement the changes. The intended follow-up work should be completed in focused implementation slices.

## Plan Tracker

This tracker is the first place to update when work begins, moves, blocks, or completes. Keep it current so a developer, reviewer, or product collaborator can understand progress without rereading the full plan.

### Status Legend

- `Not started`: No implementation work has begun.
- `Scoping`: The slice is being broken into concrete tasks, file ownership, and acceptance checks.
- `In progress`: Code or documentation changes are actively underway.
- `Blocked`: Work cannot continue without a decision, dependency, or investigation.
- `Review`: Implementation is ready for code review, product review, or design review.
- `Done`: Acceptance criteria are met, tests or checks have run, and documentation is updated.
- `Deferred`: The workstream remains valid but is intentionally moved out of the current release slice.

### Workstream Tracker

| ID | Workstream | Current Status | Next Milestone | Evidence To Attach | Last Updated |
| --- | --- | --- | --- | --- | --- |
| W0 | Documentation and README refresh | Done | Continue W1 cleanup of runtime API/MCP vocabulary | Active API/MCP roadmap docs deleted; README current-state claims corrected; program status aligned; review shortcomings resolved | 2026-04-29 |
| W1 | Remove API, MCP, and external automation surfaces | Done | Continue W2 starter variant implementation | `ExecutionMode` and execution mode fields removed from active contracts; targeted-edit telemetry renamed from dry-run wording to preflight terminology; targeted tests, typecheck, and build pass | 2026-04-29 |
| W2 | Starter kit visual variants | Done | Continue W3 UI simplification | 5 variants (executive, launch, editorial, research, teaching) in `visualVariants.ts`; blank, starter-kit, and quick-start project creation carry selected visual direction; variant traits prepend project rules markdown; `visualVariantId`/`colorTheme` persist through project state, `.aura` archives, and version snapshots; focused tests, typecheck, and build pass | 2026-04-29 |
| W3 | UI simplification | Done | Continue W4 explicit chat/run progress | Toolbar: Open+Save merged into File dropdown, Validate+Version History moved to More (…) dropdown, Present button renders only for presentation artifacts; ProjectInitReport auto-modal replaced with dismissible success banner + "View details" link; ChatBar: Document style, output mode/preset, and Runs hidden behind a SlidersHorizontal toggle button; Project Style and Doctor moved behind the sidebar advanced menu; hotkey hint text removed; targeted UX tests, typecheck, and build pass | 2026-04-29 |
| W4 | Explicit chat and run progress | Done | Continue W5 project-scoped version control | `GenerationStatus` now carries `currentStep`/`totalSteps` plus item counts; `workflowProgress.ts` centralizes step position, slide/section parsing, and compact status text; presentation and document handlers preserve run start time, show slide/section counts from events and run plans, and expose bounded retry attempts; ChatBar and AIWorkingIndicator show `Step X of Y`, `Slide/Section X of Y`, and "last update Xs ago" stall detail; targeted progress/UI tests, typecheck, and build pass | 2026-04-30 |
| W5 | Project-scoped version control | Done | Continue W6 new .aura format and optional history export | `projectSnapshot.ts` canonical serializer now covers project metadata, sections, media, memory, and documents with path-safe document filenames; `versionHistory.ts` uses path-safe `/projects/{projectId}` repo paths, isolated histories, deleted-document cleanup, and no-op prevention via `git.statusMatrix`; `VersionHistoryPanel` scopes list/read/restore to `project.id`; imported current-format `.aura` files without history receive a fresh local project id; project/manual artifact edits create project-scoped commits; legacy v1 `.aura` format is rejected with a clear error; focused version-history/import tests, typecheck, and build pass | 2026-04-30 |
| W6 | New `.aura` format and optional history export | Done | Continue W7 presentation quality recovery | `.aura` writer is shared by normal and history exports; `ProjectManifest.hasHistory` is only set when git files are packed; `exportProjectGit`/`importProjectGit` read/write raw `.git` objects from the virtual FS; imports reject unsafe or empty history payloads, replace any existing repo for that project id before restoring, and preserve the original project id only when history is valid; imports without history assign a new UUID as before; unsupported manifest versions and unsafe document archive paths are rejected; "Save with history" commits the current project snapshot before export; focused storage/import tests, typecheck, and build pass | 2026-04-30 |
| W7 | Presentation quality recovery | Done | Continue W8 document scaffolding and W9 benchmark/render validation | 16 typed `SlideLayoutDefinition` records in `layouts.ts` (cover → closing) with targetable slot contracts, `data-layout` guidance, text budgets, min font sizes, quality rules, and typed motion/SVG motif lists; 5 `MotionPreset` records and 7 `SvgMotifFamily` records are wired into compact slot-contract prompts with preset IDs, budgets, keyframe limits, motif IDs, SVG viewBox/slot guidance, and reduced-motion requirements; `selectLayout()` fuzzy keyword matcher feeds `buildSlideBlueprintPack()` in `presentationPrompts.ts` and now covers runtime role phrases such as stage-setting, problem, mechanism, comparison, and recommendation; QA flags custom keyframes outside approved motion presets; new registry/prompt tests plus existing prompt/validation tests, scoped lint, typecheck, and build pass | 2026-04-30 |
| W8 | Document scaffolding | Done | Continue W9 validation and release process | 13 typed `DocumentSectionModuleDefinition` records in `documentSectionModules.ts` (cover to pull-quote) with named slots, text budgets, heading level behavior, table/list rules, density level, visual treatment (mapped to existing `doc-*` CSS classes), page-break preference, and accessibility expectations; `selectDocumentModule()` now handles fuzzy keywords, runtime role hints, and blueprint module aliases such as `doc-kpi-grid`, `doc-callout`, `doc-pullquote`, and `doc-progress`; `buildDocumentSectionModulePrompt()` serializer is injected into `buildDocumentRuntimeModulePrompt` and `buildDocumentRuntimeModuleRepairPrompt` in `documentRuntime.ts`; heading-aware module contracts, validation, normalization, and deterministic repair respect cover and pull-quote heading behavior; new module barrel-exported from `templates/index.ts`; 29 section-module tests and 57 focused runtime tests pass; typecheck and build pass | 2026-04-30 |
| W9 | Validation and release process | Not started | Define benchmark set and prototype agent-in-the-app QA with local model where feasible | Test matrix, benchmark results, local QA notes | 2026-04-29 |

### Milestone Tracker

| Milestone | Target Outcome | Required Workstreams | Status | Exit Criteria |
| --- | --- | --- | --- | --- |
| M1: Direction cleanup | Product docs and UI language stop pointing toward API/MCP | W0, W1 | Done | Old API/MCP docs deleted, README rewritten, ExecutionMode removed, provider API distinction clear; W0 and W1 both Done |
| M2: Better starts | Users can start with a strong visual variant and editable default color theme | W2, W3 | Done | 5 variants available, color theme persist path exists, project rules hidden behind advanced; W2 and W3 both Done |
| M3: Visible work | Long-running creation and editing flows explain their steps | W4 | Done | Chat shows step count, slide/section count, stall indicator, and retry attempts; W4 Done |
| M4: Project ownership | Each project owns its version history and export behavior | W5, W6 | Done | W5: histories isolated per project-scoped git repos; W6: "Save with history" packs raw git objects after committing the current snapshot, import restores valid history with the original project id, existing repos are replaced rather than mixed, malformed history/document paths are rejected; both W5 and W6 Done |
| M5: Presentation recovery | Decks regain strong visual quality with scaffolded animation and SVG art | W7, W9 | In progress | W7 scaffold layer Done: layout slots, bounded motion presets, SVG motif guidance, prompt injection, and custom-keyframe QA are in place; W9 still needs benchmark deck runs, render checks, and product review evidence |
| M6: Document recovery | Documents use independent scaffolds and slot-based editing | W8, W9 | Not started | Document examples are polished, edits target sections/slots, validation passes |

### Tracking Instructions

1. Update this tracker at the start and end of every implementation slice.
2. Change status only when there is evidence. Do not mark work `Done` because code was written; mark it `Done` only when acceptance criteria, checks, and documentation are complete.
3. Add evidence in the tracker row before asking for review. Evidence can be a PR, commit, screenshot, benchmark output, test name, or short note pointing to a file.
4. Keep workstreams separate unless a slice intentionally spans them. If a PR touches multiple workstreams, update every affected tracker row.
5. When work is blocked, set status to `Blocked` and write the exact blocking decision or dependency in the evidence column.
6. When scope changes, update this tracker and the relevant workstream section in the same change.
7. When a milestone completes, confirm all required workstreams are `Done` or explicitly `Deferred`.
8. Keep dates current. If no one has touched a row in more than a week during active implementation, review whether it is stale.
9. Do not use the tracker as a substitute for tests, benchmarks, screenshots, or product review. The tracker points to evidence; it is not the evidence itself.
10. Preserve the review decisions in this document unless product direction changes explicitly.

### Developer Patterns To Observe

These patterns should guide every implementation slice. They are intentionally explicit so future contributors can use this plan as an operating guide, not just a roadmap.

- Work in small, reviewable slices. Avoid broad rewrites that mix docs, storage, UI, prompt changes, and runtime behavior without a clear reason.
- Read the existing local pattern before changing a subsystem. Prefer current services, types, stores, and component conventions over new abstractions.
- Preserve provider API access. Removing API/MCP means removing external Aura API, MCP, and automation product surfaces, not removing model provider settings or BYOK flows.
- Delete old API/MCP docs from active documentation. Do not leave stale roadmap material that makes those features look planned.
- Treat project rules as internal defaults. Do not expand the visible rules UI; prefer natural-language changes and good defaults.
- Build structured metadata instead of prose-only control. Variants, themes, layouts, slots, motion presets, SVG motifs, and versioning behavior should be typed where practical.
- Scaffold first, then ask the AI to populate. Presentation and document generation should start from known layouts, section modules, slots, and design tokens.
- Keep document and presentation systems independent. They can share product concepts, but each artifact type should optimize for its own quality requirements.
- Use restrictive defaults with controlled escape hatches. Customization should be possible, but the normal path should protect design quality.
- Make progress observable. Any long-running creation or edit flow should emit step count, item count, queue state, repair attempt, and current action.
- Bound repair loops. Every repair path needs a maximum attempt count, visible progress, and a fallback behavior.
- Keep version history project-scoped. Never write new work into a shared global repo path.
- Commit persistent project changes, not every chat response. Artifact-changing AI responses and manual user edits should create history entries; pure conversation should not.
- Rebuild the `.aura` format cleanly. Do not preserve legacy compatibility unless product direction changes.
- Make history export optional. Default export should stay lean; "Export with history" should be explicit.
- Validate visual quality, not just code shape. Use render checks, screenshots, benchmark prompts, and product review for presentation and document work.
- Scaffold CSS animations and SVG art. Use approved motion presets, SVG motif families, reduced-motion fallbacks, bounds checks, and motion budgets.
- Keep the UI simple by default. Move diagnostics, run history, validation details, and advanced settings behind contextual or advanced surfaces.
- Protect existing user work. Avoid destructive migrations, broad state resets, or history cleanup without a clear backup or fallback path.
- Update documentation alongside behavior changes. If an implementation changes the product promise, update README, roadmap, architecture notes, and this tracker in the same slice.

### Resolved W0 Review Shortcomings

Review date: 2026-04-29

Scope reviewed: Documentation pass touching `README.md`, `docs/program-status.md`, `docs/roadmap/api-platform-plan.md`, `docs/roadmap/mcp-integration-plan.md`, and `docs/phases/phase-10-api-mcp-and-automation-alignment.md`.

Resolution stance: These findings were blocking during review and were resolved in the W0 cleanup. Keep this section as an audit trail for why the README and active docs were corrected.

#### CR-1: API/MCP docs are archived instead of deleted from active documentation - resolved

Severity: High

Affected files:

- `docs/roadmap/api-platform-plan.md`
- `docs/roadmap/mcp-integration-plan.md`
- `docs/program-status.md`

Problem:

The plan direction says old API/MCP docs should be deleted from active documentation, not archived as active roadmap material. The current documentation pass keeps both roadmap files in `docs/roadmap/` with archive banners, while the original goals and implementation plans remain immediately below the banner. `docs/program-status.md` also describes W0 as complete and says API/MCP roadmap docs were archived.

Why it matters:

- Readers can still discover API/MCP plans inside the active roadmap folder.
- Search results and cross-links still make API/MCP look like live roadmap material.
- This contradicts the product decision to remove API/MCP from the active direction.

Required correction:

- Delete the old API and MCP roadmap docs from active documentation.
- Remove or rewrite links that point to them.
- If a historical note is needed, keep it minimal and outside active roadmap positioning.
- Do not call W0 complete until the deletion requirement is satisfied.

Resolution applied:

- `docs/roadmap/api-platform-plan.md` and `docs/roadmap/mcp-integration-plan.md` were deleted from active documentation.
- `docs/program-status.md` now describes W0 as complete only after the deletion and README corrections.

#### CR-2: Program status marks W0 complete before evidence supports completion - resolved

Severity: High

Affected file:

- `docs/program-status.md`

Problem:

The current status text marks "Workstream 0 (complete)" even though the active plan tracker still requires deleting API/MCP docs, aligning the README with the plan, and attaching evidence. The implementation has not met the W0 exit criteria yet.

Why it matters:

- It creates false project status.
- Future contributors may skip required cleanup because the status page says it is done.
- It undermines the tracker as the source of truth.

Required correction:

- Change W0 to `Review`, `In progress`, or another non-complete state until all review findings are resolved.
- Reference the plan tracker as the source of truth.
- Attach evidence only after docs are actually deleted or intentionally replaced.

Resolution applied:

- W0 is marked `Done` in the tracker with explicit evidence after the blocking review findings were resolved.
- Program status now names the completed cleanup and points back to this plan.

#### CR-3: README `.aura` file structure does not match the current exporter - resolved

Severity: High

Affected file:

- `README.md`

Problem:

The original README diff documented a `.aura` structure that did not match the current exporter. The current exporter in `src/services/storage/projectFormat.ts` writes `project-rules.md`, `context-policy.json`, `workflow-presets.json`, a `documents/` folder for presentations/documents/spreadsheets, and spreadsheet Parquet files under `documents/`.

Why it matters:

- Users inspecting `.aura` files will not find the documented paths.
- Developers may build against the wrong package layout.
- This is especially risky because the plan also calls for rebuilding `.aura` from scratch.

Required correction:

- Either document the current exporter accurately as a temporary current-state note, or remove detailed path promises until the new `.aura` format is designed.
- Avoid implying the current shape is the desired long-term format.

Resolution applied:

- README now documents the current exporter shape using `project-rules.md`, `context-policy.json`, `workflow-presets.json`, `media/`, `memory/`, and `documents/`.
- README now says this structure is current-state documentation, not a long-term compatibility contract.

#### CR-4: README promises `.aura` backwards compatibility despite the reset decision - resolved

Severity: Medium

Affected file:

- `README.md`

Problem:

The original README diff turned current v1 upgrade behavior into a future-facing product promise. That behavior exists in the current implementation, but it conflicts with the reviewed product decision that the `.aura` format should be rebuilt from scratch without backwards-compatibility requirements.

Why it matters:

- It turns current compatibility behavior into a product promise just before the format is supposed to be reset.
- It makes future removal of compatibility look like a regression.

Required correction:

- Rephrase as a current implementation note only, or remove compatibility language from README.
- Add a limitation or roadmap note that the `.aura` format is planned for a clean redesign.

Resolution applied:

- README no longer promises v1 upgrade compatibility.
- README limitations now state that the `.aura` format is planned for a clean redesign and backwards compatibility is not a future requirement.

#### CR-5: README overstates version history behavior - resolved

Severity: Medium

Affected file:

- `README.md`

Problem:

The original README diff overstated version history coverage. The plan direction is more precise: commit persistent artifact-changing assistant responses and manual user changes, not every assistant response. The README also omitted manual changes, which are part of the desired history model, and the current limitations already admitted project history is not isolated yet.

Why it matters:

- Users may expect complete history coverage today.
- Developers may optimize for committing every AI response rather than committing meaningful project state changes.
- Manual edits could be treated as second-class even though they should be versioned.

Required correction:

- Describe version history as current local versioning support, with project isolation and manual-change coverage planned.
- Avoid over-broad version-history promises unless tests prove the exact behavior.

Resolution applied:

- README now describes local version history as project changes that can be committed through `isomorphic-git`.
- README limitations now call out project isolation and consistent artifact/manual-change coverage as refinement work.

#### CR-6: README may overpromise artifact capabilities before validation evidence exists - resolved

Severity: Medium

Affected file:

- `README.md`

Problem:

The README now advertises rich animations, SVG illustrations, spreadsheet query-derived sheets, computed columns, chart embedding, instant previews, and high-quality documents as broad capabilities. Some of these are active implementation areas or known validation gaps in the plan.

Why it matters:

- The README can create expectations ahead of current validation.
- It blurs the line between current product behavior and the intended realignment.

Required correction:

- Keep README claims to capabilities that are validated today.
- Move planned improvements to "Current limitations" or roadmap language.
- For presentation animation and SVG art, say the product supports HTML/CSS/SVG-based decks today but that scaffolded motion/SVG systems are planned.

Resolution applied:

- README now describes presentations, documents, spreadsheets, and previews more conservatively.
- The stronger scaffolded motion/SVG work remains in this plan rather than being advertised as fully shipped behavior.

## Executive Summary

Aura should become more value focused, simpler to understand, and more reliable at producing polished artifacts. The current product has several strong foundations: project files, multi-artifact state, presentation and document runtimes, project rules, starter kits, model provider settings, and a version history service. The next phase should concentrate those foundations into fewer, clearer workflows.

The most important strategic shift is to stop spreading attention across API platform, MCP, and external automation concepts that are not currently creating visible user value. Those surfaces should be removed from product documentation, roadmap language, and any remaining internal extension points. This does not mean removing model provider access or BYOK provider settings. In this plan, "remove API and MCP" means removing external Aura API productization, MCP integration, dry-run or explain execution modes where they only exist to support external automation, and any documentation that makes these feel like core value propositions.

The product should instead emphasize:

- Fast creation of beautiful presentations, documents, spreadsheets, and project artifacts.
- Starter kits that feel visually distinct and useful, not merely different bundles of files.
- A minimal interface that exposes the main path and keeps advanced diagnostics out of the way.
- Transparent chat progress that tells the user what is happening and how many steps remain.
- Project-specific version control so each project has its own history.
- A rebuilt `.aura` project format that works cleanly from first principles, with optional history export.
- Presentation and document scaffolds that guide the agent, instead of asking the model to invent layout and design from scratch every time.
- Presentation scaffolds that preserve the stronger CSS animation and SVG art direction Aura had before, but with strict motion budgets and reusable art systems so output stays polished.

The highest leverage change is the design-system approach for documents and presentations. Aura should provide prebuilt themes, templates, slide layouts, document section layouts, content slots, text-fitting rules, and validation tools. The AI should usually populate and lightly customize these structures, rather than fully authoring HTML/CSS in an unconstrained way. This will make artifacts more consistent, faster to generate, easier to edit, and less likely to regress into boring slides, tiny fonts, broken layout, or endless repair loops.

This plan is organized into workstreams that can be implemented incrementally:

- Documentation and README refresh.
- Removal of API, MCP, and external automation surfaces.
- Visual variants for starter kits.
- User interface simplification.
- Explicit chat and run progress.
- Project-scoped version control and `.aura` history export.
- Presentation workflow recovery and quality benchmarking.
- Document and presentation scaffold tooling.
- Validation, QA, and release sequencing.

## Investigation Inputs

This plan is based on a codebase investigation performed on 2026-04-29.

Current repository context observed during planning:

- Working branch: `codex/dev`.
- Current HEAD observed during planning: `5665e43`, message `fix: Build breaking test error`.
- Current `origin/main` observed during planning: `33dbe0a9ed15829f4d4e0e1c3323f17de1d316fb`.
- Closest local `main` snapshot around 2026-04-22: `bcd245420a4881001aa1ef622bb35187916039ce`.
- Important presentation workflow fix from that period: `1831605ac4029af0482de85051be9a94549e6ef9`.
- Important orchestration simplification commit from that period: `8b756c85bea96d08eac9b3c5f18934ae01eb6249`.

Several focused codebase investigations were run in parallel:

- API, MCP, external automation, and documentation inventory.
- Starter kit and visual variant investigation.
- Version control, project storage, and `.aura` export investigation.
- Presentation and document workflow investigation, including comparison against main branch behavior from roughly one week earlier.

The investigation found that many of the desired changes are directionally aligned with the codebase already. Several API/MCP implementation directories are already empty or inactive, and some tests already assert that removed external adapters do not return. The next phase is therefore less about tearing out a large active platform and more about finishing the product cleanup, documentation cleanup, type cleanup, UI cleanup, and user-facing repositioning.

## Review Decisions

These decisions were made after review of the initial plan and should be treated as product constraints for the implementation phases:

- The `.aura` format does not need backwards compatibility. Rebuild it from scratch so it works properly for current and future projects.
- Exporting with version history should be an explicit option, not the default export path.
- Import identity can go either way, but import behavior should be decided by whether the user imports with history. If history is imported, preserving the original project identity is more likely to be correct. If no history is imported, creating a new project identity is likely safer.
- The first visual variant release should include only 4 or 5 high-quality, extensive variants. The architecture should support growing to around 10 variants later.
- A default color theme should be chosen automatically. The user can accept it, edit it before artifact creation, and edit it later.
- Presentation themes and document themes should be independent. They can share product vocabulary, but they should not be forced into a shared theme implementation.
- Slot schemas should be flexible enough to allow customization, but the default should be more restrictive and organized than today's loose freeform design path.
- Old API/MCP docs should be deleted from active documentation, not archived as active roadmap material.
- Project rules should be almost completely hidden. Defaults should be good enough, and most changes should happen through natural-language user input rather than a visible rules editor.
- Version history should prefer artifact-changing responses and user manual changes. It should not commit every assistant response if no project artifact changed.
- CSS animations and SVG art should be part of the presentation quality plan. They should be scaffolded and bounded so the product gets expressive slides without chaotic motion or excessive decoration.

## Product Direction

### Product Promise

Aura should feel like a focused artifact creation workspace:

- The user chooses what they want to make.
- Aura provides a strong starting point.
- The agent works visibly and step by step.
- The artifact looks polished without heavy user intervention.
- Edits appear quickly and predictably.
- Project history is local, understandable, and exportable.

This should become the center of the product. Features that do not support that promise should be removed, hidden, or deferred.

### Value Focus

The product should be evaluated against a simple value test:

1. Does this help a user create a better artifact?
2. Does this help a user edit an artifact with less friction?
3. Does this help a user understand what Aura is doing?
4. Does this help a user keep, restore, or share their work?
5. Does this help the team improve artifact quality?

If a feature does not satisfy at least one of those tests, it should not be prominent. API platform language, MCP language, dry-run execution modes, low-level run details, and broad automation promises currently fail this test for the primary user experience.

### Product Principles

#### 1. Creation over configuration

The default path should help a user make something useful immediately. Settings should support creation, not dominate it.

#### 2. Visible work over hidden queues

When the agent is working, the user should see what step it is on, how many steps remain, and which artifact or slide is being changed.

#### 3. Opinionated design over blank canvas

Aura should provide curated themes, layouts, and artifact structures. Users can customize colors and intent, but the system should carry the design burden.

#### 4. Project ownership over global state

Every project should have its own version history, artifacts, settings, and exportable package. Starting a new project should create a new history boundary.

#### 5. Minimal surface over dashboard sprawl

The main interface should expose only the essential actions. Reports, diagnostics, validation output, and history details should exist but live behind contextual drawers or details views.

## Current State Assessment

### Strengths

The codebase already has many pieces needed for the next direction:

- A project model that can contain multiple artifact types.
- `.aura` project export and import.
- Starter kits and quick-start project flows.
- Presentation runtime with slide-level planning, generation, progress events, quality checks, validation, and repair.
- Document runtime with module planning, design-system styles, and repair flows.
- Chat-driven artifact creation and editing.
- Project rules and output modes.
- Provider settings and diagnostics.
- Git-based version history using `isomorphic-git` and `@isomorphic-git/lightning-fs`.
- Tests around removed external spec and adapter behavior.

These should be preserved and refined.

### Weaknesses

The main weaknesses are not isolated to one subsystem. They are product alignment issues that appear in code, docs, UI, and workflow design:

- Documentation still presents API/MCP as a roadmap direction even though those features are not the value focus.
- `README.md` appears out of date and underrepresents current multi-artifact progress.
- Starter kits are content bundles but do not yet give users a strong visual variant choice.
- Project visual style exists mostly as markdown prose, not as structured runtime metadata.
- Version history uses a single shared repository path, which risks mixing history across projects.
- `.aura` export does not yet preserve full project git history.
- Presentation quality has regressed from earlier richer prompt and template behavior.
- Presentation edits can feel queued, stuck, or looped without useful progress feedback.
- Slide generation can produce boring layouts, small fonts, or weak visual hierarchy.
- UI contains too many visible buttons, reports, diagnostics, and technical concepts.
- Chat progress does not consistently explain step count and queue state.
- Document and presentation creation still ask the model to invent too much structure.

### Product Diagnosis

Aura has outgrown a "general agent surface" and now needs a sharper product spine. The product should be organized around high-quality artifact creation. That means removing secondary platform ideas, reducing visible controls, and making the agent work inside stronger scaffolds.

The recurring failure mode is too much openness:

- Open-ended prompts produce inconsistent slides.
- Open-ended project rules produce inconsistent visual direction.
- Open-ended UI surfaces produce confusion.
- A global version repository produces unclear project boundaries.
- Broad documentation creates mixed expectations.

The next phase should add structure in the right places:

- Typed variants.
- Typed themes.
- Typed layout slots.
- Typed artifact plans.
- Project-scoped repositories.
- Explicit progress phases.
- Clear documentation hierarchy.

## Workstream 0: Documentation And README Refresh

### Goal

Update all product documentation so it reflects the current value-focused direction and removes stale API/MCP positioning.

This should be done after or alongside the code cleanup. The documentation should not describe a platform direction that the product no longer intends to pursue.

### Original Documentation Issues

The initial investigation found stale or conflicting documentation in several areas. W0 resolved the active-doc blockers, but the list remains here as historical context for why the cleanup was needed:

- `README.md` previously described Aura as early alpha and presentation-focused.
- `README.md` previously underrepresented documents, spreadsheets, multi-artifact project files, and recent runtime improvements.
- `docs/roadmap/api-platform-plan.md` presented API platform work as a plan and was deleted from active documentation during W0.
- `docs/roadmap/mcp-integration-plan.md` presented MCP work as a plan and was deleted from active documentation during W0.
- `docs/phases/phase-10-api-mcp-and-automation-alignment.md` describes API/MCP alignment.
- `docs/program-status.md` previously referred to Phase 10 API/MCP work as implemented or pending validation.
- Some architecture documents already said external API/MCP seams had been removed, which conflicted with roadmap documents that still implied they were active goals.

### Documentation Strategy

The docs should move from "platform roadmap" to "artifact creation product roadmap."

Recommended structure:

- `README.md`
  - What Aura is.
  - What it creates.
  - How to run it.
  - How projects and `.aura` files work.
  - How provider connections work.
  - Current limitations.

- `docs/product/`
  - Product principles.
  - Artifact quality standards.
  - Starter kit and visual variant strategy.
  - Versioning and export strategy.

- `docs/architecture/`
  - Project model.
  - Artifact runtimes.
  - Storage and export.
  - Version history.
  - Provider integration.

- `docs/roadmap/`
  - Near-term implementation plan.
  - Presentation and document quality plan.
  - UI simplification plan.
  - Version control plan.

### Documentation Changes To Make

Delete from active documentation:

- API platform roadmap language.
- MCP integration roadmap language.
- Old API/MCP roadmap documents.
- Any claim that external automation is a near-term product pillar.
- Any user-facing language that implies Aura is mainly an integration platform.

Rewrite:

- Program status around current active workstreams.
- README feature list.
- README quickstart.
- README limitations.
- Architecture docs that still mention external execution adapters or serializable run specs as future product concepts.

Preserve:

- Provider API key guidance.
- Local-first project and export language.
- Artifact runtime documentation.
- Minimal maintainer notes explaining that external adapters are intentionally absent, if that prevents accidental reintroduction.

### README Positioning Draft

The README should describe Aura as:

> Aura is a local-first AI workspace for creating and editing high-quality presentations, documents, spreadsheets, and project artifacts. It combines chat, structured artifact runtimes, starter kits, project files, and version history so users can move from idea to polished output with less manual assembly.

Core feature bullets should emphasize:

- Multi-artifact projects.
- Presentation generation and editing.
- Document generation and editing.
- Spreadsheet support.
- Starter kits and visual variants.
- `.aura` project files.
- Project-scoped version history, once implemented.
- BYOK provider settings.

The README should not lead with:

- API platform.
- MCP integration.
- Automation infrastructure.
- Dry-run execution.
- Serializable external specs.

### Acceptance Criteria

- README reflects current product state and value focus.
- No user-facing docs present API/MCP as a current or future pillar.
- Provider model access remains documented clearly.
- Roadmap docs point toward artifact quality, UI simplicity, version control, and project templates.
- Program status aligns with actual implementation state.

## Workstream 1: Remove API, MCP, And External Automation Surfaces

### Goal

Finish removing product and code concepts related to external Aura API, MCP, and automation features that do not add user value.

### Important Boundary

This workstream must not remove provider API access.

Provider-related functionality is still central:

- API keys for OpenAI-compatible providers.
- Provider base URLs.
- Provider diagnostics.
- Model selection.
- BYOK settings.

When this plan says "remove API," it means external Aura API product features and related execution modes, not model provider connectivity.

### Original Code Findings

The initial investigation found several implementation areas already cleaned up:

- `src/services/adapters/` and `src/services/executionSpec/` had no active source files and were not imported by active generation paths.
- No active package dependencies were found for common MCP or backend platform libraries such as `@modelcontextprotocol`, `hono`, `supabase`, `better-auth`, `inngest`, or `bullmq`.

This meant Layer 4 of the removal strategy was effectively complete from a source-control perspective. W0 handled the active documentation cleanup, and W1 removed the active runtime execution-mode contracts.

Resolved during W1:

- `ExecutionMode = 'execute' | 'dry-run' | 'explain'` was removed from `src/services/runs/types.ts`.
- Execution `mode` fields were removed from `RunRequest`, `RunRecord`, `RunOutputsEnvelope`, and `BuildArtifactWorkflowPlanInput`.
- Chat and run contracts no longer accept an execution mode field.
- Dead dry-run/explain mode tests were deleted.
- Active targeted-edit telemetry was renamed from dry-run terminology to preflight terminology so no active warning code exposes the old execution-mode vocabulary.

Relevant files observed:

- `src/services/runs/types.ts`
- `src/services/chat/buildRunRequest.ts`
- `src/services/chat/submitPrompt.ts`
- `src/services/contracts/outputEnvelope.ts`
- `src/services/artifactRuntime/types.ts`
- `src/services/runs/registry.ts`
- `src/test/external-adapter-contracts.test.ts`
- `src/test/serializable-run-spec.test.ts`
- `src/test/run-dry-run.test.ts`
- `src/test/run-explain.test.ts`
- `src/test/structured-run-outputs.test.ts`
- `src/test/workflow-planner.test.ts`
- `src/test/presentation-runtime-policy.test.ts`

### Removal Strategy

This should be done in layers, not as a single broad deletion.

#### Layer 1: Documentation

Remove API/MCP from user-facing docs and roadmap status first. This will clarify intent and avoid accidentally preserving dead concepts because docs still mention them.

#### Layer 2: Product UI

Search for visible labels that imply platform or external automation behavior. Remove or rename them if present.

Examples of terms to audit:

- MCP
- API platform
- External adapter
- Dry run
- Explain mode
- Serializable run spec
- Automation endpoint

#### Layer 3: Runtime Contracts

Simplify execution mode once no callers rely on dry-run or explain behavior.

Preferred end state:

- A run executes.
- A plan can be previewed if there is a real product feature for preview.
- The internal runtime can still log diagnostic phases.
- There are no public or user-facing mode concepts named dry-run or explain unless they are actively useful.

Possible implementation path:

1. Replace `ExecutionMode` union with a single internal execution behavior.
2. Remove mode fields from chat request builders where possible.
3. Keep compatibility parsing only at import or stored-history boundaries if needed.
4. Update tests from "normalizes dry-run/explain" to "legacy mode fields are ignored safely" or remove them if the compatibility path disappears.

#### Layer 4: Empty Directories And Tests

The adapter and execution spec directories have already been deleted. No action is needed there.

Remaining tasks:

- Keep tests that guard against reintroducing external adapters only if they remain valuable.
- Avoid preserving tests that force dead vocabulary into the codebase.

### Risk

The largest risk is confusing provider APIs with removed product APIs. The implementation should use clear naming:

- Keep `providerApiKey`, `providerBaseUrl`, `ProviderModal`, and provider diagnostics.
- Remove or rename `apiPlatform`, `externalApi`, `mcp`, `externalAdapter`, and similar concepts.

### Acceptance Criteria

- No user-facing documentation describes API/MCP as product direction.
- No UI surface exposes MCP or external API platform concepts.
- No active source code has external adapter or MCP feature paths.
- Run mode contracts are simplified or compatibility-only.
- Tests pass after removing or rewriting stale mode tests.
- Provider connection features remain intact.

## Workstream 2: Starter Kit Visual Variants

### Goal

Allow users to choose more visual variants when choosing starter kits. The selected variant should meaningfully influence starter artifacts, presentation style, document style, and runtime prompts.

### Current State

The new project flow currently offers a small set of creation modes:

- `blank`
- `starter-kit`
- `quick-start`

Starter kits are content-oriented, not visual-system-oriented.

Observed areas:

- `src/components/NewProjectDialog.tsx`
- `src/components/Toolbar.tsx`
- `src/services/bootstrap/starterKits.ts`
- `src/services/bootstrap/projectStarter.ts`
- `src/services/bootstrap/types.ts`
- `src/types/project.ts`
- `src/components/ProjectRulesPanel.tsx`
- `src/services/artifactRuntime/build.ts`

The current starter kit set includes examples such as:

- `executive-briefing`
- `research-pack`
- `launch-plan`

The current presentation quick-start set includes examples such as:

- `executive-briefing-light`
- `launch-narrative-light`

Project rules already include user-editable prose fields such as output mode and visual style, but those fields are not strong enough to drive consistent artifact design. They also should not become a primary customization surface. The long-term assumption should be that project rules are excellent by default and are adjusted through natural-language user input when needed.

### Product Direction

Starter kit selection should be a two-part decision:

1. What kind of project are you starting?
2. What visual direction should the generated artifacts use?

The user should not have to write a prompt such as "make it more modern and high quality." Aura should offer concrete visual choices.

### Proposed Visual Variants

Start with 4 or 5 curated variants in the first release. Each initial variant should be high-quality, extensive, and complete enough to carry real workflows. The architecture should support growing to around 10 variants later, but the first pass should favor depth over breadth.

The full target library can include the variants below. The first implementation should choose the strongest 4 or 5 from this set rather than shipping all of them at partial quality.

#### 1. Executive

Use for board updates, strategy memos, investor summaries, leadership briefings, and decision documents.

Traits:

- Clear hierarchy.
- Confident typography.
- Sparse decoration.
- Large statement slides.
- Strong summary sections.
- Excellent tables and comparisons.

Good defaults:

- Light background.
- Deep neutral text.
- One strong accent color.
- Large type scale.
- Minimal motion.

#### 2. Launch

Use for product launches, go-to-market plans, campaigns, positioning, and pitch narratives.

Traits:

- Energetic composition.
- Bold section breaks.
- Strong contrast.
- Product and audience framing.
- Roadmap and milestone layouts.

Good defaults:

- Bright accent options.
- Strong title slides.
- Timeline and campaign grid layouts.
- More expressive use of shapes and image slots.

#### 3. Editorial

Use for essays, brand narratives, thought leadership, reports, and visually rich storytelling.

Traits:

- Magazine-like rhythm.
- Big headlines.
- Pull quotes.
- Alternating dense and quiet pages.
- Strong image or illustration slots.

Good defaults:

- Serif or editorial display option where appropriate.
- Strong cover and chapter opener templates.
- Pull quote and feature story layouts.

#### 4. Research

Use for research packs, analysis, insights, evidence reviews, and technical summaries.

Traits:

- Dense but clean.
- Strong evidence hierarchy.
- Tables, matrices, and charts.
- Clear methodology sections.
- Careful source and caveat treatment.

Good defaults:

- Cool neutral base.
- Data color palette.
- Comparison, evidence grid, and insight-card layouts.

#### 5. Teaching

Use for training, workshops, explainers, lessons, and onboarding material.

Traits:

- Step-by-step explanations.
- Examples and exercises.
- Concept cards.
- Recaps and checks for understanding.
- Friendly but still polished design.

Good defaults:

- Clear section progression.
- Diagram slots.
- Activity slide layouts.
- Recap and quiz layouts.

#### 6. Proposal

Use for client proposals, recommendations, scopes, pricing, and implementation plans.

Traits:

- Problem, solution, proof, plan.
- Strong package and comparison layouts.
- Clear next actions.
- Trust-building evidence sections.

Good defaults:

- Professional neutral base.
- Strong comparison tables.
- Option cards.
- Roadmap and pricing layouts.

#### 7. Interactive

Use for small web experiences, demos, explainers, interactive lessons, and prototype artifacts.

Traits:

- UI-like components.
- Embedded controls.
- Clear states.
- Lightweight interactions.
- High clarity over decoration.

Good defaults:

- Component library feel.
- Cards, controls, and panels.
- Interactive quiz or scenario layouts.

### Data Model

Add a typed visual variant registry. A likely file:

- `src/services/bootstrap/visualVariants.ts`

Suggested type shape:

```ts
export type VisualVariantId =
  | 'executive'
  | 'launch'
  | 'editorial'
  | 'research'
  | 'teaching'
  | 'proposal'
  | 'interactive';

export interface VisualVariant {
  id: VisualVariantId;
  label: string;
  shortDescription: string;
  defaultOutputMode: RuntimeOutputMode;
  palette: {
    background: string;
    primary: string;
    accent?: string;
  };
  presentationThemeId: string;
  documentThemeId: string;
  colorThemeId: string;
  documentStylePreset?: string;
  layoutFamilies: string[];
  promptTraits: string[];
  avoidTraits: string[];
}
```

The exact type should match local code style, but the concept should be explicit: the variant is not prose only. It should be structured product metadata.

Presentation and document theme ids should be separate. A variant can map to both, but document themes and presentation themes should be developed independently so each artifact type can optimize for its own layout, typography, and interaction needs.

### Where The Variant Should Flow

Thread the selected variant through:

- New project dialog state.
- `InitProjectOptions`.
- Starter kit initialization.
- Project metadata.
- Internal project defaults, including hidden project rules when needed.
- Presentation runtime prompt context.
- Document runtime prompt context.
- Quick-start artifact creation.
- Future scaffold tools.

Likely types or areas to extend:

- `ProjectStarterKit`
- `ProjectStarterArtifact`
- `InitProjectOptions`
- `ProjectDocumentStarterRef`
- `Project` metadata or settings type
- Workflow preset metadata

### UI Design

The new project dialog should not become a complex dashboard. The variant selector should be compact and visual.

Recommended UI:

- Keep the current starter kit selection.
- Add a "Visual direction" row or compact grid.
- Each variant appears as a small swatch with name and 1-line description.
- Use color chips and small layout thumbnails rather than verbose text.
- Select a recommended default automatically.
- Show no more than 4 or 5 visible options in the first release.
- Choose a default color theme automatically.
- Let the user accept the default color theme, edit it before the first artifact is created, and edit it later from artifact or project settings.

Avoid:

- Large marketing cards.
- Long descriptions.
- Technical labels such as runtime mode, style preset, or theme id.
- Forcing users to pick from too many templates.

### Runtime Behavior

The selected visual variant should influence runtime behavior in three ways:

1. It chooses a theme family.
2. It chooses preferred artifact layouts.
3. It provides prompt constraints and anti-patterns.

For presentations:

- Select a theme.
- Select slide layout families.
- Provide content slot budgets.
- Provide typography scale.
- Provide color variables.
- Provide animation and SVG art presets where the chosen variant supports them.

For documents:

- Select document theme tokens.
- Select section modules.
- Select density and tone.
- Select callout, table, and summary styles.

For interactive artifacts:

- Select component tokens.
- Select UI composition patterns.
- Select interaction guidance.

### Acceptance Criteria

- Users can select a visual variant during starter kit creation.
- First release includes 4 or 5 complete, high-quality variants.
- The variant model can grow to around 10 variants later.
- The variant is saved with the project.
- The variant influences starter artifacts.
- The variant influences presentation creation.
- The variant influences document creation.
- The user can accept or edit the default color theme before artifact creation.
- The variant is represented as structured metadata, not only prose.
- The UI remains compact and simple.

## Workstream 3: User Interface Simplification

### Goal

Make the interface dramatically simpler: fewer visible buttons, fewer reports, fewer technical controls, and clearer primary workflows.

### Current UI Friction

The interface currently exposes several controls and technical panels that may be useful but should not all be first-order surfaces.

Observed areas include:

- `src/components/Toolbar.tsx`
- `src/components/ChatBar.tsx`
- `src/components/ProjectInitReportDialog.tsx`
- `src/components/RunHistoryPanel.tsx`
- `src/components/ProjectRulesPanel.tsx`
- `src/components/DoctorPanel.tsx`
- `src/components/VersionHistoryPanel.tsx`
- `src/components/ProjectSidebar.tsx`

The toolbar currently includes many visible actions such as:

- Sidebar toggle.
- New.
- Open.
- Save.
- Export artifact.
- Validate.
- Present.
- History.
- Provider readiness or settings.
- Chat toggle.

The chat bar includes controls such as:

- Context chips.
- Attachment controls.
- Active artifact chip.
- Document style selector.
- Output mode selector.
- Presets.
- Runs.
- Hotkey text.
- Cancel/send.

Some of these are important. The issue is that too many are visible at once.

### Product Direction

The main UI should communicate:

1. What project am I in?
2. What artifact am I viewing?
3. What can I create or edit?
4. What is Aura doing right now?
5. How do I save, export, or restore?

Everything else should be contextual or advanced.

### Proposed Top-Level Navigation

Primary visible surfaces:

- Project title.
- Artifact navigation.
- New or Add.
- Save/Open.
- Present or Export, only when relevant.
- Chat.
- Connection/settings indicator.

Secondary surfaces behind menus:

- Validate.
- Run history.
- Project init report.
- Provider diagnostics.
- Project rules only in a deeply advanced/debug location.
- Advanced context controls.
- Debug payloads.
- Detailed version history.

### Toolbar Simplification

Recommended toolbar groups:

#### Left

- Sidebar toggle.
- Project name.
- Current artifact type or artifact title.

#### Center

- Artifact tabs or compact artifact switcher.

#### Right

- New.
- Save/Open menu.
- Share/Export menu.
- Present button only for presentation artifacts.
- Provider status button.
- Chat toggle.

Move these behind a "More" or advanced menu:

- Validate.
- Run history.
- Project init report.
- Debug diagnostics.
- Any internal run mode controls.

### Chat Bar Simplification

The chat bar should feel like the main creation surface, not a cockpit.

Default visible controls:

- Text input.
- Attach button.
- Send/cancel.
- Active target selector if needed.

Contextual or collapsed controls:

- Output mode.
- Document style.
- Presets.
- Context chips.
- Runs.
- Advanced project rules only as an escape hatch, not a normal workflow.

When the user starts a new project or artifact, the UI can show guided choices. During normal editing, the chat bar should stay minimal.

### Reports And Diagnostics

Reports should become "details" rather than modal interruptions.

Project initialization report:

- Replace default modal with a concise success status.
- Example: "Project created with 4 starter artifacts."
- Include a "Details" link or expandable panel.

Run history:

- Keep it for debugging and transparency.
- Move it behind a history/details button.
- Do not make it compete with the main chat experience.

Validation:

- Show a simple pass/fail or issue count.
- Detailed validation can live in a drawer.
- Do not expose validation as a primary action unless the user is actively in review mode.

### Simplicity Rules

Adopt these UI rules for future implementation:

- No visible control unless it helps the main workflow.
- No report modal unless the user requested details or action is required.
- No internal vocabulary in primary UI.
- No duplicate ways to do the same thing in the same viewport.
- No technical run state in the default surface.
- Advanced controls should exist, but stay out of the main path.
- Project rules should be almost completely hidden; users should normally change behavior by asking Aura directly.

### Acceptance Criteria

- Main toolbar has fewer visible controls.
- Chat bar is simpler by default.
- Reports are not shown unless needed or requested.
- Advanced diagnostics remain accessible.
- Provider status remains clear.
- Artifact-specific actions appear only when relevant.

## Workstream 4: Explicit Chat And Run Progress

### Goal

Make chat more explicit about what Aura is doing and how many steps remain.

This directly addresses the user experience where edits feel queued, stuck, or looped without progress changing.

### Current Pain

The user can see that work is happening, but not always:

- Which phase is active.
- Which slide or document module is being changed.
- How many steps remain.
- Whether the system is waiting for the model, repairing output, validating, or committing changes.
- Whether progress is stalled or still alive.

This is especially painful for slide editing and slide creation because the process can be multi-step and slow.

### Progress Model

Introduce a consistent progress model for agent work:

```ts
interface RunProgressStep {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'complete' | 'warning' | 'failed';
  currentItem?: number;
  totalItems?: number;
  detail?: string;
}
```

The UI does not need to show this exact type, but the product should expose this concept.

### Standard Phases

For presentations:

1. Understanding request.
2. Planning deck or edit.
3. Preparing theme and layouts.
4. Generating slide 1 of N.
5. Generating slide 2 of N.
6. Repairing slides if needed.
7. Checking layout and quality.
8. Applying changes.
9. Saving version.

For document creation:

1. Understanding request.
2. Planning sections.
3. Preparing document style.
4. Drafting section 1 of N.
5. Drafting section 2 of N.
6. Repairing sections if needed.
7. Checking structure and readability.
8. Applying changes.
9. Saving version.

For editing:

1. Understanding requested edit.
2. Locating target content.
3. Preparing patch.
4. Applying patch.
5. Checking result.
6. Saving version.

### UI Behavior

The chat should show compact but clear progress:

- "Step 3 of 8: Preparing theme and layouts."
- "Slide 4 of 9: Generating timeline slide."
- "Repairing 2 slides with layout issues."
- "Checking readability and spacing."
- "Applying changes."

When a process is queued:

- Show queue position or queued item count.
- Example: "Queued behind 2 slide updates."

When a process is taking longer than expected:

- Show heartbeat detail.
- Example: "Still generating slide 6. Last update 18 seconds ago."

When progress stalls:

- Give the user a safe cancel option.
- Preserve partial results if possible.
- Explain what was completed.

### Avoiding Endless Loops

Every repair loop should have:

- A maximum attempt count.
- A visible progress phase.
- A fallback behavior.
- A diagnostic reason when it stops.

For example:

- Attempt 1: repair malformed HTML.
- Attempt 2: simplify layout if still invalid.
- Attempt 3: accept best result with warning or ask user for confirmation.

The UI should never appear to spin forever with no progress changes.

### Implementation Notes

A progress infrastructure already exists and should be extended rather than replaced:

- `src/services/chat/workflowProgress.ts` — currently handles step-label normalization (`publicWorkflowProgressLabel`), step upsert logic, and event-to-step-update conversion for all artifact types. It maps step IDs like `slide-3`, `evaluate`, `finalize`, `document-module-2` to human labels and status. This is the right extension point for adding total step count and slide count.

The current system does not yet expose total step count or queue depth to the chat UI. The extension work is:

- Thread total slide count and total document section count into progress events.
- Add queue depth to batch queue events.
- Extend `workflowProgress.ts` to carry and display count context.

Current progress-related code also appears around:

- Presentation runtime progress events and heartbeat in `presentationRuntime.ts`.
- Batch queue progress events in `batchQueue.ts`.
- Chat message handlers.
- Run history.

The next implementation should normalize progress events across artifact runtimes so the UI does not have one-off behavior for every artifact type.

Potential new shared area:

- `src/services/runs/progress.ts`
- `src/services/artifactRuntime/progress.ts`

Potential UI component:

- `src/components/chat/RunProgress.tsx`

### Acceptance Criteria

- Chat shows step count during long-running tasks.
- Presentation creation shows slide count.
- Presentation editing shows target and phase.
- Document creation shows section/module count.
- Repair loops show attempt count and do not run endlessly.
- Queue state is visible.
- Cancel behavior remains available and safe.

## Workstream 5: Project-Scoped Version Control

### Goal

Refine version control so each project gets a unique repository/git instance. When a user creates a new project, it should not share history with previous projects. Rebuild the `.aura` format from scratch around this model, and make git history export an explicit option.

### Current State

The codebase already has:

- `.aura` project export and import.
- A git-backed version history service.
- Dependencies on `isomorphic-git` and `@isomorphic-git/lightning-fs`.

Relevant files:

- `src/services/storage/projectFormat.ts`
- `src/services/storage/fileFormat.ts`
- `src/services/storage/projectAutosave.ts`
- `src/services/storage/versionHistory.ts`
- `src/components/VersionHistoryPanel.tsx`
- `src/App.tsx`
- `package.json`

Current `.aura` export format:

- `projectFormat.ts` writes a current project format, observed as `2.4`.
- The project package includes manifest, chat, rules, context, presets, media, memory, documents, HTML/CSS/meta, and spreadsheet Parquet data.
- `fileFormat.ts` still supports a legacy presentation-only format and `projectFormat.ts` can upgrade v1 input to a project, but the next implementation does not need to preserve this compatibility.

### Format Reset Decision

The next `.aura` project format should be recreated from scratch. Backwards compatibility with legacy `.aura` files is no longer a requirement.

This is a deliberate simplification. The new format should prioritize:

- Correct project structure.
- Complete artifact coverage.
- Clean version-history boundaries.
- Simple validation.
- Safe import behavior.
- Future extensibility.

The implementation can remove legacy v1/v2 upgrade paths once the replacement format is ready. If there is concern about old local files during development, the product can show a clear unsupported-file message rather than carrying compatibility code forward.

Current version history:

- Uses a single LightningFS database name similar to `aura-project-fs`.
- Uses a hardcoded repository directory such as `/project`.
- Commits a project snapshot to that shared repository.
- `VersionHistoryPanel` lists and restores from that repository.

### Problem

The current version history model risks mixing history across projects.

Likely issues:

- New projects can inherit or share the same git repo.
- Imported projects may not create a separate repo.
- Restoring versions may expose snapshots from another project.
- Exported `.aura` files do not preserve git history.
- Snapshots may be incomplete relative to full `.aura` export.
- Deleted documents or artifacts may remain in the git worktree unless cleanup is explicit.

### Desired End State

Every project should have:

- A stable project id.
- A dedicated git repo path.
- Its own version history.
- History created when the project is created or imported.
- Commits that represent coherent project states.
- Optional exportable history inside `.aura`, enabled by an explicit "Export with history" path.

Starting a new project should feel like creating a new repository.

### Proposed Repository Layout

Use a project-scoped repo path:

```ts
const repoDir = `/projects/${projectId}`;
```

The exact path should be compatible with LightningFS and existing code conventions.

Potential service shape:

```ts
export async function ensureProjectRepo(projectId: string): Promise<void>;
export async function commitProjectVersion(project: Project, message: string): Promise<string | null>;
export async function listProjectVersions(projectId: string): Promise<ProjectVersion[]>;
export async function readProjectVersion(projectId: string, hash: string): Promise<ProjectVersionSnapshot>;
export async function restoreProjectVersion(projectId: string, hash: string): Promise<Project>;
```

### Shared Serializer

The `.aura` exporter and git versioning service should share a canonical serializer.

Reason:

- Export and version history should represent the same project truth.
- Tests can compare export package contents and version snapshot contents.
- New artifact fields are less likely to be missed.

Potential new module:

- `src/services/storage/projectSnapshot.ts`

Responsibilities:

- Convert `Project` into canonical files.
- Include documents, presentations, spreadsheets, media, memory, chat, rules, presets, context, and metadata.
- Normalize file names.
- Handle deletion cleanup.
- Provide a manifest.
- Validate on import.

### Commit Timing

Current commits can happen inside individual handlers before all project, chat, memory, and lifecycle updates are complete. This risks commits that do not reflect final user-visible state.

Preferred behavior:

- Artifact-changing run, edit, or manual user change completes.
- Project store updates.
- Chat message updates.
- Memory or metadata updates complete.
- Then a central post-run commit happens.

This creates more coherent history.

Do not commit every assistant response. Commit when a project artifact, project metadata, user-editable document, spreadsheet, presentation, media item, or other persistent project asset changes. Manual user edits should be committed using the same project-scoped mechanism as AI-generated edits.

Recommended commit messages:

- `Create project: Executive briefing`
- `Create presentation: Q2 board update`
- `Edit slide 4: tighten timeline`
- `Create document: Product launch plan`
- `Update spreadsheet: forecast assumptions`

### No-Op Commits

The versioning service should avoid no-op commits.

Use `isomorphic-git` status checks or a content hash check before committing.

Behavior:

- If nothing changed, do not create a commit.
- Return `null` or a typed result explaining no commit was needed.

### Deleted Artifact Cleanup

Before each commit, the worktree should match the current project exactly.

This means:

- Files for deleted artifacts must be removed from the repo worktree.
- Renamed artifacts should not leave stale old files.
- Spreadsheet binary data should not leave stale previous versions.

The serializer should know the complete expected file list and remove anything else under the project repo, excluding `.git`.

## Workstream 6: New `.aura` Format And Optional History Export

### Goal

Make `.aura` export/import represent the current project model cleanly, with no legacy presentation-upgrade path, and make git history export an explicit user action.

The normal save path should remain lean and should import as a fresh local project id. The history save path should preserve the original project id only when a valid history payload is present and restored.

### Implementation Status

Workstream 6 is complete for the current implementation slice.

Completed behavior:

- Normal `.aura` export and "Save with history" share the same project archive writer.
- "Save with history" commits the current project snapshot before export, then packages the project repo under `version-history/git/`.
- `hasHistory` is written only when git history files are actually present.
- Imports without history assign a fresh project id.
- Imports with valid history restore the git repo and preserve the original project id.
- Importing history replaces any existing repo for that project id rather than merging histories.
- Unsafe git history paths, empty declared history payloads, unsupported manifest versions, and unsafe document archive paths are rejected.

### `.aura` History Export

The `.aura` format should optionally include history. This should be a user-facing export option, not the default behavior.

Recommended structure:

```text
project.aura
  manifest.json
  project/
    ...
  version-history/
    manifest.json
    git/
      ...
```

Two possible approaches:

#### Option A: Export raw git repository

Package the project repo `.git` directory or an equivalent subset.

Pros:

- Preserves real commit graph.
- Easier restore to `isomorphic-git`.
- Preserves hashes and refs.

Cons:

- Larger export files.
- Need careful path validation.
- Need to ensure LightningFS repo can be reconstructed.

#### Option B: Export linear snapshots

Package a list of version snapshots and metadata.

Pros:

- Easier to inspect and validate.
- Can omit heavy data if needed.
- Less git-internal coupling.

Cons:

- Loses real git object identity.
- Restore may create a new commit graph.
- Not as faithful to "export git history."

Recommended initial approach:

- Implement project-scoped repos first.
- Add `.aura` history export as an explicit "Export with history" option.
- Start with a compact manifest and either raw git export or linear snapshots depending on implementation complexity.
- If raw git export is too large, allow "Export with history" and "Export current project only" as separate options.

### Import Behavior

When importing a `.aura` file:

- If history is present, restore it into the project-scoped repo.
- If history is absent, initialize a fresh repo and create an import commit.
- If history is present, preserving the original project id is likely correct because the repo history belongs to that identity.
- If history is absent, assigning a fresh project id is likely safer because the import behaves like a new local copy.
- Validate paths to prevent traversal.
- Validate manifest version.
- Reject or safely ignore unknown history payloads.
- Do not mix imported history into another project's repo.

### Tests

Add focused tests:

- New project A and project B have separate histories.
- Importing a project without history creates a separate history.
- Importing a project with history restores its own history without mixing into another project.
- `.aura` export without history still works.
- `.aura` export with history round-trips.
- Deleting an artifact removes it from the repo snapshot.
- Spreadsheet data is preserved.
- Memory tree and project metadata are preserved.
- Corrupt or path-traversal history payloads are rejected.
- Legacy `.aura` files are rejected with a clear unsupported-format result.

### Acceptance Criteria

- Each project has its own git repo path.
- Creating a new project starts a fresh history.
- Importing a project starts or restores its own history.
- Version history panel only shows versions for the active project.
- Commits represent coherent completed changes.
- Commits are created for artifact-changing assistant responses and user manual changes, not for every chat response.
- Deleted artifacts do not remain in snapshots.
- `.aura` export can include history through an explicit export option.
- `.aura` import restores history when included.
- The new `.aura` format does not carry legacy backwards-compatibility requirements.

## Workstream 7: Presentation Workflow Recovery And Quality

### Goal

Restore and improve the quality, speed, reliability, and edit behavior of presentation creation and editing.

This is one of the highest priority workstreams because presentation quality is a core value proposition.

### User-Reported Problems

The current presentation workflow has several problems:

- Edits are not shown immediately.
- Edits appear queued without useful progress.
- Some workflows loop endlessly.
- Progress bars do not always move.
- Newly created slides can look boring.
- Fonts can be too small or strange.
- Output quality feels lower than previous versions.
- Presentations are less exciting and polished than earlier workflows.

### Current Architecture

The presentation workflow is a two-layer system. Both layers need to be understood before planning recovery work.

#### Outer runtime layer (orchestration)

These files live in `src/services/artifactRuntime/` and own the overall presentation lifecycle:

- `src/services/artifactRuntime/presentationRuntime.ts` — main orchestrator: calls planner, runs batch queue, coordinates design → evaluate → finalize phases, handles repair, emits progress events
- `src/services/artifactRuntime/presentationPrompts.ts` — system and user prompt builders consumed by the designer and evaluator agents
- `src/services/artifactRuntime/presentationQualityChecklist.ts` — programmatic heuristic QA checks: font-size, HTML structure, slot presence, etc.
- `src/services/artifactRuntime/qualityDecision.ts` — decides whether to trigger a polish pass based on checklist results
- `src/services/artifactRuntime/promptPacks.ts` — reusable contract pack builders for presentation fragment rules, readability baselines, and quality bar guidance; consumed by `presentationPrompts.ts`
- `src/services/artifactRuntime/starterPresentationRuntime.ts` — static template scaffolding runtime for quick-start presentations; builds slide HTML from template tokens and slot extraction
- `src/services/artifactRuntime/presentation.ts` — helpers for applying run plan metadata and building slide briefs

#### Inner AI workflow layer

These files live in `src/services/ai/workflow/` and own the AI calls:

- `src/services/ai/workflow/presentation.ts` — thin model-setup shell: constructs the `LanguageModel`, resolves provider capability profile, and delegates entirely to `runPresentationRuntime()`
- `src/services/ai/workflow/batchQueue.ts` — concurrent slide generation queue; calls the designer for each slide in parallel with bounded concurrency
- `src/services/ai/workflow/agents/planner.ts` — intent classification, style and palette detection, animation level selection
- `src/services/ai/workflow/agents/designer.ts` — ToolLoopAgent slide designer; streams a draft for instant preview, then runs a `validateSlideHtml → submitFinalSlide` tool loop to fix issues
- `src/services/ai/workflow/agents/evaluator.ts` — LLM-based quality judge (`evaluateAndRevise()`); runs after the designer and scores the slide on layout, typography, color, animation, content, and accessibility; triggers a targeted revision pass if the score is below threshold
- `src/services/ai/workflow/agents/qa-validator.ts` — programmatic QA used as a tool inside the ToolLoopAgent

#### Prompt and template system

The prompts fed to the designer and evaluator are built from a layered system in `src/services/ai/`:

- `src/services/ai/prompts/sections/` — modular prompt sections: `base.ts`, `narrative.ts`, `layout.ts`, `typography.ts`, `animation.ts`, `svg.ts`, `anti-patterns.ts`, `modern-patterns.ts`, `decorative.ts`, `quality.ts`, `template-examples.ts`
- `src/services/ai/templates/registry.ts` — typed `TemplateId` union; production template IDs include `executive-briefing-light`, `launch-narrative-light`, `editorial-light`, `finance-grid-light`, `stage-setting-light`, `interactive-quiz`, `split-world`
- `src/services/ai/templates/selector.ts` — pattern-based routing to select a template based on user intent
- `src/services/ai/templates/resolver.ts` / `exemplar-packs.ts` / `reference-style-packs.ts` — resolve and provide visual exemplar HTML to guide generation style
- `src/services/ai/templates/palettes.ts` — color palette definitions per template
- `src/services/ai/templates/design-system.ts` — design system token guidance

Current strengths:

- Slide-level generation.
- Progress events.
- Queued batch generation.
- Deterministic repair.
- Bounded model repair.
- Validation.
- Quality telemetry.
- Per-part diagnostics.
- Better style preservation during some edit and add-slide flows.

Current risks:

- Template selection via `selector.ts` uses heuristic pattern-matching that may not reliably route to the right visual family for all prompts.
- The LLM evaluator in `evaluator.ts` scores slides after generation, but the quality criteria are prompt-described rather than driven by typed layout contracts or slot definitions — it can identify issues but cannot enforce structural constraints.
- The designer generates freeform slide HTML rather than populating known layout slots. This means quality is model-dependent and varies across requests.
- Progress heartbeats exist in `presentationRuntime.ts` but do not expose slide-by-slide count or repair attempt number in the chat UI. The `workflowProgress.ts` label system maps step IDs but not total counts.
- Repair loops are bounded but the bound is not always clearly surfaced to the user.
- The `starterPresentationRuntime.ts` template scaffolding is used for quick-start decks only, not for all generated slides.

### Historical Comparison

The investigation compared current workflow direction against local main branch history from around 2026-04-22.

Relevant commits:

- `bcd245420a4881001aa1ef622bb35187916039ce`: local main snapshot around the target period.
- `1831605ac4029af0482de85051be9a94549e6ef9`: presentation workflow fix affecting visual stability.
- `8b756c85bea96d08eac9b3c5f18934ae01eb6249`: orchestration simplification.

The older workflow appears to have produced stronger visual output because it gave the model more concrete visual direction.

The current template and exemplar system in `src/services/ai/templates/` is still active and provides visual direction to the designer. The `selector.ts` pattern-router, `registry.ts` template IDs, `exemplar-packs.ts`, and `reference-style-packs.ts` all feed HTML exemplar guidance into the design prompts. This system is a strength to build on, not a gap to fill from scratch.

The key quality gap is structural: the designer generates freeform slide HTML on every request. Even with rich template guidance, the model can produce inconsistent hierarchy, small fonts, and weak layouts when no slot contract enforces the output shape. The design system approach in this plan is therefore additive — replacing unconstrained HTML generation with layout-first slot population while keeping the existing template routing and exemplar system intact.

Historical strengths worth preserving:

- Template routing selected distinctive families (executive-briefing, launch-narrative, editorial, finance-grid, stage-setting, etc.) and this routing system still exists in `selector.ts`.
- Exemplar packs and reference style packs gave the model concrete HTML references, and `exemplar-packs.ts` and `reference-style-packs.ts` still provide this.
- Old prompts included blunt, simple output rules.
- The batch queue gave the first slide a full design prompt, then reused the shared style for later slides — this pattern still exists in `batchQueue.ts`.

The older workflow was not necessarily architecturally better. The current runtime is more robust in many ways. The key lesson is that the old workflow gave the model more layout scaffolding, and some of that structural guidance is what the design system approach should formalize.

### Strategic Direction

Do not simply revert to the old workflow. Instead:

- Keep the current runtime architecture.
- Recover the rich visual guidance from the older prompts and templates.
- Replace unbounded examples with curated reference snippets.
- Move from "model invents a slide" to "model fills a known slide layout."
- Add stronger screenshot and text-fit validation.
- Improve progress events and repair-loop visibility.

### Implementation Status

Workstream 7 is complete for the current scaffold layer.

Completed behavior:

- The presentation template system now has a typed slide layout registry with 16 layout definitions covering cover, intro, agenda, section breaker, statement, timeline, columns, comparison, metrics, process, quote, case study, data story, roadmap, and closing slides.
- Each layout defines required and optional slots, text budgets, minimum font sizes, quality rules, allowed motion presets, and allowed SVG motif families.
- Slot contracts are injected into queued slide prompts from the runtime slide blueprint, including a stable `data-layout` value and slot class guidance so future edits can target individual slide regions.
- Approved motion presets are scaffolded with bounded keyframe names, duration limits, animated-element limits, content-heavy restrictions, and reduced-motion expectations.
- Approved SVG motif families are scaffolded with named motif slots, viewBox guidance, placement constraints, and safe usage rules.
- Runtime slide-role phrases now resolve to the intended scaffold contracts for stage-setting, problem, comparison, mechanism, recommendation, metric, timeline, case-study, and closing flows.
- Presentation QA now warns when generated CSS uses custom keyframe names outside the approved motion preset registry.

Remaining milestone work moves to W9: benchmark deck runs, screenshot/render checks, and product review evidence for visual improvement.

### Presentation Design System

The new presentation system should provide:

- Theme registry.
- Slide layout registry.
- Content slots.
- CSS animation presets.
- SVG art and motif presets.
- Type scale.
- Color tokens.
- Spacing tokens.
- Component patterns.
- Motion budgets.
- Repair rules.
- Screenshot validation.
- Text fitting.

Every generated slide should be based on a known layout type unless the user explicitly asks for a custom freeform slide.

### CSS Animation And SVG Art

Previous stronger presentation workflows used CSS animations and SVG art more effectively. The recovery plan should explicitly preserve that capability, but move it into scaffolded systems so it remains polished and restrained.

CSS animation should not be left to unconstrained model invention. Each presentation theme should define a small set of approved motion presets:

- Subtle fade and rise for section reveals.
- Staggered item reveal for timelines and lists.
- Gentle emphasis pulse for a single key metric.
- Controlled path draw for diagrams or process flows.
- Optional scene entrance for cover or section-breaker slides.

Each motion preset should define:

- Allowed CSS keyframes.
- Maximum duration.
- Maximum number of animated elements.
- Whether it is allowed on content-heavy slides.
- Reduced-motion fallback.
- Validation rules.

SVG art should also be scaffolded. Themes can provide reusable SVG motif families:

- Abstract product shapes.
- Timeline connectors.
- Data-grid accents.
- Editorial frames.
- Process diagrams.
- Icon-backed section markers.
- Lightweight illustrative backgrounds.

The model should usually choose and populate an existing SVG motif rather than invent arbitrary SVG from scratch. Freeform SVG can remain possible for advanced custom requests, but default generation should use approved motifs with slots for labels, values, colors, and simple geometry.

Animation and SVG guardrails:

- No uncontrolled decorative motion.
- No animation on every element.
- No tiny animated text.
- No complex SVG that competes with slide content.
- No motion that breaks readability.
- Always support reduced-motion behavior.
- Validate that SVGs render inside the slide bounds.
- Validate that animated elements do not cover important content.

This gives Aura a path back to expressive, premium slides while avoiding the old failure mode where animations or art become noisy, inconsistent, or broken.

### Slide Layout Library

Each theme should include layouts such as:

- Cover.
- Intro.
- Agenda.
- Section breaker.
- Big statement.
- Timeline.
- Two-column.
- Three-column.
- Comparison.
- Metric proof.
- Process.
- Quote.
- Case study.
- Data story.
- Roadmap.
- Closing.

Each layout should define:

- Required slots.
- Optional slots.
- Maximum text length.
- Minimum font sizes.
- Preferred visual density.
- Allowed components.
- Allowed animation presets.
- Allowed SVG motif slots.
- Responsive behavior.
- Repair strategy.

Example:

```ts
interface SlideLayoutDefinition {
  id: string;
  label: string;
  themeIds: string[];
  slots: SlideSlotDefinition[];
  minFontSize: number;
  maxBullets?: number;
  supportsMedia: boolean;
  allowedMotionPresets?: string[];
  allowedSvgMotifs?: string[];
  qualityRules: string[];
}
```

### Content Slots

The model should fill slots rather than write arbitrary HTML.

Example slots:

- `eyebrow`
- `title`
- `subtitle`
- `summary`
- `primaryStatement`
- `leftColumn`
- `rightColumn`
- `metricCards`
- `timelineItems`
- `quote`
- `source`
- `speakerNotes`

This allows Aura to:

- Enforce text length.
- Preserve layout on edits.
- Repair a single slot.
- Avoid full slide regeneration.
- Keep font sizes readable.

### Edit Workflow

Presentation editing should prefer targeted patches.

For example:

- If the user asks to change slide 3 title, update the title slot only.
- If the user asks to make a slide more visual, change the layout or add visual slots.
- If the user asks to change colors, update theme tokens.
- If the user asks to add a slide, choose a layout, scaffold it, then populate it.

Avoid:

- Regenerating the whole deck for small edits.
- Rewriting CSS across every slide unless theme changes require it.
- Running repair loops without clear progress.

### Immediate Edit Display

For editing workflows:

- Show an optimistic "applying edit" state.
- Apply safe local changes immediately where possible.
- Stream or stage generated replacement for the target slide.
- Update the artifact as soon as the target slide validates.
- Continue background validation if needed.

The user should not wait for an entire deck-level process if the edit affects one slide.

### Quality Controls

An LLM-based quality evaluator already exists in `src/services/ai/workflow/agents/evaluator.ts`. It scores slides 1–10 across six categories (layout, typography, color, animation, content, accessibility) and triggers a targeted revision pass when the score falls below threshold or critical issues are found. The evaluator is gated by provider capability profile — some providers skip it.

The evaluator is a strength to build on. Its current limitation is that it identifies problems after freeform generation rather than preventing them through layout constraints. The design system approach reduces what the evaluator needs to catch by giving the designer a slot contract upfront.

Strengthen or add checks for:

- Minimum font size.
- Text overflow.
- Contrast.
- Layout collisions.
- Blank or near-blank slides.
- Excessive bullet density.
- Boring repeated layouts.
- Missing visual hierarchy.
- Broken HTML/CSS.
- External image URLs if not allowed.
- Unsupported animation or motion patterns.
- Excessive animation count or duration.
- SVGs that overflow, obscure content, or fail to render.

### Screenshot-Based QA

Heuristic HTML/CSS checks are not enough. Add screenshot-based QA where feasible.

Suggested validation:

- Render each slide at expected viewport size.
- Capture screenshot.
- Check for blank output.
- Check approximate text bounding boxes if available.
- Check canvas/image presence where required.
- Compare pixel distribution to avoid empty white slides.
- Detect extreme tiny text if tooling permits.

The workflow can start with basic render checks and grow over time.

### Prompt Recovery

The current template and prompt system already provides rich guidance:

- `src/services/ai/templates/selector.ts` — routes to the right visual family by pattern.
- `src/services/ai/templates/exemplar-packs.ts` and `reference-style-packs.ts` — inject reference HTML.
- `src/services/ai/prompts/sections/` — modular guidance sections covering layout, typography, animation, SVG, anti-patterns, and quality.
- `src/services/artifactRuntime/promptPacks.ts` — contract packs enforcing output shape and readability baselines.

The recovery work is not about restoring a deleted system. It is about adding the missing structural layer: layout definitions, slot contracts, and text budgets that the model can be given before it writes HTML, rather than only scoring output after it is generated.

Preserve and extend:

- Existing template routing and exemplar packs.
- Template-specific visual language.
- Existing anti-pattern sections.
- Clear output contract in `promptPacks.ts`.

Add:

- Typed slot schemas that the designer can receive per layout.
- Text budget constraints embedded in slot definitions.
- Pre-generation layout selection so the model knows which layout to fill.
- Reference exemplar HTML attached to specific layouts, not just themes.

Do not recover:

- Unbounded prompt size.
- Any old behavior that conflicts with current progress and validation architecture.

### Benchmarking

Create a presentation quality benchmark set.

Benchmark prompts:

- Executive board update.
- Product launch deck.
- Research findings deck.
- Training workshop deck.
- Proposal deck.
- Timeline-heavy plan.
- Data-heavy insight deck.

For each benchmark:

- Generate with current workflow.
- Generate with improved scaffold workflow.
- Compare visual quality.
- Compare font size and readability.
- Compare time to complete.
- Compare repair count.
- Compare user-visible progress behavior.

### Acceptance Criteria

- Presentation creation produces visually stronger slides.
- Minimum readable font sizes are enforced.
- Edits to individual slides appear quickly.
- Progress shows slide count and phase count.
- Repair loops are bounded and visible.
- Layout variety improves across a deck.
- Theme and layout scaffolds drive generation.
- Benchmarks show improvement over current behavior.
- CSS animation presets and SVG motif presets are scaffolded, bounded, and validated.

## Workstream 8: Document And Presentation Tooling

### Goal

Build out tools for document and presentation creation and editing so the agent has stronger guidance and less need to invent structure.

### Core Idea

As much as possible should be scaffolded before the AI writes content.

Instead of asking the AI:

> Create a beautiful slide deck.

Aura should do:

1. Select theme.
2. Select layout sequence.
3. Create slide scaffolds.
4. Provide slot definitions.
5. Ask AI to populate slots.
6. Fit text.
7. Validate.
8. Repair only the failing slots.

This approach should also apply to documents.

### Presentation Scaffolding

A static presentation scaffolding runtime already exists in `src/services/artifactRuntime/starterPresentationRuntime.ts`. It builds slide HTML from a template plus token values, extracts sections from parsed HTML, and maps them into an `ArtifactRunPlan`. This is currently used only for quick-start decks.

The design system work should generalize this approach: make layout-based scaffolding available to all generated slides, not just quick-start templates. The slot extraction and template token system in `starterPresentationRuntime.ts` is the right starting point.

For each visual theme, define a library of slide layouts:

- Intro slide.
- Agenda slide.
- Section breaker.
- Title slide.
- Timeline slide.
- Multi-column slide.
- Comparison slide.
- Data slide.
- Quote slide.
- Recommendation slide.
- Closing slide.

Each layout should include:

- Semantic purpose.
- HTML structure.
- CSS tokens.
- Slot map.
- Slot text budgets.
- Example content.
- Validation rules.

The model should receive:

- The chosen layout.
- The slot schema.
- The content goal.
- The allowed token/style variables.
- A small reference example.

The model should not be asked to invent the entire slide system repeatedly.

### Document Scaffolding

`src/services/artifactRuntime/documentDesignSystem.ts` already exists and defines shared module CSS classes and wrapper class naming for the document runtime. `promptPacks.ts` imports from it to build the `buildDocumentIframeContractPack` and `buildDocumentModuleContractPack` prompt packs.

The scaffolding work should extend this existing system with typed section module definitions and slot contracts, rather than creating a parallel design system.

For documents, define reusable section modules:

- Cover.
- Executive summary.
- Key findings.
- Recommendation.
- Evidence table.
- Comparison matrix.
- Timeline.
- Process.
- Risk section.
- Decision log.
- Appendix.
- Callout.
- Pull quote.

Each module should define:

- Semantic purpose.
- Heading level behavior.
- Content slots.
- Table or list rules.
- Density level.
- Visual treatment.
- Page-break preference.
- Accessibility expectations.

### Theme System

Themes should define:

- Background color.
- Primary color.
- Accent color.
- Text color.
- Font stack.
- Type scale.
- Spacing scale.
- Border radius.
- Card style.
- Table style.
- Chart colors.
- Motion preference.

User customization should start simple:

- Background color.
- Primary color.
- Visual variant.

The system should choose a default color theme automatically. The user should be able to accept that default, edit it before the first artifact is created, and edit it later.

Presentation themes and document themes should be independent systems. They can share names or visual intent, but they should not share implementation constraints. Presentations optimize for slide composition, motion, and visual impact. Documents optimize for reading flow, structure, print/export behavior, and long-form hierarchy.

The system should derive the rest.

### Agent Tools

The designer in `src/services/ai/workflow/agents/designer.ts` already uses a ToolLoopAgent with two tools: `validateSlideHtml` and `submitFinalSlide`. The proposed scaffold tools extend this exact pattern. New slot-based tools should be added to the same agent or the same loop rather than creating a parallel tool execution path.

Build internal tools that the agent can call or that runtime code can use before and after generation.

Suggested tools:

- `selectVisualVariant`
- `selectPresentationTheme`
- `selectSlideLayoutSequence`
- `selectMotionPreset`
- `selectSvgMotif`
- `scaffoldDeck`
- `populateSlideSlots`
- `fitSlideText`
- `validateSlideContract`
- `validateMotionBudget`
- `validateSvgBounds`
- `repairSlideSlot`
- `repairSlideLayout`
- `repairMotionPreset`
- `repairSvgMotif`
- `renderSlidePreview`
- `scoreSlideQuality`
- `selectDocumentTheme`
- `selectDocumentSectionSequence`
- `scaffoldDocument`
- `populateDocumentModule`
- `validateDocumentModule`
- `repairDocumentModule`
- `commitArtifactVersion`

These do not all need to be exposed as user-facing tools. Some can be internal services.

### Slot-Based Editing

The strongest editing model is slot-based.

When a slide or document section is created, preserve structured metadata:

- Layout id.
- Theme id.
- Slot ids.
- Content values.
- Generated HTML mapping.
- Last validation result.

Then edits can target:

- A slot.
- A section.
- A layout.
- A theme token.
- A motion preset.
- An SVG motif slot.

This enables precise edits:

- "Make the title shorter."
- "Add one proof point."
- "Turn this into a timeline."
- "Use the darker variant."
- "Change the primary color."
- "Make the timeline animate more subtly."
- "Replace the abstract art with a process diagram."

Slot schemas should be restrictive by default. They should allow customization through known extension points, but the default path should favor organized, high-quality design over loose freeform output. If a user asks for something custom, the system can loosen constraints deliberately for that request instead of making every request unconstrained.

### Guardrails

The system should prevent common artifact failures:

- Tiny fonts.
- Too many bullets.
- Low contrast.
- Overlapping text.
- Repeated identical slide layouts.
- Empty slides.
- Dense documents with no hierarchy.
- Full restyles for small edits.
- Repair loops that keep rewriting the same failure.
- Too many animations or animations that distract from the message.
- Unbounded SVG art that breaks layout or feels inconsistent with the theme.

### Acceptance Criteria

- Presentation runtime can scaffold a deck before content generation.
- Document runtime can scaffold sections before content generation.
- AI populates defined slots for common flows.
- Edits can target slots or sections.
- Theme tokens can be customized.
- Default color themes can be accepted, edited before creation, and edited later.
- Layout validation catches common visual failures.
- Animation and SVG guardrails prevent excessive or broken visual effects.
- Repair targets the failing part rather than regenerating everything.

## Workstream 9: Validation, Quality, And Release Process

### Goal

Create a validation process that proves the real user experience improves.

### Why This Matters

Many artifact systems pass unit tests while producing weak user output. This work needs product-quality validation, not just code correctness.

### Validation Levels

#### Level 1: Unit Tests

Use unit tests for:

- Variant registry.
- Starter kit initialization.
- Project-scoped repo paths.
- New `.aura` manifest parsing.
- Legacy `.aura` unsupported-format handling if compatibility is removed.
- Progress event conversion.
- Slot schema validation.
- Layout selection.
- Motion preset and SVG motif validation.

#### Level 2: Integration Tests

Use integration tests for:

- New project with variant.
- Presentation generation plan.
- Document generation plan.
- Edit slide slot.
- Save version.
- Export/import project.
- Export/import with history.

#### Level 3: Render Tests

Use render tests for:

- Slide is not blank.
- Fonts are above minimum size.
- Text does not overflow obvious containers.
- Colors have acceptable contrast.
- Layouts fit common viewports.

#### Level 4: Product Benchmarks

Use benchmark prompts for:

- Executive deck.
- Launch deck.
- Research deck.
- Teaching deck.
- Proposal deck.
- Long document.
- Document edit.
- Slide edit.

Track:

- Completion time.
- Number of repair attempts.
- Number of generated artifacts.
- Visual quality score.
- User-visible progress completeness.
- Whether edit appears before full run completion.

#### Level 5: Agent-In-The-App QA

The minimum acceptable screenshot QA still needs investigation. One promising direction is to let an agent interface with the running app and perform realistic creation/editing flows against a local model such as Ollama.

This could validate:

- New project creation with a visual variant.
- Default color theme acceptance and editing.
- Presentation creation with CSS animation and SVG art.
- Slide edit flow with visible step progress.
- Document manual edits and version commits.
- Export with and without history.

This should not replace deterministic tests. It should be treated as a product-quality smoke test that catches problems users actually feel: stuck progress, weak output, broken previews, and confusing UI.

### Release Gates

Do not ship the full realignment until:

- README and docs are consistent.
- API/MCP references are removed from user-facing docs.
- Starter variants are visible and saved.
- Project histories are scoped by project.
- New `.aura` format export/import works without legacy compatibility requirements.
- Presentation edit progress is visible.
- Repair loops are bounded.
- Animation and SVG scaffolds are bounded and validated.
- Benchmark decks are visibly better than baseline.

## Implementation Roadmap

### Phase 1: Clean Product Direction

Purpose: Align docs and visible product surfaces with the value-focused direction.

Tasks:

- Update README.
- Delete old API/MCP roadmap docs from active documentation.
- Update program status.
- Audit visible UI strings for API/MCP/external automation language.
- Clarify provider API language.

Deliverable:

- Documentation and UI vocabulary no longer point toward API/MCP as product direction.

### Phase 2: Simplify Runtime Contracts

Purpose: Remove dead API/MCP and dry-run/explain concepts from active code.

Tasks:

- Audit `ExecutionMode`.
- Remove or compatibility-wrap dry-run/explain fields.
- Update chat request builders.
- Update run registry types.
- Update or remove stale tests.
- Keep provider APIs intact.

Deliverable:

- Runtime contracts reflect actual product behavior.

### Phase 3: Add Visual Variants

Purpose: Let starter kits produce visibly different and higher-quality starting points.

Tasks:

- Add visual variant registry.
- Update starter kit types.
- Update project initialization.
- Update new project dialog with 4 or 5 high-quality initial variants.
- Add default color theme selection with pre-creation edit support.
- Save selected variant into project metadata.
- Thread variant into presentation and document prompts.

Deliverable:

- Users can select visual direction when starting projects.

### Phase 4: Project-Scoped Version History

Purpose: Make every project history unique and reliable.

Tasks:

- Refactor version history repo path to include project id.
- Add project repo initialization.
- Update version history panel to use active project id.
- Share project snapshot serializer with export flow.
- Add tests for isolation.

Deliverable:

- New projects no longer share one git history.

### Phase 5: Presentation Progress And Repair Reliability

Purpose: Fix the feeling of queued or endless presentation work.

Tasks:

- Standardize progress events.
- Show step count and slide count in chat.
- Add repair attempt limits and visible repair phases.
- Improve cancel and fallback behavior.
- Surface partial completion clearly.

Deliverable:

- Users can see what presentation work is doing at each stage.

### Phase 6: Presentation Design System Recovery

Purpose: Restore beautiful, exciting presentation output.

Tasks:

- Build theme registry.
- Build slide layout registry.
- Build motion preset and SVG motif registries.
- Recover useful legacy prompt and template guidance.
- Add slot-based generation for common layouts.
- Add text budgets and font-size rules.
- Add animation budgets and SVG bounds validation.
- Add screenshot-based checks where feasible.
- Benchmark old vs current vs improved output.

Deliverable:

- Generated decks are more polished, varied, and readable.

### Phase 7: Document Scaffolding

Purpose: Make document creation and editing more guided and consistent.

Tasks:

- Build document section registry.
- Connect visual variants to document themes.
- Generate section scaffolds before content.
- Add slot-based document edits.
- Validate readability and structure.

Deliverable:

- Documents feel intentionally designed and easier to edit.

### Phase 8: New `.aura` Format And History Export

Purpose: Recreate the `.aura` format from scratch and preserve version history when explicitly requested.

Tasks:

- Design the new `.aura` format without backwards-compatibility constraints.
- Decide raw git vs linear snapshot approach.
- Add default export without history.
- Add explicit export option with history.
- Add import restoration.
- Validate history payloads.
- Add round-trip tests.

Deliverable:

- New `.aura` files work cleanly, and can preserve project history when requested.

### Phase 9: UI Simplification

Purpose: Make the app feel simple and value-focused.

Tasks:

- Simplify toolbar.
- Simplify chat bar.
- Move reports to details views.
- Move diagnostics to advanced surfaces.
- Hide project rules almost completely.
- Make artifact-specific controls contextual.
- Review empty states and new project flow.

Deliverable:

- Main interface has fewer buttons and less technical noise.

## Proposed File Map

The exact file names may change during implementation, but this is a likely map.

### Documentation

- `README.md`
- `docs/program-status.md`
- `docs/roadmap/`
- `docs/product/artifact-quality.md`
- `docs/product/starter-variants.md`
- `docs/architecture/version-history.md`

### Starter Variants

- `src/services/bootstrap/visualVariants.ts`
- `src/services/bootstrap/starterKits.ts`
- `src/services/bootstrap/projectStarter.ts`
- `src/services/bootstrap/types.ts`
- `src/components/NewProjectDialog.tsx`
- `src/types/project.ts`

### Runtime Cleanup

- `src/services/runs/types.ts`
- `src/services/runs/registry.ts`
- `src/services/chat/buildRunRequest.ts`
- `src/services/chat/submitPrompt.ts`
- `src/services/contracts/outputEnvelope.ts`
- `src/services/artifactRuntime/types.ts`

### Version Control

- `src/services/storage/versionHistory.ts`
- `src/services/storage/projectSnapshot.ts`
- `src/services/storage/projectFormat.ts`
- `src/components/VersionHistoryPanel.tsx`

### Presentation Design System

Files to modify (existing):

- `src/services/artifactRuntime/presentationRuntime.ts`
- `src/services/artifactRuntime/presentationPrompts.ts`
- `src/services/artifactRuntime/presentationQualityChecklist.ts`
- `src/services/artifactRuntime/promptPacks.ts` — extend contract packs to include slot definitions and text budgets
- `src/services/artifactRuntime/starterPresentationRuntime.ts` — extend static scaffolding for layout-based generation
- `src/services/ai/templates/registry.ts`
- `src/services/ai/templates/selector.ts`
- `src/services/ai/templates/exemplar-packs.ts`
- `src/services/ai/templates/reference-style-packs.ts`
- `src/services/ai/workflow/agents/designer.ts` — extend ToolLoopAgent tools with slot-based tools
- `src/services/ai/workflow/agents/evaluator.ts` — extend scoring criteria for slot compliance

New files:

- `src/services/artifactRuntime/presentationThemes.ts`
- `src/services/artifactRuntime/presentationLayouts.ts`
- `src/services/artifactRuntime/presentationSlots.ts`
- `src/services/artifactRuntime/presentationMotion.ts`
- `src/services/artifactRuntime/presentationSvgMotifs.ts`

### Document Design System

Files to modify (existing):

- `src/services/artifactRuntime/documentRuntime.ts`
- `src/services/artifactRuntime/documentDesignSystem.ts` — **already exists**; extend with typed section modules and slot definitions
- `src/services/artifactRuntime/documentPrompts.ts`
- `src/services/artifactRuntime/documentQualityChecklist.ts`
- `src/services/artifactRuntime/promptPacks.ts` — extend document contract packs

New files:

- `src/services/artifactRuntime/documentSections.ts`
- `src/services/artifactRuntime/documentThemes.ts`

### Progress

Files to modify (existing):

- `src/services/chat/workflowProgress.ts` — **already exists**; the primary extension point for step count, slide count, and queue depth
- `src/services/ai/workflow/batchQueue.ts` — extend to emit total count into progress events
- `src/services/artifactRuntime/presentationRuntime.ts` — extend heartbeat and step events to include total
- `src/components/chat/handlers/presentationHandler.ts`

New files:

- `src/services/runs/progress.ts`
- `src/services/artifactRuntime/progress.ts`
- `src/components/chat/RunProgress.tsx`

### UI Simplification

- `src/components/Toolbar.tsx`
- `src/components/ChatBar.tsx`
- `src/components/ProjectInitReportDialog.tsx`
- `src/components/RunHistoryPanel.tsx`
- `src/components/DoctorPanel.tsx`
- `src/components/ProjectRulesPanel.tsx`

## Detailed Acceptance Criteria

### Product And Docs

- README describes Aura as a local-first artifact creation workspace.
- README includes current artifact types.
- README accurately describes provider settings.
- Old API/MCP roadmap docs are deleted from active documentation.
- Program status matches current product priorities.
- Architecture docs distinguish provider APIs from removed external Aura APIs.

### API/MCP Cleanup

- No active product UI mentions MCP.
- No roadmap positions MCP as upcoming product value.
- No active code depends on external adapter directories.
- Dry-run and explain modes are removed or legacy-compatible only.
- Tests do not preserve dead product vocabulary unless intentionally guarding compatibility.

### Starter Variants

- New project flow includes a visual direction choice.
- First release includes 4 or 5 high-quality variants.
- Variant architecture can grow to around 10 variants later.
- Variants include theme, prompt, layout, and document metadata.
- Variant choice persists in project data.
- Variant choice changes generated artifact style.
- A default color theme is chosen automatically and can be edited before artifact creation.

### UI Simplicity

- Primary toolbar actions are reduced.
- Chat bar is focused on prompting and sending.
- Reports move behind detail interactions.
- Validation and run history are not primary default actions.
- Advanced controls remain accessible.
- Project rules are almost completely hidden and primarily changed through user input.

### Chat Progress

- Long runs show "Step X of Y."
- Presentation creation shows "Slide X of N."
- Document creation shows "Section X of N."
- Repair attempts are visible.
- Queue state is visible.
- Stalled work shows a heartbeat or cancel path.

### Version Control

- Each project has a unique repo.
- Histories do not mix between projects.
- Version history panel is scoped to the active project.
- New project creates a fresh history.
- Imported project creates or restores a fresh history.
- `.aura` format is rebuilt without legacy backwards-compatibility requirements.
- `.aura` export can include history through an explicit option.
- Import validates history payloads safely.

### Presentations

- Decks have stronger visual hierarchy.
- Slides use readable font sizes.
- Slide layouts vary appropriately.
- Edits to a single slide do not require whole deck regeneration.
- Progress does not appear stuck during queued work.
- Repair loops are bounded.
- Screenshot or render validation catches blank/broken slides.
- CSS animation and SVG art are scaffolded through approved presets.
- Motion budgets prevent excessive or distracting animation.

### Documents

- Document sections are scaffolded before content generation.
- Document themes connect to visual variants.
- Document themes are developed independently from presentation themes.
- Editing can target sections or slots.
- Documents maintain hierarchy, spacing, and readable density.

## Risks And Mitigations

### Risk: Removing The Wrong API Concept

Mitigation:

- Clearly distinguish external Aura API/MCP from provider API connectivity.
- Keep provider settings and diagnostics intact.
- Rename docs to make this boundary obvious.

### Risk: Visual Variant Scope Expands Too Much

Mitigation:

- Start with 4 or 5 complete curated variants.
- Do not expose every template as a separate choice.
- Make variants structured metadata, not a large custom theme editor.
- Design the registry so it can expand toward around 10 variants later.

### Risk: Project History Export Makes `.aura` Files Too Large

Mitigation:

- Make history export optional.
- Consider linear snapshots if raw git is too heavy.
- Add export size warnings later if needed.

### Risk: Slide Scaffolding Reduces Creativity

Mitigation:

- Provide enough layout families per theme.
- Allow controlled custom layouts for advanced requests.
- Use variants to keep visual diversity.
- Keep the system opinionated but not rigid.

### Risk: Animation And SVG Art Becomes Noisy

Mitigation:

- Use approved motion presets rather than unconstrained animation generation.
- Define SVG motif families per theme.
- Validate motion count, duration, bounds, and reduced-motion behavior.
- Allow expressive art on cover, section-breaker, and visual slides while keeping content-heavy slides restrained.

### Risk: Screenshot QA Is Expensive Or Flaky

Mitigation:

- Start with basic render checks.
- Use screenshot QA for benchmark and repair workflows first.
- Keep deterministic HTML/CSS checks as a fast first layer.

### Risk: UI Simplification Hides Useful Power

Mitigation:

- Move advanced tools behind details or command menus.
- Preserve keyboard shortcuts where useful.
- Let advanced users open diagnostics when needed.

### Risk: Refactoring Version History Breaks Restore

Mitigation:

- Build project-scoped repo tests before broad integration.
- Rebuild the `.aura` format cleanly rather than preserving legacy import behavior.
- Avoid destructive migration of current local project state on first load.
- Preserve current project state before switching repo behavior.

## Resolved Review Decisions

1. `.aura` history export should be offered as an explicit "Export with history" option.
2. Imported project identity can go either way. If importing with history, preserving the original project id is likely better because history belongs to that identity. If importing without history, assigning a fresh project id is likely safer.
3. The first visual variant release should ship 4 or 5 high-quality variants. The system should later grow toward around 10 variants.
4. Aura should choose a default color theme. The user can accept it, edit it before artifact creation, and edit it later.
5. Document themes and presentation themes should be separate systems. They should be planned independently.
6. Slot schemas should allow customization, but should be more restrictive and organized by default so output quality is higher than today's loose freeform path.
7. Old API/MCP docs should be deleted from active documentation.
8. The minimum acceptable screenshot QA still needs investigation. An additional path to explore is agent-in-the-app testing against the local app and a local Ollama model.
9. Project rules should be almost completely hidden. They should be good by default and adjusted through user input rather than routine manual configuration.
10. Version history should commit artifact-changing responses and user manual changes, not every assistant response.

## Remaining Investigation Notes

- Decide whether history import should always preserve project id or only preserve it when history is included.
- Decide whether raw git export or linear snapshot export is the best first implementation for history.
- Define the first 4 or 5 visual variants.
- Define the minimum render/screenshot QA that is reliable enough for the first release.
- Prototype local agent-in-the-app QA using the running app and a local model.

## Immediate Next Slice

The recommended first implementation slice is:

1. Update documentation direction and delete old API/MCP roadmap docs from active documentation.
2. Add visual variant registry and project metadata for the first 4 or 5 high-quality variants.
3. Update new project dialog to select a variant and accept or edit the default color theme.
4. Thread the variant into starter kits and presentation/document prompt context while keeping document and presentation theme systems independent.
5. Add explicit presentation progress labels for slide count and phase count.
6. Add the first scaffolded CSS animation and SVG motif constraints for presentation themes.

This slice is valuable because it is visible to users quickly, clarifies the product direction, and starts improving artifact quality without requiring the full version-control refactor first.

The recommended second implementation slice is:

1. Refactor version history to be project-scoped.
2. Add tests for history isolation.
3. Update version history panel to use active project id.
4. Create a shared project snapshot serializer.
5. Design the new `.aura` format without backwards-compatibility constraints.
6. Add default export and explicit "Export with history" paths.

The recommended third implementation slice is:

1. Build presentation theme and layout registries.
2. Build CSS motion preset and SVG motif registries.
3. Recover useful legacy prompt/template guidance.
4. Add slot-based generation for the most common slide layouts.
5. Add render or screenshot validation for blank and broken slides, animation bounds, and SVG rendering.
6. Benchmark against current presentation output.

## Final Direction

Aura should stop presenting itself as a future API/MCP platform and become a sharper product for creating and editing excellent artifacts.

The next phase should make the app feel:

- Simpler.
- More visual.
- More guided.
- More reliable.
- More transparent.
- More project-aware.

The best path is to reduce surface area while increasing internal structure. Users should see fewer buttons, fewer reports, and fewer technical concepts. The system underneath should become more opinionated: variants, themes, layouts, slots, motion presets, SVG motifs, validation, progress, and project-scoped history.

That combination should make Aura feel more valuable immediately: easier to start, easier to trust, easier to edit, and much better at producing the polished presentations and documents that users actually want.
