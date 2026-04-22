# Aura Phase-by-Phase Implementation Plan

## Purpose

This document converts the workflow upgrade strategy into a concrete implementation program for `CraserF/aura_web`.

It is designed to answer:

- what to build first
- what each phase changes
- which files and modules are affected
- what can run in parallel
- how to validate each milestone
- what risks to watch for

It assumes the target state described in [aura_workflow_upgrade_plan.md](/Users/callumfraser/Documents/Codex/2026-04-23-describe-the-workflows-used-by-https/aura_workflow_upgrade_plan.md).

---

## Program Goals

By the end of this program, Aura should support:

- explicit intent resolution instead of fragile heuristic routing
- runtime project rules similar in value to Dyad's `AI_RULES.md`
- inspectable context assembly and token-aware context control
- targeted edits across presentations, documents, and spreadsheets
- template-first project bootstrapping
- full project augmentation across multiple artifacts
- validation and publish workflows by artifact profile
- reusable workflow presets and automation-friendly run contracts

---

## Current Baseline

Aura already has:

- multi-artifact project model in `src/types/project.ts`
- chat handlers in `src/components/chat/handlers/*`
- AI workflows in `src/services/ai/workflow/*`
- template systems under `src/services/ai/templates/*`
- memory services in `src/services/memory/*`
- version history in `src/services/storage/versionHistory.ts`
- charts/data/spreadsheet/export systems

The implementation plan below preserves those strengths and reorganizes the product boundary around explicit workflow contracts.

---

# Phase 0: Baseline Hardening And Inventory

## Objective

Freeze the current architecture enough to refactor safely, and document the current workflow boundary before changing it.

## Why this phase exists

Aura already has a lot of moving parts. Before changing core workflow plumbing, the team needs stable tests, runtime inventory, and interface snapshots.

## Deliverables

- workflow-boundary inventory
- current-state sequence diagrams
- test baseline for chat submission and artifact routing
- run-contract inventory for presentations, documents, spreadsheets

## Workstreams

### 0.1 Inventory Current Runtime Contracts

Document:

- current `ChatBar` responsibilities
- handler inputs and outputs
- workflow event types
- active store interactions
- where project state mutates
- where context is assembled

Target files to review and document:

- `src/components/ChatBar.tsx`
- `src/components/chat/handlers/presentationHandler.ts`
- `src/components/chat/handlers/documentHandler.ts`
- `src/components/chat/handlers/spreadsheetHandler.ts`
- `src/stores/chatStore.ts`
- `src/stores/projectStore.ts`
- `src/services/ai/workflow/types.ts`

### 0.2 Add Missing Regression Tests Around Current Routing

Add tests for:

- active document determines workflow
- no active document falls back to current workflow detection
- document-scoped and project-scoped chat visibility
- retry and auto-submit paths
- cancel behavior

Suggested test files:

- `src/test/chat-routing.test.ts`
- `src/test/chat-scope.test.ts`
- `src/test/chat-submit.test.ts`

### 0.3 Capture Prompt/Context Metrics Baseline

Add lightweight instrumentation to record:

- prompt length
- memory context length
- artifact context length
- total estimated tokens

This is a baseline only, not the final observability system.

Suggested files:

- `src/services/ai/debug.ts`
- `src/components/chat/handlers/*`

## Acceptance Criteria

- current routing behavior is covered by regression tests
- current workflow inputs and outputs are documented
- prompt/context size metrics can be sampled in development

## Risks

- hidden behavior inside handlers becomes apparent only after refactor starts

## Mitigation

- do not start Phase 1 until baseline tests are green

---

# Phase 1: Introduce Explicit Workflow Contracts

## Objective

Replace ad hoc orchestration with explicit typed contracts.

## Outcome

Every generation request should pass through typed workflow objects:

- `ResolvedIntent`
- `ContextBundle`
- `RunRequest`

## Core Design

### New Types

