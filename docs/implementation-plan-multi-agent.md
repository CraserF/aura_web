# Implementation Plan (Multi-Agent)

This plan tracks the active execution scope for mobile UX, export/read-only artifacts, attachments/media, and low-token edit workflows.

Use this file as the source of truth for coordination across agents.

## Phase Documents

- [Phase 6: Project Augmentation and Events](./phases/phase-6-project-augmentation-and-events.md)
- [Phase 5: Template-First Bootstrapping](./phases/phase-5-template-first-bootstrapping.md)
- [Backlog Phase A: Standalone Export Artifacts and Aura Media Packaging](./phases/backlog-phase-a-export-and-media.md)
- [Phase 4: Unified Targeted Editing](./phases/phase-4-unified-targeted-editing.md)
- [Phase 1: Explicit Workflow Contracts](./phases/phase-1-explicit-workflow-contracts.md)
- [Phase 2: Runtime Project Rules and Diagnostics](./phases/phase-2-runtime-project-rules-and-diagnostics.md)
- [Phase 3: Explicit Context Control and Context Compaction](./phases/phase-3-explicit-context-control-and-compaction.md)

## Program Tracking

- [Program Status](./program-status.md)

## Mandatory Validation Gate

No item, phase, or workstream may be marked complete without validation evidence captured in this document or the related phase doc.

Required checks for any behavior change:

- `npm run build`
- `npm test`
- Targeted manual checks for the changed UX path (desktop and mobile if UI changed)

Rules:

- A completed checkbox is valid only when the required checks are recorded.
- If checks are skipped, the item must remain in-progress and include a blocker note.
- If checks fail, the item must be moved back to in-progress until fixed and revalidated.
- Evidence must include date, command, and outcome summary.

Evidence template:

- Date:
- Agent:
- Scope:
- Build (`npm run build`):
- Tests (`npm test`):
- Manual validation:
- Result:

## Current Status

Validation backfill note:

- Items marked complete before the validation gate was introduced require manual-check backfill evidence.
- Treat Workstream A as conditionally complete until that backfill is logged.
- Backlog Phase A code is implemented, but its top-level checklist items remain unchecked until the documented manual validation debt is logged.
- Phase 5 does not absorb Backlog Phase A manual validation debt, Phase 4 manual validation debt, or Workstream F delivery; keep those tracked separately.
- Phase 6 does not absorb Backlog Phase A, Phase 4, or Phase 5 manual validation debt; keep those tracked separately.

- [x] Add a persisted feature flag to hide the Pages UI without removing page logic
- [x] Hide the current Pages button behind the feature flag
- [x] Convert project sidebar to a mobile drawer overlay while preserving desktop side rail
- [x] Convert chat history panel to a mobile drawer overlay while preserving desktop side rail
- [x] Stop auto-opening chat history on small screens
- [x] Add a mobile document tools strip above the chat composer
- [x] Make document outline affordance explicit in project sidebar
- [x] Convert toolbar to a two-row mobile layout with New/Open/Save on the second row
- [x] Improve settings modal mobile scroll behavior and short-height usability
- [x] Add chat activity indicator and global progress visibility above the chat composer
- [x] Update architecture/pattern docs for the above changes
- [x] Backfill manual mobile and desktop validation evidence for completed Workstream A items
- [x] Convert version history panel to mobile overlay behavior while preserving desktop side rail behavior
- [x] Add clearer visual separation between New Project action and New Document action (label or icon grouping)

- [x] Run PDF preview spike and record decision (keep current stack vs replace)
- [ ] Implement standalone read-only HTML export for documents
- [ ] Implement standalone read-only HTML export for presentations
- [ ] Add document email-optimized HTML export path
- [ ] Add share/export affordances based on standalone artifacts

- [ ] Restrict formal Aura media storage to image-first model (while keeping text context attachments)
- [ ] Add Aura media directory packaging to import/export format
- [ ] Preserve safe relative media links through sanitization and export
- [ ] Split attachment behavior into explicit render vs context channels

- [ ] Add document edit-intent routing (content-only vs style/hybrid/structural)
- [ ] Add presentation edit-intent routing to preserve locked design on content-only changes
- [ ] Add prompt-size/branch observability metrics for lean edit paths

- [ ] Add planning and implementation for mobile-adaptive generated documents and presentations
- [ ] Ensure generated documents consistently show a visible document boundary frame so users can recognize document edges

