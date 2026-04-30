# Aura Artifact Design System Rebuild Plan

Companion to:

- `docs/plan/presentation_scaffold_recovery_plan.md`
- `docs/plan/aura_artifact_design_recovery_synthesis.md`
- `docs/plan/reference-harness-engineering-lessons.md`

This is the planning document for the next implementation phase. It deliberately covers documents, presentations, and spreadsheets because the underlying quality problem is shared: the model needs a guided artifact system, not a larger prompt.

## Goal

Build a simple user experience on top of a strict, high-quality artifact generation system.

For the user:

- describe the outcome;
- accept a strong default;
- optionally pick from a few understandable style directions;
- edit through natural language or guided chips;
- never be forced to understand scaffolds, schemas, or export internals.

For the agent:

- select a pack;
- plan rhythm/structure;
- fill typed slots;
- repair rejected payloads;
- never freehand layout systems unless explicitly in a dev/debug path.

For Aura:

- own layout, styles, exports, validation, examples, and source payloads.

## Strategic Shift

Move from:

`Prompt -> model generates artifact HTML -> runtime validates fragments`

To:

`Brief -> intent classifier -> design context -> artifact pack -> source payloads -> compiler -> validator -> renderer -> repair`

The compiled artifact is not the source of truth. The source of truth is:

- design context;
- artifact pack id/version;
- direction id;
- structure/rhythm plan;
- slot payloads;
- data model;
- asset bindings.

## New Folder Structure

Add a generalized artifact pack system:

```text
src/services/artifactPacks/
  types.ts
  registry.ts
  designContext.ts
  compiler/
    htmlCompiler.ts
    documentCompiler.ts
    spreadsheetCompiler.ts
  validator/
    sharedChecks.ts
    presentationChecks.ts
    documentChecks.ts
    spreadsheetChecks.ts
  directions/
    auraDirections.ts
  packs/
    presentation/editorial-stage-v1/
    presentation/product-briefing-v1/
    document/executive-memo-v1/
    document/research-brief-v1/
    spreadsheet/operating-model-v1/
    spreadsheet/data-dashboard-v1/
```

Keep `src/services/presentationScaffolds/` temporarily as a compatibility layer, but do not expand it. The target is `artifactPacks`.

## Artifact Pack Contract

Every pack should contain:

```text
<pack>/
  manifest.ts
  SKILL.md
  DESIGN.md
  tokens.ts
  layouts/
    *.html | *.doc.ts | *.sheet.ts
  schemas.ts
  compiler.ts
  validator.ts
  examples/
    source.json
    example.html | example.docx.json | example.xlsx.json
    preview.png
  references/
    checklist.md
    failure-cases.md
    copy-rules.md
```

### `manifest.ts`

Defines:

- id and version;
- artifact type;
- best-for;
- supported output modes;
- supported directions;
- required source assets;
- optional source assets;
- layout families;
- max/min content sizes;
- edit surfaces;
- export caveats.

### `SKILL.md`

Human/agent-readable workflow:

- when to use the pack;
- when not to use it;
- what inputs it expects;
- planning sequence;
- quality checklist;
- common failures;
- repair strategy.

This follows the Open Design and Guizang skill pattern. It is not a general prompt blob.

### `DESIGN.md`

Pack-local design system using the 9-section Open Design format:

- Visual Theme & Atmosphere
- Color Palette & Roles
- Typography Rules
- Component Stylings
- Layout Principles
- Depth & Elevation
- Do's and Don'ts
- Responsive Behavior
- Agent Prompt Guide

Project-level `DESIGN.md` can override selected token roles, but the pack decides how those roles are applied.

### `tokens.ts`

Machine-readable token definitions:

- colors by semantic role;
- typography;
- spacing scale;
- density scale;
- border/radius policy;
- chart palette;
- table style roles;
- motion budget;
- export-mode restrictions.

### `layouts/`

Locked skeletons. The model fills declared slots only.

Presentation layouts are section skeletons. Document layouts are module renderers. Spreadsheet layouts are sheet/table/chart definitions.