Add:

- `src/services/ai/intent/types.ts`
- `src/services/context/types.ts`
- `src/services/runs/types.ts`

Definitions should include:

`ResolvedIntent`
- artifact type
- operation
- scope
- target selectors
- confidence
- clarification requirement

`ContextBundle`
- conversation context
- artifact context
- memory context
- data context
- attachment context
- token estimate
- source metadata

`RunRequest`
- intent
- context bundle
- project rules snapshot
- provider config snapshot
- active artifact refs
- run metadata

### New Application Service Boundary

Add:

- `src/services/chat/buildRunRequest.ts`
- `src/services/chat/submitPrompt.ts`
- `src/services/chat/resolveScope.ts`

The UI component should no longer be the orchestration boundary.

## Workstreams

### 1.1 Create Intent Service

Replace direct use of `detectWorkflowType()` with:

- `resolveIntent(prompt, activeDocument, projectState, UI scope settings)`

This resolver should classify:

- `artifactType`
- `operation`
- `scope`
- `needsClarification`

Suggested files:

- `src/services/ai/intent/resolveIntent.ts`
- `src/services/ai/intent/clarify.ts`

`src/lib/workflowType.ts` should remain temporarily as a fallback helper, but should no longer be the main decision system.

### 1.2 Create Context Assembly Service

Add:

- `src/services/context/assemble.ts`
- `src/services/context/selectors.ts`
- `src/services/context/budgets.ts`
- `src/services/context/summarize.ts`

It should assemble:

- relevant chat history
- active artifact data
- selected artifact summaries
- memory context
- table or chart context
- attachment context

### 1.3 Create Run Request Builder

`buildRunRequest()` should:

1. resolve intent
2. assemble context
3. load project rules
4. package provider settings
5. produce one typed `RunRequest`

### 1.4 Refactor ChatBar To Use Application Services

`src/components/ChatBar.tsx` should become responsible for:

- capturing user input
- attachments
- local UI state
- invoking `submitPrompt()`

Move orchestration out.

## Affected Files

- `src/components/ChatBar.tsx`
- `src/components/chat/handlers/*`
- `src/lib/workflowType.ts`
- `src/stores/chatStore.ts`
- new `src/services/chat/*`
- new `src/services/context/*`
- new `src/services/ai/intent/*`

## Validation

Add tests for:

- prompt -> resolved intent
- intent -> context bundle
- run request shape
- artifact-specific routing via resolved intent

Suggested tests:

- `src/test/intent-resolution.test.ts`
- `src/test/context-assembly.test.ts`
- `src/test/run-request.test.ts`

## Acceptance Criteria

- all three artifact handlers accept a `RunRequest` or handler-specific derivative
- `ChatBar` no longer manually performs workflow inference and context assembly inline
- current behavior remains intact for the happy path

## Risks

- behavior regressions around auto-submit, retries, and document scoping

## Mitigation

- keep legacy routing helper for fallback during transition
- land this phase behind tests before deleting old flow

---

# Phase 2: Runtime Project Rules

## Objective

Add a first-class project rules system equivalent in value to Dyad's `AI_RULES.md`.

## Outcome

Aura projects gain durable, user-editable workflow and design rules that affect all generation and edit flows.

## Core Design

### Files and Formats

Add project metadata files conceptually stored in `.aura` project state:

- `project-rules.md`
- `context-policy.json`
- `workflow-presets.json`

If filesystem-backed storage is not yet desired, these can first live in project JSON and later export/import as files.

### Services

Add:

- `src/services/projectRules/types.ts`
- `src/services/projectRules/defaults.ts`
- `src/services/projectRules/load.ts`
- `src/services/projectRules/merge.ts`
- `src/services/projectRules/promptContext.ts`

### Rules Coverage

Rules should support:

- project voice and brand
- document design preferences
- presentation style constraints
- spreadsheet conventions
- linking behavior
- export preferences
- context inclusion policy
- validation strictness

