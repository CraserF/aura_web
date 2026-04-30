# Reference Guizang PPT Lessons

## Scope

This note distills patterns from:

- `/Volumes/Callum_SSD/dev_projects/guizang-ppt-skill`
- `/Volumes/Callum_SSD/dev_projects/open-design/skills/guizang-ppt`

It does not copy Guizang assets or code. The goal is to extract the rules behind the workflow and translate them into an Aura presentation scaffold redesign that produces better decks with less user choice.

## Core Thesis

Guizang works because it removes most design freedom. It gives the agent a narrow magazine-style operating system: a fixed deck workflow, a fixed layout library, a fixed theme set, a class preflight, a rhythm plan, and a real failure checklist. The user is not asked to become an art director. They choose, or are assigned, a direction; the system protects the aesthetic.

Aura should move presentation generation toward the same shape:

- The scaffold compiler owns structure, CSS, layout classes, motion recipes, and validation.
- The model fills bounded content slots and media intents.
- The product exposes a small set of curated directions, not a broad template picker plus arbitrary colors.
- Rhythm is planned before slides are filled, not discovered after a deck already looks monotonous.

## What Guizang Gets Right

### Magazine-Style Workflow

The strongest pattern is the sequence, not any individual visual trick:

1. Pick a magazine direction or theme before writing slides.
2. Clarify audience, duration, source material, images, and hard constraints.
3. Build a narrative arc: hook, context, core, shift, takeaway.
4. Plan slide count and theme rhythm before choosing layouts.
5. Use a finite layout library instead of inventing slide structures.
6. Preflight class names against the template CSS before generation.
7. Fill content and media into known slots.
8. Run a checklist built from real failures.

Aura already has pieces of this in `src/services/presentationScaffolds`, especially compiler-owned skeletons, direction themes, rhythm planning, and deterministic validation. The redesign should double down on that path and reduce reliance on open-ended prompt-generated HTML/CSS.

### Layouts.md Pattern

Guizang's `layouts.md` is a layout contract. It defines a small library of page archetypes:

- Cover hero
- Section divider
- Big-number proof
- Quote plus image
- Image grid
- Pipeline/process
- Hero question
- Big quote
- Before/after comparison
- Lead image plus side text

Each archetype has a purpose, default mood, image ratio expectation, and spacing guidance. Aura's current `executive-editorial-v1` scaffold has six useful skeletons: cover, context, metric-proof, comparison, mechanism-process, and closing-action. It is missing several of the most valuable magazine rhythms: section divider, big quote, hero question, quote/media story split, media grid, and lead-image text mix.

Aura should treat these as scaffold skeletons, not prompt examples. The model should never paste layout code. It should select a skeleton id and fill `data-slot` values.

### Themes.md Pattern

Guizang's theme rule is blunt and effective: pick from five curated palettes, do not accept arbitrary hex values, and do not mix palettes. The rule exists because custom colors break the deck's tone faster than almost anything else.

Aura should keep curated direction themes and map user intent to the closest one. Current scaffold directions are `executive`, `launch`, `editorial`, `research`, and `teaching`. These are useful but more operational than visual. A stronger user-facing layer would be:

- Editorial default: general leadership, product narrative, business storytelling.
- Technical report: AI, engineering, data, benchmarks.
- Human story: interviews, founder stories, reflective talks.
- Design portfolio: brand, visual review, product design, gallery-like decks.
- Research manual: methods, findings, academic or field-note decks.

Internally those can map to existing direction ids or a new scaffold pack. The product should recommend one by default. If the user asks for custom colors, Aura should map them to the closest curated theme or use brand color only as a constrained accent after contrast checks.

### Checklist.md Pattern

The checklist is not a generic QA list. It is a catalogue of real deck failures. That matters because most presentation failures are not syntax errors; they are repeated visual mistakes:

- Undefined classes make layouts collapse.
- Light slides can inherit dark background treatment and look gray.
- All-light decks feel flat.
- Chrome and kicker text can duplicate each other.
- Image grids break when aspect ratios are uncontrolled.
- Images align to the bottom and get clipped by navigation/footer regions.
- Oversized titles wrap one word or one character per line.
- Emoji icons break editorial tone.
- Thick borders, heavy shadows, and rounded app cards make the deck look like SaaS UI.
- Missing motion markers make the page feel abrupt.

Aura's checklist should stay deterministic wherever possible. Current checks already catch one style block, missing class coverage, placeholders, viewport units, inline styles, motion fallback, density risks, and rhythm repetition. The next step is to add the more editorial checks: mood rhythm, chrome/kicker semantics, title length per skeleton, media crop/ratio safety, and unapproved theme tokens.

### Class Preflight

The most important Guizang rule is: the template is the only class source. Layout docs must never reference classes that the template CSS does not define.

Aura should make this impossible by construction:

- Skeleton templates are the only HTML source.
- `style.css` is the only scaffold class source.
- The compiler injects mood, density, background, and slot content.
- The validator fails unknown classes before the deck reaches the user.
- Tests should extract every class from every skeleton and assert it is defined in scaffold CSS or an explicit runtime allowlist.

