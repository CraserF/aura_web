# Value-Focused Product Realignment Plan

Date: 2026-04-29

Status: Planning document

Scope: Product direction, codebase cleanup, documentation refresh, starter kit variants, interface simplification, project-scoped version control, presentation and document workflow recovery, and design-system tooling.

Primary constraint for this document: This is a planning artifact only. It does not implement the changes. The intended follow-up work should be completed in focused implementation slices.

## Executive Summary

Aura should become more value focused, simpler to understand, and more reliable at producing polished artifacts. The current product has several strong foundations: project files, multi-artifact state, presentation and document runtimes, project rules, starter kits, model provider settings, and a version history service. The next phase should concentrate those foundations into fewer, clearer workflows.

The most important strategic shift is to stop spreading attention across API platform, MCP, and external automation concepts that are not currently creating visible user value. Those surfaces should be removed from product documentation, roadmap language, and any remaining internal extension points. This does not mean removing model provider access or BYOK provider settings. In this plan, "remove API and MCP" means removing external Aura API productization, MCP integration, dry-run or explain execution modes where they only exist to support external automation, and any documentation that makes these feel like core value propositions.

The product should instead emphasize:

- Fast creation of beautiful presentations, documents, spreadsheets, and project artifacts.
- Starter kits that feel visually distinct and useful, not merely different bundles of files.
- A minimal interface that exposes the main path and keeps advanced diagnostics out of the way.
- Transparent chat progress that tells the user what is happening and how many steps remain.
- Project-specific version control so each project has its own history.
- Exportable `.aura` files that can preserve project history where feasible.
- Presentation and document scaffolds that guide the agent, instead of asking the model to invent layout and design from scratch every time.

The highest leverage change is the design-system approach for documents and presentations. Aura should provide prebuilt themes, templates, slide layouts, document section layouts, content slots, text-fitting rules, and validation tools. The AI should usually populate and lightly customize these structures, rather than fully authoring HTML/CSS in an unconstrained way. This will make artifacts more consistent, faster to generate, easier to edit, and less likely to regress into boring slides, tiny fonts, broken layout, or endless repair loops.

This plan is organized into workstreams that can be implemented incrementally:

- Documentation and README refresh.
- Removal of API, MCP, and external automation surfaces.
- Visual variants for starter kits.
- User interface simplification.
- Explicit chat and run progress.
- Project-scoped version control and `.aura` history export.
- Presentation workflow recovery and quality benchmarking.
- Document and presentation scaffold tooling.
- Validation, QA, and release sequencing.

## Investigation Inputs

This plan is based on a codebase investigation performed on 2026-04-29.

Current repository context observed during planning:

- Working branch: `codex/dev`.
- Current HEAD observed during planning: `5665e43`, message `fix: Build breaking test error`.
- Current `origin/main` observed during planning: `33dbe0a9ed15829f4d4e0e1c3323f17de1d316fb`.
- Closest local `main` snapshot around 2026-04-22: `bcd245420a4881001aa1ef622bb35187916039ce`.
- Important presentation workflow fix from that period: `1831605ac4029af0482de85051be9a94549e6ef9`.
- Important orchestration simplification commit from that period: `8b756c85bea96d08eac9b3c5f18934ae01eb6249`.

Several focused codebase investigations were run in parallel:

- API, MCP, external automation, and documentation inventory.
- Starter kit and visual variant investigation.
- Version control, project storage, and `.aura` export investigation.
- Presentation and document workflow investigation, including comparison against main branch behavior from roughly one week earlier.

The investigation found that many of the desired changes are directionally aligned with the codebase already. Several API/MCP implementation directories are already empty or inactive, and some tests already assert that removed external adapters do not return. The next phase is therefore less about tearing out a large active platform and more about finishing the product cleanup, documentation cleanup, type cleanup, UI cleanup, and user-facing repositioning.

## Product Direction

### Product Promise

Aura should feel like a focused artifact creation workspace:

- The user chooses what they want to make.
- Aura provides a strong starting point.
- The agent works visibly and step by step.
- The artifact looks polished without heavy user intervention.
- Edits appear quickly and predictably.
- Project history is local, understandable, and exportable.

This should become the center of the product. Features that do not support that promise should be removed, hidden, or deferred.

### Value Focus

The product should be evaluated against a simple value test:

1. Does this help a user create a better artifact?
2. Does this help a user edit an artifact with less friction?
3. Does this help a user understand what Aura is doing?
4. Does this help a user keep, restore, or share their work?
5. Does this help the team improve artifact quality?

If a feature does not satisfy at least one of those tests, it should not be prominent. API platform language, MCP language, dry-run execution modes, low-level run details, and broad automation promises currently fail this test for the primary user experience.

### Product Principles

#### 1. Creation over configuration

The default path should help a user make something useful immediately. Settings should support creation, not dominate it.

#### 2. Visible work over hidden queues

When the agent is working, the user should see what step it is on, how many steps remain, and which artifact or slide is being changed.

#### 3. Opinionated design over blank canvas

Aura should provide curated themes, layouts, and artifact structures. Users can customize colors and intent, but the system should carry the design burden.

#### 4. Project ownership over global state

Every project should have its own version history, artifacts, settings, and exportable package. Starting a new project should create a new history boundary.

#### 5. Minimal surface over dashboard sprawl

The main interface should expose only the essential actions. Reports, diagnostics, validation output, and history details should exist but live behind contextual drawers or details views.

## Current State Assessment

### Strengths

The codebase already has many pieces needed for the next direction:

- A project model that can contain multiple artifact types.
- `.aura` project export and import.
- Starter kits and quick-start project flows.
- Presentation runtime with slide-level planning, generation, progress events, quality checks, validation, and repair.
- Document runtime with module planning, design-system styles, and repair flows.
- Chat-driven artifact creation and editing.
- Project rules and output modes.
- Provider settings and diagnostics.
- Git-based version history using `isomorphic-git` and `@isomorphic-git/lightning-fs`.
- Tests around removed external spec and adapter behavior.

These should be preserved and refined.

### Weaknesses

The main weaknesses are not isolated to one subsystem. They are product alignment issues that appear in code, docs, UI, and workflow design:

- Documentation still presents API/MCP as a roadmap direction even though those features are not the value focus.
- `README.md` appears out of date and underrepresents current multi-artifact progress.
- Starter kits are content bundles but do not yet give users a strong visual variant choice.
- Project visual style exists mostly as markdown prose, not as structured runtime metadata.
- Version history uses a single shared repository path, which risks mixing history across projects.
- `.aura` export does not yet preserve full project git history.
- Presentation quality has regressed from earlier richer prompt and template behavior.
- Presentation edits can feel queued, stuck, or looped without useful progress feedback.
- Slide generation can produce boring layouts, small fonts, or weak visual hierarchy.
- UI contains too many visible buttons, reports, diagnostics, and technical concepts.
- Chat progress does not consistently explain step count and queue state.
- Document and presentation creation still ask the model to invent too much structure.

### Product Diagnosis

Aura has outgrown a "general agent surface" and now needs a sharper product spine. The product should be organized around high-quality artifact creation. That means removing secondary platform ideas, reducing visible controls, and making the agent work inside stronger scaffolds.

The recurring failure mode is too much openness:

- Open-ended prompts produce inconsistent slides.
- Open-ended project rules produce inconsistent visual direction.
- Open-ended UI surfaces produce confusion.
- A global version repository produces unclear project boundaries.
- Broad documentation creates mixed expectations.

