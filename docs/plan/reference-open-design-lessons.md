# Open Design Lessons For Aura

Companion to:

- `/Volumes/Callum_SSD/dev_projects/aura_web/docs/plan/presentation_scaffold_recovery_plan.md`
- `/Volumes/Callum_SSD/dev_projects/aura_web/docs/plan/value-focused-product-realignment-plan.md`
- `/Volumes/Callum_SSD/dev_projects/aura_web/docs/plan/reference-harness-engineering-lessons.md`

Scope: lessons from the local clone at `/Volumes/Callum_SSD/dev_projects/open-design`, studied as a reference architecture and product pattern. Do not copy Open Design assets, templates, screenshots, or source code into Aura. The value is in the product/runtime/design-system concepts and the exact file boundaries that make those concepts legible.

## Sources Studied

Primary product and architecture docs:

- `/Volumes/Callum_SSD/dev_projects/open-design/README.md`
- `/Volumes/Callum_SSD/dev_projects/open-design/QUICKSTART.md`
- `/Volumes/Callum_SSD/dev_projects/open-design/docs/spec.md`
- `/Volumes/Callum_SSD/dev_projects/open-design/docs/architecture.md`
- `/Volumes/Callum_SSD/dev_projects/open-design/docs/skills-protocol.md`
- `/Volumes/Callum_SSD/dev_projects/open-design/docs/modes.md`
- `/Volumes/Callum_SSD/dev_projects/open-design/docs/agent-adapters.md`
- `/Volumes/Callum_SSD/dev_projects/open-design/specs/current/architecture-boundaries.md`
- `/Volumes/Callum_SSD/dev_projects/open-design/specs/current/runtime-adapter.md`
- `/Volumes/Callum_SSD/dev_projects/open-design/specs/current/run.md`
- `/Volumes/Callum_SSD/dev_projects/open-design/specs/current/status.md`
- `/Volumes/Callum_SSD/dev_projects/open-design/specs/current/maintainability-roadmap.md`

Runtime and UI implementation:

- `/Volumes/Callum_SSD/dev_projects/open-design/apps/web/src/App.tsx`
- `/Volumes/Callum_SSD/dev_projects/open-design/apps/web/src/components/EntryView.tsx`
- `/Volumes/Callum_SSD/dev_projects/open-design/apps/web/src/components/NewProjectPanel.tsx`
- `/Volumes/Callum_SSD/dev_projects/open-design/apps/web/src/components/ExamplesTab.tsx`
- `/Volumes/Callum_SSD/dev_projects/open-design/apps/web/src/components/DesignSystemsTab.tsx`
- `/Volumes/Callum_SSD/dev_projects/open-design/apps/web/src/components/ProjectView.tsx`
- `/Volumes/Callum_SSD/dev_projects/open-design/apps/web/src/components/FileWorkspace.tsx`
- `/Volumes/Callum_SSD/dev_projects/open-design/apps/web/src/components/DesignFilesPanel.tsx`
- `/Volumes/Callum_SSD/dev_projects/open-design/apps/web/src/components/FileViewer.tsx`
- `/Volumes/Callum_SSD/dev_projects/open-design/apps/web/src/components/PreviewModal.tsx`
- `/Volumes/Callum_SSD/dev_projects/open-design/apps/web/src/components/AssistantMessage.tsx`
- `/Volumes/Callum_SSD/dev_projects/open-design/apps/web/src/components/QuestionForm.tsx`
- `/Volumes/Callum_SSD/dev_projects/open-design/apps/web/src/artifacts/parser.ts`
- `/Volumes/Callum_SSD/dev_projects/open-design/apps/web/src/artifacts/manifest.ts`
- `/Volumes/Callum_SSD/dev_projects/open-design/apps/web/src/artifacts/renderer-registry.ts`
- `/Volumes/Callum_SSD/dev_projects/open-design/apps/web/src/artifacts/question-form.ts`
- `/Volumes/Callum_SSD/dev_projects/open-design/apps/web/src/runtime/srcdoc.ts`
- `/Volumes/Callum_SSD/dev_projects/open-design/packages/contracts/src/prompts/system.ts`
- `/Volumes/Callum_SSD/dev_projects/open-design/packages/contracts/src/prompts/discovery.ts`
- `/Volumes/Callum_SSD/dev_projects/open-design/packages/contracts/src/prompts/directions.ts`
- `/Volumes/Callum_SSD/dev_projects/open-design/packages/contracts/src/prompts/deck-framework.ts`

Daemon, file, and adapter implementation:

- `/Volumes/Callum_SSD/dev_projects/open-design/apps/daemon/src/server.ts`
- `/Volumes/Callum_SSD/dev_projects/open-design/apps/daemon/src/skills.ts`
- `/Volumes/Callum_SSD/dev_projects/open-design/apps/daemon/src/design-systems.ts`
- `/Volumes/Callum_SSD/dev_projects/open-design/apps/daemon/src/design-system-preview.ts`
- `/Volumes/Callum_SSD/dev_projects/open-design/apps/daemon/src/design-system-showcase.ts`
- `/Volumes/Callum_SSD/dev_projects/open-design/apps/daemon/src/artifact-manifest.ts`
- `/Volumes/Callum_SSD/dev_projects/open-design/apps/daemon/src/projects.ts`
- `/Volumes/Callum_SSD/dev_projects/open-design/apps/daemon/src/document-preview.ts`
- `/Volumes/Callum_SSD/dev_projects/open-design/apps/daemon/src/agents.ts`
- `/Volumes/Callum_SSD/dev_projects/open-design/packages/contracts/src/api/projects.ts`
- `/Volumes/Callum_SSD/dev_projects/open-design/packages/contracts/src/sse/chat.ts`
- `/Volumes/Callum_SSD/dev_projects/open-design/packages/sidecar-proto/src/index.ts`
- `/Volumes/Callum_SSD/dev_projects/open-design/packages/sidecar/src/index.ts`
- `/Volumes/Callum_SSD/dev_projects/open-design/tools/dev/src/config.ts`
- `/Volumes/Callum_SSD/dev_projects/open-design/tools/dev/src/diagnostics.ts`

Representative skill and design-system files:

- `/Volumes/Callum_SSD/dev_projects/open-design/design-systems/README.md`
- `/Volumes/Callum_SSD/dev_projects/open-design/design-systems/default/DESIGN.md`
- `/Volumes/Callum_SSD/dev_projects/open-design/docs/examples/DESIGN.sample.md`
- `/Volumes/Callum_SSD/dev_projects/open-design/skills/web-prototype/SKILL.md`
- `/Volumes/Callum_SSD/dev_projects/open-design/skills/simple-deck/SKILL.md`
- `/Volumes/Callum_SSD/dev_projects/open-design/skills/dashboard/SKILL.md`
- `/Volumes/Callum_SSD/dev_projects/open-design/skills/pm-spec/SKILL.md`
- `/Volumes/Callum_SSD/dev_projects/open-design/skills/finance-report/SKILL.md`
- `/Volumes/Callum_SSD/dev_projects/open-design/skills/guizang-ppt/SKILL.md`
- `/Volumes/Callum_SSD/dev_projects/open-design/skills/guizang-ppt/references/layouts.md`
- `/Volumes/Callum_SSD/dev_projects/open-design/skills/guizang-ppt/references/components.md`

## Core Lesson

Open Design's strongest pattern is not "better presentation starter kits." It is a generalized artifact shell:

- A user chooses or implies an artifact mode.
- A skill defines workflow, preview type, inputs, seed files, references, and output expectations.
- A design system defines the visual language in portable Markdown.
- A runtime composes prompt layers, streams agent events, persists files, previews artifacts in a sandbox, and exposes exports.
- A catalog UI lets users browse capabilities by surface, scenario, mode, and design language without making the first-run path feel like configuration work.

Aura should adapt this into a browser-first artifact runtime rather than clone Open Design's local daemon. Aura's current architecture in `/Volumes/Callum_SSD/dev_projects/aura_web/docs/architecture.md` is fully client-side with AI SDK providers. That product choice can still support the same primitives: artifact packs, design-system documents, typed manifests, sandbox previews, visible run progress, and mode-specific compilers.

The big strategic shift for Aura is to stop treating presentation scaffolds as a special recovery feature. Presentations, documents, and spreadsheets should all become first-class artifact modes backed by packs, manifests, preview renderers, validations, and supported edit surfaces.

## 1. Skill Picker Lessons

Open Design's skill picker exists in three layers, not one dropdown.

Source concepts:

- `/Volumes/Callum_SSD/dev_projects/open-design/docs/skills-protocol.md` defines a skill as `SKILL.md` plus optional `assets/` and `references/`, with optional `od:` metadata.
- `/Volumes/Callum_SSD/dev_projects/open-design/apps/daemon/src/skills.ts` scans `skills/*/SKILL.md`, parses frontmatter, infers missing mode/scenario/platform values, detects side files, and prepends an absolute "skill root" note when a skill ships side files.
- `/Volumes/Callum_SSD/dev_projects/open-design/apps/web/src/components/NewProjectPanel.tsx` hides most skill complexity behind project-type tabs such as prototype, deck, template, image, video, audio, and other. It resolves a default skill for the active tab using `defaultFor` metadata.
- `/Volumes/Callum_SSD/dev_projects/open-design/apps/web/src/components/ExamplesTab.tsx` is the real browseable skill catalog: filter by surface, mode, and scenario; load a static example; use an example prompt to create a project.
- `/Volumes/Callum_SSD/dev_projects/open-design/apps/daemon/src/server.ts` exposes `GET /api/skills`, `GET /api/skills/:id`, and `GET /api/skills/:id/example`.