### `schemas.ts`

Zod schemas for every model-facing input and output:

- rhythm plan;
- slot payloads;
- data tables;
- formula specs;
- media bindings;
- edit requests.

Reject unknown keys. Reject HTML in slots unless explicitly allowed. Reject invented metrics unless a source is present.

### `examples/`

Examples are required. A pack without examples is not shippable.

Each pack must include:

- one excellent compiled artifact;
- one source payload that produced it;
- one preview image;
- at least three failure cases once v1 stabilizes.

The examples are used by the UI gallery, tests, and future agents.

## Design Direction System

Directions replace raw theme choices. A direction is not a palette. It is a design posture.

### Direction Fields

```ts
interface AuraDesignDirection {
  id: string;
  label: string;
  bestFor: string[];
  mood: string;
  palette: DesignTokens;
  typography: TypographyTokens;
  layoutPosture: string[];
  artifactPosture: {
    presentation: string[];
    document: string[];
    spreadsheet: string[];
  };
  do: string[];
  dont: string[];
  examplePackIds: string[];
}
```

### V1 Directions

1. `editorial-magazine`
   - Default for strategy, investor, narrative, brand, and thought-leadership decks.
   - Serif display, calm paper, ink, one warm accent.
   - No generic cards as primary structure.

2. `modern-minimal`
   - Default for SaaS, product updates, internal tools, simple documents.
   - System sans, precise grid, muted palette, one cobalt or brand accent.
   - Product screenshots and diagrams over decoration.

3. `data-utility`
   - Default for research, finance, operations, engineering, spreadsheets.
   - Dense grids, mono numerics, annotated charts, evidence-first layouts.
   - No oversized marketing heroes unless requested.

4. `warm-narrative`
   - Default for teaching, onboarding, customer-facing explainers, proposals.
   - Warm neutral palette, friendly hierarchy, examples and guided modules.
   - No childish icon sets or emoji.

5. `bold-editorial`
   - Default for launch, campaign, manifesto, creative review.
   - Strong type, high contrast, asymmetric layouts, big statements.
   - Use sparingly; not for dense operational docs.

## User Experience

### Default Flow

1. User enters a brief.
2. Aura infers artifact type and pack.
3. Aura shows one sentence:
   - "I'll make this as an editorial investor deck with 8 slides, using a restrained paper/ink style."
4. Aura shows optional compact controls:
   - `Style: Recommended`
   - `Audience`
   - `Length`
   - `Use brand/assets`
5. If the user opens style:
   - show the recommended direction and two alternatives, not all possible settings.
6. Generate.

### What To Remove From Default UI

Do not show by default:

- scaffold id;
- separate theme and direction selectors;
- export intent unless export is the user's immediate goal;
- dense color swatches without examples;
- "choose every setting before start" forms.

These can live in an advanced drawer or debug mode.

### Guided Edit Chips

After generation, offer chips that map to allowed edit surfaces:

- More editorial
- More minimal
- Warmer
- More data-dense
- More visual
- Shorter copy
- Add evidence
- Add slide/module/sheet
- Use brand assets
- Restyle only

Each chip should become a typed edit operation. It should not open the full design space.

## Presentation Rebuild

The current `executive-editorial-v1` should not be extended as-is. It should be replaced or heavily rewritten as `presentation/editorial-stage-v1`.

### Remove

- generic circular motif;
- radial gradient decoration as default;
- repeated panel/card walls;
- palette-only theme differences;
- generic chips as visual proof;
- fake metric placeholders;
- skeleton sequence that always feels like the same deck.

### Add

Presentation pack layouts:

1. Cover
   - huge type, real subtitle, optional logo/media.
2. Act Divider
   - hero rhythm, short act title, strong whitespace.
3. Big Number
   - one to three evidence-backed numbers, no invented stats.
4. Quote/Image
   - editorial pull quote plus real image/screenshot.
5. Before/After
   - two clear states, no wall of cards.