The next phase should add structure in the right places:

- Typed variants.
- Typed themes.
- Typed layout slots.
- Typed artifact plans.
- Project-scoped repositories.
- Explicit progress phases.
- Clear documentation hierarchy.

## Workstream 0: Documentation And README Refresh

### Goal

Update all product documentation so it reflects the current value-focused direction and removes stale API/MCP positioning.

This should be done after or alongside the code cleanup. The documentation should not describe a platform direction that the product no longer intends to pursue.

### Current Documentation Issues

The investigation found stale or conflicting documentation in several areas:

- `README.md` still describes Aura as early alpha and presentation-focused.
- `README.md` appears to underrepresent documents, spreadsheets, multi-artifact project files, and recent runtime improvements.
- `docs/roadmap/api-platform-plan.md` presents API platform work as a plan.
- `docs/roadmap/mcp-integration-plan.md` presents MCP work as a plan.
- `docs/phases/phase-10-api-mcp-and-automation-alignment.md` describes API/MCP alignment.
- `docs/program-status.md` refers to Phase 10 API/MCP work as implemented or pending validation.
- Some architecture documents already say external API/MCP seams have been removed, which conflicts with roadmap documents that still imply they are active goals.

### Documentation Strategy

The docs should move from "platform roadmap" to "artifact creation product roadmap."

Recommended structure:

- `README.md`
  - What Aura is.
  - What it creates.
  - How to run it.
  - How projects and `.aura` files work.
  - How provider connections work.
  - Current limitations.

- `docs/product/`
  - Product principles.
  - Artifact quality standards.
  - Starter kit and visual variant strategy.
  - Versioning and export strategy.

- `docs/architecture/`
  - Project model.
  - Artifact runtimes.
  - Storage and export.
  - Version history.
  - Provider integration.

- `docs/roadmap/`
  - Near-term implementation plan.
  - Presentation and document quality plan.
  - UI simplification plan.
  - Version control plan.

### Documentation Changes To Make

Remove or archive:

- API platform roadmap language.
- MCP integration roadmap language.
- Any claim that external automation is a near-term product pillar.
- Any user-facing language that implies Aura is mainly an integration platform.

Rewrite:

- Program status around current active workstreams.
- README feature list.
- README quickstart.
- README limitations.
- Architecture docs that still mention external execution adapters or serializable run specs as future product concepts.

Preserve:

- Provider API key guidance.
- Local-first project and export language.
- Artifact runtime documentation.
- Tests and docs that explain why external adapters are intentionally absent, if those docs are useful for maintainers.

### README Positioning Draft

The README should describe Aura as:

> Aura is a local-first AI workspace for creating and editing high-quality presentations, documents, spreadsheets, and project artifacts. It combines chat, structured artifact runtimes, starter kits, project files, and version history so users can move from idea to polished output with less manual assembly.

Core feature bullets should emphasize:

- Multi-artifact projects.
- Presentation generation and editing.
- Document generation and editing.
- Spreadsheet support.
- Starter kits and visual variants.
- `.aura` project files.
- Project-scoped version history, once implemented.
- BYOK provider settings.

The README should not lead with:

- API platform.
- MCP integration.
- Automation infrastructure.
- Dry-run execution.
- Serializable external specs.

### Acceptance Criteria

- README reflects current product state and value focus.
- No user-facing docs present API/MCP as a current or future pillar.
- Provider model access remains documented clearly.
- Roadmap docs point toward artifact quality, UI simplicity, version control, and project templates.
- Program status aligns with actual implementation state.

## Workstream 1: Remove API, MCP, And External Automation Surfaces

### Goal

Finish removing product and code concepts related to external Aura API, MCP, and automation features that do not add user value.

### Important Boundary

This workstream must not remove provider API access.

Provider-related functionality is still central:

- API keys for OpenAI-compatible providers.
- Provider base URLs.
- Provider diagnostics.
- Model selection.
- BYOK settings.

When this plan says "remove API," it means external Aura API product features and related execution modes, not model provider connectivity.

### Current Code Findings

Several implementation areas appear already cleaned up:

- `src/services/adapters/` exists but is empty.
- `src/services/executionSpec/` exists but is empty.
- No active package dependencies were found for common MCP or backend platform libraries such as `@modelcontextprotocol`, `hono`, `supabase`, `better-auth`, `inngest`, or `bullmq`.

However, several legacy concepts remain:

- `src/services/runs/types.ts` still defines `ExecutionMode = 'execute' | 'dry-run' | 'explain'`.
- Chat and run contracts still accept or normalize mode fields.
- Tests still cover dry-run and explain normalization.
- Some docs and roadmap files still discuss API/MCP as product work.

Relevant files observed:

- `src/services/runs/types.ts`
- `src/services/chat/buildRunRequest.ts`
- `src/services/chat/submitPrompt.ts`
- `src/services/contracts/outputEnvelope.ts`
- `src/services/artifactRuntime/types.ts`
- `src/services/runs/registry.ts`
- `src/test/external-adapter-contracts.test.ts`
- `src/test/serializable-run-spec.test.ts`
- `src/test/run-dry-run.test.ts`
- `src/test/run-explain.test.ts`
- `src/test/structured-run-outputs.test.ts`
- `src/test/workflow-planner.test.ts`
- `src/test/presentation-runtime-policy.test.ts`

### Removal Strategy

This should be done in layers, not as a single broad deletion.

#### Layer 1: Documentation

Remove API/MCP from user-facing docs and roadmap status first. This will clarify intent and avoid accidentally preserving dead concepts because docs still mention them.

#### Layer 2: Product UI

Search for visible labels that imply platform or external automation behavior. Remove or rename them if present.

Examples of terms to audit:

- MCP
- API platform
- External adapter
- Dry run
- Explain mode
- Serializable run spec
- Automation endpoint

#### Layer 3: Runtime Contracts

Simplify execution mode once no callers rely on dry-run or explain behavior.

Preferred end state:

- A run executes.
- A plan can be previewed if there is a real product feature for preview.
- The internal runtime can still log diagnostic phases.
- There are no public or user-facing mode concepts named dry-run or explain unless they are actively useful.

Possible implementation path:

1. Replace `ExecutionMode` union with a single internal execution behavior.
2. Remove mode fields from chat request builders where possible.
3. Keep compatibility parsing only at import or stored-history boundaries if needed.
4. Update tests from "normalizes dry-run/explain" to "legacy mode fields are ignored safely" or remove them if the compatibility path disappears.

#### Layer 4: Empty Directories And Tests

Once all references are gone:

- Remove empty adapter and execution spec directories if the repository convention allows it.
- Keep tests that guard against reintroducing external adapters only if they remain valuable.
- Avoid preserving tests that force dead vocabulary into the codebase.

### Risk

The largest risk is confusing provider APIs with removed product APIs. The implementation should use clear naming:

- Keep `providerApiKey`, `providerBaseUrl`, `ProviderModal`, and provider diagnostics.
- Remove or rename `apiPlatform`, `externalApi`, `mcp`, `externalAdapter`, and similar concepts.

### Acceptance Criteria

- No user-facing documentation describes API/MCP as product direction.
- No UI surface exposes MCP or external API platform concepts.
- No active source code has external adapter or MCP feature paths.
- Run mode contracts are simplified or compatibility-only.
- Tests pass after removing or rewriting stale mode tests.
- Provider connection features remain intact.

## Workstream 2: Starter Kit Visual Variants

### Goal