What Aura should borrow:

- Treat "skill selection" as capability routing, not a user burden. The normal path should infer the pack from the request. The UI can expose a small recommended picker only when the inference is ambiguous.
- Keep a browseable gallery for discovery. Open Design's `ExamplesTab` pattern is valuable because users can inspect what a skill produces before spending a generation run.
- Use a small metadata vocabulary across all artifact packs: `mode`, `surface`, `scenario`, `preview`, `designSystemRequired`, `defaultFor`, `featured`, `examplePrompt`, `capabilitiesRequired`, and `supportedEditSurfaces`.
- Split "create flow" from "capability library." Aura's New Project flow should stay simple, while an Artifact Library can show examples, filters, previews, and advanced pack choices.

Important warning:

Open Design's current clone has some taxonomy drift. `docs/modes.md` describes prototype, deck, template, and design-system modes, while the actual `NewProjectPanel.tsx` adds image, video, audio, and other. `ExamplesTab.tsx` maps its "document" filter to `skill.mode === 'template'`, while document-like skills such as `pm-spec` and `finance-report` are still `prototype` skills that emit HTML. Aura should avoid this ambiguity by naming artifact modes directly: `presentation`, `document`, `spreadsheet`, `web-prototype`, `image`, `video`, and `audio`.

Aura adaptation:

- Rename "presentation starter kit" thinking to "artifact pack" thinking.
- Define a local `ArtifactPackManifest` for Aura with mode-specific extensions.
- Let presentation, document, and spreadsheet packs share catalog metadata but keep their compilers independent.
- Add examples to packs as compiled outputs or screenshots generated by Aura, not copied from Open Design.

## 2. Design System Picker Lessons

Open Design makes design systems portable and visible. The user can pick a primary design system, optionally combine inspirations, browse a library, preview a system before use, and see swatches without opening the Markdown.

Source concepts:

- `/Volumes/Callum_SSD/dev_projects/open-design/design-systems/README.md` describes one folder per design system, each with `DESIGN.md`, category metadata, and swatches derived from color tokens.
- `/Volumes/Callum_SSD/dev_projects/open-design/design-systems/default/DESIGN.md` shows the 9-section format: theme, palette, typography, components, layout, elevation, do/don'ts, responsive behavior, and agent prompt guidance.
- `/Volumes/Callum_SSD/dev_projects/open-design/apps/daemon/src/design-systems.ts` extracts title, category, summary, swatches, and surface from Markdown.
- `/Volumes/Callum_SSD/dev_projects/open-design/apps/web/src/components/NewProjectPanel.tsx` implements a compact design-system picker with "None", single-select, and multi-select inspiration. The first selected item is primary; extras become inspiration IDs in metadata.
- `/Volumes/Callum_SSD/dev_projects/open-design/apps/web/src/components/DesignSystemsTab.tsx` provides the library view: search, category filter, surface filter, swatch rows, default badge, and preview action.
- `/Volumes/Callum_SSD/dev_projects/open-design/apps/daemon/src/design-system-preview.ts` and `/Volumes/Callum_SSD/dev_projects/open-design/apps/daemon/src/design-system-showcase.ts` render live previews from the Markdown tokens.

What Aura should borrow:

- Promote `DESIGN.md` from "project rules prose" to a first-class design artifact.
- Let design systems be selected independently of artifact type, then mapped into mode-specific token targets.
- Use swatches and sample components in UI. A user should be able to tell the difference between executive, editorial, research, and teaching styles visually before generation.
- Support "primary + inspirations" carefully. The primary system should own tokens. Inspirations should influence posture or component flavor, not override the palette.

What Aura should improve:

- A web design system is not enough for documents and spreadsheets. Aura needs a design-system resolver that can map one visual language into:
  - presentation variables and slide rhythm;
  - document heading, paragraph, table, callout, page, and print styles;
  - spreadsheet fills, borders, table styles, number formats, chart styles, frozen panes, and protected-cell cues.
- Store both human-readable Markdown and machine-readable tokens. Open Design extracts tokens heuristically from Markdown. Aura should keep Markdown for agent legibility, but also produce validated `tokens.json` or equivalent typed data for compilers.

Aura adaptation:

- Add a design-system artifact type with editable `DESIGN.md`, parsed token data, and sample previews.
- Add mode-specific token adapters: `presentationTokens`, `documentStyles`, and `spreadsheetStyles`.
- Use design-system previews as product UI, not just docs. A "Style" picker should show swatches, type samples, and a representative slide/module/table preview.

## 3. Artifact Runtime Lessons

Open Design's artifact runtime has three useful ideas: stream the model's artifact, persist it as a real project file, then render it through a manifest-aware viewer.

Source concepts:

- `/Volumes/Callum_SSD/dev_projects/open-design/apps/web/src/artifacts/parser.ts` parses streaming `<artifact>` blocks into start, chunk, and end events.
- `/Volumes/Callum_SSD/dev_projects/open-design/apps/web/src/components/ProjectView.tsx` feeds streamed deltas through the parser, shows live artifact state, persists finished HTML to the project folder, refreshes file lists, and attaches produced files to assistant messages.
- `/Volumes/Callum_SSD/dev_projects/open-design/apps/web/src/artifacts/manifest.ts` defines `ArtifactManifest` with kind, title, entry, renderer, status, exports, source skill ID, design-system ID, and metadata.
- `/Volumes/Callum_SSD/dev_projects/open-design/apps/web/src/artifacts/renderer-registry.ts` chooses renderers from manifest and file kind.
- `/Volumes/Callum_SSD/dev_projects/open-design/apps/daemon/src/artifact-manifest.ts` validates persisted artifact manifests and rejects unsafe supporting-file paths.
- `/Volumes/Callum_SSD/dev_projects/open-design/apps/daemon/src/projects.ts` owns project file paths, safe path resolution, kind detection, MIME detection, and manifest sidecars.
- `/Volumes/Callum_SSD/dev_projects/open-design/apps/web/src/components/FileWorkspace.tsx`, `/Volumes/Callum_SSD/dev_projects/open-design/apps/web/src/components/DesignFilesPanel.tsx`, and `/Volumes/Callum_SSD/dev_projects/open-design/apps/web/src/components/FileViewer.tsx` make generated files inspectable, openable, downloadable, and previewable.

What Aura should borrow:

- Every generated artifact should have a manifest. Aura's `.aura` packaging already has project structure, but generated documents need per-artifact metadata that survives export/import.
- Treat the compiled artifact as one view of a richer source state. For scaffolded artifacts, store the source payloads beside compiled HTML/docx/xlsx.
- Use renderer selection by manifest rather than ad hoc component branches. A manifest lets the UI know whether to use a reveal canvas, document iframe, spreadsheet grid, raw file viewer, PDF preview, or external download.
- Produced files should be first-class UI events. Open Design attaches generated files to assistant messages and opens new files when Write/Edit tools complete. Aura should do the same for exported PPTX, PDF, DOCX, XLSX, CSV, Parquet, and chart assets.

Aura adaptation:

- Extend Aura's artifact document model with `artifactManifest`, `sourcePayload`, `packId`, `designSystemId`, `renderer`, `exports`, `validationStatus`, and `editSurfaces`.
- Move toward a renderer registry that covers presentations, documents, spreadsheets, charts, HTML prototypes, and binary Office/PDF previews.
- For scaffolded modes, compile from typed payloads and keep the payload as the edit source. Do not re-parse compiled HTML as the primary source of truth.

## 4. Sandbox Preview Lessons

Open Design's preview layer is pragmatic. It uses sandboxed iframes for generated HTML, builds `srcdoc`, patches common generated-deck runtime failures, and treats deck navigation as a host/iframe bridge.

Source concepts:

- `/Volumes/Callum_SSD/dev_projects/open-design/apps/web/src/runtime/srcdoc.ts` wraps fragments into full documents, injects a base URL for project-relative assets, adds storage shims for sandboxed iframes, and injects a deck bridge when previewing decks.
- `/Volumes/Callum_SSD/dev_projects/open-design/apps/web/src/components/FileViewer.tsx` builds `srcdoc`, passes project raw-file base URLs, detects deck-like HTML, listens for slide-state postMessage events, and provides host-side deck navigation.
- `/Volumes/Callum_SSD/dev_projects/open-design/apps/web/src/components/PreviewModal.tsx` provides a reusable full-screen preview shell with view tabs, export actions, fullscreen, and iframe rendering.
- `/Volumes/Callum_SSD/dev_projects/open-design/docs/architecture.md` states the desired security posture: `iframe sandbox="allow-scripts"` and no `allow-same-origin` for artifact code.

What Aura should borrow:

- Keep artifact code isolated from the host application. Presentations and documents already use iframes in Aura; spreadsheets should avoid executing generated code at all.
- Put host-owned controls outside the generated artifact. Deck navigation, zoom, export, page toggles, validation, and version controls should not depend on model-authored UI.
- Build preview adapters per artifact kind. Presentations need slide navigation; documents need page/outline/print views; spreadsheets need virtualized grid and workbook tabs; dashboards/prototypes need responsive frame toggles.
- Add explicit iframe asset base handling. Generated project files should reference safe project-relative resources, not external random URLs.

Security note:

Open Design has a small inconsistency: `FileViewer.tsx` uses a stricter sandbox path, while `PreviewModal.tsx` includes `allow-same-origin` for its iframe. Aura should preserve a stricter default for user/generated artifacts and only loosen it for trusted internal previews where there is a concrete need.

Aura adaptation:

- Define a shared `ArtifactPreviewShell` that isolates generated content but renders host controls outside the sandbox.
- For presentations, own nav/scale/export in the host or in a deterministic framework, not in model-authored slide scripts.
- For documents, render HTML preview in an iframe but keep DOCX/PDF export in deterministic code.
- For spreadsheets, prefer a host grid bound to a data model instead of generated HTML tables for the primary editing view.

## 5. Skill Protocol Lessons

Open Design's skill protocol is useful because it is file-based, inspectable, compatible with external agents, and extensible without central app changes.

Source concepts:

- `/Volumes/Callum_SSD/dev_projects/open-design/docs/skills-protocol.md` defines the base `SKILL.md` contract and optional `od:` extensions: mode, preview, design-system requirements, typed inputs, live parameters, outputs, and required capabilities.
- `/Volumes/Callum_SSD/dev_projects/open-design/skills/web-prototype/SKILL.md` shows a seed-template workflow: read the seed, read layouts, read checklist, bind design tokens, paste allowed layouts, self-check, emit one artifact.
- `/Volumes/Callum_SSD/dev_projects/open-design/skills/simple-deck/SKILL.md` shows a deck skill with a fixed seed, layout references, theme rhythm, and hard navigation rules.
- `/Volumes/Callum_SSD/dev_projects/open-design/skills/dashboard/SKILL.md`, `/Volumes/Callum_SSD/dev_projects/open-design/skills/pm-spec/SKILL.md`, and `/Volumes/Callum_SSD/dev_projects/open-design/skills/finance-report/SKILL.md` show how the same protocol can cover dashboards, specs, reports, invoices, and other office-like outputs.
- `/Volumes/Callum_SSD/dev_projects/open-design/apps/daemon/src/skills.ts` demonstrates metadata inference so older or incomplete skills remain usable.

What Aura should borrow:

- Make artifact packs readable to both humans and agents. A pack should include manifest, workflow instructions, slot schemas, references, examples, and checklists.
- Keep the protocol backward-compatible where possible. If a pack omits optional fields, Aura can infer safe defaults, but official packs should be explicit.
- Treat capability requirements as UI gates. If a pack needs file uploads, charts, source citations, DOCX export, spreadsheet formulas, or vision, the UI should know before generation.
- Use checklists as source material for deterministic validators. The agent can read a checklist, but Aura should also encode important P0 rules in code.

Aura adaptation:

- Define `ArtifactPack` instead of copying `od:`. The concepts should be Aura-native:
  - `mode`: presentation, document, spreadsheet, web-prototype, image, video, audio.
  - `preview`: renderer, primary entry, live-stream support.
  - `inputs`: structured first-run fields.
  - `slots`: mode-specific content payload schemas.
  - `outputs`: HTML, PDF, PPTX, DOCX, XLSX, ZIP, Markdown, CSV, Parquet.
  - `editSurfaces`: text, add module, restyle tokens, restructure, data operation, formula repair.
  - `validations`: static, render, export, data, accessibility.
  - `designSystemSections`: token sections needed by this pack.
- Store official packs in code with tests first. File-based third-party packs can come later after the internal protocol stabilizes.

## 6. Architecture Docs Lessons

Open Design's docs are valuable because they separate product vision, current architecture, protocol, runtime boundaries, run recovery, and maintainability risks.

Source concepts:

- `/Volumes/Callum_SSD/dev_projects/open-design/docs/spec.md` defines product bets and scenarios.
- `/Volumes/Callum_SSD/dev_projects/open-design/docs/architecture.md` defines topologies, components, artifact store, preview renderer, config files, API, security, and performance.
- `/Volumes/Callum_SSD/dev_projects/open-design/docs/modes.md` explains user-facing modes and workflow shape.
- `/Volumes/Callum_SSD/dev_projects/open-design/docs/agent-adapters.md` explains adapter capabilities, detection, skill injection, fallback chains, and feature gating.
- `/Volumes/Callum_SSD/dev_projects/open-design/specs/current/architecture-boundaries.md` defines web, daemon, shared, API DTO, workspace, agent-command, and task lifecycle boundaries.
- `/Volumes/Callum_SSD/dev_projects/open-design/specs/current/run.md` defines project/conversation/message/run ownership, run recovery, reattach, cancellation, and replayable SSE events.
- `/Volumes/Callum_SSD/dev_projects/open-design/specs/current/maintainability-roadmap.md` lists risks and workstreams such as contracts, validation, task manager, SQLite migrations, tests, logging, and config.

What Aura should borrow:

- Keep docs as current-state contracts, not just aspirations. Open Design's current clone shows some drift between older architecture docs and implementation; Aura should make current-state docs explicit when behavior changes.
- Add boundary docs for artifact runtime ownership. Aura has browser-only architecture today, but it still needs boundaries between UI, stores, AI workflow, artifact compilers, validators, exporters, storage, and preview renderers.
- Define the run model for browser-only workflows. Aura may not have a daemon, but long generation still has runs, steps, repair attempts, partial outputs, cancellation, and persisted status.
- Document artifact mode contracts separately from implementation plans. Presentations, documents, and spreadsheets should each have mode docs that name inputs, outputs, preview, edit surfaces, failure modes, and validation.

