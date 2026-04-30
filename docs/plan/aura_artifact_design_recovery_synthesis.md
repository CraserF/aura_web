# Aura Artifact Design Recovery Synthesis

Companion to `docs/plan/presentation_scaffold_recovery_plan.md`.

This document steps back from the first scaffold implementation and records what the reference repos teach us about why Aura's generated slides still look weak. It is intentionally planning-only. Do not implement from the old scaffold until this document and the detailed rebuild plan are read.

## Sources

Local reference repos:

- Huashu Design: `/Volumes/Callum_SSD/dev_projects/huashu-design`
- Open Design: `/Volumes/Callum_SSD/dev_projects/open-design`
- Guizang PPT Skill: `/Volumes/Callum_SSD/dev_projects/guizang-ppt-skill`
- Harness Engineering Guide: `/Volumes/Callum_SSD/dev_projects/harness-engineering-guide`

Core files studied:

- Huashu `SKILL.md`
- Huashu `references/design-styles.md`
- Huashu `references/critique-guide.md`
- Open Design `docs/spec.md`
- Open Design `docs/architecture.md`
- Open Design `docs/skills-protocol.md`
- Open Design `docs/modes.md`
- Open Design `packages/contracts/src/prompts/directions.ts`
- Open Design `packages/contracts/src/prompts/discovery.ts`
- Open Design `packages/contracts/src/prompts/deck-framework.ts`
- Open Design `docs/examples/DESIGN.sample.md`
- Open Design `design-systems/default/DESIGN.md`
- Guizang `SKILL.md`
- Guizang `references/layouts.md`
- Guizang `references/themes.md`
- Guizang `references/checklist.md`
- Harness docs listed in `reference-harness-engineering-lessons.md`

## Diagnosis

The first scaffold solved the wrong half of the problem.

It constrained the model from writing arbitrary CSS and full slide HTML, which is good. But it did not put enough high-quality design intelligence into the scaffold itself. A constrained system only improves quality if the constraints are beautiful, opinionated, and tested. If the scaffold is generic, the generated output becomes generic more consistently.

Current Aura scaffold symptoms:

- The style is not visually decisive. It says "executive editorial" but mostly renders generic panels, gradients, chips, and circular motif decoration.
- Themes are palette swaps, not full design directions. Changing from executive to launch or research does not meaningfully alter typography, density, layout posture, imagery, or rhythm.
- The skeleton set is too narrow and too similar. Many slides become "title + box/card group + footer."
- There is no strong asset protocol. Decks do not reliably use logos, product imagery, screenshots, data visuals, or truthful placeholders.
- The UI asks users to choose scaffold/theme/direction/export details up front. That is too much surface area for non-designers.
- The runtime validates technical constraints, but it does not fail cheap-looking design patterns like card walls, weak hierarchy, fake metrics, or decorative motif overuse.
- The scaffold pack lacks strong example-based taste. A pack without excellent examples teaches the next agent very little.

## Huashu Lessons

Huashu's most important idea is not a specific visual style. It is the workflow stance: the agent behaves as a designer in a specific medium, not as a generic HTML generator.

Patterns to adopt:

- Embody the specialist. A deck is designed like a deck, a prototype like an app prototype, an infographic like an information design piece.
- Start from existing context. Brand assets, product screenshots, design systems, code, or references are first-class. Designing from nothing is the fallback.
- Use a design-direction advisor when context is missing. Offer a few distinct directions instead of letting the model default to generic taste.
- Treat assets as more important than abstract colors. A logo, product render, UI screenshot, or real data visual often carries more brand recognition than a palette.
- Use an explicit critique rubric: philosophy alignment, hierarchy, craft, functionality, originality.
- Encode anti-slop patterns: no overused AI gradients, no generic emoji icons, no fake metrics, no decorative clutter.

What Aura should change:

- Add a `DesignContextSpec` that records brand assets, product images, screenshots, data sources, and design system facts.
- Add "no assets available" as a visible planning state, not a silent reason to generate generic decoration.
- Add design-direction packages with philosophy, palette, type, posture, do/don't list, and examples.
- Score compiled artifacts with a design critique rubric in addition to technical validation.

## Open Design Lessons

Open Design's strongest contribution is system shape:

- Skills are file-based and portable.
- Design systems are file-based (`DESIGN.md`) and can be reused across modes.
- The user-facing product has modes: prototype, deck, template, design system.
- Direction cards reduce design variance by forcing a curated early choice.
- The daemon owns artifact storage, preview, skill registry, and design-system resolution.
- Artifact state is durable and reviewable as files.

Patterns to adopt:

- Use a 9-section `DESIGN.md` format for project-level design systems:
  - Visual Theme & Atmosphere
  - Color Palette & Roles
  - Typography Rules
  - Component Stylings
  - Layout Principles
  - Depth & Elevation
  - Do's and Don'ts
  - Responsive Behavior
  - Agent Prompt Guide
- Use direction cards as a progressive disclosure UI: palette, type sample, mood, best-for, examples.
- Make templates and packs first-class, not hidden runtime internals.
- Store generated artifacts and metadata in a reviewable form.
- Provide fast template mode where the agent only personalizes content.

What Aura should change:

- Generalize `presentationScaffolds` into `artifactPacks`.
- Add `DESIGN.md` resolution and generation as a first-class project capability.
- Replace many new-project controls with a recommended default and optional direction cards.
- Add preview galleries that render compiled examples, not static color swatches.

## Guizang Lessons

Guizang's quality comes from strong defaults and very explicit visual rhythm.

Patterns to adopt:

- A deck starts from a complete working template.
- Layouts are selected from a catalog; the agent does not invent the page structure.
- Themes are curated and finite. Arbitrary color mixing is rejected.
- Every deck has theme rhythm: hero dark, light, dark, hero light, and content pages alternate.
- Large serif display type gives slides personality.
- Body text, metadata, quotes, and numbers have clear typographic roles.
- The checklist captures real observed failures, especially class preflight, image ratio, title length, chrome/kicker duplication, and no emoji icons.
- Visual density is managed by choosing layouts, not by shrinking everything.

What Aura should change:

- Build at least one truly excellent deck pack around a stronger editorial system:
  - fixed 1920x1080 canvas;
  - scale-to-fit host framework;
  - large display typography;
  - media-aware layouts;
  - rhythm table before generation;
  - hero/breaker slides every 3-4 slides;
  - proper chrome and footer semantics.
- Replace generic motif circles with meaningful motifs:
  - product screenshot,
  - real image,
  - data visualization,
  - section number,
  - typographic mark,
  - or nothing.
- Do not expose arbitrary custom colors. Expose curated style options and a "match my brand" path.
- Include failure fixtures in the pack so tests can catch cheap-looking regressions.

## Harness Lessons

Harness Engineering reframes the issue as context, tools, and guardrails.

Patterns to adopt:

- The harness should not trust the model to remember taste. Taste must live in docs, schemas, examples, and checks.
- Tools should be atomic and typed.
- Tool errors and validation failures must be visible to the model.
- The model should repair only the rejected surface.
- Context should be assembled by priority, not dumped into one mega prompt.
- Repository-local knowledge is the system of record.

What Aura should change:

- Add named design failures.
- Store slot payloads as editable source state.
- Add render/screenshot checks for pack examples.
- Add an artifact-pack registry that loads one pack at a time.
- Make pack docs mandatory for implementation agents.

## Current Aura Design Failures To Remove

Remove or redesign these patterns before building more on top of the current scaffold:

- Generic card-wall slides.
- Decorative radial gradients and circular motif rings as default "visual interest."
- Themes that only change color values.
- Same skeleton sequence for most decks.
- Footer/page chrome that appears because the template needs it, not because it helps the deck.
- Metric placeholders that look like fake proof.
- Dense body copy squeezed into fixed panels.
- Type scale that uses large sans-serif headings without a distinctive editorial or product voice.
- Project creation UI that asks for scaffold internals.
- Validation that passes visual mediocrity because it only checks structural rules.