Allow users to choose more visual variants when choosing starter kits. The selected variant should meaningfully influence starter artifacts, presentation style, document style, and runtime prompts.

### Current State

The new project flow currently offers a small set of creation modes:

- `blank`
- `starter-kit`
- `quick-start`

Starter kits are content-oriented, not visual-system-oriented.

Observed areas:

- `src/components/NewProjectDialog.tsx`
- `src/components/Toolbar.tsx`
- `src/services/bootstrap/starterKits.ts`
- `src/services/bootstrap/projectStarter.ts`
- `src/services/bootstrap/types.ts`
- `src/types/project.ts`
- `src/components/ProjectRulesPanel.tsx`
- `src/services/artifactRuntime/build.ts`

The current starter kit set includes examples such as:

- `executive-briefing`
- `research-pack`
- `launch-plan`

The current presentation quick-start set includes examples such as:

- `executive-briefing-light`
- `launch-narrative-light`

Project rules already include user-editable prose fields such as output mode and visual style, but those fields are not strong enough to drive consistent artifact design.

### Product Direction

Starter kit selection should be a two-part decision:

1. What kind of project are you starting?
2. What visual direction should the generated artifacts use?

The user should not have to write a prompt such as "make it more modern and high quality." Aura should offer concrete visual choices.

### Proposed Visual Variants

Start with 6 or 7 curated variants. Each variant should be opinionated enough to produce a visible difference but flexible enough to work across presentations and documents.

#### 1. Executive

Use for board updates, strategy memos, investor summaries, leadership briefings, and decision documents.

Traits:

- Clear hierarchy.
- Confident typography.
- Sparse decoration.
- Large statement slides.
- Strong summary sections.
- Excellent tables and comparisons.

Good defaults:

- Light background.
- Deep neutral text.
- One strong accent color.
- Large type scale.
- Minimal motion.

#### 2. Launch

Use for product launches, go-to-market plans, campaigns, positioning, and pitch narratives.

Traits:

- Energetic composition.
- Bold section breaks.
- Strong contrast.
- Product and audience framing.
- Roadmap and milestone layouts.

Good defaults:

- Bright accent options.
- Strong title slides.
- Timeline and campaign grid layouts.
- More expressive use of shapes and image slots.

#### 3. Editorial

Use for essays, brand narratives, thought leadership, reports, and visually rich storytelling.

Traits:

- Magazine-like rhythm.
- Big headlines.
- Pull quotes.
- Alternating dense and quiet pages.
- Strong image or illustration slots.

Good defaults:

- Serif or editorial display option where appropriate.
- Strong cover and chapter opener templates.
- Pull quote and feature story layouts.

#### 4. Research

Use for research packs, analysis, insights, evidence reviews, and technical summaries.

Traits:

- Dense but clean.
- Strong evidence hierarchy.
- Tables, matrices, and charts.
- Clear methodology sections.
- Careful source and caveat treatment.

Good defaults:

- Cool neutral base.
- Data color palette.
- Comparison, evidence grid, and insight-card layouts.

#### 5. Teaching

Use for training, workshops, explainers, lessons, and onboarding material.

Traits:

- Step-by-step explanations.
- Examples and exercises.
- Concept cards.
- Recaps and checks for understanding.
- Friendly but still polished design.

Good defaults:

- Clear section progression.
- Diagram slots.
- Activity slide layouts.
- Recap and quiz layouts.

#### 6. Proposal

Use for client proposals, recommendations, scopes, pricing, and implementation plans.

Traits:

- Problem, solution, proof, plan.
- Strong package and comparison layouts.
- Clear next actions.
- Trust-building evidence sections.

Good defaults:

- Professional neutral base.
- Strong comparison tables.
- Option cards.
- Roadmap and pricing layouts.

#### 7. Interactive

Use for small web experiences, demos, explainers, interactive lessons, and prototype artifacts.

Traits:

- UI-like components.
- Embedded controls.
- Clear states.
- Lightweight interactions.
- High clarity over decoration.

Good defaults:

- Component library feel.
- Cards, controls, and panels.
- Interactive quiz or scenario layouts.

### Data Model

Add a typed visual variant registry. A likely file:

- `src/services/bootstrap/visualVariants.ts`

Suggested type shape:

```ts
export type VisualVariantId =
  | 'executive'
  | 'launch'
  | 'editorial'
  | 'research'
  | 'teaching'
  | 'proposal'
  | 'interactive';

export interface VisualVariant {
  id: VisualVariantId;
  label: string;
  shortDescription: string;
  defaultOutputMode: RuntimeOutputMode;
  palette: {
    background: string;
    primary: string;
    accent?: string;
  };
  presentationThemeId: string;
  documentThemeId: string;
  documentStylePreset?: string;
  layoutFamilies: string[];
  promptTraits: string[];
  avoidTraits: string[];
}
```

The exact type should match local code style, but the concept should be explicit: the variant is not prose only. It should be structured product metadata.

### Where The Variant Should Flow

Thread the selected variant through:

- New project dialog state.
- `InitProjectOptions`.
- Starter kit initialization.
- Project metadata.
- Project rules default content.
- Presentation runtime prompt context.
- Document runtime prompt context.
- Quick-start artifact creation.
- Future scaffold tools.

Likely types or areas to extend:

- `ProjectStarterKit`
- `ProjectStarterArtifact`
- `InitProjectOptions`
- `ProjectDocumentStarterRef`
- `Project` metadata or settings type
- Workflow preset metadata

### UI Design

The new project dialog should not become a complex dashboard. The variant selector should be compact and visual.

Recommended UI:

- Keep the current starter kit selection.
- Add a "Visual direction" row or compact grid.
- Each variant appears as a small swatch with name and 1-line description.
- Use color chips and small layout thumbnails rather than verbose text.
- Select a recommended default automatically.
- Show no more than 6 or 7 visible options.

Avoid:

- Large marketing cards.
- Long descriptions.
- Technical labels such as runtime mode, style preset, or theme id.
- Forcing users to pick from too many templates.

### Runtime Behavior

The selected visual variant should influence runtime behavior in three ways:

1. It chooses a theme family.
2. It chooses preferred artifact layouts.
3. It provides prompt constraints and anti-patterns.

For presentations:

- Select a theme.
- Select slide layout families.
- Provide content slot budgets.
- Provide typography scale.
- Provide color variables.

For documents:

- Select document theme tokens.
- Select section modules.
- Select density and tone.
- Select callout, table, and summary styles.

For interactive artifacts:

- Select component tokens.
- Select UI composition patterns.
- Select interaction guidance.

### Acceptance Criteria

- Users can select a visual variant during starter kit creation.
- The variant is saved with the project.
- The variant influences starter artifacts.
- The variant influences presentation creation.
- The variant influences document creation.
- The variant is represented as structured metadata, not only prose.
- The UI remains compact and simple.

## Workstream 3: User Interface Simplification

### Goal

Make the interface dramatically simpler: fewer visible buttons, fewer reports, fewer technical controls, and clearer primary workflows.

### Current UI Friction

The interface currently exposes several controls and technical panels that may be useful but should not all be first-order surfaces.

Observed areas include:

- `src/components/Toolbar.tsx`
- `src/components/ChatBar.tsx`
- `src/components/ProjectInitReportDialog.tsx`
- `src/components/RunHistoryPanel.tsx`
- `src/components/ProjectRulesPanel.tsx`
- `src/components/DoctorPanel.tsx`
- `src/components/VersionHistoryPanel.tsx`
- `src/components/ProjectSidebar.tsx`