## Workstreams

### 2.1 Extend Project Model

Update `ProjectData` in `src/types/project.ts` with:

- `projectRules`
- `contextPolicy`
- `workflowPresets`

Update persistence:

- `src/services/storage/projectFormat.ts`
- `src/services/storage/projectAutosave.ts`
- version history serialization logic if needed

### 2.2 Create Rule Resolver

The resolver should merge:

- system defaults
- project defaults
- artifact-specific overrides
- preset-specific overrides
- per-run temporary overrides

### 2.3 Inject Rules Into Prompt Construction

Update prompt-building flow so all workflows get:

- shared rule block
- artifact-specific rule block
- output constraints block

Affected files:

- `src/services/ai/prompts/composer.ts`
- document workflow prompt creation in `src/services/ai/workflow/document.ts`
- spreadsheet workflows and planners

### 2.4 Add Settings UI For Project Rules

Add UI surface for:

- editing project rules
- editing context policies
- selecting defaults by artifact type

Likely files:

- `src/components/ProjectSidebar.tsx`
- new `src/components/ProjectRulesPanel.tsx`

## Validation

Add tests for:

- rule merging order
- artifact override precedence
- prompt inclusion of rules
- persistence round-trips

Suggested tests:

- `src/test/project-rules.test.ts`
- `src/test/project-rules-prompt-context.test.ts`

## Acceptance Criteria

- project rules can be edited and persisted
- all workflow runs consume resolved rules
- prompts become measurably more deterministic under rule changes

## Risks

- prompt bloat

## Mitigation

- split rule prompts into compact and expanded forms
- include token budget tests during Phase 2

---

# Phase 3: Explicit Context Control

## Objective

Turn context engineering into a visible product capability, not an internal side effect.

## Outcome

Users and workflows can explicitly control what context is included in a run.

## Core Design

### Context Inputs

Support inclusion and exclusion of:

- current artifact
- selected artifacts
- project summary
- memory scopes
- data tables
- linked charts
- attachments
- recent chat only vs full scoped chat

### Context Policies

The system should support:

- auto-include pins
- token caps
- compact summaries vs full content
- excluded artifacts

## Workstreams

### 3.1 Extend ContextBundle

Refine `ContextBundle` with source entries:

- `kind`
- `id`
- `reasonIncluded`
- `tokenEstimate`
- `detailLevel`

### 3.2 Build Inspectable Context UI

Add UI showing:

- what got included
- why
- estimated size
- which scope mode is active

Likely new components:

- `src/components/ContextPanel.tsx`
- `src/components/ContextChips.tsx`

### 3.3 Add Pinning And Exclusion

Users should be able to pin:

- a memory directory
- a document
- a spreadsheet sheet
- a chart/table source

Users should also be able to exclude noisy sources.

### 3.4 Improve Memory Retrieval To Fit Context Modes

Refine:

- `src/services/memory/retrieval.ts`
- `src/services/memory/summarize.ts`

So retrieval can request:

- `compact`
- `overview`
- `detail`

based on context budget.

## Validation

Tests:

- pinned artifacts always included
- excluded artifacts never included
- token caps respected
- scope modes produce correct context shape

Suggested tests:

- `src/test/context-policy.test.ts`
- `src/test/context-pinning.test.ts`

## Acceptance Criteria

- each run records the exact context sources used
- user can see and influence context assembly
- memory retrieval is deterministic under policy constraints

## Risks

- UI complexity

## Mitigation

- start with simple chips and drawer rather than a heavy context editor

---

# Phase 4: Unified Targeted Editing

## Objective

Make modify/refine flows bounded, explicit, and reusable across all artifact types.

## Outcome

Aura can target:

- presentation slides/elements
- document sections/blocks
- spreadsheet sheets/ranges/columns
- theme/style tokens

## Core Design

### Shared Editing Package

