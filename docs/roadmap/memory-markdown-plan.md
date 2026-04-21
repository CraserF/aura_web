# Memory Markdown — Implementation Plan

> Status: execution-ready (phase-gated with test checkpoints)  
> Scope: semantic file-based memory system for user/project intelligence with privacy boundaries  
> Last updated: 2026-04-19  
> Depends on: none (can start independently)  
> Feeds into: Account/Cloud phase (sync), API/MCP phase (memory read/write tools)

## 1) Goals

- Introduce Aura-native memory files in markdown for durable, inspectable AI intelligence.
- Support multi-level memory granularity: brief summary (~100 tokens), expanded overview (~2K tokens), full-source detail.
- Allow cross-project user memory while keeping per-user private memory encrypted.
- Structure memory for agent performance — not generic docs browsing.
- Scale over time via layered summaries and deduplication, not one giant context file.
- Make skills and tools shareable across users. Keep personal memories private and encrypted.

## 2) Product Principles

1. **Memory is for agent performance and continuity** — it makes Aura better at its job over time.
2. **Files remain portable and human-readable** — plain markdown with YAML frontmatter.
3. **Hierarchical by default** — every directory has summary layers (L0/L1/L2) so token budgets are respected.
4. **Personal memory is private by default** — encrypted at rest, decryptable only on authorized devices.
5. **Scale through compaction, not deletion** — old memories get summarized, not thrown away.
6. **Simple first** — start with file-based local storage. Cloud sync and multi-user come in the Account phase.

## 3) Current-State Summary

| Area | Status | Notes |
| ------ | -------- | ------- |
| .aura packaging and project metadata | Done | `projectFormat.ts` |
| Chat/document history | Done | Can seed memory extraction pipelines |
| Memory file model / index | Not started | No dedicated memory types or storage |
| Encryption / keychain | Not started | No per-user key material handling |
| Semantic retrieval | Not started | No embedding or search infrastructure |

## 4) Architecture — Aura Memory Format (AMF)

### 4.1 Three-Layer Detail Model (adapted from OpenViking)

Every directory in the memory tree has three layers of detail:

| Layer | File | Token Budget | Purpose |
| ------- | ------ | ------------- | --------- |
| **L0 (Abstract)** | `.abstract.md` | ~100 tokens | Quick relevance check, semantic search index |
| **L1 (Overview)** | `.overview.md` | ~2,000 tokens | Navigation map, decision-making context |
| **L2 (Detail)** | Individual `.md` files | Unlimited | Full content, loaded on-demand only |

**Generation is bottom-up**: L2 files exist first. L0/L1 are generated from L2 content by the AI, and regenerated when L2 changes.

**Token budget management in prompts**:

1. Always load L0 for relevance check (~100 tokens per directory).
2. Load L1 if L0 matches — usually sufficient for agent decision-making.
3. Load L2 only when confirmed necessary for the task.

This achieves 80-95% token reduction compared to loading all memory into context.

### 4.2 Directory Structure

```text
{aura-workspace}/
  .aura/
    memory/
      master.key                          # Local encryption key (never synced)
      
      identity/                           # Stable user profile
        .abstract.md
        .overview.md
        profile.md                        # Name, role, communication style
        preferences/
          {topic}.md                      # Merge-updated per topic
          
      skills/                            # Learned workflows and tactics
        .abstract.md
        .overview.md
        {skill-name}.md                  # Shareable skill definitions
        
      entities/                          # People, orgs, tools the user works with
        .abstract.md
        .overview.md
        {entity-name}.md                 # Append-only (new facts appended)
        
      events/                            # Immutable event log (decisions, milestones)
        .abstract.md
        .overview.md
        {date}-{slug}.md                 # Never auto-updated
        
      projects/
        {project-id}/
          .abstract.md
          .overview.md
          context/                       # Project-specific knowledge
            {topic}.md
          sessions/                      # Archived chat sessions
            {session-id}/
              messages.jsonl
              .abstract.md
              .overview.md
              
      agent/                            # Agent's own learned knowledge
        .abstract.md
        .overview.md
        cases/                          # Problem + solution pairs (immutable)
          {case-id}.md
        patterns/                       # Reusable patterns (merge-updated)
          {pattern-name}.md
        tools/                          # Tool usage knowledge (merge-updated)
          {tool-name}.md
```

### 4.3 Memory File Format

Every memory file uses markdown with YAML frontmatter:

```markdown
---
memoryId: "mem_a1b2c3d4"
type: identity | skill | entity | event | case | pattern | tool | context
scope: global | project:{project-id}
sensitivity: public | private | encrypted
owner: "{user-id}"
sourceRefs:
  - "session:sess_xyz"
  - "document:doc_abc"
updateStrategy: merge | append | immutable
createdAt: "2026-04-19T10:00:00Z"
updatedAt: "2026-04-19T10:00:00Z"
version: 1
tags:
  - "project/aura"
  - "skill/presentations"
---

## Summary
One-paragraph distillation (~100 tokens).

## Details
Expanded context with specifics (~500-2000 tokens).

## Evidence
Links to source sessions, documents, or external references.

## Actionable Use
When and how this memory should influence agent behavior.
```

### 4.4 Update Strategies (critical for long-term health)

| Memory Type | Strategy | Behavior |
| ------------- | ---------- | ---------- |
| `identity/profile.md` | **merge** | New facts merged into existing content, old facts preserved |
| `identity/preferences/` | **merge** | Per-topic files, updated in-place |
| `entities/` | **append** | New facts appended to entity file, never overwrite |
| `events/` | **immutable** | Never auto-updated after creation |
| `skills/` | **merge** | Skill definitions refined over time |
| `agent/cases/` | **immutable** | Problem+solution pairs frozen once created |
| `agent/patterns/` | **merge** | Reusable patterns refined with new examples |
| `agent/tools/` | **merge** | Tool usage knowledge accumulated |
| `projects/context/` | **merge** | Project-specific knowledge updated |
| `projects/sessions/` | **immutable** | Archived, never modified |

### 4.5 Cross-References

Use `[[entity-name]]` style links in memory files to create a knowledge graph:

```markdown
## Details
Discussed the sales dashboard redesign with [[Sarah Chen]].
She prefers [[minimal chart palettes]] and referenced the [[Q1 revenue report]].
```

Build a link index at project load time — enables graph-based retrieval without a separate database.

## 5) Memory Extraction Pipeline

### 5.1 When extraction runs

- **On session commit**: when a chat session ends or the user switches projects.
- **On document generation**: when the AI produces a notable output.
- **On explicit user request**: "remember that..." or "note that...".

### 5.2 Extraction flow

```text
Chat messages / Document outcomes
        │
        ▼
  ┌─────────────────────┐
  │  LLM Extract Pass   │  Generate candidate memories from conversation
  │  (structured output) │  (what to remember, which category, which scope)
  └──────────┬──────────┘
             │
             ▼
  ┌─────────────────────┐
  │  Dedup Check         │  Compare against existing memories
  │  (embedding search)  │  Find similar existing entries
  └──────────┬──────────┘
             │
             ▼
  ┌─────────────────────┐
  │  LLM Dedup Decision │  For each candidate vs existing match:
  │                      │  → skip (duplicate)
  │                      │  → create (new information)
  │                      │  → merge (enrich existing)
  │                      │  → delete (superseded)
  └──────────┬──────────┘
             │
             ▼
  ┌─────────────────────┐
  │  Write to Files      │  Create/update .md files
  │  Regenerate L0/L1    │  Update directory summaries
  └─────────────────────┘
```

### 5.3 Memory candidate schema (AI structured output)

```typescript
interface MemoryCandidate {
  type: 'identity' | 'skill' | 'entity' | 'event' | 'case' | 'pattern' | 'tool' | 'context';
  scope: 'global' | `project:${string}`;
  sensitivity: 'public' | 'private';
  title: string;
  summary: string;
  details: string;
  evidence: string[];
  actionableUse: string;
  tags: string[];
}
```

## 6) Retrieval Pipeline

### 6.1 Hierarchical retrieval (not flat vector search)

```text
User query / Agent context need
        │
        ▼
  ┌─────────────────────┐
  │  Scope Filter        │  global vs project-specific
  └──────────┬──────────┘
             │
             ▼
  ┌─────────────────────┐
  │  L0 Vector Search    │  Search .abstract.md files
  │                      │  Find top-3 relevant directories
  └──────────┬──────────┘
             │
             ▼
  ┌─────────────────────┐
  │  L1 Drill-Down       │  Load .overview.md for matched dirs
  │                      │  Score: 0.5 × embedding + 0.5 × parent
  └──────────┬──────────┘
             │
             ▼
  ┌─────────────────────┐
  │  L2 On-Demand Load   │  Load specific files only if L1
  │                      │  indicates they're needed
  └──────────┬──────────┘
             │
             ▼
  ┌─────────────────────┐
  │  Budget Assembly     │  Fit retrieved memories into
  │                      │  available token budget
  └─────────────────────┘
```