The toolbar currently includes many visible actions such as:

- Sidebar toggle.
- New.
- Open.
- Save.
- Export artifact.
- Validate.
- Present.
- History.
- Provider readiness or settings.
- Chat toggle.

The chat bar includes controls such as:

- Context chips.
- Attachment controls.
- Active artifact chip.
- Document style selector.
- Output mode selector.
- Presets.
- Runs.
- Hotkey text.
- Cancel/send.

Some of these are important. The issue is that too many are visible at once.

### Product Direction

The main UI should communicate:

1. What project am I in?
2. What artifact am I viewing?
3. What can I create or edit?
4. What is Aura doing right now?
5. How do I save, export, or restore?

Everything else should be contextual or advanced.

### Proposed Top-Level Navigation

Primary visible surfaces:

- Project title.
- Artifact navigation.
- New or Add.
- Save/Open.
- Present or Export, only when relevant.
- Chat.
- Connection/settings indicator.

Secondary surfaces behind menus:

- Validate.
- Run history.
- Project init report.
- Provider diagnostics.
- Project rules.
- Advanced context controls.
- Debug payloads.
- Detailed version history.

### Toolbar Simplification

Recommended toolbar groups:

#### Left

- Sidebar toggle.
- Project name.
- Current artifact type or artifact title.

#### Center

- Artifact tabs or compact artifact switcher.

#### Right

- New.
- Save/Open menu.
- Share/Export menu.
- Present button only for presentation artifacts.
- Provider status button.
- Chat toggle.

Move these behind a "More" or advanced menu:

- Validate.
- Run history.
- Project init report.
- Debug diagnostics.
- Any internal run mode controls.

### Chat Bar Simplification

The chat bar should feel like the main creation surface, not a cockpit.

Default visible controls:

- Text input.
- Attach button.
- Send/cancel.
- Active target selector if needed.

Contextual or collapsed controls:

- Output mode.
- Document style.
- Presets.
- Context chips.
- Runs.
- Advanced project rules.

When the user starts a new project or artifact, the UI can show guided choices. During normal editing, the chat bar should stay minimal.

### Reports And Diagnostics

Reports should become "details" rather than modal interruptions.

Project initialization report:

- Replace default modal with a concise success status.
- Example: "Project created with 4 starter artifacts."
- Include a "Details" link or expandable panel.

Run history:

- Keep it for debugging and transparency.
- Move it behind a history/details button.
- Do not make it compete with the main chat experience.

Validation:

- Show a simple pass/fail or issue count.
- Detailed validation can live in a drawer.
- Do not expose validation as a primary action unless the user is actively in review mode.

### Simplicity Rules

Adopt these UI rules for future implementation:

- No visible control unless it helps the main workflow.
- No report modal unless the user requested details or action is required.
- No internal vocabulary in primary UI.
- No duplicate ways to do the same thing in the same viewport.
- No technical run state in the default surface.
- Advanced controls should exist, but stay out of the main path.

### Acceptance Criteria

- Main toolbar has fewer visible controls.
- Chat bar is simpler by default.
- Reports are not shown unless needed or requested.
- Advanced diagnostics remain accessible.
- Provider status remains clear.
- Artifact-specific actions appear only when relevant.

## Workstream 4: Explicit Chat And Run Progress

### Goal

Make chat more explicit about what Aura is doing and how many steps remain.

This directly addresses the user experience where edits feel queued, stuck, or looped without progress changing.

### Current Pain

The user can see that work is happening, but not always:

- Which phase is active.
- Which slide or document module is being changed.
- How many steps remain.
- Whether the system is waiting for the model, repairing output, validating, or committing changes.
- Whether progress is stalled or still alive.

This is especially painful for slide editing and slide creation because the process can be multi-step and slow.

### Progress Model

Introduce a consistent progress model for agent work:

```ts
interface RunProgressStep {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'complete' | 'warning' | 'failed';
  currentItem?: number;
  totalItems?: number;
  detail?: string;
}
```

The UI does not need to show this exact type, but the product should expose this concept.

### Standard Phases

For presentations:

1. Understanding request.
2. Planning deck or edit.
3. Preparing theme and layouts.
4. Generating slide 1 of N.
5. Generating slide 2 of N.
6. Repairing slides if needed.
7. Checking layout and quality.
8. Applying changes.
9. Saving version.

For document creation:

1. Understanding request.
2. Planning sections.
3. Preparing document style.
4. Drafting section 1 of N.
5. Drafting section 2 of N.
6. Repairing sections if needed.
7. Checking structure and readability.
8. Applying changes.
9. Saving version.

For editing:

1. Understanding requested edit.
2. Locating target content.
3. Preparing patch.
4. Applying patch.
5. Checking result.
6. Saving version.

### UI Behavior

The chat should show compact but clear progress:

- "Step 3 of 8: Preparing theme and layouts."
- "Slide 4 of 9: Generating timeline slide."
- "Repairing 2 slides with layout issues."
- "Checking readability and spacing."
- "Applying changes."

When a process is queued:

- Show queue position or queued item count.
- Example: "Queued behind 2 slide updates."

When a process is taking longer than expected:

- Show heartbeat detail.
- Example: "Still generating slide 6. Last update 18 seconds ago."

When progress stalls:

- Give the user a safe cancel option.
- Preserve partial results if possible.
- Explain what was completed.

### Avoiding Endless Loops

Every repair loop should have:

- A maximum attempt count.
- A visible progress phase.
- A fallback behavior.
- A diagnostic reason when it stops.

For example:

- Attempt 1: repair malformed HTML.
- Attempt 2: simplify layout if still invalid.
- Attempt 3: accept best result with warning or ask user for confirmation.

The UI should never appear to spin forever with no progress changes.

### Implementation Notes

Current progress-related code appears around:

- Presentation runtime progress events.
- Batch queue progress events.
- Chat handlers.
- Artifact runtime types.
- Run history.

The next implementation should normalize progress events across artifact runtimes so the UI does not have one-off behavior for every artifact type.

Potential new shared area:

- `src/services/runs/progress.ts`
- `src/services/artifactRuntime/progress.ts`

Potential UI component:

- `src/components/chat/RunProgress.tsx`

### Acceptance Criteria

- Chat shows step count during long-running tasks.
- Presentation creation shows slide count.
- Presentation editing shows target and phase.
- Document creation shows section/module count.
- Repair loops show attempt count and do not run endlessly.
- Queue state is visible.
- Cancel behavior remains available and safe.

## Workstream 5: Project-Scoped Version Control And `.aura` History Export

### Goal

Refine version control so each project gets a unique repository/git instance. When a user creates a new project, it should not share history with previous projects. If feasible, the git history should be exported with the `.aura` file.

### Current State

The codebase already has:

- `.aura` project export and import.
- A git-backed version history service.
- Dependencies on `isomorphic-git` and `@isomorphic-git/lightning-fs`.

Relevant files:

- `src/services/storage/projectFormat.ts`
- `src/services/storage/fileFormat.ts`
- `src/services/storage/projectAutosave.ts`
- `src/services/storage/versionHistory.ts`
- `src/components/VersionHistoryPanel.tsx`
- `src/App.tsx`
- `package.json`

Current `.aura` export format:

- `projectFormat.ts` writes a current project format, observed as `2.4`.
- The project package includes manifest, chat, rules, context, presets, media, memory, documents, HTML/CSS/meta, and spreadsheet Parquet data.
- `fileFormat.ts` still supports a legacy presentation-only format and `projectFormat.ts` can upgrade v1 input to a project.

