# Presentation Scaffold Recovery Plan

## Summary

Aura’s presentation quality should be recovered by removing freeform slide authorship from the model. The model should choose from scaffolded templates, fill allowed slots, and request only approved token/theme/content changes. Aura’s runtime should own CSS, layout classes, motion, section structure, validation, and final assembly.

This is not “more prompt.” It is a harness change: a small, typed design system that makes the agent legible and constrained. The first version should ship one excellent scaffold family with multiple themes/directions, then expand.

Important correction: this reduces the need for repeated manual visual testing, but it does not remove automated tests. Tests become scaffold-contract checks, compiler checks, and regression gates rather than broad “did the model design well?” checks.

## Research Inputs

Clone these read-only reference repos at implementation start into `/Volumes/Callum_SSD/dev_projects`:

- `https://github.com/alchaincyf/huashu-design`
- `https://github.com/nexu-io/open-design`
- `https://github.com/op7418/guizang-ppt-skill`
- `https://github.com/nexu-io/harness-engineering-guide`

Study these exact sources before implementation:

- [Huashu Design](https://github.com/alchaincyf/huashu-design): design-direction advisor, asset protocol, critique rubric, anti-slop rules.
- [Huashu SKILL.md](https://github.com/alchaincyf/huashu-design/blob/master/SKILL.md): workflow, brand/asset protocol, fallback design directions.
- [Open Design](https://github.com/nexu-io/open-design): skill picker, design-system picker, scaffold UI, local artifact runtime.
- [Open Design skills protocol](https://github.com/nexu-io/open-design/blob/main/docs/skills-protocol.md): file-based `SKILL.md + assets + references` contract.
- [Open Design architecture](https://github.com/nexu-io/open-design/blob/main/docs/architecture.md): daemon, skill registry, sandbox preview, artifact persistence.
- [Open Design guizang skill](https://github.com/nexu-io/open-design/tree/main/skills/guizang-ppt): bundled deck scaffold.
- [Guizang PPT skill](https://github.com/op7418/guizang-ppt-skill): magazine-style HTML deck workflow.
- [Guizang layouts](https://github.com/op7418/guizang-ppt-skill/blob/main/references/layouts.md): layout skeletons, class preflight, theme rhythm.
- [Guizang themes](https://github.com/op7418/guizang-ppt-skill/blob/main/references/themes.md): curated theme tokens, no arbitrary color mixing.
- [Guizang checklist](https://github.com/op7418/guizang-ppt-skill/blob/main/references/checklist.md): P0/P1/P2/P3 visual QA rules.
- [Harness Guide](https://harness-guide.com/): thin harness, thick skills, tool loops, context, guardrails.
- [OpenAI harness engineering](https://openai.com/index/harness-engineering/): repository-local knowledge, mechanical invariants, agent legibility.

Local Aura files to study first:

- [presentationRuntime.ts](/Volumes/Callum_SSD/dev_projects/aura_web/src/services/artifactRuntime/presentationRuntime.ts:1)
- [presentationPrompts.ts](/Volumes/Callum_SSD/dev_projects/aura_web/src/services/artifactRuntime/presentationPrompts.ts:1)
- [presentationStyleSystem.ts](/Volumes/Callum_SSD/dev_projects/aura_web/src/services/artifactRuntime/presentationStyleSystem.ts:1)
- [build.ts](/Volumes/Callum_SSD/dev_projects/aura_web/src/services/artifactRuntime/build.ts:1)
- [types.ts](/Volumes/Callum_SSD/dev_projects/aura_web/src/services/artifactRuntime/types.ts:1)
- [layouts.ts](/Volumes/Callum_SSD/dev_projects/aura_web/src/services/ai/templates/layouts.ts:1)
- [registry.ts](/Volumes/Callum_SSD/dev_projects/aura_web/src/services/ai/templates/registry.ts:1)
- [presentationQualityChecklist.ts](/Volumes/Callum_SSD/dev_projects/aura_web/src/services/artifactRuntime/presentationQualityChecklist.ts:1)
- [projectStarter.ts](/Volumes/Callum_SSD/dev_projects/aura_web/src/services/bootstrap/projectStarter.ts:1)
- [NewProjectDialog.tsx](/Volumes/Callum_SSD/dev_projects/aura_web/src/components/NewProjectDialog.tsx:1)

## Target Architecture

Add a new scaffold layer under `src/services/presentationScaffolds/`.

The scaffold contract should be file-based but compiled into typed runtime objects:

- `types.ts`: `PresentationScaffold`, `ScaffoldTheme`, `SlideSkeleton`, `SlideSlotDefinition`, `DeckRhythmPlan`, `SlideSlotPayload`, `ScaffoldCompileResult`.
- `registry.ts`: imports shipped scaffolds and exposes `listPresentationScaffolds()`, `getPresentationScaffold()`, `resolveScaffoldForRunPlan()`.
- `compiler.ts`: deterministic assembly from `style.css + slide skeletons + slot payloads`.
- `validator.ts`: scaffold-specific class, slot, rhythm, theme, and asset checks.
- `packs/executive-editorial-v1/`: the first production scaffold.

The first scaffold pack should contain:

- `manifest.ts` or `manifest.json`: id, label, best-for, supported recipes, allowed directions, allowed themes, output modes.
- `style.css`: the only source of CSS for the scaffold.
- `slides/*.html`: locked skeletons with `data-slot` placeholders.
- `themes.ts`: 5 curated theme packs matching Aura variants: executive, launch, editorial, research, teaching.
- `references/checklist.md`: human-readable rules distilled from Guizang and Aura’s current quality checklist.
- `examples/example-deck.html`: compiled reference deck used in gallery previews and regression tests.

CSS and HTML separation is mandatory:

- CSS lives in `style.css` and generated theme variables.
- Slide skeleton HTML lives in `slides/*.html`.
- The model never returns raw CSS.
- The model never returns full slide HTML in scaffolded mode.
- The compiler emits Aura’s existing fragment format: one `<style>` block plus `<section>` elements.

Allowed customizations:

- Text slots: title, kicker, subtitle, paragraph, quote, metric value, metric label, step title, step body.
- Slot visibility: only for optional slots declared in the skeleton.
- Slide skeleton choice: only from skeleton ids allowed for the slide role.
- Theme choice: only from scaffold theme ids or project `ColorTheme` mapped into predefined token roles.
- Density/mood: enums such as `calm`, `balanced`, `dense`, `hero-light`, `hero-dark`, not raw CSS.
- Media slots: only by `ProjectMediaAsset` reference, declared aspect ratio, crop mode, and alt text.
- Icon/motif slots: only from approved motif/icon registry.

Locked areas:

- CSS selectors, class names, layout grid, motion keyframes, font stacks, z-index layers.
- Section wrappers and `data-background-color` assignment.
- Motion system and reduced-motion fallback.
- Export-mode constraints.
- All validation gates.

## Runtime Changes

Extend `ArtifactRunPlan` with presentation scaffold fields:

- `presentationScaffoldId`
- `presentationThemeId`
- `presentationDirectionId`
- `presentationExportIntent: 'html' | 'pdf' | 'editable-pptx'`
- `deckRhythmPlan`
- `allowedEditSurface`
- `designContextSpec`
- `mediaSlotPlan`

Add `DeckRhythmPlan` before generation:

- one entry per slide with role, skeleton id, density, mood, motion intensity, visual weight, media needs, and transition purpose;
- enforce no repeated skeletons on adjacent content slides;
- enforce hero or breaker rhythm every 3-4 slides for decks of 6+ slides;
- ensure slide 1 establishes motif and later slides preserve token/class vocabulary.

Replace presentation create/add-slide flow with scaffolded runtime by default:

- `runPresentationRuntime()` still plans and emits the same public events.
- `runQueuedPresentationRuntime()` calls a scaffold content loop instead of `design()` for scaffolded runs.
- The model receives one slide slot schema at a time and returns structured slot payload only.
- The compiler assembles each slide deterministically.
- Existing freeform designer path remains behind a dev-only fallback flag and should not be reachable from normal UI.

Edits become surface-specific:

- Text edit: patch slot payloads, then recompile.
- Add slide: choose allowed skeleton, collect slot payload, append compiled section.
- Restyle: swap scaffold theme tokens only.
- Restructure: rerun rhythm plan and recompile from existing payloads.
- Full regeneration: create new rhythm plan and payloads, never raw HTML/CSS.

## Agent Tool Workflow

Implement a scaffolded tool loop with these deterministic steps:

- `selectPresentationScaffold`: resolves scaffold, theme, direction, export intent, and slide count.
- `planDeckRhythm`: returns typed rhythm entries for each slide.
- `customizeSlideSlots`: called once per slide with the exact skeleton slot schema.
- `compileScaffoldSlide`: host function, not model-authored HTML.
- `assembleScaffoldDeck`: host function, emits single style block plus sections.
- `lintScaffoldedDeck`: returns machine-readable P0/P1/P2 findings.
- `repairSlotPayload`: asks the model only to fix rejected slot values, not layout or CSS.

Use Zod schemas for every model-facing payload. Reject unknown keys. Reject slot content that contains HTML unless the slot explicitly allows inline semantic tags.

## UI Changes

Upgrade the new-presentation/start flow:

- Extend `NewProjectDialog` presentation quick start with scaffold, direction, theme, slide count, audience, export intent, and optional design system/media inputs.
- Replace tiny color swatches with direction cards showing palette, type sample, mood, best-for, and an example preview.
- Add a scaffold gallery using compiled `examples/example-deck.html`.
- Add “Save current deck as scaffold” later, after v1 is stable.
- In progress UI, show per-slide work queue states from `runPlan.workQueue`: planned, filling slots, compiled, linted, finalized.
- In chat, surface scaffold decisions plainly: selected scaffold, theme, direction, and whether any requested change was outside the allowed surface.

## Quality Gates

Port the strongest reference rules into deterministic checks:

- Undefined class check: every class in compiled sections must exist in scaffold CSS or approved Aura runtime classes.
- Single style system check: exactly one style block.
- No inline styles.
- No viewport units for type/layout.
- Reduced-motion required if motion exists.
- Concrete `data-background-color` per section.
- No placeholder tokens.
- No emoji-as-icons.
- No repeated card-wall layouts.
- No three-slide run with same mood/density in 6+ slide decks.
- Title line-length risk for compact layouts.
- Media slot aspect/crop check.
- Export intent check: `editable-pptx` forbids complex filters, over-nested text spans, and non-semantic text-as-image patterns.

Keep existing `presentationQualityChecklist` quality scoring, but add scaffold-specific named failures so repair can target slot payloads.

## Implementation Order

1. Clone and study the reference repos.
   Keep clones outside Aura’s tracked tree. Do not vendor code/assets unless licensing is explicitly cleared.

2. Add scaffold types and one scaffold pack.
   Build `executive-editorial-v1` from Aura’s existing production templates, not copied reference code. Include 6 skeletons: cover, context, metric proof, comparison, mechanism/process, closing action.

3. Add the scaffold compiler.
   Compile `style.css`, theme tokens, and skeleton slot payloads into the current presentation fragment format.

4. Add scaffold validator.
   Implement class coverage, slot coverage, one-style-system, rhythm, theme, and media-slot checks.

5. Add direction/theme packs.
   Expand current `visualVariants` into richer presentation direction packs inspired by Open Design and Guizang: executive, launch, editorial, research, teaching.

6. Extend `ArtifactRunPlan`.
   Add scaffold selection, rhythm plan, edit surface, media slot plan, and export intent.

7. Replace queued deck generation path.
   Route deck-like create prompts through scaffolded slot filling and deterministic compilation.

8. Replace add-slide and restyle paths.
   Add-slide fills one new skeleton. Restyle swaps tokens. Neither path lets the model write CSS or full HTML.

9. Upgrade UI.
   Add scaffold/direction/theme selection to project creation and presentation quick start. Add scaffold preview and per-slide progress.

10. Add design context and media slots.
   Parse project rules, color theme, media assets, and later `DESIGN.md` into `designContextSpec`.

11. Add export-mode constraints.
   Start with `html`; add `editable-pptx` restrictions in schemas and validation even before full deterministic PPTX export lands.

12. Retire normal freeform generation.
   Keep it behind a dev/debug flag only after scaffolded create, add-slide, and restyle flows pass acceptance tests.

## Test Plan

Add focused tests:

- `presentation-scaffold-registry.test.ts`: scaffold manifests are valid, skeleton ids unique, themes complete.
- `presentation-scaffold-compiler.test.ts`: compiler emits one style block, expected sections, no placeholders, no inline styles.
- `presentation-scaffold-validator.test.ts`: catches undefined classes, forbidden style attributes, invalid rhythm, missing slots, bad media aspects.
- `presentation-runtime-scaffolded.test.ts`: queued create uses scaffolded slot payloads and never calls freeform designer HTML path.
- `presentation-edit-scaffolded.test.ts`: text edit, add-slide, restyle, and blocked unsupported edits.
- `presentation-quality-checklist.test.ts`: new named failures and repair feedback.
- `new-project-dialog.test.tsx`: scaffold/direction/theme choices persist into project rules and run plan.
- `prompt-contracts.test.ts`: prompts/tool schemas do not ask for raw CSS or raw full-slide HTML in scaffolded mode.
- `release-smoke.test.ts`: one scaffolded deck compiles, validates, exports standalone HTML, and opens in the current Reveal canvas.

Manual validation should be one v1 gate only:

- Generate one executive deck, one launch deck, one editorial deck from the same scaffold with different themes.
- Capture desktop, tablet, and mobile viewport screenshots.
- Confirm visual rhythm, readability, and no obvious overlap.
- After that, normal per-run quality relies on compiler and validation gates.

## Acceptance Criteria

- A normal deck prompt produces scaffolded slides without model-authored CSS.
- A model cannot invent new classes, layout wrappers, keyframes, or arbitrary colors.
- CSS and HTML are stored separately in the scaffold pack and assembled only by the compiler.
- The first shipped scaffold supports at least five visual themes/directions.
- Add-slide preserves the existing scaffold style system.
- Restyle changes tokens only.
- Unsupported edit requests are rejected or converted into a supported edit surface.
- Generated decks pass existing presentation validation plus scaffold-specific validation.
- The UI exposes scaffold/theme/direction choices before generation.
- References and implementation docs point future agents to the scaffold contract instead of old prompt-only behavior.

## Assumptions

- V1 focuses on presentations. Documents and spreadsheets stay out of scope except for shared project rules/design context.
- Existing Aura production templates are the seed material; reference repos are for process and architecture, not copy-paste assets.
- Huashu commercial/licensing uncertainty means no direct code or asset reuse without approval.
- Aura keeps stricter CSS/HTML separation than Guizang, even though Guizang allows inline tuning.
- Automated tests remain required. The goal is to remove freeform visual guessing, not verification.
