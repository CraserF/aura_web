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
| 5. Editorial Stage visual quality gate | Done | Make the default deck visually credible across directions. | Fresh CDP screenshot gate passes across `editorial-magazine`, `modern-minimal`, and `data-utility`. | Compiler, validator, render smoke, regenerated example, original failure screenshots, 24 closure screenshots in `/private/tmp/editorial-stage-visual-gate` with `-cdp.png` suffixes, and `docs/plan/editorial-stage-visual-gate-review.md`. | Use CDP viewport capture for future manual screenshot gates on this machine. |
| 6. Real media asset rendering | Done | Harden actual project media rendering in declared pack slots. | Safe media resolves before compile and missing/unsafe required media blocks. | Media resolver, compiler/runtime threading, example media fixture, focused tests, full test suite. | Carry export-specific media restrictions into Phase 10. |
| 7. Source-payload repair and edit safety | Done | Repair rejected source payloads and fail closed on unsafe edits. | Repairable source-slot/media defects are fixed before persistence; unsafe real-media gaps still block. | Pack edit fallback, unsupported edit, no-op edit, validation persistence, CSS isolation, slide dimension, source repair, version snapshot, and ESLint regressions covered. | Keep review loop active while starting guided edit chips. |
| 8. Guided edit chips | Done | Offer simple user controls that map to typed source operations. | Chips map to supported edit surfaces only. | Pack-scoped composer chips, unsupported-surface messaging, chat/runtime tests. | Extend only when a typed edit surface exists. |
| 9. Design-system mode | Done | Parse project `DESIGN.md`/rules into validated tokens and examples. | Presentation, document, and spreadsheet project-design tokens compile through pack-owned adapters. | Safe token-role resolver, project design metadata, Project colours preview UI, runtime color-theme threading, shared adapter interface, Editorial Stage CSS adapter, Executive Memo document-token adapter, Operating Model spreadsheet-theme adapter, design-context/compiler/UI/run-request/pack tests. | Carry the same adapter discipline into later runtime routing; never add artifact-specific raw CSS bypasses. |
| 10. Export and preview gates | Done | Add export-intent constraints and generated preview artifacts. | Browser-side preview smoke passes for a fresh pack-backed deck. | Compiled-output export validator blocks viewport units, missing export backgrounds, missing reduced-motion fallback, editable-PPTX unsafe CSS/text patterns, Editorial Stage exposes `examples/preview.png`, runtime preview metadata/media round-trips through `.aura` and snapshots, and `node scripts/run-presentation-preview-smoke.mjs` passes with a 1280x720 PNG. | Carry export/preview constraints into document and spreadsheet packs when Phases 11/12 start. |
| 11. Document packs | Done | Add source-payload document packs without presentation-shaped UI. | Executive-memo-like document creates route through `document/executive-memo-v1`; edits and image creates stay on existing safe paths. | Registered document pack, source schema, scoped CSS, deterministic compiler, document validator, generated example, pack runtime routing, persisted source payload/manifest, and `executive-memo-pack`/document-runtime/registry tests. | Next document slice can add source-backed edits or a second document pack when prioritized. |
| 12. Spreadsheet packs | Done | Add deterministic workbook packs with formulas/charts/style validation. | `spreadsheet/operating-model-v1` compiles and validates. | Operating Model source schema, manifest, deterministic JSON compiler, spreadsheet-theme adapter, formula/cell-safety validator, examples, registry wiring, independent review, focused pack tests, and full verification. | Next spreadsheet slice can be runtime routing, deterministic XLSX export, or `spreadsheet/data-dashboard-v1` when prioritized against the open Phase 11 routing gate. |
| 13. Pack gallery and example starts | Done | Show compiled examples and let users start from supported examples without exposing pack internals. | Artifact Library starts projects from Aura-owned examples while save-as-pack stays deferred. | Gallery data model, toolbar entry point, Artifact Library dialog, deterministic example project service, shipped media carry-forward, disabled save-as-pack affordance, review fixes, and focused gallery/start tests. | Keep save-as-pack queued until candidate-authoring contracts and quality review are defined. |

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