Current version history:

- Uses a single LightningFS database name similar to `aura-project-fs`.
- Uses a hardcoded repository directory such as `/project`.
- Commits a project snapshot to that shared repository.
- `VersionHistoryPanel` lists and restores from that repository.

### Problem

The current version history model risks mixing history across projects.

Likely issues:

- New projects can inherit or share the same git repo.
- Imported projects may not create a separate repo.
- Restoring versions may expose snapshots from another project.
- Exported `.aura` files do not preserve git history.
- Snapshots may be incomplete relative to full `.aura` export.
- Deleted documents or artifacts may remain in the git worktree unless cleanup is explicit.

### Desired End State

Every project should have:

- A stable project id.
- A dedicated git repo path.
- Its own version history.
- History created when the project is created or imported.
- Commits that represent coherent project states.
- Optional exportable history inside `.aura`.

Starting a new project should feel like creating a new repository.

### Proposed Repository Layout

Use a project-scoped repo path:

```ts
const repoDir = `/projects/${projectId}`;
```

The exact path should be compatible with LightningFS and existing code conventions.

Potential service shape:

```ts
export async function ensureProjectRepo(projectId: string): Promise<void>;
export async function commitProjectVersion(project: Project, message: string): Promise<string | null>;
export async function listProjectVersions(projectId: string): Promise<ProjectVersion[]>;
export async function readProjectVersion(projectId: string, hash: string): Promise<ProjectVersionSnapshot>;
export async function restoreProjectVersion(projectId: string, hash: string): Promise<Project>;
```

### Shared Serializer

The `.aura` exporter and git versioning service should share a canonical serializer.

Reason:

- Export and version history should represent the same project truth.
- Tests can compare export package contents and version snapshot contents.
- New artifact fields are less likely to be missed.

Potential new module:

- `src/services/storage/projectSnapshot.ts`

Responsibilities:

- Convert `Project` into canonical files.
- Include documents, presentations, spreadsheets, media, memory, chat, rules, presets, context, and metadata.
- Normalize file names.
- Handle deletion cleanup.
- Provide a manifest.
- Validate on import.

### Commit Timing

Current commits can happen inside individual handlers before all project, chat, memory, and lifecycle updates are complete. This risks commits that do not reflect final user-visible state.

Preferred behavior:

- Run or edit completes.
- Project store updates.
- Chat message updates.
- Memory or metadata updates complete.
- Then a central post-run commit happens.

This creates more coherent history.

Recommended commit messages:

- `Create project: Executive briefing`
- `Create presentation: Q2 board update`
- `Edit slide 4: tighten timeline`
- `Create document: Product launch plan`
- `Update spreadsheet: forecast assumptions`

### No-Op Commits

The versioning service should avoid no-op commits.

Use `isomorphic-git` status checks or a content hash check before committing.

Behavior:

- If nothing changed, do not create a commit.
- Return `null` or a typed result explaining no commit was needed.

### Deleted Artifact Cleanup

Before each commit, the worktree should match the current project exactly.

This means:

- Files for deleted artifacts must be removed from the repo worktree.
- Renamed artifacts should not leave stale old files.
- Spreadsheet binary data should not leave stale previous versions.

The serializer should know the complete expected file list and remove anything else under the project repo, excluding `.git`.

### `.aura` History Export

The `.aura` format should optionally include history.

Recommended structure:

```text
project.aura
  manifest.json
  project/
    ...
  version-history/
    manifest.json
    git/
      ...
```

Two possible approaches:

#### Option A: Export raw git repository

Package the project repo `.git` directory or an equivalent subset.

Pros:

- Preserves real commit graph.
- Easier restore to `isomorphic-git`.
- Preserves hashes and refs.

Cons:

- Larger export files.
- Need careful path validation.
- Need to ensure LightningFS repo can be reconstructed.

#### Option B: Export linear snapshots

Package a list of version snapshots and metadata.

Pros:

- Easier to inspect and validate.
- Can omit heavy data if needed.
- Less git-internal coupling.

Cons:

- Loses real git object identity.
- Restore may create a new commit graph.
- Not as faithful to "export git history."

Recommended initial approach:

- Implement project-scoped repos first.
- Add `.aura` history export as an optional flag.
- Start with a compact manifest and either raw git export or linear snapshots depending on implementation complexity.
- If raw git export is too large, allow "Export with history" and "Export current project only" as separate options.

### Import Behavior

When importing a `.aura` file:

- If history is present, restore it into the project-scoped repo.
- If history is absent, initialize a fresh repo and create an import commit.
- Validate paths to prevent traversal.
- Validate manifest version.
- Reject or safely ignore unknown history payloads.
- Do not mix imported history into another project's repo.

### Tests

Add focused tests:

- New project A and project B have separate histories.
- Importing a project creates a separate history.
- `.aura` export without history still works.
- `.aura` export with history round-trips.
- Deleting an artifact removes it from the repo snapshot.
- Spreadsheet data is preserved.
- Memory tree and project metadata are preserved.
- Corrupt or path-traversal history payloads are rejected.
- Legacy v1 `.aura` import still works.

### Acceptance Criteria

- Each project has its own git repo path.
- Creating a new project starts a fresh history.
- Importing a project starts or restores its own history.
- Version history panel only shows versions for the active project.
- Commits represent coherent completed changes.
- Deleted artifacts do not remain in snapshots.
- `.aura` export can include history if feasible.
- `.aura` import restores history when included.

## Workstream 6: Presentation Workflow Recovery And Quality

### Goal

Restore and improve the quality, speed, reliability, and edit behavior of presentation creation and editing.

This is one of the highest priority workstreams because presentation quality is a core value proposition.

### User-Reported Problems

The current presentation workflow has several problems:

- Edits are not shown immediately.
- Edits appear queued without useful progress.
- Some workflows loop endlessly.
- Progress bars do not always move.
- Newly created slides can look boring.
- Fonts can be too small or strange.
- Output quality feels lower than previous versions.
- Presentations are less exciting and polished than earlier workflows.

### Current Architecture

Current presentation runtime areas include:

- `src/services/artifactRuntime/presentationRuntime.ts`
- `src/services/artifactRuntime/presentationPrompts.ts`
- `src/services/ai/workflow/batchQueue.ts`
- `src/services/artifactRuntime/presentationQualityChecklist.ts`
- `src/components/chat/handlers/presentationHandler.ts`

Current strengths:

- Slide-level generation.
- Progress events.
- Queued batch generation.
- Deterministic repair.
- Bounded model repair.
- Validation.
- Quality telemetry.
- Per-part diagnostics.
- Better style preservation during some edit and add-slide flows.

Current risks:

- The old active prompt composer was removed from the main flow.
- Rich legacy template exemplars no longer appear to guide generation strongly.
- Quality scoring is largely heuristic and code-based rather than screenshot-based.
- Motion rules may be misaligned with current prompt guidance.
- Some progress behavior may not surface enough detail.

### Historical Comparison

The investigation compared current workflow direction against local main branch history from around 2026-04-22.

Relevant commits:

- `bcd245420a4881001aa1ef622bb35187916039ce`: local main snapshot around the target period.
- `1831605ac4029af0482de85051be9a94549e6ef9`: presentation workflow fix affecting visual stability.
- `8b756c85bea96d08eac9b3c5f18934ae01eb6249`: orchestration simplification.

