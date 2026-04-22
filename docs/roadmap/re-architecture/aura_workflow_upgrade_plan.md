# Aura Workflow Upgrade Plan

## Goal

Upgrade `CraserF/aura_web` from a strong artifact-generation prototype into a more complete "AI artifact builder" with first-class workflows for:

- template-first bootstrapping
- iterative editing
- context control
- targeted edits
- full project augmentation
- durable project rules
- artifact-aware validation and publishing

This plan compares Aura's current architecture against the stronger workflow patterns visible in Dyad and translates those ideas into Aura-native implementation steps.

## Executive Summary

Aura already has several important foundations:

- multi-artifact project model (`document`, `presentation`, `spreadsheet`)
- artifact-specific workflows in `src/services/ai/workflow/*`
- templates and prompt composers
- version history
- memory retrieval
- chart/data/export infrastructure

The main gap is not "missing AI." The main gap is that Aura's workflow model is still too implicit and too heuristic at the product boundary.

Today, a lot of the important behavior is spread across:

- chat routing heuristics
- per-artifact handlers
- prompt composition
- document/project stores
- roadmap docs that are ahead of the current product

To get Dyad-like workflow strength, Aura needs to become more explicit about:

1. project setup and bootstrap contracts
2. context selection contracts
3. edit intent and edit scope
4. artifact-scoped vs project-scoped augmentation
5. workflow observability and review loops
6. user-editable rules and reusable templates

## Current-State Comparison

### Where Aura is already strong

- **Artifact-native model**: Aura already supports documents, presentations, and spreadsheets in the same project model. This is ahead of Dyad's currently app-centric public product framing.
- **Workflow engine exists**: `src/services/ai/workflow/engine.ts` and the artifact workflows already give Aura a strong orchestration core.
- **Targeted-edit groundwork exists**: presentations already support patch-style search/replace via `src/services/ai/workflow/patchUtils.ts` and edit prompts in `src/services/ai/prompts/composer.ts`.
- **Memory groundwork exists**: project memory retrieval and storage patterns are already present under `src/services/memory/*`.
- **Project/version model exists**: `src/types/project.ts`, `src/services/storage/versionHistory.ts`, and autosave give Aura a durable artifact container.
- **Template system exists**: presentations already have a non-trivial template registry and blueprint system.

### Where Aura is weaker than the Dyad-style workflow model

- **No explicit project rules file equivalent**: Aura has contributor docs (`CLAUDE.md`, `docs/coding-patterns.md`) but not a project-level, user-editable runtime rules system like Dyad's `AI_RULES.md`.
- **Workflow selection is still heuristic at the chat boundary**: `src/lib/workflowType.ts` uses keywords as a fallback, which is fragile for a serious artifact suite.
- **Context control is mostly internal**: memory retrieval exists, but users do not appear to have strong, explicit control over what context is in-scope for a given run.
- **Targeted edits are mostly presentation-only**: document and spreadsheet edits are not yet governed by a unified scope model.
- **Template-first bootstrapping is uneven**: presentations are template-rich; documents and spreadsheets are less formalized.
- **Full project augmentation is limited**: Aura can generate artifacts, but it does not yet have a strong "augment the whole project" layer for links, shared references, summaries, consistency, dependency refresh, and batch improvements.
- **Publishing/export workflows are fragmented**: exports exist, but the product loop is not yet organized around "build, review, export, publish, sync" as a first-class workflow family.

## Root Problems To Solve

### 1. The workflow contract is implicit

Aura's workflow logic exists, but the user-facing system contract is not explicit enough. The app often has to infer:

- what artifact type the user wants
- whether the request is create vs modify vs refine vs augment
- whether the request is local or project-wide
- what context should be visible
- what parts are allowed to change

This makes the system flexible, but less reliable.

### 2. The project model is ahead of the UX contract

The data model already supports multi-document projects and memory, but the interaction model still behaves a lot like a single-chat generative tool with artifact routing.

### 3. The editing model is not unified

Presentations have the beginnings of targeted patch workflows. Documents and spreadsheets are still closer to full-regeneration or handler-specific logic.

### 4. Reusability is uneven

