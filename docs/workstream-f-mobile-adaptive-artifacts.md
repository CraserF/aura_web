# Workstream F: Mobile-Adaptive Artifact Design System

This document defines the detailed implementation plan for mobile-adaptive rendering and framing of generated documents and presentations.

## Objectives

- Preserve artifact proportions across viewport sizes without distortion.
- Make artifact boundaries visually explicit so users can always identify canvas/document limits.
- Ensure generated outputs remain readable and high-quality on mobile, tablet, and desktop.
- Prevent stretched artifact backgrounds on larger screens by using intentional gutters.

## Non-Goals

- Rewriting reveal.js internals.
- Replacing existing generation pipelines in one step.
- Broad visual redesign of all templates in a single PR.

## Inputs and Constraints

- Presentations currently use Reveal with a fixed design stage and transform scaling.
- Existing repository guidance already warns against viewport-unit sizing inside slides.
- Documents support both scroll mode and paged mode.
- Any change must keep desktop quality stable while improving mobile behavior.

## Target Proportion Rules

- Presentation default stage: 16:9 (1920x1080 source space).
- Document frame default: A4-like content frame in paged mode, readable constrained frame in scroll mode.
- Both artifact types: fit/contain behavior only, no stretch-to-fill.
- Extra viewport space should become side or bottom gutters, not stretched artifact surface.

## Phased Execution

Status snapshot (2026-04-23):

- Phase F0: baseline contract documented (in progress, continue refining docs as behavior evolves).
- Phase F1: initial implementation landed (shared presentation frame + 16:9 fit/contain behavior).
- Phase F2: initial implementation landed (document canvas frame/boundary consistency in app shell).
- Phase F3: implemented via mobile-safe generation guidance in document/presentation prompt surfaces plus lightweight QA guards.
- Phase F4: partially implemented via representative fixtures and checklist hardening; full manual viewport matrix still pending.

## Phase F0: UX and Architecture Baseline

Deliverables:
- Define canonical canvas-frame contract for both artifact types.
- Define viewport breakpoints and frame behavior matrix (mobile/tablet/desktop).
- Define border/frame visual spec (thickness, radius, contrast, shadow).

Files:
- docs/architecture.md
- docs/coding-patterns.md
- docs/workstream-f-mobile-adaptive-artifacts.md

Acceptance:
- Architecture and coding rules explicitly define fit/contain and frame boundaries.

## Phase F1: Presentation Frame and Fit/Contain

Deliverables:
- Wrap presentation canvas in a bounded frame with visible outline.
- Ensure frame preserves 16:9 ratio and letterboxes/pillarboxes as needed.
- Ensure controls and overlays remain correctly positioned in framed mode.

Files:
- src/components/PresentationCanvas.tsx
- src/styles/index.css (or existing shared style surface)
- docs/architecture.md

Acceptance:
- No distortion on small or large screens.
- Visible frame boundary always present.
- Existing navigation/fullscreen controls remain usable.

## Phase F2: Document Frame and Boundary Consistency

Deliverables:
- Add consistent frame outline behavior in document canvas for scroll and pages mode.
- Keep document content readable while making frame limits explicit.
- Preserve print/export behavior and avoid regressions.

Files:
- src/components/DocumentCanvas.tsx
- src/services/export/pdf.ts (only if needed for frame/print interaction)
- docs/coding-patterns.md

Acceptance:
- Clear document boundary in both modes.
- No clipping or overflow regressions in iframe-rendered content.
- Print/PDF output unaffected unless explicitly intended.

## Phase F3: Generation Guidance for Mobile-Ready Layouts

Deliverables:
- Update prompt/composer rules so generated output avoids mobile-hostile layout assumptions.
- Add template/blueprint constraints for spacing, columns, and media behavior on narrow screens.
- Keep desktop quality and brand expression intact.

Files:
- src/services/ai/prompts/composer.ts
- src/services/ai/workflow/document.ts
- src/services/ai/workflow/presentation.ts
- src/services/ai/templates/document-blueprints.ts

Acceptance:
- Newly generated artifacts show better mobile readability without desktop regression.
- Prompt guidance should prefer:
  - single-column or gracefully collapsing narrative layouts unless the prompt clearly asks for side-by-side comparison
  - fluid media sizing and wrap-safe KPI or metadata bands
  - limited slide density for fixed 16:9 stages viewed inside smaller framed viewports
- Presentation rules must preserve the fixed stage model; do not introduce responsive stretch logic inside slide HTML.

## Phase F4: Regression and Quality Hardening

Deliverables:
- Add representative artifact fixture set for manual and automated review.
- Validate visual consistency across representative devices and screen classes.
- Finalize rollout notes and risk controls.

Files:
- docs/implementation-plan-multi-agent.md
- docs/workstream-f-mobile-adaptive-artifacts.md
- Optional targeted tests where feasible

Acceptance:
- Validation evidence captured and linked before marking Workstream F complete.

Representative fixture set:
- one long-form document fixture
- one visually dense document fixture
- one presentation fixture with cards, media framing, and metrics
- Current fixture file: `src/test/fixtures/workstream-f.ts`

## Cross-Workstream Dependencies

- Workstream A:
  - Version history panel should become overlay on smaller screens.
  - Add clearer separation between New Project and New Document actions.
  - This keeps shell affordances clear while canvas framing changes roll out.

- Workstream B/C:
  - Export and preview paths must preserve framed artifact boundaries where appropriate.

## Validation Matrix (Required)

Manual viewport classes:
- Mobile narrow portrait
- Mobile landscape
- Tablet portrait
- Desktop standard
- Desktop wide

Manual checks per artifact type:
- Boundary visibility and contrast
- Proportion preservation (no stretch)
- Readability and interaction comfort
- Overlay/control positioning
- Background gutter behavior

Automated checks:
- npm run build
- npm test

Evidence log template:
- Date
- Agent
- Artifact type
- Viewports tested
- Build result
- Test result
- Manual findings
- Regressions and actions

Viewport review checklist:
- document frame remains visibly bounded with readable gutters
- presentation stage remains proportionally contained and legible
- dense modules stack or wrap cleanly instead of clipping
- controls and overlays stay usable
- desktop rendering stays visually ambitious rather than collapsing into bland single-column output

## Risks and Mitigations

- Risk: Over-constraining layouts harms creative output.
  - Mitigation: enforce framing and proportion rules at canvas layer first; keep prompt constraints lightweight.

- Risk: Frame styling leaks into exported/printed artifacts.
  - Mitigation: isolate frame styles to app shell/canvas wrappers, not artifact content.

- Risk: Reveal control overlays misalign under new container framing.
  - Mitigation: test control positioning in edit and present modes before rollout.

## Completion Criteria

Workstream F may be marked complete only when:
- All phase acceptance criteria are met.
- Validation matrix evidence is logged.
- Build and tests are passing.
- Desktop quality is not regressed while mobile behavior is improved.