Do not expand edit features unless these stay true:

- Pack-backed edits must not fall back to freeform HTML/CSS for supported source surfaces.
- Unsupported edit surfaces fail closed with targeted feedback.
- Blocking validation results do not persist artifact/edit outputs.
- Pack CSS stays isolated from host/project CSS.
- Slide dimensions remain locked through compile/render/export previews.
- Changed source and test files pass targeted ESLint cleanup.
- Rejected source-slot and repairable media payloads receive targeted repair attempts instead of falling back to full HTML/CSS generation.
- Real required-media gaps remain blocking unless the requested asset is actually available.

### Phase 9 Active Work

Phase 9's presentation, document, and spreadsheet adapter proof is complete. Keep these invariants true as later runtime routing lands:

- Project `DESIGN.md`/rules are parsed into a typed `projectDesignSystem` model with validated token roles and ignored-line diagnostics.
- Pack compilers consume project design only through pack-owned adapters and CSS variables; raw CSS, gradients, functions, custom properties, and unknown roles remain rejected.
- The UI exposes a preview of accepted project design tokens and ignored lines before users rely on the design system for generation. Completed for project rules through the Project colours preview.
- Editorial Stage has regression coverage proving project design tokens affect compiled output without escaping the pack style boundary.
- Document and spreadsheet packs define adapter contracts before runtime routing or export code consumes project design tokens.
- Phase 10 preview/export work preserves the same token validation path instead of adding an export-only style bypass.

Phase 9 carry-forward doc updates:

- The first document adapter evidence is in Phase 11 through `document/executive-memo-v1`.
- The first workbook/table/chart adapter evidence is in Phase 12 through `spreadsheet/operating-model-v1`.
- When preview artifacts land, record whether `artifact.preview.png` and export targets used the same validated project design tokens.

### Phase 11 Active Entry Guard

The user explicitly reprioritized starting Workstream/Phase 11 before the Phase 5 visual screenshot review was formally closed. Keep the Phase 11 entry narrow so the program does not drift:

- Allowed now: define `document/executive-memo-v1` source payload types, manifest metadata, pack compiler, design-token adapter contract, validator, and focused tests.
- Allowed now: record the first document-side evidence for Phase 9 once a document adapter maps validated project design tokens into document-owned style tokens.
- Defer: document gallery UI, save-as-pack, many document pack variants, spreadsheet packs, and any presentation visual refinements not coming from the Phase 5 screenshot review.
- Phase 5 is now done because the screenshot set was converted into concrete logged fixes and rerun; do not reopen it without new visual evidence.
- Phase 9 was not marked done from the document adapter alone; keep that historical guard as context for why the Phase 12 spreadsheet adapter proof was required.

### Phase 12 Active Entry Guard

The user explicitly reprioritized Workstream/Phase 12 before Phase 5's visual screenshot review was formally closed. Keep the spreadsheet entry narrow so the program does not drift:

- Allowed now: define `spreadsheet/operating-model-v1` source payload types, manifest metadata, pack compiler, spreadsheet-theme adapter contract, validator, examples, and focused tests.
- Allowed now: record the first spreadsheet-side evidence for Phase 9 once a spreadsheet adapter maps validated project design tokens into workbook/table/chart style roles.
- Defer: spreadsheet runtime create/edit routing, deterministic XLSX export, spreadsheet gallery UI, save-as-pack, many spreadsheet variants, and any second pack until the first pack passes review and full verification.
- Phase 5 was not marked done because spreadsheet work moved forward; it is done because the visual fixes were implemented and the CDP screenshot gate was rerun.
- Do not let spreadsheet packs accept arbitrary formulas, external references, HTML fragments, raw CSS, or unvalidated theme colours.

### Phase 13 Completion Notes

Workstream/Phase 13 shipped as a browseable library plus start-from-example foundation, not a new required choice in the creation flow:

- Completed: gallery data derived from `ArtifactPackManifest.examples`, a toolbar library entry point, compiled example metadata, preview paths, pack type/status/direction/output information, and a clearly disabled save-as-pack affordance.
- Completed: users can start from supported shipped examples through deterministic host code that compiles/validates Aura-owned source payloads and persists `artifactManifest`/`artifactSourcePayload`.
- Completed: the Editorial Stage example carries its shipped media asset into the project shell so future source-backed edits can resolve the same media id.
- Keep deferred: generated thumbnail previews for document/spreadsheet packs, editable design-system gallery, save-current-as-pack, and pack authoring workflows.
- Do not add extra choices to the default new-project flow to compensate for weak defaults. The library is for discovery, inspection, and future advanced starts.
- Do not implement save-as-pack until candidate manifests, source sanitization, preview regeneration, and quality review gates are specified.

### Phase 10 Preview Artifact Gate

Do not mark the preview artifact slice complete until all are true:

- The Editorial Stage generated example preview is tracked at `examples/preview.png`.
- The Editorial Stage manifest exposes that asset through `examples[].previewPath`.
- Registry coverage asserts the exposed preview path, not only the compiled HTML example.
- The manifest no longer carries the seed-era caveat that preview generation is omitted.
- The preview artifact is regenerated from the same validated source/design-token path as the compiled example.
- Runtime-created presentation artifacts generate a `media/artifacts/{documentId}/artifact.preview.png` `ProjectMediaAsset`.
- `ProjectDocument.artifactPreview` stores the semantic pointer, dimensions, generated timestamp, and source timestamp.
- `.aura` export/import and version-history snapshots preserve the preview media and pointer.
- Pack-backed standalone exports preserve the pack-owned style block and never swap in the legacy palette CSS.
- Browser smoke harness exists at `src/test/browser/presentation-preview-smoke.html` and imports the real Editorial Stage compiler plus `createPresentationArtifactPreview`.
- Browser smoke runner passes with a `1280x720` PNG data URL at `media/artifacts/browser-preview-smoke-deck/artifact.preview.png`.

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

### 2026-05-01 - Editorial Stage Visual Gate Closure

Completed on `codex/artifact-pack-design-rebuild`:

- Fixed the bottom safe-area problems on slides 03 and 06 by moving proof/verdict content away from the final viewport pixels.
- Reworked slide 07 from a flat equal-card row into staggered process cards with a timeline spine.
- Reworked slide 08 from three equal closing cards into a dominant action plus two supporting actions.
- Added render smoke coverage that asserts every example slide root remains a fixed 1280x720, full-background stage without transform/zoom scaling.
- Regenerated `examples/example.html` from the compiler.
- Diagnosed the screenshot harness issue: direct Chrome `--window-size=1280,720` produced a 1280x633 content viewport on this machine, so the closure set uses Chrome DevTools device metrics for a true 1280x720 viewport.
- Rendered 24 closure screenshots in `/private/tmp/editorial-stage-visual-gate` with `-cdp.png` suffixes.
- Updated `docs/plan/editorial-stage-visual-gate-review.md` to mark the gate passing.

Verification completed:

- `npm test -- src/test/editorial-stage-compiler.test.ts src/test/editorial-stage-render-smoke.test.ts src/test/editorial-stage-validator.test.ts`
- CDP screenshot render: 24 `*-cdp.png` files generated.
- PNG smoke: all 24 closure screenshots are 1280x720; the 21 non-slide-04 closure screenshots have no white bottom band, and slide 04's near-white bottom row is intentional hero background.

Disposition:

- Phase 5 is Done.

### 2026-05-01 - Editorial Stage Visual Gate Review

Completed on `codex/artifact-pack-design-rebuild`:

- Reviewed the 24 baseline screenshots plus `editorial-magazine-slide-02-fresh.png` in `/private/tmp/editorial-stage-visual-gate`.
- Added the concrete screenshot findings to `docs/plan/editorial-stage-visual-gate-review.md`.
- Converted the open review into named Phase 5 fixes: remove the persistent bottom white band, prevent clipped footer/verdict/card content, and revisit process/closing equal-panel card-wall layouts after the stage/capture fix.

Closed by the follow-up visual gate closure slice:

- Stage/cropping, bottom clipping, footer/verdict collision, and process/closing card-wall blockers are resolved.

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

### 2026-05-01 - Source Payload Repair Loop And Review Fixes

Completed in this slice:

- Added deterministic source-payload repair before source-backed edit persistence.
- Repair now cleans HTML-like slot text, fills missing required slots, truncates overlong slot text, removes undeclared slot keys, repairs media aspect/crop metadata, and converts missing required media-slot layouts to a non-media layout when the source binding itself is absent.
- Kept unresolved required real media blocked so Aura does not silently drop a user-requested proof image.
- Preserved pack manifest/source payloads in version-history snapshots so restored decks remain source-editable.
- Fixed source edit routing for metric-label edits and numeric-leading replacements.
- Fixed partial multi-slide add behavior near the 18-slide cap so successful additions are not discarded when a later requested slide exceeds the cap.
- Added a chunked media byte-to-base64 conversion path for `.aura` imports.
- Added pack-level motion guidance from the original Aura animated-slide design inspiration while keeping motion compiler-owned, CSS-only, reduced-motion-aware, and fixed to the 1280x720 stage.
- Updated stale program-status lint blocker text after `npm run lint` passed.

Verification completed:

- `npm test -- src/test/artifact-pack-runtime-routing.test.ts src/test/version-history.test.ts src/test/media-packaging.test.ts src/test/editorial-stage-render-smoke.test.ts`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `git diff --check`

Next active gate:

- Start Phase 8 with guided edit chips after verification, while Phase 5 screenshot review remains open.

### 2026-05-01 - Guided Edit Chips Slice

Completed in this slice:

- Added pack-scoped guided edit chips for source-backed Editorial Stage presentations only.
- Chips fill the composer for supported typed operations: text edit, add slide, and restyle; they do not auto-submit.
- Added a visible limits control that explains reorder/delete/media-swap edits are not supported yet instead of writing an impossible prompt.
- Tightened unsupported pack-edit runtime feedback so blocked requests tell users which edit surfaces are currently supported.
- Kept the chip gate based on `artifactManifest.packId` plus `artifactSourcePayload`, not historical manifest `editSurfaces`.
- Ran an independent read-only code review of the Phase 7/8 changes; no findings were reported.

Verification completed:

- `npm test -- src/test/chat-submit.test.tsx src/test/artifact-pack-runtime-routing.test.ts`
- `npm test`
- `npm run lint`
- `npm run build`
- `git diff --check`

Next active gate:

- Begin Phase 9 design-system mode with a safe project `DESIGN.md` resolver that maps user brand/style guidance into validated token roles, never arbitrary compiler CSS.

### 2026-05-01 - Project Design System Resolver Foundation

Completed in this slice:

- Added a project design-system resolver that maps safe `DESIGN.md`/project-rules color roles into Aura token roles.
- Accepted only validated hex colors attached to known roles, with support for user-friendly design-list items and existing project color-theme defaults.
- Rejected CSS blocks, one-line CSS snippets, fenced CSS snippets, functions, gradients, custom properties, unknown roles, and raw CSS declarations.
- Added typed `projectDesignSystem` metadata to `DesignContextSpec`, including preview palette and ignored-line notes.
- Threaded validated project design colors into Editorial Stage through compiler-owned CSS variables inside the single pack style block.
- Marked compiled sections with `data-project-design-system` when a validated project design system is present.
- Ran an independent review of the resolver; two parser leaks were found and fixed before the slice was closed.

Verification completed:

- `npm test -- src/test/artifact-pack-design-context.test.ts src/test/editorial-stage-compiler.test.ts`
- `npm run typecheck`
- `npm run lint`