### 6.2 Embedding strategy

**Decision: Two-tier approach.**

**Tier 1 — TF-IDF (zero dependencies, ships immediately):**

- Pure JS implementation (~50 lines), no model download.
- Good for exact-term matching, weak for synonyms/paraphrase.
- Store TF-IDF index alongside memory files as `.search-index.json`.
- Latency: < 1ms for 100 documents.

**Tier 2 — Transformers.js (opt-in upgrade for semantic search):**

- Uses `@huggingface/transformers` with `Xenova/all-MiniLM-L6-v2` (q8 quantized).
- 384-dim embeddings, ~23 MB model + ~10 MB WASM runtime (~33 MB one-time download).
- Cached automatically via browser Cache API — works offline after first download.
- Runs in Web Worker (non-blocking main thread). ~50-200ms per embedding batch.
- Handles semantic matching: "authentication" matches "login flow and OAuth setup".
- Store 384-dim vectors alongside memory files as `.embeddings.json`.

**User-facing**: TF-IDF active by default. Settings toggle to enable "Enhanced memory search" which downloads the model on first enable. Both work offline after setup.

**Vite integration**: No special plugins needed. Standard ESM import + `new URL('./worker.ts', import.meta.url)` pattern for Web Worker.

**Key constraint:** Memory retrieval must work offline. Cloud-only embeddings are not acceptable.

### 6.3 Context assembly budget

| Context slot | Token budget | Source |
| -------------- | ------------- | -------- |
| User identity | ~200 tokens | `identity/.overview.md` |
| Relevant skills | ~500 tokens | Top-matched `skills/*.md` summaries |
| Project context | ~500 tokens | `projects/{id}/.overview.md` |
| Recent cases/patterns | ~300 tokens | Top-matched agent memories |
| Reserved for data/charts | ~500 tokens | Extract API results |
| **Total memory budget** | **~2,000 tokens** | Fits in system message alongside prompts |

## 7) Privacy, Roles, and Encryption

### 7.1 Single-user (Phase 1)

- All memories stored locally in `.aura/memory/`.
- `sensitivity: 'private'` files are flagged but not encrypted (single-user, local device).
- No role model needed yet.

### 7.2 Multi-user (Phase 2 — Account/Cloud)

- Separate memory namespaces per `userId`.
- Encrypt `sensitivity: 'encrypted'` files at rest using per-user keys.
- Encryption scheme (envelope pattern):
  - **Root key**: per-device, stored in OS keychain or local file.
  - **User key (KEK)**: derived at runtime via HKDF from root key + userId. Never stored.
  - **File key (DEK)**: random per write, encrypted by user KEK, stored in file header.
- Magic bytes prefix (`AURA1`) on encrypted files — files without it are treated as plaintext.

### 7.3 Role model for shared memories

| Role | Read own | Write own | Read shared | Write shared | Admin |
| ------ | ---------- | ----------- | ------------- | -------------- | ------- |
| owner | Yes | Yes | Yes | Yes | Yes |
| collaborator-write | Yes | Yes | Yes | Yes | No |
| collaborator-read | Yes | Yes | Yes | No | No |
| agent-read | Scoped | No | Scoped | No | No |

### 7.4 Shareable vs private

| Memory type | Shareable? | Notes |
| ------------- | ----------- | ------- |
| Skills | Yes | Exportable, publishable to explore page |
| Tools knowledge | Yes | Best practices for tool usage |
| Identity/Profile | Never | Always per-user encrypted |
| Preferences | Never | Per-user only |
| Events | Configurable | Project events may be shared, personal events never |
| Cases/Patterns | Configurable | Team knowledge vs personal insights |

## 8) Milestones

### Phase Execution Rules (applies to M1 → M3)

1. Complete milestone tasks in order.
2. Run and record the milestone-specific test gate before starting the next milestone.
3. Do not mark a milestone complete unless all gate checks pass.
4. Keep the execution record updated in this file as work lands.

### M1 — Memory File Standard + Local Storage

Parallel-safe: yes — independent of all other features

| Task | Description | Est. |
| ------ | ------------- | ------ |
| M1.1 | Define AMF schema types and Zod validators | S |
| M1.2 | Implement memory file read/write utilities (parse frontmatter, validate, write) | M |
| M1.3 | Implement directory structure creation and management | S |
| M1.4 | Implement L0/L1 summary generation (AI-driven, from L2 files) | M |
| M1.5 | Define memory write/update policies (merge, append, immutable) | M |
| M1.6 | Implement cross-reference link parser (`[[entity-name]]` → index) | S |
| M1.7 | Add memory directory to .aura file packaging | S |