The older workflow appears to have produced stronger visual output because it gave the model more concrete visual direction.

Historical strengths:

- A prompt composer injected specific template examples and visual art direction.
- Template routing selected distinctive families such as keynote, tech architecture, sci-fi, data dashboard, editorial magazine, infographic grid, timeline, and pitch deck.
- Legacy template files were large and detailed enough to serve as practical style references.
- Old prompts included blunt, simple output rules.
- The old batch pattern gave the first slide a full design prompt, then reused the shared style for later slides.

The older workflow was not necessarily architecturally better. The current runtime appears more robust in many ways. The key lesson is that the old workflow gave the model richer design scaffolding.

### Strategic Direction

Do not simply revert to the old workflow. Instead:

- Keep the current runtime architecture.
- Recover the rich visual guidance from the older prompts and templates.
- Replace unbounded examples with curated reference snippets.
- Move from "model invents a slide" to "model fills a known slide layout."
- Add stronger screenshot and text-fit validation.
- Improve progress events and repair-loop visibility.

### Presentation Design System

The new presentation system should provide:

- Theme registry.
- Slide layout registry.
- Content slots.
- Type scale.
- Color tokens.
- Spacing tokens.
- Component patterns.
- Repair rules.
- Screenshot validation.
- Text fitting.

Every generated slide should be based on a known layout type unless the user explicitly asks for a custom freeform slide.

### Slide Layout Library

Each theme should include layouts such as:

- Cover.
- Intro.
- Agenda.
- Section breaker.
- Big statement.
- Timeline.
- Two-column.
- Three-column.
- Comparison.
- Metric proof.
- Process.
- Quote.
- Case study.
- Data story.
- Roadmap.
- Closing.

Each layout should define:

- Required slots.
- Optional slots.
- Maximum text length.
- Minimum font sizes.
- Preferred visual density.
- Allowed components.
- Responsive behavior.
- Repair strategy.

Example:

```ts
interface SlideLayoutDefinition {
  id: string;
  label: string;
  themeIds: string[];
  slots: SlideSlotDefinition[];
  minFontSize: number;
  maxBullets?: number;
  supportsMedia: boolean;
  qualityRules: string[];
}
```

### Content Slots

The model should fill slots rather than write arbitrary HTML.

Example slots:

- `eyebrow`
- `title`
- `subtitle`
- `summary`
- `primaryStatement`
- `leftColumn`
- `rightColumn`
- `metricCards`
- `timelineItems`
- `quote`
- `source`
- `speakerNotes`

This allows Aura to:

- Enforce text length.
- Preserve layout on edits.
- Repair a single slot.
- Avoid full slide regeneration.
- Keep font sizes readable.

### Edit Workflow

Presentation editing should prefer targeted patches.

For example:

- If the user asks to change slide 3 title, update the title slot only.
- If the user asks to make a slide more visual, change the layout or add visual slots.
- If the user asks to change colors, update theme tokens.
- If the user asks to add a slide, choose a layout, scaffold it, then populate it.

Avoid:

- Regenerating the whole deck for small edits.
- Rewriting CSS across every slide unless theme changes require it.
- Running repair loops without clear progress.

### Immediate Edit Display

For editing workflows:

- Show an optimistic "applying edit" state.
- Apply safe local changes immediately where possible.
- Stream or stage generated replacement for the target slide.
- Update the artifact as soon as the target slide validates.
- Continue background validation if needed.

The user should not wait for an entire deck-level process if the edit affects one slide.

### Quality Controls

Add or strengthen checks for:

- Minimum font size.
- Text overflow.
- Contrast.
- Layout collisions.
- Blank or near-blank slides.
- Excessive bullet density.
- Boring repeated layouts.
- Missing visual hierarchy.
- Broken HTML/CSS.
- External image URLs if not allowed.
- Unsupported animation or motion patterns.

### Screenshot-Based QA

Heuristic HTML/CSS checks are not enough. Add screenshot-based QA where feasible.

Suggested validation:

- Render each slide at expected viewport size.
- Capture screenshot.
- Check for blank output.
- Check approximate text bounding boxes if available.
- Check canvas/image presence where required.
- Compare pixel distribution to avoid empty white slides.
- Detect extreme tiny text if tooling permits.

The workflow can start with basic render checks and grow over time.

### Prompt Recovery

Recover the useful parts of the older workflow:

- Concrete style examples.
- Template-specific visual language.
- Layout exemplars.
- Strong anti-patterns.
- Clear output contract.

Do not recover:

- Unbounded prompt size.
- Overly broad template selection.
- Hidden full-regeneration behavior.
- Any old behavior that conflicts with current progress and validation architecture.

### Benchmarking

Create a presentation quality benchmark set.

Benchmark prompts:

- Executive board update.
- Product launch deck.
- Research findings deck.
- Training workshop deck.
- Proposal deck.
- Timeline-heavy plan.
- Data-heavy insight deck.

For each benchmark:

- Generate with current workflow.
- Generate with improved scaffold workflow.
- Compare visual quality.
- Compare font size and readability.
- Compare time to complete.
- Compare repair count.
- Compare user-visible progress behavior.

### Acceptance Criteria

- Presentation creation produces visually stronger slides.
- Minimum readable font sizes are enforced.
- Edits to individual slides appear quickly.
- Progress shows slide count and phase count.
- Repair loops are bounded and visible.
- Layout variety improves across a deck.
- Theme and layout scaffolds drive generation.
- Benchmarks show improvement over current behavior.

## Workstream 7: Document And Presentation Tooling

### Goal

Build out tools for document and presentation creation and editing so the agent has stronger guidance and less need to invent structure.

### Core Idea

As much as possible should be scaffolded before the AI writes content.

Instead of asking the AI:

> Create a beautiful slide deck.

Aura should do:

1. Select theme.
2. Select layout sequence.
3. Create slide scaffolds.
4. Provide slot definitions.
5. Ask AI to populate slots.
6. Fit text.
7. Validate.
8. Repair only the failing slots.

This approach should also apply to documents.

### Presentation Scaffolding

For each visual theme, define a library of slide layouts:

- Intro slide.
- Agenda slide.
- Section breaker.
- Title slide.
- Timeline slide.
- Multi-column slide.
- Comparison slide.
- Data slide.
- Quote slide.
- Recommendation slide.
- Closing slide.

Each layout should include:

- Semantic purpose.
- HTML structure.
- CSS tokens.
- Slot map.
- Slot text budgets.
- Example content.
- Validation rules.

The model should receive:

- The chosen layout.
- The slot schema.
- The content goal.
- The allowed token/style variables.
- A small reference example.

The model should not be asked to invent the entire slide system repeatedly.

### Document Scaffolding

For documents, define reusable section modules:

- Cover.
- Executive summary.
- Key findings.
- Recommendation.
- Evidence table.
- Comparison matrix.
- Timeline.
- Process.
- Risk section.
- Decision log.
- Appendix.
- Callout.
- Pull quote.

Each module should define:

- Semantic purpose.
- Heading level behavior.
- Content slots.
- Table or list rules.
- Density level.
- Visual treatment.
- Page-break preference.
- Accessibility expectations.

### Theme System

Themes should define:

- Background color.
- Primary color.
- Accent color.
- Text color.
- Font stack.
- Type scale.
- Spacing scale.
- Border radius.
- Card style.
- Table style.
- Chart colors.
- Motion preference.

User customization should start simple:

- Background color.
- Primary color.
- Visual variant.

The system should derive the rest.

