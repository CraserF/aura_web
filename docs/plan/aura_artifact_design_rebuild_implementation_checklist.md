# Aura Artifact Design Rebuild Implementation Checklist

This checklist turns the research docs into an implementation sequence. Use it after reading:

- `docs/plan/presentation_scaffold_recovery_plan.md`
- `docs/plan/reference-huashu-design-lessons.md`
- `docs/plan/reference-open-design-lessons.md`
- `docs/plan/reference-guizang-ppt-lessons.md`
- `docs/plan/reference-harness-engineering-lessons.md`
- `docs/plan/aura_artifact_design_recovery_synthesis.md`
- `docs/plan/aura_artifact_design_system_rebuild_plan.md`

## Current Decision

Do not keep polishing the current `executive-editorial-v1` scaffold as the main path. It is structurally useful but visually too generic. Treat it as a prototype that proved the compiler idea, then replace the default design language with a stronger artifact-pack system.

## Branch

Planning branch:

- `codex/presentation-design-recovery-research`

Recommended implementation branch after docs are reviewed:

- `codex/artifact-pack-design-rebuild`

## Execution Tracker

Use this section as the live source of truth before starting each work session. Update it in the same PR/commit as implementation changes.

Status key:

- `Done`: implemented and verified.
- `Active`: current phase; do this before starting broad new surfaces.
- `Active/Next`: active hardening slice while an earlier gate remains open.
- `Next`: next major phase after the active gate passes.
- `Queued`: important, but intentionally deferred.
- `Blocked`: cannot proceed until the blocker is removed.

| Phase | Status | Goal | Current Gate | Evidence | Next Action |
| --- | --- | --- | --- | --- | --- |
| 0. Research and synthesis docs | Done | Capture lessons from reference repos and convert them into Aura-owned rules. | Docs exist in `docs/plan`. | Reference lessons, synthesis, rebuild plan. | Keep docs linked from this checklist. |
| 1. Artifact pack foundation | Done | Add pack types, registry, directions, design context, and source metadata. | Registry/types compile and tests pass. | `artifactPacks` foundation and registry tests. | Extend only when a pack requires it. |
| 2. Editorial Stage default presentation pack | Done | Replace prompt-authored decks with compiler-owned presentation source payloads. | Default presentation create uses `presentation/editorial-stage-v1`. | Pack runtime routing tests. | Keep legacy scaffold out of normal UI/runtime. |
| 3. Source-backed presentation edits | Done | Text edit, add-slide, and restyle patch source payloads and recompile. | No `designEdit`/`runBatchQueue` for pack-backed source edits. | `artifact-pack-runtime-routing.test.ts`. | Add repair loops for rejected source edits later. |
| 4. Simplified creation UI | Done | Users choose artifact shape and style direction, not scaffold/theme internals. | No scaffold/theme/export/color picker in default new-project flow. | UI and UX simplification tests. | Add guided edit chips after visual gate. |
| 5. Editorial Stage visual quality gate | Active | Make the default deck visually credible across directions. | Full screenshot review remains open. | Compiler, validator, render smoke, regenerated example, 24 headless screenshots in `/private/tmp/editorial-stage-visual-gate`. | Finish screenshot review; only then mark Phase 5 done or log concrete fixes. |
| 6. Real media asset rendering | Done | Harden actual project media rendering in declared pack slots. | Safe media resolves before compile and missing/unsafe required media blocks. | Media resolver, compiler/runtime threading, example media fixture, focused tests, full test suite. | Carry export-specific media restrictions into Phase 10. |
| 7. Source-payload repair and edit safety | Active | Repair rejected source payloads and fail closed on unsafe edits. | Fail-closed routing is in place; targeted source repair loops remain. | Pack edit fallback, unsupported edit, no-op edit, validation persistence, CSS isolation, slide dimension, and ESLint regressions covered. | Add structured repair attempts for rejected slot/media/rhythm payloads. |
| 8. Guided edit chips | Queued | Offer simple user controls that map to typed source operations. | Chips map to supported edit surfaces only. | Pending. | Add after Phase 5/6 gates so chips improve a solid default instead of masking weak output. |
| 9. Design-system mode | Queued | Parse project `DESIGN.md`/rules into validated tokens and examples. | Project design context previews compile without arbitrary CSS. | Pending. | Start after guided edit surfaces are stable. |
| 10. Export and preview gates | Queued | Add export-intent constraints and generated preview artifacts. | HTML/PDF/PPTX-safe restrictions are validated; `artifact.preview.png` exists for packs. | Pending. | Add after media rendering because exports must handle real assets. |
| 11. Document packs | Queued | Add source-payload document packs without presentation-shaped UI. | `document/executive-memo-v1` compiles and validates. | Pending. | Start only after presentation visual gate passes. |
| 12. Spreadsheet packs | Queued | Add deterministic workbook packs with formulas/charts/style validation. | `spreadsheet/operating-model-v1` compiles and validates. | Pending. | Start after document pack foundation or explicit priority shift. |
| 13. Pack gallery and save-as-pack | Queued | Show compiled examples and later save current artifacts as pack candidates. | Gallery uses compiled Aura-owned examples. | Pending. | Do not begin before default packs look excellent. |