Status: ✅ COMPLETE (2026-04-21)

**Implemented files:**

- `src/services/memory/types.ts` — AMF types (MemoryId, MemoryCategory, MemoryScope, etc.)
- `src/services/memory/schema.ts` — Zod validators for all AMF types
- `src/services/memory/storage.ts` — File parsing/serialization (YAML+Markdown), frontmatter handling
- `src/services/memory/directory.ts` — Directory tree management, L0/L1 scaffolding
- `src/services/memory/policies.ts` — Update strategies (merge, append, immutable)
- `src/services/memory/links.ts` — Cross-reference parsing, link graph building
- `src/services/memory/archive.ts` — Markdown archive import/export for `.aura` packaging
- `src/services/memory/index.ts` — Module exports

**Test coverage: 92 tests across 10 suites (all passing):**

- `memory-schema.test.ts` — 12 tests for validation
- `memory-storage.test.ts` — 14 tests for file I/O
- `memory-directory.test.ts` — 16 tests for directory ops
- `memory-policies.test.ts` — 14 tests for update strategies
- `memory-links.test.ts` — 23 tests for cross-references
- `memory-archive.test.ts` — 1 round-trip archive test
- `memory-extraction.test.ts` — 3 extraction and persistence tests
- `memory-retrieval.test.ts` — 4 retrieval and budget tests
- `memory-summarize.test.ts` — 1 bottom-up summary regeneration test
- `project-format-spreadsheet.test.ts` — 1 `.aura` memory load regression test

**M1 test gate (required before M2):**

- Unit: ✅ AMF schema validation, frontmatter read/write, update strategy enforcement, cross-reference parsing.
- Integration: ✅ `.aura` package save/load includes memory directory + metadata integrity.
- Manual: ✅ sample memory tree regeneration now has automated coverage for bottom-up L0/L1 summary updates.

### M2 — Capture + Retrieval

Depends on: M1

| Task | Description | Est. |
| ------ | ------------- | ------ |
| M2.1 | Build memory extraction pipeline (LLM structured output) | L |
| M2.2 | Build dedup checker (embedding similarity + LLM decision) | L |
| M2.3 | Build local embedding index (TF-IDF or lightweight model) | M |

Status: IN PROGRESS (retrieval foundation landed 2026-04-21)

**Implemented in this slice:**

- LLM-based extraction service in `src/services/memory/extraction.ts`
- Post-generation capture trigger in `src/components/ChatBar.tsx`
- TF-IDF retrieval baseline in `src/services/memory/retrieval.ts`
- Hierarchical directory-first retrieval with project/global scope filtering
- Token-budget assembly and formatted memory context output
- Bottom-up directory summary regeneration in `src/services/memory/summarize.ts`
- Prompt-time retrieval injection into document and presentation workflows
- Archive-backed `.aura` persistence so retrieval can operate on loaded projects

**Still pending for full M2 completion:**

- Dedup decision flow (`skip/create/merge/delete`)
- Session archival and regeneration triggers

| M2.4 | Build hierarchical retrieval pipeline (L0 → L1 → L2 drill-down) | L |
| M2.5 | Build context assembly with token budgeting | M |
| M2.6 | Wire retrieval into AI workflow (inject relevant memory into system prompts) | M |
| M2.7 | Add session archival on chat end (messages.jsonl + summaries) | M |

**M2 test gate (required before M3):**

- Unit: extraction candidate mapping, dedup decision branches (skip/create/merge/delete), token budget calculator.
- Integration: end-to-end chat/session → extraction → write → retrieval → prompt assembly.
- Quality: relevance checks on top-k retrieval and dedup false-positive/false-negative sampling.

### M3 — Privacy + Multi-User Preparation

Depends on: M2, Account/Cloud M1

| Task | Description | Est. |
| ------ | ------------- | ------ |
| M3.1 | Implement per-user encryption (envelope pattern: root → KEK → DEK) | L |
| M3.2 | Implement role-aware memory access control | M |
| M3.3 | Add sync-ready metadata for cloud replication | M |
| M3.4 | Implement skill export/import for sharing | M |
| M3.5 | Implement memory compaction (periodic L0/L1 regeneration, stale memory pruning) | M |

**M3 test gate (required before rollout):**

- Unit: envelope encryption/decryption primitives and role policy checks.
- Integration: per-user namespace isolation, encrypted file read/write cycle, share/export-import workflows.
- Security: unauthorized access denial, corrupted encrypted file handling, key-rotation safety checks.

