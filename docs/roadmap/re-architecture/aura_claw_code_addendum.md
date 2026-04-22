# Aura Workflow Plan Addendum From Claw Code

## Purpose

This addendum captures the additional workflow and architecture lessons that should be folded into Aura's existing upgrade plan after reviewing `ultraworkers/claw-code`.

This is not a recommendation to copy Claw Code's product surface. The useful lessons are mostly about:

- operational workflow hardening
- machine-readable orchestration
- parity and regression control
- multi-lane execution primitives
- user/operator trust surfaces

---

## High-Value Lessons From Claw Code

## 1. Add A First-Class `doctor` / Preflight Workflow

### Why it matters

One of Claw Code's strongest practical patterns is that it treats environment validation as a first-class workflow, not a support doc.

Examples in the repo:

- `README.md` and `USAGE.md` repeatedly push `doctor` as the first health check
- `doctor --output-format json` exists for machine-readable use

### Why Aura should care

Aura's workflow plan currently emphasizes generation, context, augmentation, and validation of artifacts. It is still comparatively light on validating the runtime itself before work begins.

Aura needs a productized preflight that answers:

- is the provider configured correctly?
- are exports available?
- is the current project valid?
- are charts/data engines ready?
- is memory retrieval healthy?
- are linked artifact dependencies broken?
- is the workspace using unsupported/stale project metadata?

### Recommended addition

Add an Aura-wide preflight command and UI panel:

- `doctor`
- `status`
- `project-health`

### Implementation recommendation

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

### Phase impact

Fold into:

- Phase 2: Runtime Project Rules
- Phase 3: Explicit Context Control
- Phase 7: Validation Profiles And Publish Workflows

---

## 2. Treat Machine-Readable Output As A Product Contract

### Why it matters

Claw Code repeatedly exposes machine-readable JSON output for human commands:

- help
- version
- status
- sandbox
- inventory commands
- init
- doctor

It also uses machine-stable tags instead of brittle prose matching in `init`.

### Why Aura should care

Aura's long-term roadmap already includes API, MCP, automation, and collaboration. That means human-readable output is not enough. The workflow engine needs stable structured run output now, before externalization.

### Recommended addition

Every major Aura workflow should emit structured output objects with stable enums, not just chat strings.

Examples:

- run summary
- validation result
- export result
- bootstrap result
- augmentation result
- doctor result

### Implementation recommendation

Add shared result types:

- `src/services/contracts/runResult.ts`
- `src/services/contracts/bootstrapResult.ts`
- `src/services/contracts/diagnosticResult.ts`
- `src/services/contracts/exportResult.ts`

Update handlers so user-facing chat messages are derived from these structured results instead of being the primary record.

### Phase impact

Strengthen:

- Phase 1: Explicit Workflow Contracts
- Phase 5: Template-First Bootstrapping
- Phase 7: Validation Profiles And Publish Workflows
- Phase 10: API/MCP/Automation Alignment

---

## 3. Add A Deterministic Parity / Scenario Harness

### Why it matters

Claw Code's strongest engineering pattern is its deterministic parity harness:

- mock service
- scenario manifest
- clean-environment harness
- parity diff script
- explicit scenario list mapped to behavior checkpoints

This is much stronger than relying only on unit tests.

### Why Aura should care

Aura is a workflow product. The hardest regressions will not be pure function bugs. They will be:

- routing regressions
- context regressions
- prompt contract regressions
- export regressions
- multi-artifact update regressions
- provider behavior regressions

Aura needs scenario-based workflow parity tests.

### Recommended addition

Create a workflow parity harness with:

- mock model provider
- seeded project fixtures
- scenario manifest
- run diff tooling

### Example scenario families

- create presentation from starter kit
- create document with image context
- create spreadsheet from prompt
- refine one selected target only
- augment whole project
- link spreadsheet into document
- export after validation
- doctor on broken project
- retry with narrowed context
- run with pinned memory inputs

### Implementation recommendation

Add:

- `src/test/workflow-scenarios.json`
- `src/test/harness/mockProvider.ts`
- `src/test/harness/runWorkflowScenario.ts`
- `src/test/harness/assertScenario.ts`
- `src/test/workflow-parity.test.ts`

Potential future script:

- `scripts/run_workflow_parity.ts`

### Phase impact

This should be added as a cross-cutting requirement beginning in:

- Phase 1

and expanded in every later phase.

---