Remaining current gate:

- Keep Phase 9 as `Active/Next` until document and spreadsheet packs consume the same validated token roles through explicit adapters.

### 2026-05-01 - Project Design Preview UI And Runtime Color Theme Threading

Completed in this slice:

- Added a Project colours preview to the project rules panel so users can see accepted design-token roles before generation.
- Exposed ignored colour-rule diagnostics in the same preview without showing raw token internals as a required user choice.
- Threaded the project `ColorTheme` into artifact run-plan design context even when no `DESIGN.md`/project-rules markdown exists.
- Added a shared `ProjectDesignTokenAdapter` interface and moved Editorial Stage's project-colour CSS-variable mapping behind that adapter contract.
- Kept project design colours inside the compiler-owned style block and pack-owned CSS variables, preserving the style isolation boundary.
- Fixed independent-review findings before closing the slice: scoped pack CSS variables to `.es-slide` instead of `:root`, taught runtime QA/checklist validators to accept scoped class tokens, applied workflow-preset memory budgets before memory retrieval, allowed artifact default modes to be cleared, and blocked structural title-slide deletion from the text-edit surface.

Verification completed:

- `npm test -- src/test/run-request.test.ts src/test/project-rules-panel.test.tsx src/test/ux-simplification.test.ts src/test/artifact-pack-design-context.test.ts src/test/editorial-stage-compiler.test.ts`
- `npm test -- src/test/run-request.test.ts src/test/project-rules-panel.test.tsx src/test/ux-simplification.test.ts src/test/editorial-stage-compiler.test.ts src/test/editorial-stage-validator.test.ts`
- `npm test -- src/test/presentation-quality-checklist.test.ts src/test/artifact-pack-runtime-routing.test.ts src/test/presentation-runtime-workflow.test.ts src/test/release-smoke.test.ts`
- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `git diff --check`

Remaining current gate:

- Keep Phase 9 as `Active/Next` until document and spreadsheet packs prove the same adapter contract.

### 2026-05-01 - Export Intent Validation Gate Slice

Completed in this slice:

- Started Phase 10 with deterministic compiled-output export validation instead of user-facing export choices.
- Required every compiled section to declare `data-background-color` for export surfaces.
- Blocked viewport units inside the fixed presentation stage.
- Required `prefers-reduced-motion: reduce` when compiled CSS includes motion declarations.
- Added editable-PPTX restrictions for unsafe filter/mask/blend/clip CSS, nested text spans, and text rendered as SVG/image content.
- Proved the default Editorial Stage compiled output remains valid when requested as `editable-pptx`.

Verification completed:

- `npm test -- src/test/editorial-stage-validator.test.ts src/test/editorial-stage-compiler.test.ts`
- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `git diff --check`

### 2026-05-01 - Editorial Stage Pack Preview Artifact Slice

Completed in this slice:

- Generated a real `1280x720` PNG preview from `examples/example.html` at `examples/preview.png`.
- Wired the preview into the Editorial Stage manifest through `examples[].previewPath`.
- Removed the seed-era manifest/checklist language that said preview generation was omitted.
- Added registry coverage that verifies the exposed preview path exists and has the expected PNG signature and dimensions.
- Fixed the independent review findings carried into this slice: successful presentation edits now set `changedDocumentId`, source-backed pack edits preserve project-design tokens, the legacy Apply project colours action is hidden for pack-backed presentations, and text-slot word removals no longer route to the unsupported structural-edit path.

Verification completed:

- `sips -g pixelWidth -g pixelHeight src/services/artifactPacks/packs/presentation/editorial-stage-v1/examples/preview.png`
- `npm test -- src/test/artifact-pack-registry.test.ts`
- `npm test -- src/test/editorial-stage-compiler.test.ts src/test/editorial-stage-render-smoke.test.ts src/test/artifact-pack-registry.test.ts`
- `npm test -- src/test/artifact-pack-runtime-routing.test.ts src/test/chat-submit.test.tsx src/test/ux-simplification.test.ts src/test/presentation-runtime-policy.test.ts src/test/artifact-pack-registry.test.ts`
- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `git diff --check`

