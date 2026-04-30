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