Add:

- `src/services/editing/types.ts`
- `src/services/editing/resolveTargets.ts`
- `src/services/editing/strategies.ts`
- `src/services/editing/patchDocument.ts`
- `src/services/editing/patchPresentation.ts`
- `src/services/editing/patchSpreadsheet.ts`
- `src/services/editing/styleTokens.ts`

### Supported Strategies

- search/replace patch
- block replace
- markdown section patch
- style token update
- deterministic sheet action
- formula/query transformation

## Workstreams

### 4.1 Generalize Presentation Patch Utilities

Refactor:

- `src/services/ai/workflow/patchUtils.ts`

into artifact-neutral patch utilities.

### 4.2 Add Document Block Editing

Create document target resolution for:

- heading section
- callout block
- table block
- chart block
- metadata block

### 4.3 Add Spreadsheet Scoped Editing

Add targets:

- active sheet
- named sheet
- column
- range
- formula column
- filter/sort state

### 4.4 Integrate Targets Into Intent Resolution

`ResolvedIntent` should carry:

- `targetSelectors`
- `editStrategyHint`

### 4.5 Add Fallback Rules

If bounded edit fails:

1. retry with safer patch mode
2. ask for clarification
3. fall back to full regeneration only if explicitly allowed

## Validation

Tests:

- patch parse/apply success
- patch dry-run failure behavior
- document section targeting
- spreadsheet range targeting
- full-regeneration fallback behavior

Suggested tests:

- `src/test/editing-presentation.test.ts`
- `src/test/editing-document.test.ts`
- `src/test/editing-spreadsheet.test.ts`

## Acceptance Criteria

- modify/refine requests are scoped by default
- full rewrites require explicit intent or fallback
- run metadata records edit strategy used

## Risks

- target matching brittleness

## Mitigation

- use stable target IDs or generated block markers where possible

---

# Phase 5: Template-First Bootstrapping

## Objective

Make project and artifact creation start from templates, starter kits, and workflow presets rather than blank-state generation only.

## Outcome

Aura can bootstrap:

- single artifacts
- multi-artifact starter kits
- artifact-specific defaults

## Core Design

### Add Template Registries For All Artifact Types

Presentations already have a strong registry. Add equivalent registries for:

- documents
- spreadsheets
- project starter kits

### Bootstrap Layer

Add:

- `src/services/bootstrap/types.ts`
- `src/services/bootstrap/projectStarter.ts`
- `src/services/bootstrap/starterKits.ts`
- `src/services/bootstrap/defaultRules.ts`

## Workstreams

### 5.1 Document Template Registry

Add:

- `src/services/ai/templates/document/registry.ts`
- `src/services/ai/templates/document/blueprints.ts`

Families might include:

- executive brief
- editorial report
- proposal
- research memo
- wiki/readme

### 5.2 Spreadsheet Template Registry

Add:

- `src/services/ai/templates/spreadsheet/registry.ts`

Families might include:

- KPI tracker
- financial model starter
- research dataset workbook
- CRM-style table
- project tracker

### 5.3 Project Starter Kits

Add:

- `src/services/ai/templates/project-kits/registry.ts`

Starter kits should define:

- initial artifact set
- naming defaults
- rules defaults
- export defaults
- validation profile

### 5.4 Starter UI

Add project creation UI for:

- blank project
- starter kit
- single artifact quick start

Likely files:

- `src/components/ProjectSidebar.tsx`
- new `src/components/NewProjectDialog.tsx`

## Validation

Tests:

- starter kit creates expected artifacts
- default rules and presets attach correctly
- generated starter project persists and reloads correctly

## Acceptance Criteria

- users can start with purpose-built project kits
- all artifacts created from starter kits inherit rules and presets

## Risks

- starter kits become too rigid

## Mitigation

- keep kits composable and editable after creation

---

# Phase 6: Full Project Augmentation

## Objective