## Replacement Principles

1. Opinionated defaults before choices.
   - The user should get a good default from the brief.
   - Choice appears only when it reduces risk.

2. Direction is more than color.
   - A direction includes type, grid, density, imagery, chrome, motion, and forbidden patterns.

3. Assets beat decoration.
   - Use real logos, screenshots, data visuals, and product imagery when available.
   - If unavailable, use honest placeholders or restrained typography, not fake decorative visuals.

4. Compile from source state.
   - Payloads, outline, rhythm, and data models are source.
   - HTML/PPTX/DOCX/XLSX output is compiled.

5. Quality gates must include taste.
   - Add named checks for hierarchy, rhythm, card walls, placeholder slop, accent overuse, and asset misuse.

6. Every pack needs excellent examples.
   - Examples are not decoration. They are training context for future agents and regression fixtures.

## New Product Shape

Aura should move from "starter kits + presentation scaffold" to "guided artifact studio."

Top-level user-facing modes:

- Create a deck
- Create a document
- Create a spreadsheet
- Create or match a design system
- Start from a template

The UI should not expose these as a complex control panel. The normal path is:

1. User describes the outcome.
2. Aura chooses a recommended artifact type and pack.
3. Aura says the plan plainly.
4. If style is ambiguous, Aura shows at most three direction cards.
5. Aura generates using the pack.
6. User edits with guided chips or natural language.

Advanced controls belong in a "details" drawer, not the default flow.

## Reference Direction Library For Aura

Adapt Open Design's five directions, but make them artifact-aware:

1. Editorial Magazine
   - Best for investor decks, thought leadership, strategy docs.
   - Serif display, restrained paper palette, one warm accent.
   - Deck posture: hero/breaker rhythm, pull quotes, big numbers, real images.
   - Document posture: article-like headings, side notes, calm tables.
   - Spreadsheet posture: not default except for report dashboards.

2. Modern Minimal
   - Best for SaaS, product updates, internal operating docs.
   - System sans, greyscale, one accent, almost no decoration.
   - Deck posture: product screenshots and diagrams over cards.
   - Document posture: clear hierarchy and compact modules.
   - Spreadsheet posture: clean tables, frozen headers, restrained dashboard.

3. Data Utility
   - Best for research, finance, operations, engineering.
   - Dense but legible, mono numerics, precise grids.
   - Deck posture: evidence slides, tables, charts, annotations.
   - Document posture: citations, tables, methodology blocks.
   - Spreadsheet posture: primary default for models and dashboards.

4. Warm Narrative
   - Best for teaching, onboarding, customer stories, proposals.
   - Warm background, gentle contrast, friendly but not childish.
   - Deck posture: illustrated or photographic story beats.
   - Document posture: guided sections, callouts, examples.
   - Spreadsheet posture: simple trackers and planning templates.

5. Bold Editorial
   - Best for campaigns, launches, manifestos, creative reviews.
   - Strong type, high contrast, asymmetric layouts.
   - Deck posture: big statements, fewer cards, deliberate tension.
   - Document posture: short branded briefs.
   - Spreadsheet posture: rarely used except summary dashboards.

## Acceptance Criteria For The Next Implementation

- The default generated presentation looks substantially better with no user choices.
- Direction changes alter layout posture and typography, not just color tokens.
- The UI presents at most one recommended default and two alternatives.
- A deck can be generated using real media slots or honest placeholders.
- The current generic motif and card-wall patterns are removed from the default deck pack.
- Documents and spreadsheets have their own scaffold plans, not leftovers from presentation logic.
- Every artifact type has a pack contract, example, validator, and source payload model.
- Tests include both structural checks and design-quality named failures.