Presentation prompts and templates are mature. Document and spreadsheet bootstrapping, style contracts, and reusable edit primitives need the same depth.

## Target Product Model

Aura should evolve into an **artifact operating system** with these first-class workflow layers:

1. **Bootstrap**
   Create a project from a chosen artifact template family and project rules.

2. **Scope**
   Explicitly choose whether a request applies to:
   - current artifact
   - selected artifacts
   - whole project
   - project memory only
   - data layer only

3. **Context**
   Explicitly control which memories, documents, data tables, attachments, and prior runs are provided.

4. **Edit**
   Make surgical edits to a bounded target:
   - section
   - slide
   - page block
   - chart
   - linked table
   - spreadsheet range
   - style/theme layer

5. **Augment**
   Run project-wide improvement workflows:
   - link references
   - align tone/theme
   - generate summaries
   - refresh linked charts/tables
   - fix consistency issues
   - generate exports

6. **Review**
   Validate output with artifact-aware QA, quality review, and publish readiness checks.

7. **Publish / Export**
   Export and sync outputs in a repeatable, inspectable workflow.

## Architecture Changes

## A. Introduce Runtime Project Rules

### Why

Dyad's `AI_RULES.md` model is one of its strongest workflow ideas. Aura needs its own runtime equivalent.

### Proposal

Add a project-level rules system:

- `/.aura/project-rules.md`
- `/.aura/context-policy.json`
- `/.aura/workflow-presets.json`

### Responsibilities

`project-rules.md`
- artifact design rules
- allowed libraries/components/patterns
- brand/tone/style instructions
- output constraints
- export and linking rules
- spreadsheet conventions

`context-policy.json`
- which memory scopes are allowed by default
- token budgets by workflow
- auto-include files/artifacts
- excluded artifacts/data sources

`workflow-presets.json`
- default workflow per artifact type
- default template family
- validation profile
- export profile

### Code changes

Add:

- `src/services/projectRules/types.ts`
- `src/services/projectRules/load.ts`
- `src/services/projectRules/merge.ts`
- `src/services/projectRules/defaults.ts`
- `src/services/projectRules/promptContext.ts`

Integrate into:

- `src/components/ChatBar.tsx`
- `src/components/chat/handlers/*`
- `src/services/ai/workflow/*`
- `src/services/ai/prompts/*`

### Acceptance criteria

- every workflow run receives a resolved project rule set
- users can inspect and edit rules
- document, presentation, and spreadsheet workflows all consume the same rule layer

## B. Replace Heuristic Routing With Explicit Intent Resolution

### Why

`src/lib/workflowType.ts` is too brittle as a system boundary.

### Proposal

Replace "keyword-based workflow type detection" with a formal intent resolver that produces:

- artifact target
- operation kind
- scope
- edit mode
- confidence
- clarification request if needed

### New type

`ResolvedIntent`

- `artifactType`: `document | presentation | spreadsheet | project`
- `operation`: `create | modify | refine_style | add | augment | review | export | publish | analyze`
- `scope`: `artifact | selected-artifacts | project | memory | data`
- `targetSelectors`: IDs, sections, ranges, chart IDs, etc.
- `confidence`
- `needsClarification`

### Code changes

Add:

- `src/services/ai/intent/resolveIntent.ts`
- `src/services/ai/intent/types.ts`
- `src/services/ai/intent/clarify.ts`

Deprecate:

- direct reliance on `src/lib/workflowType.ts`

Integrate into:

- `src/components/ChatBar.tsx`
- `src/components/chat/handlers/*`

### Acceptance criteria

- all workflows start from a `ResolvedIntent`
- fallback keyword routing is removed from the main happy path
- ambiguity prompts are artifact-agnostic, not presentation-only

## C. Introduce Explicit Context Control

### Why

Aura has internal memory retrieval, but not enough explicit user-level context engineering.

### Proposal

Add a `Context Assembly` layer between chat submission and workflow execution.

It should decide:

- which chat messages are included
- which artifact(s) are included
- which memory nodes are included
- which linked tables/charts are included
- which attachments are included
- whether summaries or full content are included

### New model

`ContextBundle`

- `conversationContext`
- `artifactContext`
- `memoryContext`
- `dataContext`
- `attachmentContext`
- `policy`
- `tokenEstimate`