Aura adaptation:

- Add current-state docs for `ArtifactPack`, `ArtifactManifest`, `DesignSystem`, `RunProgress`, and `PreviewRenderer`.
- Keep planning docs in `docs/plan/`, but move stable contracts to active architecture or contracts docs once implemented.
- Add a "current behavior vs planned behavior" note when a feature is mid-transition, especially around `.aura` packaging and scaffolded generation.

## 7. UI Simplification Lessons

Open Design's UI has a useful tension: it exposes a rich system, but the first step is still a compact create panel.

Source concepts:

- `/Volumes/Callum_SSD/dev_projects/open-design/apps/web/src/components/EntryView.tsx` separates the left create panel from main tabs for designs, examples, design systems, image templates, and video templates.
- `/Volumes/Callum_SSD/dev_projects/open-design/apps/web/src/components/NewProjectPanel.tsx` shows only name, design system, and a few mode-specific toggles for the active tab. It resolves the skill internally.
- `/Volumes/Callum_SSD/dev_projects/open-design/apps/web/src/components/ExamplesTab.tsx` moves deeper exploration into a gallery with preview, tags, filters, and "use prompt."
- `/Volumes/Callum_SSD/dev_projects/open-design/apps/web/src/components/DesignsTab.tsx` gives users project status and a grid/kanban switch, using derived run status.
- `/Volumes/Callum_SSD/dev_projects/open-design/apps/web/src/components/QuestionForm.tsx` renders model-emitted forms inline, including rich direction cards, so ambiguity can be resolved without exposing raw system controls.

What Aura should borrow:

- Default to a chat-first or simple create-first path. Do not ask users to pick internal scaffold IDs.
- Put advanced capability discovery in a gallery, not the main path.
- Use visually rich style/direction cards instead of long dropdowns for aesthetic choices.
- Show progress in terms users understand: selecting pack, planning slides/sections/sheets, filling content, compiling, validating, exporting.
- Let the assistant ask structured questions inline when needed, but keep the form bounded and quick.

What Aura should avoid:

- Do not let the home screen become a catalog of every artifact feature. Open Design's media/template tabs are useful for a broad tool, but Aura's main value is artifact creation and editing. Keep secondary surfaces contextual.
- Do not expose "design system multi-select" as a power-user feature before the semantics are clear. If Aura supports inspirations, label them as inspirations and explain that the primary style remains authoritative.

Aura adaptation:

- Create a single "New artifact" flow with inferred mode, recommended pack, style direction, and optional advanced drawer.
- Add an "Artifact Library" for examples, packs, and design systems.
- Keep diagnostics, raw validation reports, run logs, and pack internals behind advanced surfaces.

## 8. Scaffold App Patterns

Open Design's best scaffold pattern is: seed first, layout library second, checklist last, artifact output after self-check.

Source concepts:

- `/Volumes/Callum_SSD/dev_projects/open-design/skills/web-prototype/SKILL.md` requires the agent to read the seed, read layouts, bind `DESIGN.md` tokens, select layouts, fill real copy, run checklist, and emit the artifact.
- `/Volumes/Callum_SSD/dev_projects/open-design/skills/simple-deck/SKILL.md` requires a fixed deck seed, explicit slide rhythm, no rewritten navigation script, and theme checks.
- `/Volumes/Callum_SSD/dev_projects/open-design/skills/guizang-ppt/SKILL.md` and its references define a class inventory, layout skeletons, component rules, theme choices, and preflight checks. The useful concept is not the visual style itself; it is that the seed and references are treated as authoritative.
- `/Volumes/Callum_SSD/dev_projects/open-design/packages/contracts/src/prompts/system.ts` injects a hard preflight rule when the skill body references `assets/template.html`, `references/layouts.md`, `references/themes.md`, `references/components.md`, or `references/checklist.md`.
- `/Volumes/Callum_SSD/dev_projects/open-design/packages/contracts/src/prompts/directions.ts` defines deterministic visual directions with IDs, palette, fonts, references, and posture cues.
- `/Volumes/Callum_SSD/dev_projects/open-design/packages/contracts/src/prompts/deck-framework.ts` pins a deck framework when a deck has no skill seed, so the model does not rewrite navigation/scaling/print logic.

What Aura should borrow:

- Do not ask the model to author layout systems from scratch in normal generation.
- Give every artifact mode a seed/pack with:
  - class or style inventory;
  - allowed layouts/modules/sheets;
  - token mapping;
  - examples;
  - checklist;
  - deterministic compiler;
  - validators.
- Use directions as deterministic token and posture packages, not vague adjectives.
- Pin framework behavior outside model control. For decks this is navigation and scaling. For documents it is page rhythm, headings, citations, tables, and print. For spreadsheets it is workbook structure, formulas, data bindings, and formats.

