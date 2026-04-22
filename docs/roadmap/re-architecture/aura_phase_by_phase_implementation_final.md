# Aura Unified Phase-by-Phase Implementation Plan

## Purpose

This document is the unified implementation plan for upgrading `CraserF/aura_web` into a stronger AI artifact builder for documents, presentations, and spreadsheets.

It merges:

- the original Aura workflow improvement strategy
- the phase-based implementation breakdown
- the additional architecture and workflow lessons learned from analyzing `ultraworkers/claw-code`

This is now the single canonical planning document for the workflow upgrade program.

---

## End-State Goals

By the end of this program, Aura should support:

- explicit intent resolution instead of fragile heuristic routing
- runtime project rules similar in value to Dyad's `AI_RULES.md`
- inspectable, token-aware context assembly and context control
- targeted edits across presentations, documents, and spreadsheets
- template-first bootstrapping for artifacts and whole projects
- full project augmentation across multiple artifacts
- validation and publish workflows by artifact profile
- reusable workflow presets and automation-friendly run contracts
- machine-readable structured workflow results
- a first-class `doctor` / diagnostics workflow
- deterministic workflow parity harnesses
- event taxonomy and run registries
- context compaction and policy-driven recovery

---

## Core Architectural Principles

The upgraded Aura architecture should follow these principles:

1. **Workflow contracts are explicit**
   Intent, scope, context, targets, rules, and results should be typed and inspectable.

2. **Human-facing prose is derived from machine-facing contracts**
   Chat messages, status strings, and panels should be rendered from structured result objects.

3. **Artifact generation and workflow operations are different layers**
   Creating an artifact is one concern; diagnosing, validating, routing, retrying, and augmenting are separate concerns.

4. **Every important workflow must be testable as a scenario**
   Unit tests are not enough. Aura needs deterministic parity-style workflow tests.

5. **The runtime should explain itself**
   Users and operators should be able to answer:
   - what happened
   - why it happened
   - what context was used
   - what changed
   - why something failed

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

The implementation plan below keeps those strengths and reorganizes the system around explicit workflow contracts and hardened operational behavior.

---

# Phase 0: Baseline Hardening, Inventory, And Scenario Foundations

## Objective

Freeze the current architecture enough to refactor safely, inventory the runtime boundary, and introduce the first workflow scenario harness scaffolding.

## Why this phase exists

Aura already has many moving parts. Before changing core workflow plumbing, the team needs:

- stable regression coverage
- runtime inventory
- interface snapshots
- scenario harness seeds

## Deliverables

- workflow-boundary inventory
- current-state sequence diagrams
- test baseline for chat submission and artifact routing
- initial workflow scenario manifest
- baseline prompt/context metrics

## Workstreams

### 0.1 Inventory Current Runtime Contracts

Document:

- current `ChatBar` responsibilities
- handler inputs and outputs
- workflow event types
- active store interactions
- where project state mutates
- where context is assembled
- where validation occurs
- where retries/fallbacks occur

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

Suggested files:

- `src/services/ai/debug.ts`
- `src/components/chat/handlers/*`

### 0.4 Create Workflow Scenario Manifest Skeleton

Inspired by Claw Code's parity harness, add an initial scenario manifest for core Aura flows.

Add:

- `src/test/workflow-scenarios.json`

Initial scenarios:

- create presentation from prompt
- create document from prompt
- create spreadsheet from prompt
- refine active document
- refine active presentation
- spreadsheet action flow

### 0.5 Define Canonical Source-Of-Truth Docs

Create or reserve canonical docs for:

- workflow contracts
- context contracts
- validation profiles
- bootstrap contracts

Add:

- `docs/workflow-contracts.md`
- `docs/context-contract.md`
- `docs/validation-profiles.md`
- `docs/bootstrap-contracts.md`

## Acceptance Criteria

- current routing behavior is covered by regression tests
- current workflow inputs and outputs are documented
- prompt/context metrics can be sampled in development
- a scenario manifest exists for future parity harness work