### UX features

- "Current artifact"
- "Whole project"
- "Selected docs"
- "Selected data"
- "Memory only"
- "All chat" vs "Scoped chat"
- explicit auto-include pins

### Code changes

Add:

- `src/services/context/types.ts`
- `src/services/context/assemble.ts`
- `src/services/context/budgets.ts`
- `src/services/context/selectors.ts`
- `src/services/context/summarize.ts`

Refactor:

- `src/components/ChatBar.tsx`
- `src/services/memory/retrieval.ts`
- workflow inputs in `src/services/ai/workflow/types.ts`

### Acceptance criteria

- each run stores the exact context bundle used
- user can inspect why a memory or artifact was included
- long-context behavior is deterministic, not accidental

## D. Create A Unified Targeted Edit Model

### Why

Targeted edits should exist for all artifact types, not just presentation patching.

### Proposal

Add a shared edit-target system:

- `ArtifactTarget`
  - presentation slide
  - presentation element
  - document section
  - document block
  - chart
  - linked table
  - spreadsheet sheet
  - spreadsheet range
  - spreadsheet column
  - theme/style layer

### Edit strategies

- `search_replace_patch`
- `ast_like_block_replace`
- `markdown_block_patch`
- `sheet_action`
- `style_token_update`
- `link_refresh`

### Code changes

Add:

- `src/services/editing/types.ts`
- `src/services/editing/resolveTargets.ts`
- `src/services/editing/patchDocument.ts`
- `src/services/editing/patchPresentation.ts`
- `src/services/editing/patchSpreadsheet.ts`
- `src/services/editing/styleTokens.ts`

Refactor:

- `src/services/ai/workflow/patchUtils.ts` into a shared edit package
- `src/services/ai/workflow/agents/designer.ts`
- `src/services/ai/workflow/document.ts`
- `src/services/ai/workflow/spreadsheet.ts`

### Acceptance criteria

- every modify/refine request must resolve to either:
  - bounded target edit, or
  - explicit full regeneration
- workflows must record which strategy they used

## E. Build Template-First Bootstrapping For All Artifact Types

### Why

Presentation templates are mature. Documents and spreadsheets need the same explicit bootstrapping depth.

### Proposal

Standardize template families for:

- presentations
- documents
- spreadsheets
- cross-artifact project starter kits

### Template layers

1. `artifact template`
2. `theme token set`
3. `prompt blueprint`
4. `starter content outline`
5. `validation profile`

### Example starter kits

- Investor Pitch Project
  - pitch deck
  - executive summary
  - financial workbook

- Research Project
  - findings deck
  - report
  - evidence table workbook

- Product Launch Project
  - keynote deck
  - launch brief
  - KPI tracker

### Code changes

Add:

- `src/services/bootstrap/types.ts`
- `src/services/bootstrap/projectStarter.ts`
- `src/services/bootstrap/starterKits.ts`
- `src/services/ai/templates/document/registry.ts`
- `src/services/ai/templates/spreadsheet/registry.ts`
- `src/services/ai/templates/project-kits/registry.ts`

Refactor:

- current presentation template registry into a broader artifact-template architecture

### Acceptance criteria

- new projects can start from a starter kit, not just a blank artifact
- bootstrap creates the initial artifacts, rules, memory seed, and validation defaults

## F. Add Full Project Augmentation Workflows

### Why

This is one of the biggest missing pieces. Aura can create artifacts, but it is weaker at improving the whole project coherently.

### Proposal

Introduce a project-level augmentation engine.

### Augmentation workflow examples

- "make this whole project feel more consistent"
- "link the report to the financial workbook"
- "turn key metrics from the spreadsheet into charts in the deck"
- "create an executive summary from these three docs"
- "review all artifacts for tone, naming, and duplicated content"

### Workflow categories

- `consistency_augmentation`
- `cross_link_augmentation`
- `summary_augmentation`
- `data_to_chart_augmentation`
- `publish_readiness_augmentation`
- `portfolio_packaging_augmentation`

### Code changes

Add:

