# Harness Engineering Lessons For Aura Artifact Quality

Companion to `docs/plan/presentation_scaffold_recovery_plan.md`.

Sources studied:

- `/Volumes/Callum_SSD/dev_projects/harness-engineering-guide/README.md`
- `/Volumes/Callum_SSD/dev_projects/harness-engineering-guide/guide/what-is-harness.md`
- `/Volumes/Callum_SSD/dev_projects/harness-engineering-guide/guide/agentic-loop.md`
- `/Volumes/Callum_SSD/dev_projects/harness-engineering-guide/guide/tool-system.md`
- `/Volumes/Callum_SSD/dev_projects/harness-engineering-guide/guide/context-engineering.md`
- `/Volumes/Callum_SSD/dev_projects/harness-engineering-guide/guide/guardrails.md`
- `/Volumes/Callum_SSD/dev_projects/harness-engineering-guide/guide/skill-system.md`
- OpenAI Harness Engineering article: `https://openai.com/index/harness-engineering/`
- Harness Guide site: `https://harness-guide.com/`

## Core Lesson

The quality problem is not just a model-output problem. It is a harness problem.

The model is currently being asked to make too many visual decisions inside one turn, with too little mechanical feedback. The reference harness material argues for a different shape:

- keep the harness thin and deterministic;
- move domain taste into file-based skills and packs;
- expose only the right tools at the right time;
- make output legible to the agent and the host app;
- promote repeated human feedback into mechanical checks;
- treat repository-local docs, schemas, examples, and tests as the system of record.

For Aura, this means the artifact runtime should not be a prompt that asks for a good deck/document/spreadsheet. It should be a guided artifact factory. The agent plans, fills typed inputs, and repairs rejected values. The host owns layout, styling, export constraints, and validation.

## Thin Harness, Thick Artifact Packs

The Harness Guide's skill-system docs describe a skill as a bundle of documentation, behavior rules, and tools. The OpenAI article describes repository-local knowledge as the system of record and warns that broad guidance rots unless it is encoded in local docs and checks.

Aura should apply that directly:

- The core artifact runtime stays small: classify intent, choose a pack, assemble context, call slot-filling tools, compile, validate, render, and repair.
- Presentation, document, and spreadsheet taste lives in artifact packs, not central prompts.
- Each pack contains the complete design contract: `SKILL.md`, `DESIGN.md`, `tokens.json`, layout catalog, slot schemas, examples, validation rules, and fixtures.
- The runtime loads only the active pack and the relevant references. It should not inject every artifact rule into every generation.

This is the "thin harness, thick skills" pattern adapted to Aura.

## Tool Loop Shape

The agentic-loop docs emphasize explicit exit conditions, tool-result visibility, and no silent tool errors. Aura's artifact loop should become a typed loop with these steps:

1. `classifyArtifactIntent`
   - Detect artifact type, audience, output intent, source material, and whether a brand/design system exists.
2. `resolveDesignContext`
   - Load project `DESIGN.md`, brand rules, uploaded media, data files, or starter kit rules.
3. `selectArtifactPack`
   - Choose the best pack and direction. Ask the user only if there is genuine ambiguity.
4. `planArtifactRhythm`
   - Deck: slide arc and theme rhythm.
   - Document: module hierarchy and reading rhythm.
   - Spreadsheet: workbook model, sheet roles, dashboard views, and validation tables.
5. `fillAllowedSlots`
   - The model receives one module/slide/sheet schema at a time.
   - It returns JSON only.
   - Unknown keys are rejected.
6. `compileArtifact`
   - Host function assembles HTML, document XML, or workbook styles.
   - The model never owns layout CSS, spreadsheet style XML, or deck navigation.
7. `lintAndRender`
   - Static checks first, then render/screenshot checks for visual artifacts.
8. `repairRejectedSlots`
   - The model only repairs content values or chooses another allowed module.
   - It does not patch arbitrary layout.

This loop gives the model real work, but the risky decisions are host-owned.

## Context Engineering Lessons

The context-engineering docs argue that the model only knows what the harness assembles, and that context must be priority-based. Aura should stop relying on one large prompt block and instead assemble context in a predictable order:

Priority 0: runtime invariants
- No raw CSS in scaffolded mode.
- No arbitrary classes.
- No invented data.
- No unsupported edit surfaces.

Priority 1: active artifact pack contract
- `SKILL.md`
- manifest summary
- selected direction tokens
- active layout/module schemas
- pack checklist

Priority 2: project design context
- `DESIGN.md`
- project rules
- brand spec
- selected media/data assets

Priority 3: current request
- user goal
- audience
- requested change
- output/export intent

Priority 4: existing artifact state
- slot payloads, not compiled HTML where possible
- data model for spreadsheets
- document module tree

Priority 5: recent conversation
- compressed summary after a threshold

The important change: compiled artifact output should not be the primary source of truth for edits. Slot payloads and pack decisions should be.

