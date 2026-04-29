# Value-Focused Product Realignment Plan

> Status: **in execution**
> Date: 2026-04-29
> Depends on: Phase 10 (API, MCP, and Automation Alignment) and Backlog Phase B completion
> Scope: Sharpen output quality and workflow discipline across all artifact types with minimal scope expansion

## Purpose

This plan refocuses Aura's development effort on the capabilities that deliver the most direct user value: high-quality artifact output and disciplined, predictable AI workflows. It does not introduce new artifact types or platform features. Every workstream addresses a measurable quality gap in existing output.

The plan is organized into four workstreams, each targeting a distinct quality gap identified in the workflow gap analysis and agent product benchmark research:

- [Workstream 1](#workstream-1-presentation-quality-and-workflow-sharpening): Presentation quality and workflow sharpening
- [Workstream 2](#workstream-2-document-workflow-discipline): Document workflow discipline
- [Workstream 3](#workstream-3-per-family-document-style-packs): Per-family document style packs
- [Workstream 4](#workstream-4-workflow-observability-and-quality-loop): Workflow observability and quality loop

Workstreams 1 and 2 are substantially complete. This plan is currently executing Workstream 3.

---

## Workstream 1: Presentation Quality and Workflow Sharpening

**Status:** `complete`

**Goal:** Give presentation generation a recipe-based planner with explicit design constraints, per-recipe style packs, and multi-slide queue support so that every presentation output is anchored to a deliberate visual system rather than blank-slate HTML invention.

**Key deliverables:**
- `ArtifactWorkflowPlan` with presentation `requestKind`, `presentationRecipeId`, and `queuedWorkItems`
- 7 recipe-specific reference style packs (`presentation-title-polished`, `presentation-executive-starter`, `presentation-launch-narrative`, `presentation-stage-setting`, `presentation-editorial-light`, `presentation-finance-grid-light`, `presentation-quiz-show`)
- Per-recipe design constraints and anti-patterns in the workflow planner
- Sequential queue mode for multi-slide batch and add-slide operations

**Evidence:** Tests in `src/test/workflow-planner.test.ts` and `src/test/reference-style-packs.test.ts` cover recipe routing and style-pack quality rules. All tests pass.

---

## Workstream 2: Document Workflow Discipline

**Status:** `complete`

**Goal:** Apply the same planner discipline to documents — explicit intent classification (`create`/`edit`/`restyle`/`rewrite`), document theme family selection, blueprint-anchored composition rules, and integration of `templateGuidance` into the document workflow handler.

**Key deliverables:**
- `documentThemeFamily` field on `ArtifactWorkflowPlan` with 6 families (`executive-light`, `editorial-light`, `proposal-light`, `research-light`, `playbook-light`, `infographic-light`)
- `DocumentBlueprint` registry with composition rules, component rules, and example HTML per blueprint
- `templateGuidance` wired through `DocumentInput` and applied in the document system prompt
- Per-family design constraints and anti-patterns in the workflow planner

**Evidence:** Tests in `src/test/workflow-planner.test.ts` cover theme family selection. `src/test/workflow-parity.test.ts` validates document handler contract parity.

---

## Workstream 3: Per-Family Document Style Packs

**Status:** `complete`

**Goal:** Give each document theme family its own `ReferenceStylePack`, matching the design guidance richness that presentations get from per-recipe style packs. Currently all 6 document theme families fall back to a single generic `document-professional-light` pack. This means every document type — executive briefs, research summaries, playbooks, infographics — gets identical design guidance regardless of purpose. Adding per-family packs closes this gap.

**Scope:**
- Add 6 new `ReferenceStylePackId` values and corresponding `ReferenceStylePack` objects: `document-executive-light`, `document-editorial-light`, `document-proposal-light`, `document-research-light`, `document-playbook-light`, `document-infographic-light`
- Update `resolveReferenceStylePackId` in `build.ts` to select the appropriate per-family pack instead of always returning `document-professional-light`
- Update tests in `workflow-planner.test.ts` to assert per-family pack selection

**Not in scope:**
- Changing document blueprint composition rules (already well-defined in Workstream 2)
- Adding exemplar packs for documents (separate future workstream)
- Changing the presentation style pack system

**Acceptance criteria:**
1. Each of the 6 document theme families maps to a distinct `ReferenceStylePack`
2. Every new pack has `confidentialityRules`, `syntheticExample`, `typography`, `paletteRules`, `layoutRules`, and `motionRules`
3. The `reference-style-packs.test.ts` suite passes with all new packs included
4. Tests in `workflow-planner.test.ts` assert the correct per-family pack for `proposal-light` and `research-light` document families
5. `npm test` and `npm run build` pass

**Evidence log:**

| Date | Agent | Action | Result |
| --- | --- | --- | --- |
| 2026-04-29 | Copilot | Added 6 per-family document style packs, updated `resolveReferenceStylePackId`, updated workflow-planner tests | `npm test` passed (505 tests); `npm run build` passed |

---

## Workstream 4: Workflow Observability and Quality Loop

**Status:** `planned`

**Goal:** Make workflow quality measurable and visible so quality regressions are caught quickly and users see meaningful progress signals during longer runs.

**Planned deliverables:**
- Workflow quality benchmark loop integrated with the benchmark cases registry
- Per-artifact quality scores and confidence signals surfaced in the UI after generation
- Benchmark coverage extended to cover the document and spreadsheet families added in Workstreams 2 and 3

**Dependencies:** Workstream 3 must be complete before the document benchmark families can be scored against the new per-family style guidance.

---

## Execution Rules

- Each workstream must have passing `npm test` and `npm run build` before being marked `complete`
- Evidence must be logged in the table before a workstream transitions to `complete`
- Do not start Workstream 4 until Workstream 3 evidence is logged
- Follow the confidentiality rules from `docs/validation/major-change-protocol.md` for all synthetic fixtures and style-pack examples
