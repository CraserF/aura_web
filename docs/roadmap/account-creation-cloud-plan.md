# Account Creation, Cloud, and Collaboration — Implementation Plan

> Status: planning (no implementation in this document)  
> Scope: auth, cloud persistence, portfolio/project management, simplified collaboration, version control  
> Last updated: 2026-04-19  
> Depends on: Memory M1 (memory file format must be defined before cloud sync)  
> Feeds into: API/MCP phase (auth tokens, project access control)

## 1) Goals

- Add account creation and secure sign-in for Aura cloud capabilities.
- Persist projects, memories, and settings across sessions and devices.
- Enable private/public projects, async collaboration, and portfolio management.
- Abstract version control into plain-language actions accessible to non-technical users.
- Keep the app fully functional offline — cloud is additive, never required.

## 2) Current-State Summary

| Area | Status | Notes |
|------|--------|-------|
| Local persistence | Done | IndexedDB auto-save, .aura file download |
| Version history | Done | `isomorphic-git` + `lightning-fs` in IndexedDB |
| Backend/auth | Not started | Pure client-side app, no server component |
| Cloud sync | Not started | No remote storage or sync protocol |
| Collaboration | Not started | Single-user only |

## 3) Technology Decisions

### 3.1 Auth Framework — Better Auth

**Research finding:** Better Auth is a self-hosted, framework-agnostic TypeScript auth library (MIT, 27.9k stars).

| Feature | Better Auth | Supabase Auth (GoTrue) |
|---------|------------|----------------------|
| Self-hosted | Yes (your own backend) | Yes (part of Supabase stack) |
| Framework agnostic | Yes (works with any React setup) | Yes (client SDK) |
| Teams/Orgs/Roles | Yes (Organization plugin: owner/admin/member + custom) | Basic (via RLS policies, no built-in org model) |
| Auth methods | Email, 40+ OAuth, magic link, passkeys, 2FA | Email, OAuth, magic link, phone |
| Database | Standard Postgres (Kysely/Drizzle/Prisma) | Internal Postgres tables |
| Vite+React compatibility | Yes, but **requires a server endpoint** | Yes, client-only SDK |

**Recommendation:** Start with **Supabase Auth** for simplicity — it's built into the BaaS, requires no separate server, and handles the 80% case (email, social, magic link). When org/team management becomes critical (paid tier), evaluate adding Better Auth on top, connecting it to the same Supabase Postgres instance.

**Architectural constraint:** Better Auth requires a server component (Express/Hono/Fastify endpoint). Aura is currently a pure SPA. Adding Better Auth means adding a backend service — which aligns with the API/MCP phase but adds deployment complexity. Defer unless Supabase Auth proves insufficient.

### 3.2 BaaS — Supabase (recommended) vs Firebase

**Research-based decision matrix:**

| Factor | Supabase | Firebase | Winner |
|--------|----------|----------|--------|
| **Self-host (open-source)** | Full stack via Docker Compose | Not possible (proprietary Google infra) | **Supabase** |
| **Auth** | GoTrue (email, social, magic link, phone) | Firebase Auth (generous free tier) | Tie |
| **File/blob storage** | S3-compatible with RLS, TUS uploads | Google Cloud Storage, 5 GB free | Tie |
| **Realtime** | Postgres logical replication, broadcast, presence | Firestore realtime (battle-tested, offline-first) | **Firebase** |
| **Row-level security** | Native Postgres RLS (SQL policies) | Separate rules language per service | **Supabase** |
| **Offline-first** | **No built-in offline persistence** | Firestore automatic offline cache + sync | **Firebase** |
| **Pricing predictability** | Flat $25/mo Pro, no per-operation charges | Per-read/write/delete, can spike unpredictably | **Supabase** |
| **Database** | Standard Postgres (SQL, JSON, full-text search) | Firestore (NoSQL document model) | **Supabase** |
| **Self-host for OSS** | Docker Compose, community K8s | Not possible | **Supabase** |
| **SDK ecosystem** | Growing, good React support | Mature, excellent SDKs | **Firebase** |