6. Process
   - three to five steps, visually sequenced.
7. Evidence Table
   - compact table or chart for research/data decks.
8. Screenshot/Product
   - product/UI/media-led slide.
9. Decision
   - recommendation with risks and trade-offs.
10. Closing Action
   - clear owner/action/checkpoint.

### Required Rhythm

For 6+ slides:

- slide 1 is cover;
- at least one act divider or breaker every 3-4 slides;
- no three adjacent slides with the same density and mood;
- no adjacent content slides using the same layout family;
- at least one media/evidence slide if assets or data are available;
- no more than one card-grid slide per five slides.

### Typography

Each direction changes typography:

- Editorial Magazine: serif display + sans body + mono metadata.
- Modern Minimal: system sans display/body + mono numerics.
- Data Utility: sans display/body + mono data labels.
- Warm Narrative: soft serif display + humanist sans body.
- Bold Editorial: extreme display type + restrained body.

The compiler should assign type roles. The model should not pick fonts.

### Media Protocol

If a brand/product is named:

- look for user-provided assets first;
- if none, ask or use a safe asset lookup path where available;
- bind assets to declared media slots;
- if no usable asset exists, use a labelled placeholder or pure type layout;
- do not generate generic decorative imagery as a substitute for product evidence.

### Presentation Quality Gates

Add failures:

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

## Document Rebuild

Documents need their own packs, not adapted slide layouts.

### V1 Document Packs

1. `document/executive-memo-v1`
   - summary, decision, evidence, risks, recommendation, next steps.
2. `document/research-brief-v1`
   - question, method, findings, evidence table, implications, sources.
3. `document/proposal-v1`
   - client context, approach, timeline, pricing/options, terms, next step.
4. `document/playbook-v1`
   - principles, procedures, checklists, examples, roles, escalation.

### Source Payload

Documents compile from:

- title;
- audience;
- abstract/summary;
- module list;
- evidence blocks;
- tables;
- callouts;
- citations/source notes;
- appendix items.

### Document Quality Gates

- no orphan headings;
- no over-deep heading hierarchy;
- module order matches pack contract;
- summary is present;
- tables fit page width;
- source notes exist for factual claims where required;
- tone matches audience;
- no decorative components that reduce readability.

## Spreadsheet Rebuild

Spreadsheets need structure, not just tables.

### V1 Spreadsheet Packs

1. `spreadsheet/operating-model-v1`
   - assumptions, inputs, model, outputs, dashboard, audit.
2. `spreadsheet/data-dashboard-v1`
   - raw data, cleaned data, pivots/metrics, dashboard, notes.
3. `spreadsheet/project-tracker-v1`
   - tasks, owners, timeline, risks, dashboard.
4. `spreadsheet/budget-planner-v1`
   - categories, transactions, forecast, dashboard.

### Source Payload

Spreadsheets compile from:

- workbook purpose;
- sheet plan;
- table schemas;
- formula specs;
- validation rules;
- chart specs;
- dashboard cards;
- named ranges;
- assumptions.

### Spreadsheet Quality Gates

- no formulas referencing missing cells;
- no circular refs unless explicitly allowed;
- all formulas use named ranges or stable table refs where possible;
- raw data is separated from model logic;
- numeric formats are consistent;
- headers are frozen;
- dashboard metrics trace to source tables;
- generated/protected cells are visually distinct;
- charts use pack chart palette.

## Runtime Changes

### New Run Plan Fields

Extend run planning beyond presentations:

```ts
artifactPackId?: string;
artifactPackVersion?: number;
designDirectionId?: string;
designContextSpec?: DesignContextSpec;
artifactStructurePlan?: ArtifactStructurePlan;
allowedEditSurface?: ArtifactEditSurface;
sourcePayloadRef?: string;
mediaBindingPlan?: MediaBindingPlan;
dataBindingPlan?: DataBindingPlan;
exportIntent?: 'html' | 'pdf' | 'docx' | 'pptx' | 'xlsx';
```