- `src/services/ai/workflow/project.ts`
- `src/services/ai/workflow/agents/project-planner.ts`
- `src/services/ai/workflow/agents/project-reviewer.ts`
- `src/services/ai/workflow/agents/crosslinker.ts`
- `src/services/ai/workflow/agents/consistency-auditor.ts`
- `src/services/augmentation/graph.ts`
- `src/services/augmentation/dependencies.ts`

### Acceptance criteria

- project-wide commands are first-class
- augmentation can update multiple artifacts in one run
- linked content refreshes are traceable and reversible

## G. Create Artifact Dependency Graphs

### Why

Project augmentation requires a graph, not just flat documents.

### Proposal

Add a dependency graph that tracks:

- document references
- presentation references
- spreadsheet-linked tables
- chart dependencies
- summary-from-source relationships
- export artifacts

### Data model additions

Extend `ProjectDocument` and project metadata with:

- `dependsOn`
- `feedsInto`
- `derivedFrom`
- `publishTargets`
- `contextTags`

### Code changes

Add:

- `src/services/projectGraph/types.ts`
- `src/services/projectGraph/build.ts`
- `src/services/projectGraph/refresh.ts`
- `src/services/projectGraph/validate.ts`

Update:

- `src/types/project.ts`
- `src/services/storage/projectFormat.ts`
- `src/services/storage/projectAutosave.ts`

### Acceptance criteria

- linked tables/charts can be refreshed through dependency traversal
- project review can traverse upstream and downstream artifact relationships

## H. Expand Review And Validation Into Artifact-Aware Profiles

### Why

Aura already has QA/review pieces, but they need to become consistent across artifact types and project-level publish flows.

### Proposal

Introduce validation profiles:

- `presentation-standard`
- `document-standard`
- `spreadsheet-standard`
- `executive-pack`
- `research-pack`
- `publish-ready`

### Validation types

Presentations
- structure
- design consistency
- chart integrity
- stage layout fit
- export safety

Documents
- heading hierarchy
- print/PDF readiness
- link validity
- citation/reference consistency
- chart/table hydration validity

Spreadsheets
- schema validity
- formula validity
- sort/filter integrity
- linked table freshness
- chart data-source validity

Project-level
- cross-artifact consistency
- duplicate claims
- broken dependencies
- naming mismatches
- stale summaries

### Code changes

Add:

- `src/services/validation/profiles.ts`
- `src/services/validation/projectValidation.ts`
- `src/services/validation/documentValidation.ts`
- `src/services/validation/spreadsheetValidation.ts`

Refactor:

- `src/services/ai/workflow/agents/document-qa.ts`
- `src/services/ai/workflow/agents/qa-validator.ts`
- `src/services/ai/workflow/agents/reviewer.ts`

### Acceptance criteria

- every workflow can declare a validation profile
- export and publish actions must optionally require a passing profile

## I. Formalize Iterative Editing Loops

### Why

Aura supports follow-up prompts, but the system does not yet strongly distinguish:

- draft
- revise
- review
- approve
- publish

### Proposal

Introduce explicit artifact lifecycle states:

- `draft`
- `reviewing`
- `approved`
- `published`
- `stale`

### Additional concepts

- follow-up edits should be able to target the last run
- users should be able to retry with:
  - same context
  - reduced context
  - narrower scope
  - stronger rules
  - different template family

### Code changes

Update:

- `src/types/project.ts`
- `src/stores/projectStore.ts`
- `src/stores/chatStore.ts`

Add:

- `src/services/runs/types.ts`
- `src/services/runs/store.ts`
- `src/services/runs/retry.ts`

### Acceptance criteria

- every generation stores a run record
- follow-up edits can reference the prior run config and context bundle

## J. Build A Reusable Workflow Preset System

### Why

Aura should let users reuse successful workflows, not just successful outputs.

### Proposal

Add reusable presets:

- artifact presets
- export presets
- validation presets
- context presets
- automation presets

### Examples

- "Board deck generation preset"
- "Research report update preset"
- "Monthly KPI refresh preset"

### Code changes

Add:

- `src/services/presets/types.ts`
- `src/services/presets/storage.ts`
- `src/services/presets/defaults.ts`
- `src/services/presets/apply.ts`

### Acceptance criteria

