# Memory Markdown — Implementation Plan

> Status: planning (no implementation in this document)  
> Scope: semantic file-based memory system for user/project intelligence with privacy boundaries

## 1) Goals

- Introduce Aura-native memory files in markdown for durable, inspectable intelligence.
- Support multi-level memory granularity: brief summary, expanded notes, full-source links.
- Allow cross-project user memory while keeping per-user private memory encrypted.
- Keep structure hierarchical and Aura-compatible for future cloud sync/collaboration.

## 2) Product Principles

- Memory is for **agent performance and continuity**, not generic docs browsing.
- Memory should scale over time via layered summaries, not one giant context file.
- Files remain portable and human-readable where possible.
- Personal memory must be private by default and decryptable only on authorized devices.

## 3) Current-State Findings (repo investigation)

- `.aura` packaging and project metadata are already established (`projectFormat.ts`).
- Chat/document history already exists and can seed memory extraction pipelines.
- No dedicated memory file model, memory index, or encryption keychain layer yet.

## 4) Proposed Aura Memory Format (AMF)

Folder model inside project or global aura workspace:

- `memory/identity/` — stable user profile, preferences, communication style
- `memory/skills/` — learned workflows, tool patterns, reusable tactics
- `memory/projects/<project-id>/` — project-specific memory graph
- `memory/research/` — extracted findings from docs/sessions
- `memory/snapshots/` — periodic rolled-up state summaries

File format:

- Markdown with YAML frontmatter:
  - `memoryId`, `ownerId`, `scope`, `sensitivity`, `sourceRefs`, `updatedAt`, `version`
- Body sections:
  - `Summary`
  - `Details`
  - `Evidence`
  - `Actionable Use`

## 5) Privacy, Roles, and Encryption

- Separate memory namespaces per user in shared aura folders.
- Encrypt personal memories at rest (device-bound key material; future cloud key wrapping).
- Role model for shared memories:
  - owner
  - collaborator-read
  - collaborator-write
  - tool-agent-read (scoped)

## 6) Retrieval & Semantic Layer

- Build file-level semantic index over memory markdown chunks.
- Retrieval pipeline:
  1. scope filter (project/user/team)
  2. permission filter
  3. semantic rank
  4. budget-aware context assembly
- Keep explicit provenance links to originating files/sessions.

## 7) Milestones

### M1 — Memory File Standard
- Define schema, frontmatter rules, and folder hierarchy.
- Define memory write/update policies and conflict behavior.

### M2 — Capture + Retrieval
- Add memory extraction from chat/doc outcomes.
- Add semantic index and scoped retrieval for prompts.

### M3 — Privacy + Multi-User Collaboration
- Add per-user encryption and role-aware shared memory.
- Add sync-ready metadata for cloud replication.

## 8) Validation Requirements

- Unit tests: parser/validator, permission checks, scope resolution.
- Security tests: unauthorized memory access denial, encryption/decryption failure handling.
- Manual checks: memory quality review, retrieval relevance, multi-user separation behavior.

## 9) Risks & Mitigations

- **Memory bloat** → snapshot compaction + retention policies.
- **Privacy leakage** → strict namespace isolation + encryption defaults.
- **Low retrieval quality** → explicit evidence fields + ranking feedback loop.

## 10) External References to Evaluate

- OpenViking memory patterns (adapt concepts, keep Aura format opinionated).
- Obsidian-style markdown graph ideas (for structure, not UI parity).