## Guardrails Become Design Guardrails

The guardrails docs separate prompt guidance from enforced policy. Aura needs the same distinction for design:

Prompt guidance:
- "Use restraint."
- "Prefer an editorial direction."
- "Avoid generic cards."

Mechanical guardrails:
- Max card count per slide/module.
- Max accent usages per slide/screen.
- Required theme rhythm.
- Defined type scale only.
- Declared image aspect ratios only.
- No duplicate adjacent layout skeletons.
- No more than two display typefaces per artifact.
- No inline style or arbitrary class names.
- No placeholder or invented metrics.

The current scaffold has some technical guardrails, but not enough taste guardrails. A deck can pass the compiler and still look cheap because "cheap" is not encoded as a failure.

## Agent Legibility

The OpenAI article emphasizes agent legibility: what is not in the repo does not exist to the agent. Aura needs a local design knowledge base that future agents can navigate:

- `docs/design-system/` should explain artifact principles, not only implementation details.
- Every artifact pack should contain examples and failure examples.
- Quality feedback from bad generations should be promoted into named checks.
- Plans should link the exact pack files and rules that implementation agents must study.
- A recurring cleanup path should remove low-quality packs and stale examples.

The present problem is a good example: the implementation followed the previous plan structurally, but the plan did not contain enough visual taste in executable form. The repo therefore taught the agent to constrain output, but not to make it beautiful.

## Implications For Presentations

Deck generation should be treated like a controlled stage production:

- A stable 1920x1080 framework owns navigation, export, scaling, and print.
- A pack owns visual vocabulary, type scale, rhythm, and slide skeletons.
- The agent owns topic-specific copy, source-aware facts, and choosing between allowed skeletons.
- The host owns validation and render checks.

Deck failures should be reported as named contract failures, for example:

- `deck.rhythm.too_flat`
- `deck.layout.card_wall`
- `deck.typography.no_display_personality`
- `deck.asset.generic_or_missing`
- `deck.copy.placeholder_metric`
- `deck.theme.accent_overuse`

These failures should feed targeted repair instructions.

## Implications For Documents

Document generation should use the same harness pattern:

- Documents need module packs: executive memo, research brief, proposal, one-pager, technical spec, playbook.
- The model fills structured module payloads: headline, summary, evidence blocks, callout, table rows, source notes.
- The document compiler owns typography, page rhythm, citations, heading hierarchy, page breaks, tables, and exports.
- The quality gate checks heading depth, table readability, orphan headings, source coverage, and tone consistency.

The user should not have to choose much. Aura can default from intent:

- "board update" -> executive memo.
- "research summary" -> research brief.
- "sales proposal" -> proposal.
- "internal SOP" -> playbook.

## Implications For Spreadsheets

Spreadsheet generation also needs scaffolding, not freeform workbook authoring:

- Workbook packs define sheet roles: assumptions, raw data, clean data, model, dashboard, audit.
- Style tokens map to workbook styles: fills, borders, number formats, table styles, frozen panes.
- The model fills schemas for tables, formulas, assumptions, and chart specs.
- The host writes the workbook and validates formulas, references, ranges, and sheet dependencies.

Quality for spreadsheets is less about visual flourish and more about trust:

- named inputs;
- consistent number formats;
- no hidden magic formulas;
- separate raw data from model logic;
- dashboard outputs trace back to data;
- protected/generated cells are clearly marked.

## User Experience Guidance

The harness references support simplicity: the user should not configure the harness manually. Aura should move from "choose everything" to "guided defaults with visible override."

Default flow:

1. User says what they need.
2. Aura infers artifact type, audience, and likely pack.
3. Aura shows one recommended direction and two alternatives only if useful.
4. User can accept or change style with simple chips:
   - More editorial
   - More minimal
   - More data-dense
   - Warmer
   - More brand-led
5. Aura plans and shows a work queue.
6. Edits are phrased as supported surfaces:
   - "Change wording"
   - "Use a calmer style"
   - "Add evidence"
   - "Make it denser"
   - "Add a slide/module/sheet"

The user should not have to understand scaffold ids, export-intent enums, or theme internals.

## Required Architecture Changes

1. Introduce artifact packs for all artifact types, not only presentation scaffolds.
2. Store source payloads beside compiled output.
3. Add design-system resolution as a first-class runtime step.
4. Add named design-quality failures, not only technical validation.
5. Render generated examples in CI or release smoke tests.
6. Add a "pack preview gallery" using real compiled examples.
7. Replace many UI choices with intelligent defaults and a small set of guided override chips.
8. Make reference docs and pack docs mandatory reading for implementation agents.

## Non-Negotiables

- The model does not author full layout CSS in scaffolded modes.
- The model does not invent arbitrary colors.
- The model does not invent metrics or sources.
- Every artifact has a source-of-truth payload separate from compiled output.
- Every pack has examples and failure cases.
- Every visual pack has render verification.
- User simplicity beats exhaustive configurability.