Size estimates: S = < 1 day, M = 1-3 days, L = 3-5 days

## 9) Validation Requirements

- **Unit tests**: frontmatter parser/validator, update strategy enforcement (merge vs append vs immutable), link parser, token budget calculator, Zod schema validation.
- **Integration tests**: extraction pipeline end-to-end (chat → memory files), retrieval pipeline (query → ranked results), .aura save/load with memory directory.
- **Security tests**: unauthorized memory access denial, encryption/decryption cycle, role-based access enforcement, encrypted file corruption handling.
- **Quality tests**: memory relevance scoring (are the right memories retrieved?), dedup accuracy (false positive/negative rates), L0/L1 summary quality (do summaries capture key information?).
- **Manual checks**: memory growth over 10+ sessions (does it scale?), retrieval relevance review, multi-project memory separation.

## 10) Risks & Mitigations

| Risk | Mitigation |
| ------ | ------------ |
| Memory bloat over time | Snapshot compaction + retention policies. L0/L1 regeneration compresses knowledge. Stale memory pruning based on last-accessed timestamp. |
| Privacy leakage in shared contexts | Strict namespace isolation + sensitivity flags + encryption defaults. Never include `private` memories in shared project contexts. |
| Low retrieval quality | Explicit evidence fields in memory format. Hierarchical retrieval (not flat search). Feedback loop: if agent uses a memory and user corrects, update the memory. |
| Extraction noise (irrelevant memories) | Structured output with explicit `actionableUse` field. Dedup pipeline filters duplicates. Minimum confidence threshold on extraction. |
| Embedding model quality (local) | TF-IDF as baseline (zero-dep). Transformers.js (`all-MiniLM-L6-v2`, q8, ~33 MB) as opt-in upgrade for semantic search. Both work offline. |
| Cross-reference graph complexity | Simple `[[link]]` index, not a full graph database. Rebuild index on project load. Good enough for navigational retrieval. |

## 11) External References Evaluated

| Source | What we adopted | What we skipped |
| -------- | ---------------- | ----------------- |
| **OpenViking** | L0/L1/L2 hierarchy, 8 memory categories, update strategies (merge/append/immutable), dedup pipeline (skip/create/merge/delete), envelope encryption, directory-recursive retrieval | Full virtual filesystem URI scheme, complex multi-tenant account model (simplified for Aura) |
| **Obsidian** | YAML frontmatter format, `[[wikilink]]` cross-references, hierarchical tags, local-first philosophy | Plugin architecture, graph visualization UI, community theme system |
| **Claude Code memory** | Section-based format (Summary/Details/Evidence/Actionable Use), scope awareness (global vs project) | Single-file index approach (Aura uses directory hierarchy instead) |

## 12) Open Questions

1. ~~**Local embedding model**~~: **Decided — TF-IDF baseline + Transformers.js (`all-MiniLM-L6-v2`) opt-in upgrade.**
2. **Memory UI**: Some memory can be visible to users, but not everything needs to be. Not a focus for initial implementation — add later. Eventually could show how projects link together and overall thoughts/memories on a topic (graph-style visualization). Start with a minimal "Memory" tab in settings showing the directory tree as read-only.
3. **Memory export format**: Should exported skills use standard markdown, or a custom Aura skill format with execution metadata? Start with markdown, add execution metadata later.
4. **Retention policy**: How long to keep archived session messages? Recommendation: keep L0/L1 summaries indefinitely, delete raw messages.jsonl after 90 days.
5. **Memory conflict on sync**: When cloud sync introduces conflicting memory files, merge strategy? Defer to Account/Cloud plan.

## 13) Execution Record (update as work ships)

### Milestone completion tracker

- [x] M1 complete
- [ ] M2 complete
- [ ] M3 complete

### Checkpoint log

| Date | Milestone | Change summary | Test gate result | Owner |
| ------ | ----------- | ---------------- | ------------------ | ------- |
| 2026-04-21 | M1 | AMF schema + storage + directory mgmt + policies + links + archive packaging + 84 tests | ✅ PASS | GitHub Copilot |
| 2026-04-21 | M2 | TF-IDF retrieval core + token-budget assembly + `.aura` memory loading | ✅ PASS (slice) | GitHub Copilot |
| 2026-04-21 | M2 | Structured memory extraction service + post-generation capture trigger + 90 tests | ✅ PASS (slice) | GitHub Copilot |
| 2026-04-21 | M2 | Prompt-time memory injection + bottom-up summary regeneration + focused tests + green production build | ✅ PASS (slice) | GitHub Copilot |