Aura adaptation:

- Presentations: continue scaffold recovery, but shift from prompt-only constraints to a pack compiler and stored slot payloads.
- Documents: use module packs such as executive memo, research brief, proposal, PRD, runbook, invoice, and meeting notes. The model fills modules; Aura compiles the document.
- Spreadsheets: use workbook packs such as analysis workbook, financial model, KPI dashboard, project tracker, and data-cleaning workbook. The model defines schemas, formulas, queries, and chart specs; Aura writes the workbook/data model.

## 9. Generalizing Beyond Presentation Starter Kits

Open Design proves the catalog/runtime pattern can cover more than slides, but it also shows where a stronger Aura design is needed.

Source concepts:

- `/Volumes/Callum_SSD/dev_projects/open-design/skills/pm-spec/SKILL.md`, `/Volumes/Callum_SSD/dev_projects/open-design/skills/finance-report/SKILL.md`, `/Volumes/Callum_SSD/dev_projects/open-design/skills/invoice/SKILL.md`, `/Volumes/Callum_SSD/dev_projects/open-design/skills/meeting-notes/SKILL.md`, and similar skills produce document-flavored HTML artifacts through the same prototype mode.
- `/Volumes/Callum_SSD/dev_projects/open-design/apps/daemon/src/projects.ts` recognizes `.docx`, `.pptx`, and `.xlsx` as document, presentation, and spreadsheet file kinds.
- `/Volumes/Callum_SSD/dev_projects/open-design/apps/daemon/src/document-preview.ts` extracts text previews from PDF, DOCX, PPTX, and XLSX files with size limits and XML safety checks.
- `/Volumes/Callum_SSD/dev_projects/open-design/apps/web/src/components/FileViewer.tsx` routes PDF, document, presentation, and spreadsheet file kinds to a document preview viewer.
- `/Volumes/Callum_SSD/dev_projects/open-design/apps/web/src/artifacts/types.ts` does not yet include native `document` or `spreadsheet` artifact kinds, which is a useful gap for Aura to close rather than inherit.

### Documents

Documents should not be "HTML pages that look like documents." They need a document-native source model:

- document mode;
- module tree;
- heading hierarchy;
- body/callout/table/list/source-note modules;
- page and print constraints;
- citation/source metadata;
- export targets such as HTML preview, PDF, DOCX, and Markdown.

Aura should use the Open Design skill idea, but with stronger document semantics:

- `DocumentPackManifest`: mode, best-for, modules, export targets, page settings, supported edit surfaces.
- `DocumentModuleSchema`: title, summary, evidence, table rows, callout text, citations, density, page-break preference.
- `DocumentCompiler`: host-owned HTML/PDF/DOCX assembly.
- `DocumentValidator`: heading depth, orphan headings, table width, source coverage, placeholder copy, tone, page overflow, accessibility.

Open Design's document-flavored skills are useful examples of scenario taxonomy: PRD, finance report, invoice, meeting notes, runbook, onboarding, OKRs. Aura should turn those scenarios into real document packs, not prototype-mode HTML.

### Spreadsheets

Spreadsheets should not be generated as decorative tables. They need a data-native source model:

- workbook;
- sheets;
- tables;
- schemas;
- formulas;
- named ranges;
- charts;
- validation rules;
- provenance/audit notes;
- export targets such as XLSX, CSV, Parquet, and embedded linked tables/charts.

Aura's existing spreadsheet plan in `/Volumes/Callum_SSD/dev_projects/aura_web/docs/roadmap/spreadsheet-integration-plan.md` already points in the right direction with DuckDB-WASM, prompt-first operations, linked tables/charts, Parquet packaging, and virtualized grid rendering. Open Design adds the product-shell lesson: spreadsheets should also have packs, examples, design-system styles, manifests, previews, and run progress.

Aura should define spreadsheet packs such as:

- analysis workbook: raw data, clean data, summary, charts, audit;
- financial model: assumptions, model, scenarios, dashboard, checks;
- KPI dashboard: metrics, targets, trends, alerts, source table;
- project tracker: tasks, owners, dates, status, rollups;
- data-cleaning workbook: import, mapping, validation, output.

Quality gates for spreadsheets should be trust-oriented:

- formulas parse and execute;
- references point to existing sheets/ranges;
- raw data and model logic are separated;
- generated cells are marked;
- number formats are consistent;
- dashboard values trace back to source data;
- no hidden invented metrics unless explicitly synthetic;
- workbook exports round-trip.

### Shared Artifact Model

The shared abstraction should be "artifact pack + source payload + compiler + preview + export + validators," not "HTML artifact."

Recommended shared fields:

- `artifactId`
- `artifactType`
- `packId`
- `designSystemId`
- `sourcePayloadVersion`
- `compiledEntries`
- `primaryPreview`
- `exports`
- `editSurfaces`
- `validationFindings`
- `createdFromPrompt`
- `lastEditedBy`