**Decision: Supabase** — the self-host capability is essential for an open-source project. Users who want to run their own Aura instance must be able to bring their own backend. Supabase's Postgres foundation also pairs naturally with Better Auth if needed later.

**Offline gap mitigation:** Supabase has no built-in offline persistence. Options:
1. **PowerSync** — sync layer that sits on Supabase Postgres, provides local SQLite cache with automatic conflict resolution. Open-source, designed for this exact gap.
2. **ElectricSQL** — another Postgres sync option with local-first architecture.
3. **Custom layer** — use existing IndexedDB persistence as the local layer, add a sync protocol on top.

**Recommendation:** Keep existing IndexedDB local storage as the primary persistence. Cloud sync is additive — push local changes to Supabase on save, pull on load. Conflict resolution via last-write-wins with manual merge for critical conflicts. Evaluate PowerSync if true real-time sync becomes needed.

### 3.3 Version Control — isomorphic-git (keep) + Abstraction Layer

**Jujutsu (jj) research findings:**

| Question | Finding |
|----------|---------|
| Browser-compatible (WASM/JS)? | **No.** No WASM build exists or is planned. Rust codebase with filesystem dependencies. |
| Git-compatible? | Yes, fully. Uses git storage backend via `gitoxide`. |
| Server-side library? | Yes, `jj-lib` crate is designed for GUI/server use. **But API is explicitly unstable.** |
| Key UX simplification | Working copy is always a commit (no staging area). Auto-snapshotting. Committable conflicts. Full undo. Optional branches ("bookmarks"). |

**Decision: Keep isomorphic-git for client-side operations.** Jujutsu cannot run in the browser. Its semantic simplifications are attractive but can be achieved by building an abstraction layer over git:

| User action | Plain language | Git operation (hidden) |
|-------------|---------------|----------------------|
| Save version | "Save this version" | `git add -A && git commit` |
| Undo | "Undo last change" | `git revert HEAD` |
| Create variant | "Create a remix" | `git branch && git checkout` |
| Combine changes | "Merge these versions" | `git merge` |
| Sync to cloud | "Sync" | `git push` / `git pull` |
| View history | "Version history" | `git log` |
| Restore version | "Go back to version X" | `git checkout <hash>` |

**Implementation:** Build `src/services/versioning/actions.ts` — a plain-language action API that wraps isomorphic-git operations. The UI never exposes git concepts directly.

**Future consideration:** If a server-side component is introduced (API phase), Jujutsu could be used server-side for richer version operations. The abstraction layer makes this a backend swap, not a frontend change.

## 4) Feature Tracks

### Track A — Accounts + Sessions

| Feature | Description | Priority |
|---------|-------------|----------|
| Sign-up/sign-in | Email + password, Google OAuth, magic link (via Supabase Auth) | P0 |
| Session management | JWT tokens, refresh flow, device listing | P0 |
| Profile | Display name, avatar, email preferences | P1 |
| Settings sync | Push/pull user settings to cloud | P1 |

### Track B — Cloud Project Persistence

| Feature | Description | Priority |
|---------|-------------|----------|
| Project upload | Save .aura files to Supabase Storage (S3-compatible) | P0 |
| Project listing | Fetch user's projects from cloud | P0 |
| Memory sync | Push/pull memory files from `.aura/memory/` | P1 |
| Conflict resolution | Last-write-wins with merge prompt for critical changes | P1 |
| Backup/restore | Export all user data, import from backup | P2 |

### Track C — Portfolio View

| Feature | Description | Priority |
|---------|-------------|----------|
| Portfolio page | Grid/list of all user projects across devices | P0 |
| Project metadata | Thumbnail, title, last modified, document count, type breakdown | P0 |
| Project actions | Open, duplicate, delete, share settings | P0 |
| Cross-project memory | Show which memories are global vs project-scoped | P1 |
| Portfolio-level summaries | AI-generated summaries of project activity | P2 |

### Track D — Public Collaboration