## 4. Introduce Lane / Run Event Taxonomy

### Why it matters

Claw Code defines an explicit lane event taxonomy in `lane_events.rs`:

- started
- blocked
- red
- green
- merge-ready
- finished
- failed
- reconciled

This is a strong pattern because it turns workflow progress into a machine-operable state model.

### Why Aura should care

Aura's workflows are becoming multi-step, multi-artifact, and eventually automation/API/MCP-driven. Free-form event strings are not enough.

Aura needs explicit event types for:

- runs
- artifact updates
- validation gates
- dependency refreshes
- project augmentation
- publish readiness

### Recommended addition

Create a workflow event taxonomy for Aura:

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

### Implementation recommendation

Add:

- `src/services/events/types.ts`
- `src/services/events/eventBus.ts`
- `src/services/events/fingerprint.ts`
- `src/services/events/provenance.ts`

### Phase impact

Strengthen:

- Phase 6: Full Project Augmentation
- Phase 7: Validation Profiles And Publish Workflows
- Phase 8: Workflow Presets And Lifecycle States
- Phase 10: API/MCP/Automation Alignment

---

## 5. Add Run Registry And Multi-Lane Work Tracking

### Why it matters

Claw Code uses a task registry and related runtime tracking concepts rather than treating each run as ephemeral chat.

### Why Aura should care

Aura's plan already introduces run metadata. Claw Code suggests this should go further:

- active run registry
- run statuses
- assigned artifact set
- output accumulation
- retry/recovery state

This becomes especially important once:

- project augmentation can touch multiple artifacts
- automation can queue runs
- cloud/API/MCP support arrives

### Recommended addition

Extend run management into a registry:

- pending
- running
- blocked
- review-ready
- completed
- failed
- cancelled
- superseded

### Implementation recommendation

Add:

- `src/services/runs/registry.ts`
- `src/services/runs/status.ts`
- `src/services/runs/outputBuffer.ts`
- `src/services/runs/recovery.ts`

### Phase impact

Expand:

- Phase 8: Workflow Presets And Lifecycle States

and pull some of it earlier into:

- Phase 1

for the basic run status model.

---

## 6. Add Context Compaction As A Runtime Primitive

### Why it matters

Claw Code has explicit summary compression and auto-compact scenario coverage. That is a stronger form of context hygiene than "we have memory retrieval."

### Why Aura should care

Aura will increasingly rely on:

- chat history
- project memory
- artifact summaries
- dependency graph context

Without explicit compaction, context quality will degrade as projects grow.

### Recommended addition

Add a compaction subsystem that can:

- compress old run history
- compact artifact summaries
- keep pinned context intact
- explain what got compacted

### Implementation recommendation

Add:

- `src/services/context/compact.ts`
- `src/services/context/compressionBudget.ts`
- `src/services/context/compactionPolicy.ts`

Update run metadata to store:

- original context estimate
- compacted context estimate
- compaction reason

### Phase impact

Strengthen:

- Phase 3: Explicit Context Control
- Phase 8: Workflow Presets And Lifecycle States

---

## 7. Add Policy Engine For Recovery And Automation

### Why it matters

Claw Code's `policy_engine.rs` is a useful pattern: policy is explicit, condition-based, and action-based.

### Why Aura should care

Aura's workflows will increasingly need deterministic responses to runtime conditions:

- validation failed
- dependency graph stale
- export blocked
- project health broken
- provider unavailable
- context too large

These should not remain scattered if-statements.

### Recommended addition

Create an Aura policy engine for workflow decisions.

### Example conditions

- context exceeds budget
- validation profile blocked
- artifact stale
- dependency broken
- project rule violation
- run retry count exceeded
- export engine unavailable

### Example actions

- compact context
- narrow scope
- retry once
- request clarification
- mark stale
- block publish
- downgrade to draft
- run doctor

### Implementation recommendation

Add:

- `src/services/policy/types.ts`
- `src/services/policy/engine.ts`
- `src/services/policy/defaultRules.ts`

### Phase impact

Add to:

- Phase 6: Full Project Augmentation
- Phase 7: Validation Profiles And Publish Workflows
- Phase 8: Workflow Presets And Lifecycle States

---

## 8. Add Idempotent `init` / Bootstrap Scaffolding

### Why it matters

Claw Code's `init` is strong because it is:

- idempotent
- structured
- machine-readable
- opinionated enough to scaffold missing guidance

### Why Aura should care