- users can save a workflow setup and reuse it on another artifact or project

## K. Strengthen Spreadsheet Workflows Beyond Intent Parsing

### Why

Spreadsheet support exists, but it is still lighter than document/presentation orchestration.

### Proposal

Move spreadsheets from "action detection + starter planner" to a fuller artifact workflow with:

- planning
- context extraction
- transform proposal
- validation
- preview/apply

### New spreadsheet operations

- prompt-to-formula
- prompt-to-query
- prompt-to-cleaning-plan
- prompt-to-linked-table
- prompt-to-chart-pack
- project-level data augmentation

### Code changes

Refactor:

- `src/services/ai/workflow/spreadsheet.ts`
- `src/services/spreadsheet/actions.ts`
- `src/services/spreadsheet/starter.ts`

Add:

- `src/services/ai/workflow/agents/spreadsheet-planner.ts`
- `src/services/ai/workflow/agents/spreadsheet-validator.ts`
- `src/services/ai/workflow/agents/spreadsheet-augmenter.ts`

### Acceptance criteria

- spreadsheet generation and editing use the same intent/context/validation framework as other artifacts

## L. Make Prompt Composition Artifact-System Based, Not Artifact-Specific Islands

### Why

Aura has mature prompt composition for presentations, but the architecture is still uneven across artifact types.

### Proposal

Split prompts into shared and artifact-specific layers:

Shared layers
- identity
- project rules
- context policy
- target scope
- edit constraints
- output contract
- validation goals

Artifact layers
- presentation design
- document design
- spreadsheet transformation

### Code changes

Add:

- `src/services/ai/prompts/shared/base.ts`
- `src/services/ai/prompts/shared/rules.ts`
- `src/services/ai/prompts/shared/context.ts`
- `src/services/ai/prompts/shared/editConstraints.ts`
- `src/services/ai/prompts/shared/outputContracts.ts`

Refactor:

- `src/services/ai/prompts/composer.ts`
- `src/services/ai/workflow/document.ts`
- document prompt building into a proper composer

### Acceptance criteria

- all artifact workflows use the same shared prompt contract sections
- prompt tokens can be measured by section

## M. Add Workflow Observability

### Why

Once the workflow system becomes more explicit, debugging and tuning need run-level observability.

### Proposal

Record per-run data:

- resolved intent
- context bundle summary
- token estimate
- template/preset used
- edit strategy used
- validation profile
- step durations
- retries
- final changed targets

### Code changes

Add:

- `src/services/observability/types.ts`
- `src/services/observability/runLog.ts`
- `src/services/observability/metrics.ts`

### Acceptance criteria

- developers can compare runs and spot context bloat, edit overreach, and validation regressions

## Recommended Code Pattern Changes

## 1. Stop letting `ChatBar.tsx` act as the system boundary

### Problem

`src/components/ChatBar.tsx` still owns too much orchestration:

- message creation
- attachment handling
- scope rules
- workflow routing
- context gathering
- memory assembly
- generation triggering

### Change

Move orchestration into a dedicated application service:

- `src/services/chat/submitPrompt.ts`
- `src/services/chat/buildRunRequest.ts`

`ChatBar.tsx` should become a UI component that emits a typed user action.

## 2. Introduce a typed `RunRequest`

### Problem

Handlers accept many loosely coupled parameters and derive too much at runtime.

### Change

Create a shared `RunRequest`:

- `intent`
- `contextBundle`
- `rules`
- `artifactTargets`
- `workflowPreset`
- `providerConfig`
- `runMetadata`

Every handler should accept a single typed object derived before workflow execution.

## 3. Split "artifact services" from "workflow services"

### Problem

Some modules mix artifact rendering behavior and workflow policy behavior.

### Change

Adopt this split:

- `services/artifacts/*`
  - document rendering
  - presentation rendering
  - spreadsheet mutations

- `services/workflows/*`
  - intent
  - context
  - run orchestration
  - validation
  - review

## 4. Make document prompts as modular as presentation prompts

### Problem

Presentation prompting is much more composable than document prompting.

### Change

Give documents:

- a document prompt composer
- reusable document template blueprints
- surgical edit prompts
- shared output contracts