## Risks

- hidden behavior inside handlers becomes apparent only after refactor starts

## Mitigation

- do not start Phase 1 until baseline tests are green

---

# Phase 1: Explicit Workflow Contracts And Structured Results

## Objective

Replace ad hoc orchestration with explicit typed workflow contracts and structured result contracts.

## Outcome

Every generation request should pass through typed workflow objects:

- `ResolvedIntent`
- `ContextBundle`
- `RunRequest`
- `RunResult`

## Core Design

### New Types

Add:

- `src/services/ai/intent/types.ts`
- `src/services/context/types.ts`
- `src/services/runs/types.ts`
- `src/services/contracts/runResult.ts`

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

`RunResult`
- run ID
- artifact outputs
- validation summary
- changed targets
- warnings
- next actions
- structured status

### New Application Service Boundary

Add:

- `src/services/chat/buildRunRequest.ts`
- `src/services/chat/submitPrompt.ts`
- `src/services/chat/resolveScope.ts`

The UI component should no longer be the orchestration boundary.

### Run Registry Skeleton

Following Claw Code's task-registry lesson, add the first version of a run registry:

- `src/services/runs/registry.ts`
- `src/services/runs/status.ts`

Statuses:

- pending
- running
- blocked
- completed
- failed
- cancelled

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

### 1.4 Add Structured Run Results

Handlers and workflows should return structured `RunResult` objects first. User-facing assistant messages should be rendered from these results.

### 1.5 Refactor ChatBar To Use Application Services

`src/components/ChatBar.tsx` should become responsible for:

- capturing user input
- attachments
- local UI state
- invoking `submitPrompt()`

Move orchestration out.

### 1.6 Build Workflow Parity Harness Skeleton

Inspired by Claw Code's deterministic scenario harness, add:

- `src/test/harness/mockProvider.ts`
- `src/test/harness/runWorkflowScenario.ts`
- `src/test/harness/assertScenario.ts`
- `src/test/workflow-parity.test.ts`

This phase only needs the skeleton plus a few core scenarios.

## Affected Files

- `src/components/ChatBar.tsx`
- `src/components/chat/handlers/*`
- `src/lib/workflowType.ts`
- `src/stores/chatStore.ts`
- new `src/services/chat/*`
- new `src/services/context/*`
- new `src/services/ai/intent/*`
- new `src/services/runs/*`
- new `src/services/contracts/*`

## Validation

Add tests for:

- prompt -> resolved intent
- intent -> context bundle
- run request shape
- run result shape
- artifact-specific routing via resolved intent
- first parity scenarios

Suggested tests:

- `src/test/intent-resolution.test.ts`
- `src/test/context-assembly.test.ts`
- `src/test/run-request.test.ts`
- `src/test/run-result.test.ts`
- `src/test/workflow-parity.test.ts`

## Acceptance Criteria

- all three artifact handlers accept a `RunRequest` or handler-specific derivative
- handlers emit structured `RunResult` objects
- `ChatBar` no longer manually performs workflow inference and context assembly inline
- current behavior remains intact for the happy path

## Risks

- behavior regressions around auto-submit, retries, and document scoping

## Mitigation

- keep legacy routing helper for fallback during transition
- land this phase behind tests before deleting old flow

---

# Phase 2: Runtime Project Rules, Config Validation, And Diagnostics

## Objective

Add a first-class project rules system equivalent in value to Dyad's `AI_RULES.md`, backed by schema validation and a first-class `doctor` / diagnostics workflow.

## Outcome

Aura projects gain:

- durable, user-editable workflow and design rules
- validated context policies and presets
- a preflight/doctor workflow for runtime and project health

## Core Design

### Files and Formats

Add project metadata files conceptually stored in `.aura` project state:

- `project-rules.md`
- `context-policy.json`
- `workflow-presets.json`

### Services

Add:

- `src/services/projectRules/types.ts`
- `src/services/projectRules/defaults.ts`
- `src/services/projectRules/load.ts`
- `src/services/projectRules/merge.ts`
- `src/services/projectRules/promptContext.ts`

### Config Validation

Inspired by Claw Code's config diagnostics, add:

- `src/services/configValidate/types.ts`
- `src/services/configValidate/projectRules.ts`
- `src/services/configValidate/contextPolicy.ts`
- `src/services/configValidate/presets.ts`

Diagnostics should support:

- unknown key
- wrong type
- deprecated field
- suggestion/hint

### Doctor / Diagnostics

Add:

- `src/services/diagnostics/types.ts`
- `src/services/diagnostics/runDoctor.ts`
- `src/services/diagnostics/checks/provider.ts`
- `src/services/diagnostics/checks/project.ts`
- `src/services/diagnostics/checks/exports.ts`
- `src/services/diagnostics/checks/memory.ts`
- `src/services/diagnostics/checks/data.ts`
- `src/services/diagnostics/checks/dependencies.ts`

UI:

- `src/components/DoctorPanel.tsx`

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

### 2.3 Validate Rules, Policies, And Presets

Validation should run:

- on project load
- on save
- on doctor
- before workflow execution when needed

### 2.4 Inject Rules Into Prompt Construction

Update prompt-building flow so all workflows get:

- shared rule block
- artifact-specific rule block
- output constraints block

Affected files:

- `src/services/ai/prompts/composer.ts`
- document workflow prompt creation in `src/services/ai/workflow/document.ts`
- spreadsheet workflows and planners

### 2.5 Add Settings UI For Project Rules

Add UI surface for:

- editing project rules
- editing context policies
- selecting defaults by artifact type

Likely files:

- `src/components/ProjectSidebar.tsx`
- `src/components/ProjectRulesPanel.tsx`

### 2.6 Add Doctor Workflow

The doctor should report:

- provider config health
- project rule validation health
- missing or broken artifact dependencies
- export readiness
- data/memory subsystem readiness

Doctor should produce:

- structured result
- human-readable rendering

## Validation

Add tests for:

- rule merging order
- artifact override precedence
- prompt inclusion of rules
- persistence round-trips
- config validation diagnostics
- doctor result structure

Suggested tests:

- `src/test/project-rules.test.ts`
- `src/test/project-rules-prompt-context.test.ts`
- `src/test/config-validation.test.ts`
- `src/test/doctor.test.ts`

## Acceptance Criteria

- project rules can be edited and persisted
- all workflow runs consume resolved rules
- invalid rules/policies produce actionable diagnostics
- doctor exists as a first-class workflow

## Risks

- prompt bloat
- config complexity

## Mitigation

- split rule prompts into compact and expanded forms
- include token budget tests during Phase 2

---

# Phase 3: Explicit Context Control And Context Compaction

## Objective

Turn context engineering into a visible product capability and add compaction as an explicit runtime subsystem.

## Outcome

Users and workflows can explicitly control what context is included in a run, and Aura can compact history/context deterministically when needed.

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

### Context Compaction

Inspired by Claw Code's summary compression:

Add:

- `src/services/context/compact.ts`
- `src/services/context/compressionBudget.ts`
- `src/services/context/compactionPolicy.ts`

The compaction system should:

- preserve pinned context
- compress old run history
- compact artifact summaries
- explain what was compacted
- report size before/after

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
- what got compacted

New components:

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

### 3.5 Add Compaction Policies

Policies should determine:

- when to compact
- what to preserve
- how aggressive compaction should be
- whether to prompt the user or auto-compact

## Validation

Tests:

- pinned artifacts always included
- excluded artifacts never included
- token caps respected
- scope modes produce correct context shape
- compaction preserves pinned inputs
- compaction reports before/after size

Suggested tests:

- `src/test/context-policy.test.ts`
- `src/test/context-pinning.test.ts`
- `src/test/context-compaction.test.ts`

## Acceptance Criteria