### Agent Tools

Build internal tools that the agent can call or that runtime code can use before and after generation.

Suggested tools:

- `selectVisualVariant`
- `selectPresentationTheme`
- `selectSlideLayoutSequence`
- `scaffoldDeck`
- `populateSlideSlots`
- `fitSlideText`
- `validateSlideContract`
- `repairSlideSlot`
- `repairSlideLayout`
- `renderSlidePreview`
- `scoreSlideQuality`
- `selectDocumentTheme`
- `selectDocumentSectionSequence`
- `scaffoldDocument`
- `populateDocumentModule`
- `validateDocumentModule`
- `repairDocumentModule`
- `commitArtifactVersion`

These do not all need to be exposed as user-facing tools. Some can be internal services.

### Slot-Based Editing

The strongest editing model is slot-based.

When a slide or document section is created, preserve structured metadata:

- Layout id.
- Theme id.
- Slot ids.
- Content values.
- Generated HTML mapping.
- Last validation result.

Then edits can target:

- A slot.
- A section.
- A layout.
- A theme token.

This enables precise edits:

- "Make the title shorter."
- "Add one proof point."
- "Turn this into a timeline."
- "Use the darker variant."
- "Change the primary color."

### Guardrails

The system should prevent common artifact failures:

- Tiny fonts.
- Too many bullets.
- Low contrast.
- Overlapping text.
- Repeated identical slide layouts.
- Empty slides.
- Dense documents with no hierarchy.
- Full restyles for small edits.
- Repair loops that keep rewriting the same failure.

### Acceptance Criteria

- Presentation runtime can scaffold a deck before content generation.
- Document runtime can scaffold sections before content generation.
- AI populates defined slots for common flows.
- Edits can target slots or sections.
- Theme tokens can be customized.
- Layout validation catches common visual failures.
- Repair targets the failing part rather than regenerating everything.

## Workstream 8: Validation, Quality, And Release Process

### Goal

Create a validation process that proves the real user experience improves.

### Why This Matters

Many artifact systems pass unit tests while producing weak user output. This work needs product-quality validation, not just code correctness.

### Validation Levels

#### Level 1: Unit Tests

Use unit tests for:

- Variant registry.
- Starter kit initialization.
- Project-scoped repo paths.
- `.aura` manifest parsing.
- Progress event conversion.
- Slot schema validation.
- Layout selection.

#### Level 2: Integration Tests

Use integration tests for:

- New project with variant.
- Presentation generation plan.
- Document generation plan.
- Edit slide slot.
- Save version.
- Export/import project.
- Export/import with history.

#### Level 3: Render Tests

Use render tests for:

- Slide is not blank.
- Fonts are above minimum size.
- Text does not overflow obvious containers.
- Colors have acceptable contrast.
- Layouts fit common viewports.

#### Level 4: Product Benchmarks

Use benchmark prompts for:

- Executive deck.
- Launch deck.
- Research deck.
- Teaching deck.
- Proposal deck.
- Long document.
- Document edit.
- Slide edit.

Track:

- Completion time.
- Number of repair attempts.
- Number of generated artifacts.
- Visual quality score.
- User-visible progress completeness.
- Whether edit appears before full run completion.

### Release Gates

Do not ship the full realignment until:

- README and docs are consistent.
- API/MCP references are removed from user-facing docs.
- Starter variants are visible and saved.
- Project histories are scoped by project.
- Presentation edit progress is visible.
- Repair loops are bounded.
- Benchmark decks are visibly better than baseline.

## Implementation Roadmap

### Phase 1: Clean Product Direction

Purpose: Align docs and visible product surfaces with the value-focused direction.

Tasks:

- Update README.
- Remove API/MCP roadmap docs or rewrite them as archived historical notes.
- Update program status.
- Audit visible UI strings for API/MCP/external automation language.
- Clarify provider API language.

Deliverable:

- Documentation and UI vocabulary no longer point toward API/MCP as product direction.

### Phase 2: Simplify Runtime Contracts

Purpose: Remove dead API/MCP and dry-run/explain concepts from active code.

Tasks:

- Audit `ExecutionMode`.
- Remove or compatibility-wrap dry-run/explain fields.
- Update chat request builders.
- Update run registry types.
- Update or remove stale tests.
- Keep provider APIs intact.

Deliverable:

- Runtime contracts reflect actual product behavior.

### Phase 3: Add Visual Variants

Purpose: Let starter kits produce visibly different and higher-quality starting points.

Tasks:

- Add visual variant registry.
- Update starter kit types.
- Update project initialization.
- Update new project dialog.
- Save selected variant into project metadata.
- Thread variant into presentation and document prompts.

Deliverable:

- Users can select visual direction when starting projects.

### Phase 4: Project-Scoped Version History

Purpose: Make every project history unique and reliable.

Tasks:

- Refactor version history repo path to include project id.
- Add project repo initialization.
- Update version history panel to use active project id.
- Share project snapshot serializer with export flow.
- Add tests for isolation.

Deliverable:

- New projects no longer share one git history.

### Phase 5: Presentation Progress And Repair Reliability

Purpose: Fix the feeling of queued or endless presentation work.

Tasks:

- Standardize progress events.
- Show step count and slide count in chat.
- Add repair attempt limits and visible repair phases.
- Improve cancel and fallback behavior.
- Surface partial completion clearly.

Deliverable:

- Users can see what presentation work is doing at each stage.

### Phase 6: Presentation Design System Recovery

Purpose: Restore beautiful, exciting presentation output.

Tasks:

- Build theme registry.
- Build slide layout registry.
- Recover useful legacy prompt and template guidance.
- Add slot-based generation for common layouts.
- Add text budgets and font-size rules.
- Add screenshot-based checks where feasible.
- Benchmark old vs current vs improved output.

Deliverable:

- Generated decks are more polished, varied, and readable.

### Phase 7: Document Scaffolding

Purpose: Make document creation and editing more guided and consistent.

Tasks:

- Build document section registry.
- Connect visual variants to document themes.
- Generate section scaffolds before content.
- Add slot-based document edits.
- Validate readability and structure.

Deliverable:

- Documents feel intentionally designed and easier to edit.

### Phase 8: `.aura` History Export

Purpose: Preserve version history when sharing or storing projects.

Tasks:

- Decide raw git vs linear snapshot approach.
- Add export option with history.
- Add import restoration.
- Validate history payloads.
- Add round-trip tests.

Deliverable:

- `.aura` files can preserve project history when requested.

### Phase 9: UI Simplification

Purpose: Make the app feel simple and value-focused.

Tasks:

- Simplify toolbar.
- Simplify chat bar.
- Move reports to details views.
- Move diagnostics to advanced surfaces.
- Make artifact-specific controls contextual.
- Review empty states and new project flow.

Deliverable:

- Main interface has fewer buttons and less technical noise.

## Proposed File Map

The exact file names may change during implementation, but this is a likely map.

### Documentation

- `README.md`
- `docs/program-status.md`
- `docs/roadmap/`
- `docs/product/artifact-quality.md`
- `docs/product/starter-variants.md`
- `docs/architecture/version-history.md`

### Starter Variants

- `src/services/bootstrap/visualVariants.ts`
- `src/services/bootstrap/starterKits.ts`
- `src/services/bootstrap/projectStarter.ts`
- `src/services/bootstrap/types.ts`
- `src/components/NewProjectDialog.tsx`
- `src/types/project.ts`

### Runtime Cleanup