Aura's plan already includes bootstrap starter kits. Claw Code suggests adding a second bootstrap layer:

- initialize a repo/project for Aura workflows
- seed project rules
- seed context policies
- seed starter artifacts
- seed guidance docs

### Recommended addition

Add an Aura init/bootstrap report with stable tags:

- created
- updated
- skipped

### Implementation recommendation

Add:

- `src/services/bootstrap/initProject.ts`
- `src/services/bootstrap/initReport.ts`

### Phase impact

Strengthen:

- Phase 5: Template-First Bootstrapping

---

## 9. Add Config Validation With Helpful Diagnostics

### Why it matters

Claw Code validates config keys, types, and deprecated fields, including suggestions.

### Why Aura should care

Once Aura adds:

- project rules
- context policies
- workflow presets
- starter kits
- automation settings

it will need config validation or users will get confusing workflow failures.

### Recommended addition

Add validation for:

- project rules schema
- context policy schema
- workflow preset schema
- export/publish profiles

### Implementation recommendation

Add:

- `src/services/configValidate/types.ts`
- `src/services/configValidate/projectRules.ts`
- `src/services/configValidate/contextPolicy.ts`
- `src/services/configValidate/presets.ts`

### Phase impact

Strengthen:

- Phase 2
- Phase 5
- Phase 8

---

## 10. Add Canonical Source-Of-Truth And Documentation Routing

### Why it matters

Claw Code is unusually explicit about:

- which implementation is canonical
- which docs to read first
- where parity status lives
- how to avoid guessing from repo layout

### Why Aura should care

Aura is already growing many planning docs. It needs stronger source-of-truth discipline or the workflow architecture will drift between:

- roadmap docs
- code
- tests
- UI behavior

### Recommended addition

Document explicit canonical sources for:

- workflow contracts
- project rules schema
- template registries
- validation profiles
- parity scenario manifests

### Implementation recommendation

Create:

- `docs/workflow-contracts.md`
- `docs/context-contract.md`
- `docs/validation-profiles.md`
- `docs/bootstrap-contracts.md`

and clearly reference them from `README.md` / architecture docs.

### Phase impact

Cross-cutting for all phases.

---

## 11. Add Container-First / Clean-Environment Workflow Validation

### Why it matters

Claw Code's checked-in container workflow and sandbox detection are simple but useful. They make reproducibility part of the project surface.

### Why Aura should care

Aura is client-side today, but it still has:

- provider setup
- export engines
- data engines
- optional future server/API/MCP surfaces

Some regressions will only appear in clean environments.

### Recommended addition

Add:

- clean-environment CI smoke tests
- export/data smoke tests in isolated environments
- a reproducible dev container or containerized test command

### Phase impact

Best added gradually starting around:

- Phase 7
- Phase 10

---

## Plan Changes To Make Immediately

These are the highest-leverage changes to the existing Aura plan after reviewing Claw Code:

1. Add a `doctor` / diagnostics workstream as a first-class requirement.
2. Require machine-readable structured results for all major workflows.
3. Add a scenario-based workflow parity harness starting in Phase 1.
4. Add run/lane event taxonomy to the workflow architecture.
5. Expand run metadata into a proper run registry.
6. Add context compaction as an explicit subsystem.
7. Add a policy engine for retry/block/escalation behavior.
8. Make bootstrap/init idempotent and structured.
9. Add schema/config validation for rules, policies, and presets.

---

## Recommended Phase Adjustments

## Add to Phase 1

- machine-readable `RunResult` contracts
- workflow parity harness skeleton
- run registry skeleton

## Add to Phase 2

- config validation for project rules
- doctor checks for rule/config health

## Add to Phase 3

- context compaction subsystem
- compacted context reporting

## Add to Phase 5

- idempotent `init`/bootstrap report

## Add to Phase 6-8

- event taxonomy
- policy engine
- richer run registry and lifecycle state model

## Add to Phase 10

- structured outputs as mandatory compatibility contract

---

## Bottom Line

The most important extra lesson from Claw Code is this:

Aura should not only improve how it **generates artifacts**.
It should also improve how it **proves, reports, validates, diagnoses, and recovers** its workflows.

That means the existing Aura plan should now explicitly include:

- diagnostics
- structured contracts
- parity harnesses
- event taxonomies
- run registries
- compaction
- policy-driven recovery

Those improvements will make the rest of the workflow upgrades much more robust.
