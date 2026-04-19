# API Platform & Visual Automation — Implementation Plan

> Status: planning (no implementation in this document)  
> Scope: internal API surface and in-app automation builder for Aura capabilities

## 1) Goals

- Expose Aura capabilities through a stable API surface.
- Let users build automations visually (not code-first) with prompt customization.
- Make workflows reusable across projects and organizations.

## 2) Current-State Findings (repo investigation)

- Core workflows are service-oriented and already modular (`src/services/ai/workflow/*`).
- Project/document model is suitable as API resource boundaries.
- No external API gateway or auth token model exists yet.

## 3) API Product Boundaries

Initial resource families:
- projects
- documents/presentations/spreadsheets
- memories
- workflows/runs
- tools/skills (future marketplace-compatible)

Operational requirements:
- idempotency keys for generation endpoints
- async job model for long-running workflows
- usage accounting and quota enforcement

## 4) Visual Automation Builder

Builder primitives:
- trigger (manual/schedule/event/webhook)
- context selection (project/scope/memory)
- action blocks (generate/update/export/sync)
- guardrails (token budget, safety policies)
- output routing (new doc, update doc, publish, notify)

## 5) Prompt Customization Framework

- Prompt templates with safe variable injection.
- Versioned prompt recipes per automation.
- Diffable prompt revisions with rollback.

## 6) Milestones

### M1 — API Contract + Auth Integration
- OpenAPI spec draft
- service boundary mapping from existing workflows
- authenticated API gateway baseline

### M2 — Workflow Execution APIs
- async run lifecycle (`queued/running/succeeded/failed`)
- run logs and result artifacts
- retry/cancel semantics

### M3 — Visual Builder UX
- flow editor with reusable blocks
- prompt template editor
- publish/share automation templates

## 7) Validation Requirements

- Contract tests for all API resources.
- Load tests for generation queues.
- Security tests for authz and project isolation.
- UX tests for no-code builder clarity.

## 8) Risks & Mitigations

- **API surface sprawl** → strict versioning and bounded initial endpoints.
- **unsafe automation loops** → execution limits and safety stop controls.
- **prompt misconfiguration** → template linting and dry-run mode.