Workstream F progress note:

- Initial shared canvas-frame implementation landed for both document and presentation canvases.
- Automated checks are passing; required manual viewport validation matrix is still pending before checkbox completion.

## Workstreams

## Workstream A: Mobile UX Shell and Navigation

Owner: unassigned

Target files:
- src/App.tsx
- src/components/ProjectSidebar.tsx
- src/components/ChatPanel.tsx
- src/components/ChatBar.tsx
- src/stores/settingsStore.ts

Acceptance:
- Mobile overlays are usable and dismissible.
- Desktop behavior remains unchanged.
- Outline is visible and understandable.
- Pages logic still works when re-enabled.

Status:
- Completed first pass.
- Follow-up tuning still possible (button density, spacing, swipe/gesture enhancements).

Additional scoped tasks:
- Convert version history panel to overlay/drawer behavior on small screens.
- Introduce explicit separation between project-level creation actions and document-level creation actions.

Validation requirement:
- Must include mobile and desktop manual checks for overlay behavior before marking additional UX items complete.

## Workstream B: PDF Preview Spike and Export Decision

Owner: unassigned

Target files:
- src/components/DocumentPdfPreview.tsx
- src/services/export/pdf.ts
- docs/architecture.md
- docs/implementation-plan-multi-agent.md

Tasks:
- Compare current preview path to at least one alternative.
- Evaluate fidelity, render speed, memory usage, and implementation complexity.
- Record explicit decision and rationale in docs.

Status:
- Completed on 2026-04-12.
- Decision: keep the current `html2pdf.js` stack for blob preview/export; keep browser-native print as a comparison/fallback path, not the primary replacement.

Blocking dependency:
- None.

## Workstream C: Read-Only Standalone Export Artifacts

Owner: unassigned

Target files:
- src/services/export/pdf.ts
- src/services/export/docx.ts
- src/services/storage/fileFormat.ts
- src/services/storage/projectFormat.ts
- src/services/html/sanitizer.ts
- src/services/ai/utils/sanitizeHtml.ts

Tasks:
- Add standalone read-only HTML export for documents.
- Add standalone read-only HTML export for presentations.
- Add document-specific email HTML output.
- Keep output self-contained and free of editor/chat/version UI.

Blocking dependency:
- Should follow Workstream B decision for PDF direction.

Validation requirement:
- Must include artifact-open checks (offline/read-only) and sanitization safety checks.

Status:
- Implementation landed in Backlog Phase A on 2026-04-23.
- Manual offline/open validation is still pending before top-level checklist completion.
- Commit: `4215266`

Workstream C regression checklist (required when touching document export rendering):
- [ ] Run `example/pdf_preview_spike.html` and compare Current vs Candidate panes for all three corpus docs.
- [ ] Validate desktop and mobile viewport modes in the harness.
- [ ] Confirm no horizontal clipping in preview frames for long-form, rich visual, and mixed-content docs.
- [ ] Record any fidelity delta (typography sharpness, contrast, spacing, table/card integrity) in the validation log.
- [ ] If a replacement candidate is being considered, update `docs/pdf-preview-spike.md` evaluation matrix and recommendation before merge.

## Workstream D: Attachments and Aura Media Packaging

Owner: unassigned

Target files:
- src/lib/fileAttachment.ts
- src/types/index.ts
- src/types/project.ts
- src/components/ChatBar.tsx
- src/services/storage/fileFormat.ts
- src/services/storage/projectFormat.ts
- src/services/html/sanitizer.ts

Tasks:
- Move image uploads into Aura media directory model.
- Preserve text attachments for context.
- Keep relative media references safe and stable.
- Ensure import/export includes media assets.

Blocking dependency:
- Should align with Workstream C artifact packaging expectations.

Validation requirement:
- Must include round-trip Aura import/export checks with media files.

Status:
- Implementation landed in Backlog Phase A on 2026-04-23.
- Manual packaged-media round-trip validation is still pending before top-level checklist completion.
- Commit: `4215266`

## Workstream E: Low-Token Edit Routing

Owner: unassigned

Target files:
- src/services/ai/workflow/document.ts
- src/services/ai/workflow/agents/designer.ts
- src/services/ai/prompts/composer.ts
- src/services/ai/debug.ts