Next active gate:

- Add generated `artifact.preview.png` persistence for runtime-created artifacts, ensuring previews use the same validated project design tokens as HTML/PDF/PPTX output.

### 2026-05-01 - Runtime Presentation Preview Persistence Slice

Completed in this slice:

- Added `ProjectArtifactPreview` metadata on `ProjectDocument`, with preview bytes stored as normal `ProjectMediaAsset` records at `media/artifacts/{documentId}/artifact.preview.png`.
- Added a browser-side presentation preview helper that renders the first compiled slide from the same pack-owned HTML/CSS into a `1280x720` PNG data URL and upserts the preview media/pointer into the project.
- Threaded successful presentation create/edit persistence through async preview generation after lifecycle validation, with a follow-up version snapshot once preview media lands.
- Preserved preview metadata in `.aura` document metadata, project media packaging, imports, and version-history snapshots.
- Fixed independent review findings: pack-backed standalone exports no longer replace Editorial Stage CSS with the legacy palette shell, and image-caption removal stays inside the text-slot edit surface.
- Closed the follow-up review findings by rendering previews inside an isolated iframe, moving preview capture off the success critical path, bounding capture with a timeout, blocking stale preview writes when slide HTML changes, and keeping mixed caption-plus-image removal blocked as a media edit.
- Closed the second review pass by committing preview snapshots after the primary content commit, refreshing preview staleness metadata from the latest persisted document, and clearing preview timeout handles after successful capture.

Verification completed:

- `npm test -- src/test/artifact-preview.test.ts src/test/media-packaging.test.ts src/test/version-history.test.ts src/test/standalone-export-presentation.test.ts src/test/presentation-runtime-policy.test.ts`
- `npm test -- src/test/chat-submit.test.tsx src/test/artifact-pack-runtime-routing.test.ts src/test/ux-simplification.test.ts src/test/artifact-pack-registry.test.ts`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `git diff --check`

Next active gate:

- Phase 10 is complete for presentations. Keep Phase 5's visual screenshot review as the active presentation-quality gate and carry Phase 9/10 adapter, export, and preview contracts into document/spreadsheet packs when Phases 11/12 begin.

### 2026-05-01 - Browser Preview Smoke Harness Slice

Completed in this slice:

- Added `src/test/browser/presentation-preview-smoke.html`, a Vite-served browser fixture that compiles the Editorial Stage example deck, calls the real browser preview helper, persists the result through `upsertProjectArtifactPreview`, and reports compact pass/fail JSON in the DOM.
- Added `scripts/run-presentation-preview-smoke.mjs`, a bounded smoke runner that starts the Vite dev server, runs Chrome headless with `--dump-dom`, parses the fixture result, and checks PNG metadata/path/data length.
- Added harness coverage in `src/test/presentation-preview-smoke-harness.test.ts` so the smoke remains wired to the real pack compiler, preview helper, and persistence path.
- Ran the actual Chrome smoke. Passing output included `previewPath: "media/artifacts/browser-preview-smoke-deck/artifact.preview.png"`, `mimeType: "image/png"`, `width: 1280`, `height: 720`, and a PNG data URL length of `103406`.

Verification completed:

- `npm test -- src/test/presentation-preview-smoke-harness.test.ts`
- `node --check scripts/run-presentation-preview-smoke.mjs`
- `node scripts/run-presentation-preview-smoke.mjs`
- `git diff --check -- src/test/browser/presentation-preview-smoke.html scripts/run-presentation-preview-smoke.mjs src/test/presentation-preview-smoke-harness.test.ts docs/plan/aura_artifact_design_rebuild_implementation_checklist.md docs/program-status.md`

### 2026-05-01 - Executive Memo Document Pack Foundation

Completed in this slice:

- Started Workstream/Phase 11 inside the narrow entry guard requested by the user.
- Added `document/executive-memo-v1` with module source payloads for memo cover, decision summary, context, recommendation, evidence table, risk register, action plan, and source notes.
- Registered the pack with document-specific edit surfaces, including `add-module`, and kept slide/presentation language out of the document pack surface.
- Added scoped `style.css` loaded through the artifact-pack raw CSS loader, with the compiler owning assembly and no fallback CSS copy inside TypeScript.
- Added a deterministic compiler that emits one `data-aura-style-system="document/executive-memo-v1"` style block plus semantic `article`/module markup.
- Added validator checks for required slots, heading structure, table row width, source notes, HTML in slots, unsupported hype tone, inline styles, viewport units, missing print rules, scripts, emoji-as-icons, and undefined classes.
- Added the first document-side design-token adapter proof for Phase 9 via `target: document-tokens`.
- Added a checked-in `examples/source.json` and compiler-generated `examples/example.html`, with regression coverage to prevent source/example drift.
- Fixed review findings carried from the previous preview slice: `html2canvas` is a direct dependency, preview follow-up snapshots re-check the latest document after the primary commit, and the Chrome smoke runner tracks actual process close before escalating from `SIGTERM` to `SIGKILL`.
- Fixed the independent Phase 11 review findings: validator checks now use schema-defaulted module arrays, the cover CSS matches the compiled `em-memo-cover` class, and compiled memos must contain exactly one `h1`.

Verification completed:

- `npm test -- src/test/executive-memo-pack.test.ts src/test/artifact-pack-registry.test.ts`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `git diff --check`
- `node scripts/run-presentation-preview-smoke.mjs` passed outside the sandbox after the sandboxed local-server smoke could not reach Vite.

Remaining current gate:

- Document runtime create/edit routing still uses the existing document runtime; routing through `document/executive-memo-v1` is the next document-pack implementation slice when prioritized.
- Phase 9 remained `Active/Next` at the end of this slice until the spreadsheet adapter proof landed in Phase 12.

### 2026-05-01 - Operating Model Spreadsheet Pack Foundation

Completed in this slice:

- Started Workstream/Phase 12 inside the narrow entry guard requested by the user.
- Added `spreadsheet/operating-model-v1` with workbook source payloads for inputs, assumptions, model/calculation, summary, and dashboard sheets.
- Registered the pack with spreadsheet-specific edit surfaces, including `add-sheet`, `formula-edit`, and `restyle`, without presentation or document terminology.
- Added a deterministic compiler that emits structured workbook JSON with `workbook`, `data`, `formatting`, `charts`, and `theme` sections instead of model-authored spreadsheet markup.
- Added a spreadsheet-theme adapter proof for Phase 9 via `target: spreadsheet-theme`, mapping validated project design tokens into workbook/table/chart roles only.
- Added validator checks for duplicate sheets/tables/columns, unknown row keys, unsafe formulas, missing formula dependencies, invalid chart references, missing required workbook roles, HTML fragments, invalid compiled JSON, and missing compiled theme metadata.
- Added checked-in `examples/source.json` and `examples/example.json`, with regression coverage to prevent source/example drift.
- Fixed the independent review finding in the executive memo compiler by compiling from schema-defaulted source data instead of validating defaults and then rendering the raw input object.
- Fixed independent spreadsheet review findings: the compiler now renders schema-defaulted source data, formula expressions are bounded to declared double-quoted columns plus arithmetic, and text cells reject spreadsheet formula-control prefixes.
- Updated program status and this checklist so Phase 5/9/12 state is consistent across the docs.

Verification completed:

- `npm test -- src/test/operating-model-pack.test.ts src/test/artifact-pack-registry.test.ts src/test/executive-memo-pack.test.ts`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `git diff --check`

Remaining current gate:

- Spreadsheet runtime create/edit routing and deterministic XLSX export remain deferred to the next spreadsheet slice.
- Phase 9's cross-artifact adapter proof is now complete; later runtime work must keep using pack-owned adapters rather than raw CSS or arbitrary colour bypasses.