### Active Phase Exit Criteria

Phase 5 is not complete until all are true:

- Example source and compiled HTML match exactly through compiler regeneration tests.
- Direction variants for `editorial-magazine`, `modern-minimal`, and `data-utility` compile from the same source.
- Screenshot or render gate confirms fixed 1280x720 stage, no blank slides, no visible placeholder media for optional slots, and no text/element collision in the example deck.
- Validator reports zero blocking findings and zero unwaived craft advisories for fake metrics, missing media, fallback copy, card/media-wall run, repeated adjacent layouts, and breaker gaps.
- Any remaining visual concern is documented as a concrete next action, not a vague "make it nicer" note.

### Phase 6 Exit Criteria

Phase 6 is not complete until all are true:

- Project media is available to the presentation pack compiler during create and source-backed edit flows.
- Media bindings keep only source-safe asset ids in `artifactSourcePayload`; compiled HTML receives resolved `src` values from the host resolver.
- Required media slots with missing project assets block persistence; optional unresolved media only creates targeted advisory feedback.
- Bound media renders as semantic `<img>` markup inside the locked media frame with crop class, `alt`, `role`, `aria-label`, and `data-asset-id`.
- Example media fixtures compile into `examples/example.html` so the gallery/regression path tests real images, not placeholder labels.
- Tests cover resolver normalization, real image compilation, unresolved required media, and runtime resolver threading.

### Phase 7 Active Work

Do not expand edit features until these stay true:

- Pack-backed edits must not fall back to freeform HTML/CSS for supported source surfaces.
- Unsupported edit surfaces fail closed with targeted feedback.
- Blocking validation results do not persist artifact/edit outputs.
- Pack CSS stays isolated from host/project CSS.
- Slide dimensions remain locked through compile/render/export previews.
- Changed source and test files pass targeted ESLint cleanup.
- Rejected slot/media/rhythm payloads receive targeted repair attempts instead of falling back to full HTML/CSS generation.

### Anti-Drift Rules

- Do the active phase before queued phases unless the user explicitly reprioritizes.
- Prefer one large structural improvement over many small prompt or copy tweaks.
- Do not add new user-facing choices to compensate for weak defaults.
- Do not let the model write raw presentation CSS or full-slide HTML in the normal pack path.
- Do not mark a phase done without tests or a documented manual gate.
- If a change does not improve source payloads, compiler output, validation, or the user-facing default flow, treat it as refinement and defer it.

## Progress Log

### 2026-04-30 - Presentation Source-Edit Runtime And Simplified Creation UI

Completed on `codex/artifact-pack-design-rebuild`:

- Added an editorial-stage source operation layer so text edits, add-slide requests, and restyles patch the pack source payload and recompile instead of asking the model to rewrite HTML/CSS.
- Routed manifest-backed `presentation/editorial-stage-v1@1.0.0` edits through the deterministic source-edit runtime before queued/freeform generation.
- Persisted source-backed edit outputs with refreshed `artifactManifest` and updated `artifactSourcePayload`; blocking compile validation keeps the previous source payload.
- Passed active presentation `artifactManifest` and `artifactSourcePayload` into the presentation workflow during edits.
- Made add-slide and restyle request detection explicit in the artifact run plan.
- Simplified the new-project flow by removing default scaffold/theme/export/audience/slide-count/color-picker controls and keeping style direction as the guided user choice.
- Mapped visual variants to artifact design directions through project rules using `Design direction: <id>`.
- Added contract tests proving source-backed text edits, add-slide, and restyle do not call `runBatchQueue` or `designEdit`.

Verification completed:

- `npm test -- src/test/artifact-pack-runtime-routing.test.ts src/test/editorial-stage-compiler.test.ts src/test/editorial-stage-validator.test.ts src/test/artifact-pack-registry.test.ts src/test/artifact-pack-design-context.test.ts src/test/new-project-dialog.test.tsx src/test/init-project.test.ts src/test/ux-simplification.test.ts`
- `npm run typecheck`
- targeted ESLint on changed source and test files
- `git diff --check`
- `npm run build`

Remaining next phase:

- Improve the visual craft of the editorial-stage layouts and example deck, then run the manual screenshot quality gate.
- Add stronger source-payload repair for rejected slot edits instead of only conservative prompt parsing.
- Begin document pack source-payload foundations after the presentation pack passes the visual gate.

### 2026-05-01 - Editorial Stage Visual Craft Gate Slice

Completed on `codex/artifact-pack-design-rebuild`:

- Added direction-aware compiler output: every slide now receives `data-direction` and an `es-direction-*` class so direction changes can alter tokens and typographic/layout posture.
- Added direction-specific CSS tokens and posture adjustments for modern-minimal, data-utility, warm-narrative, and bold-editorial.
- Removed the radial decorative gradients from cover/closing and replaced them with rule/grid treatments aligned to the pack design guide.
- Omitted unbound optional media frames so optional media layouts do not show empty patterned placeholders.
- Marked bound media with asset id, crop class, accessible label, and explicit bound-media styling.
- Added validator gates for required media, invalid media aspect/crop, and generic fallback copy.
- Replaced generic fallback copy in source builders with less placeholder-like defaults.
- Rebuilt `examples/source.json` as an 8-slide reference deck with a bound lead-media evidence slide, comparison, pipeline, and closing.
- Regenerated `examples/example.html` from the actual compiler and added tests to prevent source/example drift.
- Added jsdom render smoke coverage for fixed-stage metadata, dimensions, and direction classes.

Verification completed:

- `npm test -- src/test/editorial-stage-compiler.test.ts src/test/editorial-stage-validator.test.ts src/test/editorial-stage-render-smoke.test.ts src/test/artifact-pack-runtime-routing.test.ts`

Remaining next phase:

- Run the manual screenshot gate across at least editorial-magazine, modern-minimal, and data-utility.
- Add real project media asset resolution so media bindings can render actual images rather than metadata-backed evidence frames.
- Expand layout craft on media-grid/comparison/process-pipeline if screenshots still read as equal-panel card walls.

### 2026-05-01 - Tracker And Real Media Rendering Slice

Completed on `codex/artifact-pack-design-rebuild`:

- Added the execution tracker as the live source of truth with explicit active/next/queued phase statuses, phase gates, evidence, and anti-drift rules.
- Added a Phase 6 exit checklist so media rendering cannot be marked done unless project media resolves through the host compiler path and missing required media blocks persistence.
- Added `createProjectMediaResolver()` for project media assets with normalized `media/` paths and rejection of unsafe/out-of-namespace paths.
- Threaded project media into the presentation workflow, editorial-stage queue runtime, and source-backed edit runtime.
- Updated the editorial-stage compiler so bound media renders semantic `<img>` markup from resolved project assets while source payloads keep only asset ids.
- Added validation feedback for unresolved required media and unresolved compiled media placeholders.
- Added an example media fixture and regenerated `examples/example.html` with a real data-URL image in the lead-media slot.
- Expanded deterministic render smoke coverage across `editorial-magazine`, `modern-minimal`, and `data-utility`, including direction metadata, media metadata, and no radial-gradient CSS.
- Added a source-backed edit regression proving media survives deterministic recompilation after a text edit.
- Ran a headless Chrome visual gate that generated 24 per-slide screenshots across `editorial-magazine`, `modern-minimal`, and `data-utility` into `/private/tmp/editorial-stage-visual-gate`.
- Fixed the largest screenshot issues found in the gate: lead-media body copy no longer inherits uppercase label styling, and comparison verdicts now remain visible with tighter lane rhythm.