Introduce project-wide workflows that improve multiple artifacts together.

## Outcome

Aura becomes capable of commands like:

- improve project consistency
- create cross-artifact summaries
- link artifacts together
- propagate data-driven updates

## Core Design

### New Workflow

Add:

- `src/services/ai/workflow/project.ts`

And project-level agents:

- `project-planner.ts`
- `project-reviewer.ts`
- `crosslinker.ts`
- `consistency-auditor.ts`

## Workstreams

### 6.1 Add Project-Level Intent Operations

Support:

- `augment`
- `review_project`
- `link_project`
- `summarize_project`
- `refresh_dependencies`

### 6.2 Build Project Dependency Graph

Add:

- `src/services/projectGraph/types.ts`
- `src/services/projectGraph/build.ts`
- `src/services/projectGraph/refresh.ts`
- `src/services/projectGraph/validate.ts`

Track:

- references
- linked tables
- chart sources
- summary derivations
- export targets

### 6.3 Add Multi-Artifact Update Application

Add a batch mutation layer so one run can safely update:

- report + deck + workbook
- summary docs + linked charts

### 6.4 Add Cross-Linking Flows

Examples:

- document references spreadsheet sheet
- presentation references document summary
- chart generated from spreadsheet and inserted into document/presentation

## Validation

Tests:

- dependency graph generation
- refresh linked data
- summary augmentation
- cross-artifact updates remain stable and reversible

Suggested tests:

- `src/test/project-graph.test.ts`
- `src/test/project-augmentation.test.ts`

## Acceptance Criteria

- project-wide commands are first-class
- updates across multiple artifacts are tracked in one run
- dependency refresh can detect stale downstream artifacts

## Risks

- multi-artifact write complexity

## Mitigation

- introduce dry-run diff summaries before apply

---

# Phase 7: Validation Profiles And Publish Workflows

## Objective

Make review, export, and publish actions explicit and profile-driven.

## Outcome

Every artifact and project can be validated against a known profile before export or publishing.

## Core Design

### Validation Services

Add:

- `src/services/validation/profiles.ts`
- `src/services/validation/documentValidation.ts`
- `src/services/validation/presentationValidation.ts`
- `src/services/validation/spreadsheetValidation.ts`
- `src/services/validation/projectValidation.ts`

### Profile Examples

- `presentation-standard`
- `document-standard`
- `spreadsheet-standard`
- `executive-pack`
- `research-pack`
- `publish-ready`

## Workstreams

### 7.1 Unify QA Result Model

Today QA/review logic is spread across artifact-specific systems.

Introduce a shared validation result structure:

- `passed`
- `blockingIssues`
- `warnings`
- `score`
- `profileId`
- `artifactTargets`

### 7.2 Add Publish Readiness UI

Show:

- current validation profile
- pass/fail
- blocking issues
- export availability

Potential new components:

- `src/components/ValidationPanel.tsx`
- `src/components/PublishPanel.tsx`

### 7.3 Gate Export/Publish Actions By Profile

Exports should optionally require:

- passing validation profile
- explicit override

### 7.4 Expand Run Metadata

Each export/publish run should record:

- profile used
- issues found
- overrides used
- output formats produced

## Validation

Tests:

- profile selection
- blocking issue detection
- export gating
- project-wide validation behavior

## Acceptance Criteria

- validation is no longer ad hoc per artifact
- export and publish are explicit workflow stages

## Risks

- false positives create friction

## Mitigation

- allow per-profile warning thresholds and overrides

---

# Phase 8: Workflow Presets And Lifecycle States

## Objective

Support repeatable workflows and durable artifact lifecycle states.

## Outcome

Users can save and reuse successful workflow setups and manage artifacts through draft/review/publish states.

## Core Design

### Preset Services

Add:

- `src/services/presets/types.ts`
- `src/services/presets/storage.ts`
- `src/services/presets/apply.ts`
- `src/services/presets/defaults.ts`