- `src/services/runs/types.ts`
- `src/services/runs/registry.ts`
- `src/services/chat/buildRunRequest.ts`
- `src/services/chat/submitPrompt.ts`
- `src/services/contracts/outputEnvelope.ts`
- `src/services/artifactRuntime/types.ts`

### Version Control

- `src/services/storage/versionHistory.ts`
- `src/services/storage/projectSnapshot.ts`
- `src/services/storage/projectFormat.ts`
- `src/components/VersionHistoryPanel.tsx`

### Presentation Design System

- `src/services/artifactRuntime/presentationRuntime.ts`
- `src/services/artifactRuntime/presentationPrompts.ts`
- `src/services/artifactRuntime/presentationQualityChecklist.ts`
- `src/services/artifactRuntime/presentationThemes.ts`
- `src/services/artifactRuntime/presentationLayouts.ts`
- `src/services/artifactRuntime/presentationSlots.ts`

### Document Design System

- `src/services/artifactRuntime/documentRuntime.ts`
- `src/services/artifactRuntime/documentDesignSystem.ts`
- `src/services/artifactRuntime/documentSections.ts`
- `src/services/artifactRuntime/documentThemes.ts`

### Progress

- `src/services/runs/progress.ts`
- `src/services/artifactRuntime/progress.ts`
- `src/components/chat/RunProgress.tsx`
- `src/components/chat/handlers/presentationHandler.ts`

### UI Simplification

- `src/components/Toolbar.tsx`
- `src/components/ChatBar.tsx`
- `src/components/ProjectInitReportDialog.tsx`
- `src/components/RunHistoryPanel.tsx`
- `src/components/DoctorPanel.tsx`
- `src/components/ProjectRulesPanel.tsx`

## Detailed Acceptance Criteria

### Product And Docs

- README describes Aura as a local-first artifact creation workspace.
- README includes current artifact types.
- README accurately describes provider settings.
- Roadmap docs no longer promote API/MCP.
- Program status matches current product priorities.
- Architecture docs distinguish provider APIs from removed external Aura APIs.

### API/MCP Cleanup

- No active product UI mentions MCP.
- No roadmap positions MCP as upcoming product value.
- No active code depends on external adapter directories.
- Dry-run and explain modes are removed or legacy-compatible only.
- Tests do not preserve dead product vocabulary unless intentionally guarding compatibility.

### Starter Variants

- New project flow includes a visual direction choice.
- At least 6 variants exist.
- Variants include theme, prompt, layout, and document metadata.
- Variant choice persists in project data.
- Variant choice changes generated artifact style.

### UI Simplicity

- Primary toolbar actions are reduced.
- Chat bar is focused on prompting and sending.
- Reports move behind detail interactions.
- Validation and run history are not primary default actions.
- Advanced controls remain accessible.

### Chat Progress

- Long runs show "Step X of Y."
- Presentation creation shows "Slide X of N."
- Document creation shows "Section X of N."
- Repair attempts are visible.
- Queue state is visible.
- Stalled work shows a heartbeat or cancel path.

### Version Control

- Each project has a unique repo.
- Histories do not mix between projects.
- Version history panel is scoped to the active project.
- New project creates a fresh history.
- Imported project creates or restores a fresh history.
- `.aura` export can include history when enabled.
- Import validates history payloads safely.

### Presentations

- Decks have stronger visual hierarchy.
- Slides use readable font sizes.
- Slide layouts vary appropriately.
- Edits to a single slide do not require whole deck regeneration.
- Progress does not appear stuck during queued work.
- Repair loops are bounded.
- Screenshot or render validation catches blank/broken slides.

### Documents

- Document sections are scaffolded before content generation.
- Document themes connect to visual variants.
- Editing can target sections or slots.
- Documents maintain hierarchy, spacing, and readable density.

## Risks And Mitigations

### Risk: Removing The Wrong API Concept

Mitigation:

- Clearly distinguish external Aura API/MCP from provider API connectivity.
- Keep provider settings and diagnostics intact.
- Rename docs to make this boundary obvious.

### Risk: Visual Variant Scope Expands Too Much

Mitigation:

- Start with 6 or 7 curated variants.
- Do not expose every template as a separate choice.
- Make variants structured metadata, not a large custom theme editor.

### Risk: Project History Export Makes `.aura` Files Too Large

Mitigation:

- Make history export optional.
- Consider linear snapshots if raw git is too heavy.
- Add export size warnings later if needed.

### Risk: Slide Scaffolding Reduces Creativity

Mitigation:

- Provide enough layout families per theme.
- Allow controlled custom layouts for advanced requests.
- Use variants to keep visual diversity.
- Keep the system opinionated but not rigid.

### Risk: Screenshot QA Is Expensive Or Flaky

Mitigation:

- Start with basic render checks.
- Use screenshot QA for benchmark and repair workflows first.
- Keep deterministic HTML/CSS checks as a fast first layer.

### Risk: UI Simplification Hides Useful Power

Mitigation:

- Move advanced tools behind details or command menus.
- Preserve keyboard shortcuts where useful.
- Let advanced users open diagnostics when needed.

### Risk: Refactoring Version History Breaks Restore

Mitigation:

- Build project-scoped repo tests before broad integration.
- Keep legacy history migration path if needed.
- Avoid destructive migration on first load.
- Preserve current project state before switching repo behavior.

## Open Questions

1. Should `.aura` history export be on by default or offered as a separate "Export with history" option?
2. Should imported projects keep their original project id or receive a new id by default?
3. How many visual variants should ship in the first pass?
4. Should users choose colors during project creation or after the first artifact is created?
5. Should presentation themes be shared with document themes or mapped separately?
6. How strict should slide slot schemas be for advanced custom requests?
7. Should old API/MCP docs be deleted, archived, or rewritten as historical notes?
8. What is the minimum acceptable screenshot QA for the first release?
9. Should project rules remain visible by default or move into advanced settings?
10. Should version history commits happen after every assistant response or only after artifact-changing responses?

## Immediate Next Slice

The recommended first implementation slice is:

1. Update documentation direction and remove API/MCP roadmap positioning.
2. Add visual variant registry and project metadata.
3. Update new project dialog to select a variant.
4. Thread the variant into starter kits and presentation/document prompt context.
5. Add explicit presentation progress labels for slide count and phase count.

This slice is valuable because it is visible to users quickly, clarifies the product direction, and starts improving artifact quality without requiring the full version-control refactor first.

The recommended second implementation slice is:

1. Refactor version history to be project-scoped.
2. Add tests for history isolation.
3. Update version history panel to use active project id.
4. Create a shared project snapshot serializer.

The recommended third implementation slice is:

1. Build presentation theme and layout registries.
2. Recover useful legacy prompt/template guidance.
3. Add slot-based generation for the most common slide layouts.
4. Add render or screenshot validation for blank and broken slides.
5. Benchmark against current presentation output.

## Final Direction

Aura should stop presenting itself as a future API/MCP platform and become a sharper product for creating and editing excellent artifacts.

The next phase should make the app feel:

- Simpler.
- More visual.
- More guided.
- More reliable.
- More transparent.
- More project-aware.

The best path is to reduce surface area while increasing internal structure. Users should see fewer buttons, fewer reports, and fewer technical concepts. The system underneath should become more opinionated: variants, themes, layouts, slots, validation, progress, and project-scoped history.

That combination should make Aura feel more valuable immediately: easier to start, easier to trust, easier to edit, and much better at producing the polished presentations and documents that users actually want.