Verification completed:

- `npm test -- src/test/artifact-pack-media-resolver.test.ts src/test/editorial-stage-compiler.test.ts src/test/editorial-stage-validator.test.ts src/test/editorial-stage-render-smoke.test.ts src/test/artifact-pack-runtime-routing.test.ts`
- targeted ESLint on changed source/test files
- `git diff --check`
- `npm run build`

Remaining current gate:

- Review the full screenshot set in `/private/tmp/editorial-stage-visual-gate` for any remaining subtle layout issues before marking Phase 5 done.
- Then begin Phase 7 source-payload repair loops, using the validator finding ids added in Phase 5/6 as repair targets.

### 2026-05-01 - Review Pass And Safety Hardening

Review update:

- A review pass kept Phase 5 open while the screenshot set is still being checked.
- Phase 6 moved back into hardening after media rendering review findings.
- Phase 7 is now the active/next safety slice, blocked on pack edit fallback, unsupported edit surfaces, validation persistence, CSS isolation, slide dimensions, and ESLint cleanup.
- Current focus is hardening source/edit safety before expanding feature surfaces.

Completed in this slice:

- Blocked pack-backed edit runs without a matching source payload so they no longer fall through to freeform HTML/CSS generation.
- Stopped failed or safety-blocked presentation outputs from replacing the document/source of truth in the chat handler.
- Added fail-closed routing for unsupported restructure/media replacement edits, while keeping explicit text-slot edits supported.
- Blocked no-op source edits so unchanged decks are not reported or persisted as successful edits.
- Hardened project media resolution to require safe image data URLs matching the declared MIME type.
- Treated missing media resolvers as unresolved media for required slots.
- Routed normal pack creates through available project media when the slide brief asks for visual evidence.
- Scoped live presentation CSS in the Reveal engine and removed generic project color aliases that could leak into app controls.
- Aligned the live Reveal stage to the pack's 1280x720 contract.
- Cleared ESLint errors and warnings, including build-only plugin/test type issues.