### Lifecycle States

Extend artifacts with states:

- `draft`
- `reviewing`
- `approved`
- `published`
- `stale`

## Workstreams

### 8.1 Extend ProjectDocument Model

Update:

- `src/types/project.ts`

Add:

- lifecycle state
- last validation profile
- last successful preset
- stale reason if applicable

### 8.2 Add Preset Application In Run Builder

`buildRunRequest()` should accept:

- selected preset
- preset-derived rules
- preset-derived context policy

### 8.3 Add Preset UI

Users should be able to:

- save current workflow setup
- reuse preset
- duplicate and edit preset

## Validation

Tests:

- preset round-trip storage
- preset application to run request
- lifecycle state transitions

## Acceptance Criteria

- workflows can be reused consistently
- artifact lifecycle state updates are visible and persistent

## Risks

- too many configuration surfaces

## Mitigation

- start with a few high-value presets and simple lifecycle transitions

---

# Phase 9: Spreadsheet Workflow Deepening

## Objective

Bring spreadsheets up to the same orchestration quality level as documents and presentations.

## Outcome

Spreadsheet workflows become planful, scoped, validated, and augmentation-aware.

## Workstreams

### 9.1 Introduce Spreadsheet Planner And Validator

Add:

- `src/services/ai/workflow/agents/spreadsheet-planner.ts`
- `src/services/ai/workflow/agents/spreadsheet-validator.ts`
- `src/services/ai/workflow/agents/spreadsheet-augmenter.ts`

### 9.2 Move From Intent Regexes To Structured Spreadsheet Intent

Refactor:

- `src/services/spreadsheet/actions.ts`
- `src/services/spreadsheet/starter.ts`

They can still use deterministic parsers, but should operate inside the shared workflow framework.

### 9.3 Add Prompt-To-Formula And Prompt-To-Query Contracts

Support:

- create computed columns
- query views
- linked tables
- chart packs

### 9.4 Add Spreadsheet Contribution To Project Augmentation

Examples:

- spreadsheet drives charts in deck
- spreadsheet drives metrics in document
- summary regenerated when data changes

## Validation

Tests:

- spreadsheet planner intent resolution
- prompt-to-formula
- prompt-to-query
- cross-artifact refresh

## Acceptance Criteria

- spreadsheet workflow uses same run contract system as other artifacts
- spreadsheets participate fully in augmentation and validation flows

---

# Phase 10: API/MCP/Automation Alignment

## Objective

Make the workflow contracts compatible with future API, MCP, and automation work already planned in the repo.

## Outcome

Aura's internal runtime can be safely exposed externally because workflow contracts are explicit and reusable.

## Workstreams

### 10.1 Align RunRequest With API/MCP Contract

Ensure `RunRequest` and run results can map directly to:

- API execution requests
- MCP tool calls
- automation runs

### 10.2 Add Serializable Run Specs

A workflow should be representable as:

- intent
- rules snapshot
- context snapshot
- preset
- provider config reference

### 10.3 Add Dry-Run / Explain Support

Before external execution, support:

- "what would be included"
- "what would change"
- "what validation profile would run"

## Validation

- run contract serializes cleanly
- API/MCP roadmap docs can map directly to current internal abstractions

## Acceptance Criteria

- no major internal refactor should be needed later to expose workflows through API or MCP

---

# Parallelization Map

## Can Run In Parallel

### Track A: Workflow Core

- Phase 1
- Phase 2
- Phase 3

### Track B: Editing And Validation

- Phase 4
- Phase 7

### Track C: Bootstrap And Presets

- Phase 5
- Phase 8

### Track D: Project Augmentation

- Phase 6
- Phase 9

### Track E: Externalization

- Phase 10

## Strong Dependencies

- Phase 1 should finish before most other phases
- Phase 2 and 3 should land before large-scale prompt and augmentation work
- Phase 6 depends heavily on Phase 1, 2, 3, and 4 foundations
- Phase 10 should wait until run contracts settle