Aura already does much of this through `validateScaffoldedDeck` and `approvedClasses`. This should become the default presentation path, not just a newer path beside older freeform templates.

### Visual Rhythm

Guizang plans visual rhythm before writing slide code. Its hard rules are directly reusable in Aura with fixed-stage wording:

- Do not allow three consecutive slides with the same mood and density.
- Decks of eight or more slides need at least one dark hero and one light hero or equivalent high-contrast reset.
- Avoid decks where every body slide is light.
- Insert a hero, divider, question, or big-quote reset every three to four slides.
- Alternate airy pages with dense evidence pages.
- Alternate proof modules with story or mechanism modules.
- Avoid adjacent repeated skeletons.

Aura's `planDeckRhythm` currently avoids adjacent skeleton repetition and validates repeated mood/density runs. It should also enforce hero reset intervals, require dark/light contrast in longer decks, and choose skeletons based on narrative beats rather than a simple rotating fallback.

## Common Template Failures To Guard Against

These should be explicit named failures in scaffold validation and quality telemetry:

- `undefined-class`: any slide class absent from scaffold CSS or runtime allowlist.
- `style-system-count`: anything other than one compiler-owned style block.
- `inline-style`: generated slide content tries to style itself.
- `viewport-unit`: CSS uses viewport units inside Aura's scaled fixed stage.
- `unapproved-theme-token`: colors are not from the chosen scaffold theme.
- `rhythm-monotony`: three-slide runs repeat mood, density, or visual weight.
- `missing-hero-reset`: long deck lacks periodic hero/divider/question reset.
- `all-light-body`: body slides never switch mood.
- `repeated-skeleton`: adjacent content slides use the same skeleton.
- `card-wall`: too many equal cards without hierarchy or integrated visual explanation.
- `chrome-kicker-duplicate`: stable metadata and page hook say the same thing.
- `title-length-risk`: title exceeds skeleton-specific length or line-count budget.
- `media-aspect-risk`: media slot receives unsupported ratio or crop mode.
- `media-bottom-crop-risk`: image alignment can collide with footer/nav regions.
- `emoji-icon`: pictographic emoji used as iconography.
- `placeholder-token`: unresolved template or slot placeholder remains.
- `motion-mismatch`: motion preset does not match skeleton role or lacks reduced-motion fallback.

## Aura Redesign Direction

### 1. Make Scaffolded Decks The Primary Path

`src/services/presentationScaffolds` is already aligned with Guizang's best lesson: the harness owns the deck. Aura should route normal presentation creation through scaffolded generation by default:

- Planner creates narrative beats and roles.
- Rhythm planner selects scaffold, direction, theme, skeleton, mood, density, and media needs.
- Model fills JSON slots only.
- Compiler assembles the deck.
- Validator blocks structural, theme, rhythm, and export issues.

The older production templates in `src/services/ai/templates/html` can remain as compatibility and inspiration, but their large card styling, broad gradients, and per-template visual systems should not be the long-term default.

### 2. Redesign The Direction Layer Around Curated Editorial Packs

Aura should expose fewer choices:

- Recommended direction, auto-selected.
- Optional direction switch among five curated choices.
- Optional duration or slide count.
- Optional source material and media.

Avoid exposing low-level template ids, arbitrary color pickers, animation levels, layout selection, or per-slide design knobs during creation. Those should be internal compiler decisions.

Each direction pack should bundle:

- Theme tokens.
- Default mood map by skeleton.
- Preferred skeleton mix.
- Chrome/kicker/footer tone.
- Motion recipe map.
- Density defaults.
- Media treatment rules.

This mirrors the open-design `styles.md` idea: a direction answers many user-choice questions at once.

### 3. Expand The Skeleton Library To Magazine Archetypes

Evolve `executive-editorial-v1` or create a new `aura-magazine-v1` pack with roughly ten skeletons:

| Skeleton | Role | Notes |
|---|---|---|
| `cover` | title-scene | Strong hero lockup, one motif, compact metadata. |
| `section-divider` | transition | Sparse chapter reset, dark/light alternating mood. |
| `metric-proof` | proof | Two to three dominant metrics plus interpretation, not six equal cards. |
| `story-split` | context/problem | Quote or insight on one side, media or proof panel on the other. |
| `media-grid` | evidence | Two, four, or six media frames with fixed ratio and captions. |
| `process-pipeline` | mechanism/timeline | Ordered steps with connector rhythm. |
| `question-hero` | transition/closing | One big question or challenge with high contrast. |
| `big-quote` | quote-statement | One statement, attribution, large negative space. |
| `comparison` | comparison | Parallel lanes plus verdict/bridge. |
| `lead-media` | explainer | Main image/diagram plus side text or vice versa. |

The current skeletons map cleanly into this set: `cover`, `context`, `metric-proof`, `comparison`, `mechanism-process`, and `closing-action` are the seed. The missing skeletons are mostly rhythm and media skeletons.

### 4. Add First-Class Media Slot Contracts