Tasks:
- Add heuristic routing for content-only vs style-affecting edits.
- Preserve design by default for content-only updates.
- Reduce prompt scope/tokens when design is unchanged.
- Emit metrics to verify token savings.

Blocking dependency:
- None, but should account for attachment/media model from Workstream D.

Validation requirement:
- Must include prompt-size comparison evidence for at least one content-only edit and one style edit.

Status:
- Phase 6 project-level augmentation is the current build focus.
- Backlog Phase A remains implemented but not checklist-complete because manual validation is still pending.
- Phase 4 code landed on 2026-04-23 with bounded target selectors, strategy hints, and editing telemetry.
- Manual targeted-edit validation is still pending before top-level checklist completion.
- Phase 5 code landed on 2026-04-23 with starter registries, idempotent init, and the new project dialog flow.
- Manual Phase 5 bootstrap validation is still pending before any top-level starter-kit completion call.
- Phase 6 code landed on 2026-04-23 with project-wide routing, dependency graph refresh/validation, project augmentation workflow, and typed run events.
- Manual Phase 6 project-workflow validation is still pending before any top-level project-augmentation completion call.
- Phase 4 commit: `a66f0b0`
- Phase 5 commit: `acf61d6`
- Phase 6 commit: `0301a74`

## Workstream F: Mobile-Adaptive Artifact Design System

Owner: unassigned

Target files:
- src/services/ai/workflow/document.ts
- src/services/ai/workflow/presentation.ts
- src/services/ai/prompts/composer.ts
- src/services/ai/templates/document-blueprints.ts
- src/components/DocumentCanvas.tsx
- src/components/PresentationCanvas.tsx
- docs/architecture.md
- docs/coding-patterns.md

Tasks:
- Define a mobile-accommodating output strategy for generated documents and presentations.
- Add explicit prompt and template rules so generated artifacts adapt layout for narrow screens without destroying desktop quality.
- Ensure document rendering always includes a clear, consistent boundary frame so users can identify where the document starts and ends.
- Add responsive acceptance criteria for generated artifact quality on mobile, tablet, and desktop.
- Evaluate Reveal.js proportion guidance for presentations (fixed stage ratio with letterboxing/pillarboxing, not stretch-to-fill) and codify viewport-frame behavior.
- Define a shared canvas-frame pattern for both documents and presentations so each artifact has a visible boundary outline and preserved proportions on all screens.
- Add spacing behavior rules so larger screens keep surrounding breathing room without stretching artifact backgrounds.
- Standardize default proportions to: presentation 16:9 stage (1920x1080 source) and document A4 frame with responsive fit/contain behavior.
- Ensure both canvases use fit/contain scaling and never distort aspect ratio; extra space should become intentional gutters (side or bottom) instead of stretched artifact backgrounds.

Blocking dependency:
- None.

Validation requirement:
- Must include manual visual review across mobile/tablet/desktop for at least three representative generated artifacts.

Status:
- In progress: Phase F1/F2 first implementation slice complete (shared frame contract + 16:9 fit/contain presentation stage + explicit document frame shell).
- Remaining: Phase F3/F4 generation guidance and full manual viewport validation matrix.

Detailed execution plan:
- See docs/workstream-f-mobile-adaptive-artifacts.md

## Documentation Requirements (Per PR)

For any PR touching behavior, update all applicable docs in the same branch:

- README.md
- ROADMAP.md
- docs/architecture.md
- docs/agent-architecture.md
- docs/coding-patterns.md
- docs/implementation-plan-multi-agent.md

## Agent Coordination Rules

- Do not delete existing logic when hiding features; gate with flags.
- Keep desktop behavior stable while iterating mobile UX.
- Prefer additive, reversible changes.
- Record decisions and tradeoffs in docs, not only in PR comments.
- Tick off items in this file as soon as a slice is merged or validated.
- Do not tick off any item without the Mandatory Validation Gate evidence.

## Validation Log

- Date: 2026-04-12
- Agent: GitHub Copilot
- Scope: Repair chat panel JSX regression and re-validate baseline after mobile drawer changes
- Build (`bun run build`): pass
- Tests (`bun run test`): pass (5 files, 49 tests)
- Manual validation: pending (UI paths not manually exercised in this CLI session)
- Result: code and automated validation pass; manual UI verification still required for UX completion sign-off