## 5. Move from "artifact type" to "artifact capability"

### Problem

Many behaviors should be driven by capabilities, not type checks.

### Change

Examples:

- `supportsThemeTokens`
- `supportsLinkedTables`
- `supportsChartHydration`
- `supportsPagedExport`
- `supportsTargetedBlockEdits`

This reduces branching and helps future artifact types.

## Implementation Phases

## Phase 0: Stabilize The Boundary

Duration: 1-2 weeks

- add `ResolvedIntent`
- add `RunRequest`
- add `ContextBundle`
- move orchestration out of `ChatBar.tsx`
- preserve current behavior

Primary files:

- `src/components/ChatBar.tsx`
- `src/components/chat/handlers/*`
- new `src/services/chat/*`
- new `src/services/context/*`
- new `src/services/ai/intent/*`

## Phase 1: Runtime Rules + Explicit Context Control

Duration: 2 weeks

- add `project-rules.md`
- add context policies
- wire rules/context into all workflows
- expose context inspection in UI

Primary files:

- new `src/services/projectRules/*`
- `src/services/memory/*`
- `src/services/ai/workflow/*`

## Phase 2: Unified Targeted Edits

Duration: 2-3 weeks

- generalize patch utilities
- add document block edits
- add spreadsheet scoped edits
- record edit strategy in run metadata

Primary files:

- `src/services/ai/workflow/patchUtils.ts`
- new `src/services/editing/*`
- document/presentation/spreadsheet workflows

## Phase 3: Template-First Bootstrapping

Duration: 2 weeks

- add document/spreadsheet template registries
- add project starter kits
- add preset bootstrapping flow

Primary files:

- `src/services/ai/templates/*`
- new `src/services/bootstrap/*`
- project creation UI/store flow

## Phase 4: Project Augmentation Engine

Duration: 3 weeks

- add project workflow
- add dependency graph
- add cross-artifact augmentation flows

Primary files:

- new `src/services/ai/workflow/project.ts`
- new `src/services/projectGraph/*`
- linking/refresh services

## Phase 5: Validation Profiles + Publish Workflows

Duration: 2 weeks

- unify review/QA
- add export/publish profiles
- enforce publish readiness

Primary files:

- new `src/services/validation/*`
- export services
- run/publish UI

## Phase 6: Presets, Automation, MCP/API Alignment

Duration: 2-4 weeks

- add workflow presets
- align run contracts with API/MCP plans
- make current roadmap docs executable against the new workflow architecture

Primary files:

- new `src/services/presets/*`
- roadmap/API/MCP integration layers

## Testing Strategy

## Unit tests

- intent resolution
- context assembly
- rule merging
- targeted edit patching
- dependency graph building
- validation profiles

## Integration tests

- create project from starter kit
- edit current artifact with bounded scope
- augment whole project
- link spreadsheet data into document/presentation
- re-run with narrowed context
- export after validation

## Regression tests

- active artifact routing
- document-scoped vs project-scoped chat
- memory inclusion rules
- patch failure fallback
- stale dependency refresh

## Priority Order

If implementation capacity is limited, do this order:

1. explicit intent resolution
2. context assembly layer
3. runtime project rules
4. unified targeted edits
5. template-first bootstrapping
6. project augmentation engine
7. validation profiles
8. workflow presets

## Concrete First Sprint

If starting immediately, the best first sprint is:

1. Create `ResolvedIntent`, `RunRequest`, and `ContextBundle` types.
2. Move chat submission orchestration out of `ChatBar.tsx`.
3. Replace keyword workflow detection with a resolver service.
4. Add a basic runtime rules file and load/merge path.
5. Store run metadata for each generation.

That sprint will not deliver every workflow feature, but it will create the architecture that all the other improvements need.

## Bottom Line

Aura does not need to become Dyad. It already has a stronger artifact vision than Dyad in some areas.

What Aura needs is a clearer workflow contract.

The path forward is to make the system more explicit about:

- what the user is trying to do
- what can change
- what context is allowed
- what project rules apply
- what artifact relationships exist
- how review/export/publish happen

Once those contracts are formalized, Aura can support the full workflow set much more reliably across documents, presentations, and spreadsheets.