Verification completed:

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`

Remaining current gate:

- Phase 5 still needs the screenshot review to be closed or turned into concrete fixes.
- Phase 7 still needs structured repair attempts for rejected source payloads before guided edit chips expand the edit surface.

## Implementation Order

### 1. Stabilize The Planning Docs

- Keep the reference lesson docs in `docs/plan`.
- Link them from `presentation_scaffold_recovery_plan.md` or a follow-up index.
- Do not vendor code/assets from reference repos.
- Move stable contracts out of `docs/plan` only after implementation starts.

### 2. Add Artifact Pack Types

Create:

- `src/services/artifactPacks/types.ts`
- `src/services/artifactPacks/registry.ts`
- `src/services/artifactPacks/directions/auraDirections.ts`
- `src/services/artifactPacks/designContext.ts`

Minimum types:

- `ArtifactPack`
- `ArtifactPackManifest`
- `ArtifactDesignDirection`
- `ArtifactSourcePayload`
- `ArtifactStructurePlan`
- `ArtifactEditSurface`
- `ArtifactValidationFinding`
- `DesignContextSpec`
- `MediaBindingPlan`
- `DataBindingPlan`

Acceptance:

- Types compile.
- Registry can list one placeholder/internal pack.
- Tests assert ids are unique and directions include required fields.

### 3. Add Source Payload Storage

Extend artifact documents so generated artifacts can store source state:

- pack id/version;
- direction id;
- design context id/spec;
- structure/rhythm plan;
- slot/module/workbook payload;
- compiled output;
- validation report.

Acceptance:

- Existing artifacts remain readable.
- New packed artifacts can be edited from source payload rather than reparsing compiled HTML.

### 4. Replace Presentation Default Pack

Create a new presentation pack:

- `src/services/artifactPacks/packs/presentation/editorial-stage-v1/`

Do not copy Guizang/Huashu/Open Design code. Build Aura-owned skeletons and CSS.

Skeletons:

- cover
- section-divider
- big-number
- story-split
- media-grid
- process-pipeline
- question-hero
- big-quote
- comparison
- lead-media
- decision
- closing-action

Design requirements:

- strong type personality;
- fewer cards;
- no generic circular motif;
- real media slots;
- theme rhythm;
- direction changes alter type/layout posture, not only colors.

Acceptance:

- One excellent example deck exists as source payload and compiled output.
- Default generation uses this pack.
- Current `executive-editorial-v1` is not the normal default.

### 5. Add Presentation Design Validators

Add named failures:

- `presentation.card_wall`
- `presentation.generic_motif`
- `presentation.theme_only_direction`
- `presentation.fake_metric`
- `presentation.weak_hierarchy`
- `presentation.no_breaker_rhythm`
- `presentation.asset_missing_when_required`
- `presentation.chrome_kicker_duplicate`
- `presentation.title_too_long_for_layout`
- `presentation.accent_overuse`
- `presentation.media_crop_risk`

Acceptance:

- Tests include failure fixtures for each important check.
- Repair loop targets source payloads or allowed skeleton swaps only.

### 6. Simplify Creation UI

Replace internal scaffold choices with:

- recommended artifact type;
- recommended style direction;
- optional length/audience;
- optional use brand/assets;
- advanced details drawer.

Direction UI:

- one recommended card;
- at most two alternatives by default;
- show palette, type sample, mood, best-for, and preview.

Acceptance:

- A user can create a deck without choosing scaffold/theme/export settings.
- Advanced users can still inspect/change settings.
- Project rules store decisions in plain language.

### 7. Add Document Packs

Start with:

- `document/executive-memo-v1`
- `document/research-brief-v1`

Acceptance:

- Documents compile from module payloads.
- Document validator catches heading/table/source/tone issues.
- UI does not reuse presentation-specific terms.

### 8. Add Spreadsheet Packs

Start with:

- `spreadsheet/operating-model-v1`
- `spreadsheet/data-dashboard-v1`

Acceptance:

- Workbooks compile from sheet/table/formula/chart specs.
- Formula and reference validation runs before export.
- Generated/protected/source cells are styled consistently.

### 9. Add Design System Mode

Support project `DESIGN.md` as a first-class artifact:

- parsed tokens;
- preview sample;
- artifact-type adapters;
- project-level style selection.

Acceptance:

- Presentation/document/spreadsheet packs can consume the same design system through adapters.
- Arbitrary colors are not passed directly to compilers without mapping/validation.

### 10. Add Artifact Library

Add a gallery for:

- packs;
- examples;
- design systems;
- starting templates.

Acceptance:

- Gallery is not required to start a normal artifact.
- Examples are compiled from Aura-owned source payloads.
- Users can start from a preview without understanding pack internals.

## Stop Conditions

Pause implementation and reassess if:

- the default generated deck still looks like generic cards after Phase 4;
- direction changes only modify colors;
- users must pick more than three design settings to get a good result;
- source payloads are not persisted;
- examples cannot pass render smoke tests;
- validators cannot name why a deck looks bad.

## Manual Quality Gate For The New Deck Pack

Before making the new pack default:

1. Generate the same 8-slide brief in:
   - Editorial Magazine
   - Modern Minimal
   - Data Utility
2. Capture fixed-canvas screenshots.
3. Confirm:
   - obvious first focal point on every slide;
   - no card wall;
   - no motif-only decoration;
   - no overflow;
   - readable type;
   - rhythm reset every 3-4 slides;
   - direction difference is visible beyond color.

## What Not To Do

- Do not add more prompt text to hide weak templates.
- Do not expand the current scaffold with more color themes as the main fix.
- Do not ask users to choose every style setting.
- Do not copy reference repo assets or code.
- Do not make documents/spreadsheets presentation-shaped.
- Do not ship packs without examples.