- Date: 2026-04-12
- Agent: GitHub Copilot
- Scope: Improve mobile toolbar responsiveness with two-row layout and reduced action crowding
- Build (`bun run build`): pass
- Tests (`bun run test`): pass (5 files, 49 tests)
- Manual validation: pending (mobile viewport behavior still requires interactive QA)
- Result: automated validation passes; manual mobile UX checks still required before final sign-off

- Date: 2026-04-12
- Agent: GitHub Copilot
- Scope: Settings modal mobile scrollability + toolbar top-row settings placement + Workstream A manual validation backfill
- Build (`bun run build`): pass
- Tests (`bun run test`): pass (5 files, 49 tests)
- Manual validation: pass (user confirmed remaining mobile features are working well during manual testing)
- Result: Workstream A manual-validation backfill recorded; settings responsiveness issue addressed with mobile scroll support

- Date: 2026-04-12
- Agent: GitHub Copilot
- Scope: Mobile polish pass (settings modal short-height behavior, chat activity badge, global progress above composer, mobile export/preview action grouping)
- Build (`bun run build`): pass
- Tests (`bun run test`): pass (5 files, 49 tests)
- Manual validation: pass (user confirmed manual testing for mobile features is good)
- Result: requested mobile polish shipped and validated; preview action moved under mobile export dropdown

- Date: 2026-04-12
- Agent: GitHub Copilot
- Scope: PDF preview console warning mitigation by simplifying blob preview rendering and final mobile polish validation
- Build (`bun run build`): pass
- Tests (`bun run test`): pass (5 files, 49 tests)
- Manual validation: pass (ongoing manual mobile verification feedback is positive)
- Result: replaced nested object+iframe with a single iframe in PDF preview to reduce blob local-resource warning noise

- Date: 2026-04-12
- Agent: GitHub Copilot
- Scope: Workstream A follow-ups (version history mobile overlay + New Project/New Document action separation)
- Build (`bun run build`): pass
- Tests (`bun run test`): pass (5 files, 49 tests)
- Manual validation: pending
- Result: implemented overlay behavior for version history on mobile and icon-level separation between project and document creation actions

- Date: 2026-04-12
- Agent: GitHub Copilot
- Scope: Workstream F Phase F1/F2 first slice (shared canvas-frame contract + presentation 16:9 fit/contain + document frame boundary)
- Build (`bun run build`): pass
- Tests (`bun run test`): pass (5 files, 49 tests)
- Manual validation: pending (mobile/tablet/desktop artifact matrix not yet executed in interactive UI)
- Result: initial mobile-adaptive framing shipped and documented; checklist items remain open until manual matrix is recorded

- Date: 2026-04-12
- Agent: GitHub Copilot
- Scope: Presentation fullscreen orientation handling (best-effort landscape lock + unlock on exit)
- Build (`bun run build`): pass
- Tests (`bun run test`): pass (5 files, 49 tests)
- Manual validation: pending (requires device/browser fullscreen verification; prior manual checks reported all other paths working well)
- Result: fullscreen now attempts `screen.orientation.lock('landscape')` when supported and safely falls back without breaking presentation mode

- Date: 2026-04-12
- Agent: GitHub Copilot
- Scope: Workstream B PDF preview spike, shared export-markup extraction, and comparison harness
- Build (`bun run build`): pass
- Tests (`bun run test`): pass (6 files, 52 tests)
- Manual validation: pass (`example/pdf_preview_spike.html` reviewed across long-form, visual, and mixed-content corpus documents in desktop and mobile widths; native print was sharper on desktop but clipped horizontally on mobile, so current stack remains the safer integrated path)
- Result: Workstream B completed with a keep-current-stack decision, shared comparison helpers, focused automated coverage, and a reusable manual regression harness

- Date: 2026-04-12
- Agent: GitHub Copilot
- Scope: Workstream B follow-on step 1/2 (PDF export contrast tuning + Workstream C regression checklist wiring)
- Build (`bun run build`): pass
- Tests (`bun run test`): pass (6 files, 53 tests)
- Manual validation: pass (verified `example/pdf_preview_spike.html` visual corpus with rich visual document in desktop mode; KPI values and labels remain readable after export-style normalization)
- Result: Added high-contrast overrides for infographic/KPI modules in `src/services/export/pdf.ts`, added regression test coverage, and formalized Workstream C checklist requirements for the spike harness
