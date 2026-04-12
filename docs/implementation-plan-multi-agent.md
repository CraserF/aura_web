# Implementation Plan (Multi-Agent)

This plan tracks the active execution scope for mobile UX, export/read-only artifacts, attachments/media, and low-token edit workflows.

Use this file as the source of truth for coordination across agents.

## Mandatory Validation Gate

No item, phase, or workstream may be marked complete without validation evidence captured in this document or the related phase doc.

Required checks for any behavior change:

- `bun run build`
- `bun run test`
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
- Build (`bun run build`):
- Tests (`bun run test`):
- Manual validation:
- Result:

## Current Status

Validation backfill note:

- Items marked complete before the validation gate was introduced require manual-check backfill evidence.
- Treat Workstream A as conditionally complete until that backfill is logged.

- [x] Add a persisted feature flag to hide the Pages UI without removing page logic
- [x] Hide the current Pages button behind the feature flag
- [x] Convert project sidebar to a mobile drawer overlay while preserving desktop side rail
- [x] Convert chat history panel to a mobile drawer overlay while preserving desktop side rail
- [x] Stop auto-opening chat history on small screens
- [x] Add a mobile document tools strip above the chat composer
- [x] Make document outline affordance explicit in project sidebar
- [x] Update architecture/pattern docs for the above changes
- [ ] Backfill manual mobile and desktop validation evidence for completed Workstream A items

- [ ] Run PDF preview spike and record decision (keep current stack vs replace)
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