- each run records exact context sources used
- user can see and influence context assembly
- memory retrieval is deterministic under policy constraints
- compaction is explicit, testable, and inspectable

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

# Phase 5: Template-First Bootstrapping And Idempotent Init

## Objective

Make project and artifact creation start from templates, starter kits, and workflow presets rather than blank-state generation only, and add an idempotent initializer/bootstrap report.

## Outcome

Aura can bootstrap:

- single artifacts
- multi-artifact starter kits
- artifact-specific defaults
- whole-project initialization in a structured and repeatable way

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
- `src/services/bootstrap/initProject.ts`
- `src/services/bootstrap/initReport.ts`

### Structured Init Report

Inspired by Claw Code's `init` flow, bootstrap should produce stable statuses:

- created
- updated
- skipped

This should be emitted as structured output and rendered for users.

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
- `src/components/NewProjectDialog.tsx`

### 5.5 Add Idempotent Init / Bootstrap Flow

The project init flow should:

- create missing project files and metadata
- preserve existing user edits
- report what changed in stable structured fields

## Validation

Tests:

- starter kit creates expected artifacts
- default rules and presets attach correctly
- generated starter project persists and reloads correctly
- init reports created/updated/skipped accurately

## Acceptance Criteria

- users can start with purpose-built project kits
- all artifacts created from starter kits inherit rules and presets
- bootstrap/init is idempotent and structured

## Risks

- starter kits become too rigid

## Mitigation

- keep kits composable and editable after creation

---

# Phase 6: Full Project Augmentation, Dependency Graphs, And Event Taxonomy

## Objective

Introduce project-wide workflows that improve multiple artifacts together, backed by explicit dependency graphs and event taxonomy.

## Outcome

Aura becomes capable of commands like:

- improve project consistency
- create cross-artifact summaries
- link artifacts together
- propagate data-driven updates
- emit explicit events about workflow state and dependencies

## Core Design

### New Workflow

Add:

- `src/services/ai/workflow/project.ts`

And project-level agents:

- `project-planner.ts`
- `project-reviewer.ts`
- `crosslinker.ts`
- `consistency-auditor.ts`

### Project Dependency Graph

Add:

- `src/services/projectGraph/types.ts`
- `src/services/projectGraph/build.ts`
- `src/services/projectGraph/refresh.ts`
- `src/services/projectGraph/validate.ts`

### Event Taxonomy

Inspired by Claw Code's lane events, add:

- `src/services/events/types.ts`
- `src/services/events/eventBus.ts`
- `src/services/events/fingerprint.ts`
- `src/services/events/provenance.ts`

Suggested events:

- `run.started`
- `run.context_assembled`
- `run.blocked`
- `run.generating`
- `run.validation_failed`
- `run.ready_for_review`
- `run.approved`
- `run.exported`
- `run.published`
- `run.failed`
- `run.retried`
- `artifact.stale`
- `artifact.refreshed`
- `dependency.broken`
- `dependency.relinked`

## Workstreams

### 6.1 Add Project-Level Intent Operations

Support:

- `augment`
- `review_project`
- `link_project`
- `summarize_project`
- `refresh_dependencies`

### 6.2 Build Project Dependency Graph

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

### 6.5 Add Event Publication

Every project augmentation run should emit typed events rather than free-form progress only.

## Validation

Tests:

- dependency graph generation
- refresh linked data
- summary augmentation
- cross-artifact updates remain stable and reversible
- event publication and deduplication

Suggested tests:

- `src/test/project-graph.test.ts`
- `src/test/project-augmentation.test.ts`
- `src/test/workflow-events.test.ts`

## Acceptance Criteria

- project-wide commands are first-class
- updates across multiple artifacts are tracked in one run
- dependency refresh can detect stale downstream artifacts
- workflow state is represented by explicit event taxonomy

## Risks

- multi-artifact write complexity

## Mitigation

- introduce dry-run diff summaries before apply

---

# Phase 7: Validation Profiles, Publish Workflows, And Clean-Environment Verification