### 2026-05-01 - Document Pack Runtime Routing And Artifact Library Foundation

Completed in this slice:

- Routed executive-memo-like document creates through `document/executive-memo-v1` source payload construction plus `compileExecutiveMemoPack`.
- Kept the document pack route gated to normal creates only; edits, image creates, and generic document prompts continue through the existing document runtime paths.
- Persisted pack-backed document outputs with `artifactManifest` and `artifactSourcePayload` in workflow outputs and `ProjectDocument` records.
- Extended document run output envelopes so pack manifest/source metadata can flow through the same contracts as presentations.
- Started Workstream/Phase 13 with `listArtifactPackGalleryItems()`, a toolbar Artifact Library entry point, and a dialog that shows pack type, status, best-for metadata, direction labels, output modes, compiled example paths, preview paths, and a disabled save-as-pack affordance.
- Fixed post-review spreadsheet contract issues: formula columns are materialized by the compiler, formula outputs must use generated/calculation/output columns, compiled workbook JSON receives formula/cell/chart safety checks, and spreadsheet run plans are not stamped as pack-backed until runtime routing exists.
- Fixed second-pass review findings: source and compiled workbook rows now validate declared column types and non-nullable cells, compiled workbook validation blocks missing sheet data, and the toolbar-to-library path is covered with the real gallery service.

Verification completed:

- `npm test -- src/test/operating-model-pack.test.ts src/test/artifact-pack-registry.test.ts src/test/structured-run-outputs.test.ts src/test/document-runtime-workflow.test.ts src/test/artifact-library-dialog.test.tsx`
- `npm test -- src/test/operating-model-pack.test.ts src/test/new-project-dialog.test.tsx src/test/artifact-library-dialog.test.tsx src/test/artifact-pack-registry.test.ts`
- `npm run typecheck`

Remaining current gate:

- Phase 13 remains active until start-from-example or a narrowed acceptance gate is implemented and verified.
- Spreadsheet runtime create/edit routing and deterministic XLSX export remain deferred; the registry/gallery can expose the pack, but normal spreadsheet run plans must not claim pack-backed routing yet.

### 2026-05-01 - Artifact Library Start From Example Slice

Completed in this slice:

- Added a deterministic artifact-pack example project service that starts from shipped pack examples for Editorial Stage, Executive Memo, and Operating Model.
- Compiled examples from Aura-owned source payloads at start time instead of letting the model write artifact markup, and blocked startup if shipped examples produce blocking validation findings.
- Persisted `artifactManifest` and `artifactSourcePayload` on example-started documents, including supported exports, edit surfaces, source payload version, design direction, and validation status.
- Carried the Editorial Stage example media fixture into the project media store so source-backed presentation edits can resolve the same `launch-proof-screenshot` asset.
- Derived workbook metadata and chart specs for the Operating Model example while preserving the compiled workbook JSON for inspection.
- Materialized Operating Model example rows into the spreadsheet table layer before project handoff so the grid/export path is not empty.
- Wired Artifact Library's "Start from example" action into the production toolbar flow with the existing discard-current-project confirmation guard.
- Kept "Save as pack" visibly deferred and disabled until pack-candidate authoring contracts are designed.
- Fixed independent review findings: production start-from-example is now wired, presentation run envelopes expose `artifactManifest`/`artifactSourcePayload`, and spreadsheet examples no longer hand off metadata without table rows.

Verification completed:

- `npm test -- --run src/test/artifact-pack-example-project.test.ts src/test/artifact-library-dialog.test.tsx src/test/artifact-pack-registry.test.ts src/test/new-project-dialog.test.tsx`
- `npm run typecheck`

Remaining queued work:

- Save-current-as-pack, document/spreadsheet thumbnails, spreadsheet runtime routing, and deterministic XLSX export remain queued. They need their own source sanitization, preview regeneration, and export gates before implementation.

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