### Source State Storage

Each generated artifact should store:

```text
artifact.source.json
artifact.compiled.html | artifact.docx | artifact.xlsx
artifact.validation.json
artifact.preview.png
```

Edits patch `artifact.source.json` and recompile.

### Compatibility

Existing artifacts can keep using legacy paths. New artifacts should use artifact packs by default. Freeform generation remains dev/debug only.

## Tests

Add tests in layers:

### Pack Registry

- pack manifests parse;
- ids are unique;
- required examples exist;
- directions are complete;
- output modes match compiler support.

### Compiler

- deterministic output from source payload;
- one style system per visual artifact;
- no unresolved slots;
- no inline style in scaffolded presentation HTML;
- document modules compile in declared order;
- spreadsheet workbook has declared sheets and named ranges.

### Validator

- catches unknown classes;
- catches card walls;
- catches missing assets;
- catches fake metric placeholders;
- catches bad rhythm;
- catches spreadsheet formula errors;
- catches document heading/table failures.

### Runtime

- create routes through artifact packs;
- edit patches source payloads;
- restyle changes direction/tokens only;
- unsupported edits are blocked or mapped to supported surfaces.

### UI

- default flow does not expose scaffold internals;
- recommended direction appears first;
- optional style cards persist to run plan;
- edit chips map to typed edit operations.

### Visual Smoke

For each shipped visual pack:

- compile example;
- render desktop/tablet/mobile or fixed canvas;
- capture screenshot;
- compare basic nonblank/layout bounds;
- manually review before release.

## Implementation Phases

### Phase 0 - Planning Docs

Status: this document set.

Deliverables:

- reference lesson docs;
- synthesis;
- rebuild plan;
- implementation checklist.

### Phase 1 - Design Direction And Pack Foundation

- Add `artifactPacks` types and registry.
- Add direction library.
- Add project `DESIGN.md` resolver.
- Add source payload storage types.
- No UI changes yet except internal plumbing.

### Phase 2 - Replace Presentation Default

- Build `presentation/editorial-stage-v1`.
- Use real example deck as fixture.
- Retire current generic scaffold from normal flow.
- Add render-based smoke for example deck.

### Phase 3 - Simplify Presentation UI

- Default to recommended pack/direction.
- Move advanced scaffold settings into details.
- Add direction cards with real previews.
- Add guided edit chips.

### Phase 4 - Documents

- Add `document/executive-memo-v1`.
- Add `document/research-brief-v1`.
- Store source payload and compile to existing document runtime.
- Add document validation.

### Phase 5 - Spreadsheets

- Add `spreadsheet/operating-model-v1`.
- Add `spreadsheet/data-dashboard-v1`.
- Compile workbook styles and formulas deterministically.
- Add formula and style validation.

### Phase 6 - Pack Gallery And Save-As-Pack

- Add gallery of compiled examples.
- Add "save current artifact as template/pack candidate" after v1 quality is stable.
- Do not ship this before the default packs look excellent.

## Implementation Instructions For Future Agents

Before editing code, read:

1. `docs/plan/presentation_scaffold_recovery_plan.md`
2. `docs/plan/aura_artifact_design_recovery_synthesis.md`
3. `docs/plan/aura_artifact_design_system_rebuild_plan.md`
4. `docs/plan/reference-harness-engineering-lessons.md`
5. Reference-specific lesson docs in `docs/plan/reference-*-lessons.md`
6. Current pack files under `src/services/presentationScaffolds/`

Then do not start by patching prompts. Start by replacing the design source of truth.

## Definition Of Done For The Next Major Change

- The default deck no longer uses the current generic motif/card-wall visual language.
- At least one generated deck looks good without the user selecting style settings.
- Direction changes visibly change typography/layout posture.
- The user-facing creation flow is simpler than today.
- Source payloads are persisted and edits recompile from source.
- Tests prove the runtime does not call the freeform designer path for pack-backed artifacts.
- Documentation points future agents to artifact packs and design directions, not prompt-only behavior.