| Feature | Description | Priority |
|---------|-------------|----------|
| Visibility toggle | Private (default) / Public per project | P0 |
| Public project view | Read-only view for non-owners | P0 |
| Remix/fork | Clone a public project into user's portfolio | P1 |
| Version lanes | Named branches for parallel work (abstracted git branches) | P2 |
| Combine changes | Merge version lanes (abstracted git merge) | P2 |

### Track E — Explore & Discovery

| Feature | Description | Priority |
|---------|-------------|----------|
| Explore page | Browse trending public projects | P1 |
| Search | Full-text search across public project titles/descriptions | P1 |
| Signals | Bookmark + like (for ranking) | P2 |
| Categories | Skills, templates, projects, tools | P2 |
| Moderation | Report/flag system, content review baseline | P2 |

## 5) Architecture

### 5.1 Data Model (Supabase Postgres)

```sql
-- Users (managed by Supabase Auth)
-- auth.users table provides id, email, metadata

-- User profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
  storage_path TEXT NOT NULL,  -- Path in Supabase Storage
  thumbnail_url TEXT,
  document_count INT DEFAULT 0,
  forked_from UUID REFERENCES projects(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Project bookmarks/likes
CREATE TABLE project_signals (
  user_id UUID REFERENCES auth.users(id),
  project_id UUID REFERENCES projects(id),
  signal_type TEXT CHECK (signal_type IN ('bookmark', 'like')),
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, project_id, signal_type)
);

-- Memory sync metadata (actual files in Supabase Storage)
CREATE TABLE memory_sync (
  user_id UUID REFERENCES auth.users(id),
  memory_path TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, memory_path)
);

-- RLS policies
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own and public projects" ON projects
  FOR SELECT USING (owner_id = auth.uid() OR visibility = 'public');
CREATE POLICY "Users modify own projects" ON projects
  FOR ALL USING (owner_id = auth.uid());
```

### 5.2 Storage Layout (Supabase Storage)

```
bucket: aura-projects
  {user_id}/
    {project_id}/
      project.aura              # Full .aura zip file
      thumbnail.png             # Auto-generated preview
      
bucket: aura-memories
  {user_id}/
    identity/                   # Synced memory files
    skills/
    entities/
    events/
    projects/{project_id}/
    agent/
```

### 5.3 Sync Protocol (local-first)

```
Local (IndexedDB + .aura files)  ←→  Cloud (Supabase Storage + Postgres)
         ↕                                       ↕
    Primary storage                    Backup + cross-device sync
    Always available                   Available when online
```

**Sync strategy:**
1. **On save**: Upload .aura file to Supabase Storage, update project metadata in Postgres.
2. **On load**: Check cloud for newer version (compare `updated_at`). If newer, offer to download.
3. **Conflict**: If both local and cloud have changes since last sync, show merge dialog.
4. **Offline**: All operations work locally. Queue sync operations for when connectivity returns.

## 6) Milestones

### M1 — Auth + Cloud Foundation
**Parallel-safe: can start independently. Memory M1 should complete first for sync format.**

| Task | Description | Est. |
|------|-------------|------|
| M1.1 | Add Supabase client SDK (`@supabase/supabase-js`) | S |
| M1.2 | Implement auth UI (sign-up, sign-in, sign-out, profile) | L |
| M1.3 | Session management (JWT refresh, auth state in Zustand store) | M |
| M1.4 | Supabase Storage integration (upload/download .aura files) | M |
| M1.5 | Project metadata table + RLS policies | M |
| M1.6 | Settings sync (push/pull user preferences) | S |
| M1.7 | Auth-aware routing (guest vs signed-in experience) | M |

### M2 — Portfolio + Sync
**Depends on: M1**

| Task | Description | Est. |
|------|-------------|------|
| M2.1 | Portfolio page UI (project grid with thumbnails, metadata) | L |
| M2.2 | Project CRUD actions (create, duplicate, delete from cloud) | M |
| M2.3 | Auto-generate project thumbnails | M |
| M2.4 | Memory sync protocol (push/pull .aura/memory/ to Supabase Storage) | L |
| M2.5 | Conflict detection and merge dialog | L |
| M2.6 | Offline queue (buffer sync operations when disconnected) | M |