Guizang is strict about images because images break decks. Aura's scaffold types already include `mediaSlots`, but the current pack does not appear to use them.

Add media slots to relevant skeletons with:

- Allowed ratios: `16:9`, `16:10`, `4:3`, `3:2`, `1:1`, `3:4`.
- Crop modes: `cover-top` for screenshots/photos, `contain` for diagrams/UI scenes, `cover-center` only when safe.
- Slot purpose and requirement flag.
- Caption slot paired with every media slot.
- Validator check that all required media slots are filled or intentionally downgraded to a non-media variant.

For image grids, the contract should use equal source-space frame dimensions rather than uncontrolled aspect ratio. For screenshots and diagrams, default to contain or top-preserving crop so labels and browser chrome are not cut.

### 5. Make Rhythm Planning A Required Artifact

Before slot generation, Aura should produce a rhythm plan equivalent to Guizang's theme rhythm table:

- Slide index.
- Narrative role.
- Skeleton id.
- Mood.
- Density.
- Visual weight.
- Motion recipe.
- Media needs.
- Transition purpose.

The validator should compare the compiled deck against this plan. If the model or compiler output drifts, validation should fail or advise before finalization.

### 6. Translate Motion Recipes Into Aura's Runtime

Guizang uses data-marked entrance recipes: cascade, hero, quote, directional, and pipeline. Aura should not copy the implementation. It should translate the idea into scaffold-owned motion:

- `hero`: slow entrance or ambient motif only on hero/divider/question slides.
- `cascade`: ordered reveal for standard text/proof modules.
- `quote`: line-by-line reveal for big quote skeletons.
- `directional`: left/right reveal for comparison skeletons.
- `pipeline`: connector or step reveal for process skeletons.

For `editable-pptx`, motion should degrade to static or minimal. For HTML/PDF, use approved CSS presets and reduced-motion fallbacks. Do not let the model invent keyframes.

### 7. Fix Semantic Text Roles

Guizang's chrome/kicker distinction is useful for Aura:

- Chrome/footer is stable deck metadata: section, page, date, source, or issue marker.
- Kicker is the page hook: a short, slide-specific cue.
- Footer is quiet evidence or navigation context.

Aura should encode this through slot names and prompt guidance. Validation can cheaply flag exact or near-duplicate text between kicker, footer, and labels.

### 8. Reduce Visual Softness And Card Dependence

The current Aura production templates often lean on rounded 20-28px cards, glassy gradients, and repeated panel grids. Guizang's better editorial feel comes from type, grid, contrast, and spacing.

For the magazine scaffold:

- Keep card radius near 8px or below unless there is a functional reason.
- Use borders, rails, rules, and caption systems over heavy shadows.
- Use large type and asymmetric grids instead of nested cards.
- Use color as signposting, not as full-card decoration.
- Let hero pages breathe; do not fill them with metrics.

## Implementation Plan

### Phase 1: Lock The Curation Model

- Decide whether to evolve `executive-editorial-v1` or create `aura-magazine-v1`.
- Rename or map directions to five curated editorial packs.
- Add direction metadata: preferred skeletons, chrome tone, kicker tone, density, motion, and media rules.
- Make scaffolded generation the preferred path for create flows that do not require bespoke custom HTML.

### Phase 2: Expand Skeletons

- Add `section-divider`, `big-quote`, `question-hero`, `story-split`, `media-grid`, and `lead-media`.
- Keep all skeletons compiler-owned with declared slots only.
- Add per-skeleton title length, copy length, media, and density constraints.
- Update tests so every skeleton class is covered by CSS.

### Phase 3: Upgrade Rhythm Planning

- Add hard rhythm rules for long decks: hero reset interval, dark/light contrast, no all-light body run.
- Make rhythm entries include motion recipe and media slot needs.
- Add named validation findings for `missing-hero-reset`, `all-light-body`, and `rhythm-monotony`.

### Phase 4: Add Media Contracts

- Populate `mediaSlots` in skeletons.
- Add compiler support for media placement and captions.
- Add validator checks for aspect ratio, crop mode, missing required media, and media-grid consistency.
- Allow text-only fallback variants only when the skeleton explicitly supports them.

### Phase 5: Simplify User Choice

- UI asks for audience, purpose, duration, source material, media availability, and constraints.
- Direction is auto-recommended with one visible switcher.
- Theme and layout choices are not exposed as separate steps.
- Custom colors are mapped to curated directions or constrained to one accent.

## Acceptance Criteria

A redesigned Aura presentation scaffold is successful when:

- A normal deck can be generated without the model writing CSS or raw slide HTML.
- Every deck has one style system, known classes, concrete backgrounds, and no inline styles.
- Decks of eight or more slides show visible rhythm changes without user micromanagement.
- The user can choose a broad direction, but cannot accidentally create a broken palette.
- Media-heavy decks preserve image tops/sides, captions, and consistent ratios.
- The quality checklist reports editorial failures by name, not just generic validation messages.
- Generated decks look like a coherent magazine issue rather than a sequence of unrelated cards.