Mode-specific source payloads:

- Presentation: deck rhythm, slide roles, skeleton IDs, slot payloads, theme tokens, motion/motif choices.
- Document: module tree, module IDs, heading levels, slot payloads, citations, page rules.
- Spreadsheet: workbook meta, sheets, schemas, formulas, queries, charts, data source refs, protection/format rules.

## 10. Runtime And Agent Lessons

Open Design's daemon is not a direct fit for Aura today, but its run, adapter, and event concepts are still useful.

Source concepts:

- `/Volumes/Callum_SSD/dev_projects/open-design/apps/daemon/src/agents.ts` detects local CLIs, builds process arguments, exposes model/reasoning options, and declares stream formats.
- `/Volumes/Callum_SSD/dev_projects/open-design/apps/daemon/src/server.ts` folds system prompt, skill body, design-system body, working-directory hints, file lists, and attachments into a run request.
- `/Volumes/Callum_SSD/dev_projects/open-design/packages/contracts/src/sse/chat.ts` defines SSE events for start, agent payloads, stdout, stderr, error, and end.
- `/Volumes/Callum_SSD/dev_projects/open-design/specs/current/run.md` defines replayable runs with run ID, status, event replay, reattach, and explicit cancellation.
- `/Volumes/Callum_SSD/dev_projects/open-design/apps/web/src/components/ProjectView.tsx` persists assistant messages during streaming, stores run status and last event ID, reattaches recoverable runs, and shows produced files.

What Aura should borrow without adding a daemon:

- Model every generation/edit/export as a run with steps, item counts, status, started/ended times, retry attempts, and produced artifact changes.
- Persist partial run state in IndexedDB so refreshes do not destroy the user's mental model.
- Use a typed event stream inside the app even when the underlying provider is AI SDK streaming text. Events can represent planning, module fill, compile, validation, repair, export, and produced files.
- Keep cancellation explicit. Closing a drawer or changing tabs should not silently cancel a run unless the user clicks Stop.

What Aura should not inherit by default:

- A local daemon and CLI adapter layer. Aura's current product direction is client-side BYOK. Adding a daemon would be a separate product decision.
- A generic shell-out artifact model. Aura's value is deterministic compilers and browser-native artifact runtimes.

Future option:

If Aura later needs local file, Office, or CLI capabilities, use Open Design's boundary docs as the starting point: web owns UI; local capability server owns filesystem/process/export; shared code contains DTOs and schemas only.

## 11. Recommended Aura Implementation Path

1. Define shared artifact pack contracts.
   - Add internal TypeScript types for pack manifest, source payload, renderer, exports, edit surfaces, and validation findings.
   - Keep official packs code-owned at first; do not create a third-party marketplace yet.

2. Turn current presentation scaffolds into the first complete pack family.
   - Store slide slot payloads and deck rhythm as source state.
   - Compile to Aura's current presentation fragment/output.
   - Keep model-authored CSS out of normal generation.

3. Add document packs as a parallel first-class runtime.
   - Use the document section modules already described in the value realignment work.
   - Compile from module payloads to preview HTML and exportable document formats.
   - Add document-native validation.

4. Add spreadsheet packs around the DuckDB plan.
   - Use workbook/source schemas rather than generated HTML.
   - Bind grid rendering and chart linking to the data model.
   - Add formula/reference/data validation before export.

5. Add design-system resolver and token adapters.
   - Parse `DESIGN.md` into typed tokens.
   - Map tokens to presentation, document, and spreadsheet style systems.
   - Add preview cards and sample components/tables/slides.

6. Add an artifact library.
   - Browse packs by mode, scenario, and example.
   - Preview compiled examples generated by Aura.
   - Start from example prompt or use as template.

7. Update docs from plan to contract.
   - Once implemented, move stable definitions into active architecture docs.
   - Keep current-state notes accurate.

## Non-Negotiables For Aura

- Do not copy Open Design assets, templates, screenshots, or code.
- Do not make presentations the only scaffolded artifact.
- Do not let the model own layout CSS, deck navigation, document page rules, spreadsheet formulas without validation, or workbook structure in normal paths.
- Do not use a vague "design system" prompt where deterministic token mapping is needed.
- Do not expose internal pack IDs as the primary user workflow.
- Do not store compiled HTML as the only editable state for scaffolded artifacts.

## Product North Star

Aura should become a general artifact workspace:

- presentations are staged visual narratives;
- documents are structured reading artifacts;
- spreadsheets are trusted data workbooks;
- design systems are reusable style artifacts;
- packs encode taste and mechanics;
- the AI fills, plans, repairs, and explains;
- the runtime compiles, validates, previews, exports, and protects user work.

Open Design is useful because it shows how these pieces fit as one product surface. Aura's opportunity is to make the same idea more deterministic, browser-native, and artifact-type-aware.