## Objective

Make review, export, and publish actions explicit and profile-driven, and verify them in isolated environments where needed.

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

### Clean-Environment Verification

Inspired by Claw Code's container/clean-env workflow:

Add:

- isolated export smoke tests
- clean-environment checks for data/export dependencies
- optional containerized test entrypoint later if needed

## Workstreams

### 7.1 Unify QA Result Model

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

New components:

- `src/components/ValidationPanel.tsx`
- `src/components/PublishPanel.tsx`

### 7.3 Gate Export/Publish Actions By Profile

Exports should optionally require:

- passing validation profile
- explicit override

### 7.4 Add Clean-Environment Smoke Tests

Test:

- export engines load correctly
- document PDF export path works
- DOCX export path works
- spreadsheet export/data path works

## Validation

Tests:

- profile selection
- blocking issue detection
- export gating
- project-wide validation behavior
- isolated export smoke tests

## Acceptance Criteria

- validation is no longer ad hoc per artifact
- export and publish are explicit workflow stages
- environment-specific failures are caught before user-facing release

## Risks

- false positives create friction

## Mitigation

- allow per-profile warning thresholds and overrides

---

# Phase 8: Workflow Presets, Lifecycle States, Run Registry, And Policy Engine

## Objective

Support repeatable workflows, durable artifact lifecycle states, explicit run registry management, and policy-driven recovery behavior.

## Outcome

Users can save and reuse successful workflow setups, manage artifact lifecycle states, and Aura can make deterministic decisions about retries, blocking, compaction, and escalation.

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

### Run Registry Expansion

Expand:

- `src/services/runs/registry.ts`
- `src/services/runs/status.ts`
- `src/services/runs/outputBuffer.ts`
- `src/services/runs/recovery.ts`

Statuses:

- pending
- running
- blocked
- review-ready
- completed
- failed
- cancelled
- superseded

### Policy Engine

Inspired by Claw Code's policy engine, add:

- `src/services/policy/types.ts`
- `src/services/policy/engine.ts`
- `src/services/policy/defaultRules.ts`

Example conditions:

- context exceeds budget
- validation profile blocked
- artifact stale
- dependency broken
- project rule violation
- retry count exceeded
- export unavailable

Example actions:

- compact context
- narrow scope
- retry once
- request clarification
- mark stale
- block publish
- downgrade to draft
- run doctor

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

### 8.4 Expand Run Registry

Track:

- active runs
- final run outputs
- retry chains
- blocked reason
- policy actions taken

### 8.5 Add Policy Evaluation To Workflow Lifecycle

Policy should run:

- before run execution
- after context assembly
- after validation
- on artifact staleness changes

## Validation

Tests:

- preset round-trip storage
- preset application to run request
- lifecycle state transitions
- run registry state transitions
- policy engine evaluation

Suggested tests:

- `src/test/presets.test.ts`
- `src/test/lifecycle-states.test.ts`
- `src/test/run-registry.test.ts`
- `src/test/policy-engine.test.ts`

## Acceptance Criteria

- workflows can be reused consistently
- artifact lifecycle state updates are visible and persistent
- runs are tracked as registry entries, not just ephemeral messages
- retry/block/escalation behavior is policy-driven

## Risks

- too many configuration surfaces

## Mitigation

- start with a few high-value presets and simple lifecycle transitions

---

# Phase 9: Spreadsheet Workflow Deepening

## Objective

Bring spreadsheets up to the same orchestration quality level as documents and presentations.

## Outcome

Spreadsheet workflows become planful, scoped, validated, augmentation-aware, and registry/policy-compatible.

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

Aura's internal runtime can be safely exposed externally because workflow contracts are explicit, structured, and reusable.

## Workstreams

### 10.1 Align RunRequest And RunResult With API/MCP Contract

Ensure `RunRequest` and `RunResult` can map directly to:

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

- what would be included
- what would change
- what validation profile would run

### 10.4 Make Structured Output Mandatory