### M3 — Versioning Abstraction
**Depends on: M1, can parallel with M2**

| Task | Description | Est. |
|------|-------------|------|
| M3.1 | Build `src/services/versioning/actions.ts` (plain-language git wrapper) | M |
| M3.2 | Version history UI (timeline of saves, restore button) | M |
| M3.3 | "Remix" flow (fork a project, track provenance) | M |
| M3.4 | "Version lanes" (named branches with simple UI) | L |
| M3.5 | "Combine changes" (merge with conflict UI) | L |

### M4 — Public Collaboration + Explore
**Depends on: M2 + M3**

| Task | Description | Est. |
|------|-------------|------|
| M4.1 | Visibility toggle (private/public per project) | S |
| M4.2 | Public project read-only view (no auth required) | M |
| M4.3 | Remix/fork capability for public projects | M |
| M4.4 | Explore page (browse public projects, search) | L |
| M4.5 | Bookmark + like signals, trending algorithm | M |
| M4.6 | Moderation baseline (report/flag system) | M |

**Size estimates: S = < 1 day, M = 1-3 days, L = 3-5 days**

## 7) Validation Requirements

- **Security**: Auth flow tests (sign-up, sign-in, token refresh, sign-out), RLS policy tests (user isolation, public visibility), rate limiting, CSRF protection, XSS prevention in user-generated content.
- **Reliability**: Offline-to-online sync consistency, conflict resolution correctness, data integrity after round-trip sync, backup/restore fidelity.
- **Performance**: Portfolio page load time with 50+ projects, sync latency for .aura files of various sizes, concurrent user handling.
- **Product**: Usability testing for non-technical users on version control actions ("save version", "remix", "combine changes"). Test that git concepts are fully abstracted.

## 8) Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Over-complex collaboration UX | Language simplification ("save version" not "commit"). Guided flows with clear explanations. User testing before launch. |
| Cloud cost growth | Storage tiering (compress .aura files). Lifecycle policies (archive inactive projects). Quota per user tier. |
| Vendor lock-in on Supabase | Storage abstraction layer — .aura files are standard zips. Project metadata is portable SQL. Self-host option preserves independence. |
| Offline sync conflicts | Last-write-wins as default. Manual merge dialog for critical conflicts. Clear conflict indicators. |
| Supabase Auth limitations (no orgs) | Start with flat user model. Add Better Auth when org/team features become critical (likely paid tier). |
| Memory encryption key management | Start simple (local key file). Migrate to OS keychain / cloud KMS as needed. |

## 9) UI/UX Improvements (from Dyad Research)

Patterns to adopt during this phase:

| Pattern | Source | Application in Aura |
|---------|--------|-------------------|
| Resizable panels (`react-resizable-panels`) | Dyad | Portfolio sidebar + project view split layout |
| OKLCH color tokens | Dyad | Better dark mode consistency across portfolio/settings UI |
| State-driven animations (fade/slide on state change) | Dyad | Portfolio transitions, auth flow animations |
| Smart loading overlays with context messages | Dyad | "Syncing projects...", "Loading portfolio..." |
| Dialog-driven confirmations for destructive actions | Dyad | Delete project, overwrite local with cloud version |

## 10) Open Questions

1. **Supabase vs self-host default**: Should the open-source distribution default to self-hosted Supabase, or a lighter local-only mode with optional cloud? Recommendation: local-only by default, cloud opt-in via settings.
2. **Pricing tiers**: What features are free vs paid? Recommendation: local-only is always free. Cloud sync free for small quota. Paid for larger storage, team features, explore page promotion.
3. **Team/Org model timing**: When do we need teams? Defer to after M4, unless user demand is clear earlier.
4. **PowerSync evaluation**: Should we evaluate PowerSync for real-time sync, or is the simple push/pull model sufficient? Defer evaluation to post-M2 based on user feedback.
5. **Jujutsu server-side**: If we add a backend service in the API phase, should we use jj server-side for richer version semantics? The abstraction layer in M3 makes this a backend swap, not a frontend change. Decision deferred.