---

# Recommended Team Breakdown

## Team 1: Workflow Platform

Own:

- intent resolution
- run request builder
- context assembly
- project rules

## Team 2: Artifact Editing

Own:

- targeted editing framework
- document/presentation/spreadsheet scoped edits

## Team 3: Artifact Bootstrapping

Own:

- template registries
- starter kits
- presets

## Team 4: Project Intelligence

Own:

- dependency graph
- augmentation workflows
- memory/context evolution

## Team 5: Validation And Publish

Own:

- validation profiles
- publish readiness
- export gating

---

# Detailed First 3 Sprints

## Sprint 1

Goal: establish explicit workflow contracts

Tasks:

1. add `ResolvedIntent`
2. add `ContextBundle`
3. add `RunRequest`
4. implement `resolveIntent()`
5. implement `buildRunRequest()`
6. refactor `ChatBar.tsx` to call service boundary
7. keep legacy handler behavior under the new contract

Definition of done:

- current features still work
- tests cover routing and run request creation

## Sprint 2

Goal: add runtime project rules and compact context policy

Tasks:

1. extend `ProjectData`
2. add project rules services
3. inject rules into all workflows
4. add basic UI for rules editing
5. add token-aware context policy support

Definition of done:

- project-level rules persist
- prompts reflect rule changes

## Sprint 3

Goal: targeted editing foundation

Tasks:

1. generalize patch utils
2. document target resolver
3. spreadsheet target resolver
4. edit fallback policies
5. run metadata records edit strategy

Definition of done:

- bounded edits work for at least one document flow and one spreadsheet flow in addition to presentations

---

# Validation Strategy For The Whole Program

## 1. Contract Tests

Every phase should preserve and validate:

- intent contracts
- context bundle contracts
- run request contracts
- validation result contracts

## 2. Golden Flow Tests

Maintain end-to-end tests for:

- create presentation from prompt
- create document from prompt
- create spreadsheet from prompt
- refine current artifact
- project-wide augmentation
- export after validation

## 3. Snapshot Tests

Useful for:

- context bundle summaries
- resolved rules
- validation outputs

## 4. Performance Budgets

Track:

- prompt/token growth
- memory retrieval latency
- run-request build latency
- validation latency

---

# Main Risks Across The Program

## Risk 1: Overengineering

Because Aura already has many systems, there is a danger of adding too many abstractions too quickly.

### Mitigation

- every phase must preserve working UX
- every new abstraction needs tests and a clear caller

## Risk 2: Prompt Bloat

Rules, context control, and validation can all make prompts too large.

### Mitigation

- compact vs expanded prompt sections
- token budget tests
- context summaries

## Risk 3: Multi-Artifact Update Complexity

Project augmentation can create partial failure modes.

### Mitigation

- dry-run summaries
- batch apply with rollback on failure
- per-artifact mutation logs

## Risk 4: UI Complexity

Too many controls could undermine the simple chat-first experience.

### Mitigation

- keep advanced controls in drawers/panels
- preserve a simple default mode

---

# Final Recommended Order

If the team wants the highest leverage path, implement in this order:

1. Phase 0
2. Phase 1
3. Phase 2
4. Phase 3
5. Phase 4
6. Phase 5
7. Phase 6
8. Phase 7
9. Phase 8
10. Phase 9
11. Phase 10

That ordering creates the strongest foundation with the least rework.

---

# Bottom Line

The most important change is not a new model, template, or export format.

The most important change is to make Aura's workflow system explicit:

- explicit intent
- explicit scope
- explicit context
- explicit rules
- explicit targets
- explicit validation
- explicit run metadata

Once that foundation is in place, all the higher-level features the project wants, including context control, targeted edits, full project augmentation, iterative editing, and template-first bootstrapping, become much easier to build reliably.