By this phase, all major workflows should expose stable machine-readable contracts, not ad hoc text interpretation.

## Validation

- run contract serializes cleanly
- API/MCP roadmap docs can map directly to current internal abstractions
- dry-run/explain output is deterministic

## Acceptance Criteria

- no major internal refactor should be needed later to expose workflows through API or MCP
- structured outputs are a compatibility contract, not an implementation detail

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

### Track D: Project Intelligence

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
- diagnostics

## Team 2: Artifact Editing

Own:

- targeted editing framework
- document/presentation/spreadsheet scoped edits

## Team 3: Artifact Bootstrapping

Own:

- template registries
- starter kits
- presets
- init flow

## Team 4: Project Intelligence

Own:

- dependency graph
- augmentation workflows
- memory/context evolution
- event taxonomy

## Team 5: Validation And Publish

Own:

- validation profiles
- publish readiness
- export gating
- clean-environment verification

## Team 6: Workflow Reliability

Own:

- parity harness
- run registry
- policy engine
- structured contract testing

---

# Detailed First 3 Sprints

## Sprint 1

Goal: establish explicit workflow contracts

Tasks:

1. add `ResolvedIntent`
2. add `ContextBundle`
3. add `RunRequest`
4. add `RunResult`
5. implement `resolveIntent()`
6. implement `buildRunRequest()`
7. refactor `ChatBar.tsx` to call service boundary
8. create scenario harness skeleton
9. create run registry skeleton

Definition of done:

- current features still work
- tests cover routing and run request/result creation

## Sprint 2

Goal: add runtime project rules, config validation, and doctor

Tasks:

1. extend `ProjectData`
2. add project rules services
3. add config validation
4. inject rules into all workflows
5. add basic UI for rules editing
6. add doctor checks and panel

Definition of done:

- project-level rules persist
- prompts reflect rule changes
- invalid config produces clear diagnostics
- doctor reports meaningful health state

## Sprint 3

Goal: targeted editing and explicit context control foundation

Tasks:

1. generalize patch utils
2. document target resolver
3. spreadsheet target resolver
4. add pin/exclude context controls
5. add context compaction primitives
6. record edit strategy in run metadata

Definition of done:

- bounded edits work for at least one document flow and one spreadsheet flow in addition to presentations
- context sources are inspectable

---

# Validation Strategy For The Whole Program

## 1. Contract Tests

Every phase should preserve and validate:

- intent contracts
- context bundle contracts
- run request contracts
- run result contracts
- validation result contracts

## 2. Golden Flow Tests

Maintain end-to-end tests for:

- create presentation from prompt
- create document from prompt
- create spreadsheet from prompt
- refine current artifact
- project-wide augmentation
- export after validation
- doctor on broken setup

## 3. Workflow Parity Scenarios

Maintain deterministic scenario-based tests using:

- mock providers
- seeded project fixtures
- scenario manifest
- run assertions

## 4. Snapshot Tests

Useful for:

- context bundle summaries
- resolved rules
- validation outputs
- doctor outputs

## 5. Performance Budgets

Track:

- prompt/token growth
- memory retrieval latency
- run-request build latency
- validation latency
- compaction effectiveness

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
- compaction subsystem

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

## Risk 5: Drift Between Docs, Tests, And Runtime

As the workflow system grows, the planning docs can drift from the actual runtime.

### Mitigation

- keep canonical workflow-contract docs
- keep scenario manifest aligned with actual supported flows
- treat structured contracts as the source of truth

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

The most important change is to make Aura's workflow system explicit, inspectable, diagnosable, and automatable:

- explicit intent
- explicit scope
- explicit context
- explicit rules
- explicit targets
- explicit validation
- explicit run metadata
- explicit diagnostics
- explicit structured outputs
- explicit recovery behavior

Once that foundation is in place, all the higher-level features the project wants, including context control, targeted edits, full project augmentation, iterative editing, template-first bootstrapping, and external automation, become much easier to build reliably.
