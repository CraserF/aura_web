# Account Creation, Cloud, and Collaboration — Implementation Plan

> Status: planning (no implementation in this document)  
> Scope: auth, cloud persistence, portfolio/project publication, simplified collaboration model

## 1) Goals

- Add account creation and secure sign-in for Aura cloud capabilities.
- Persist projects, memories, and settings across sessions/devices.
- Enable private/public projects, async collaboration, and portfolio management.
- Keep workflow accessible for non-technical users.

## 2) Current-State Findings (repo investigation)

- App is currently client-first with local browser persistence and local `.aura` files.
- There is no backend auth/session model yet.
- Version history already exists locally via `isomorphic-git` + `lightning-fs`.

## 3) Technology Decisions to Resolve Early

### 3.1 Auth Framework

Candidate: **Better Auth** as app-level auth/session framework.

Evaluation criteria:
- open-source friendliness
- session security and extensibility
- org/team/role support roadmap
- integration effort with chosen backend

### 3.2 BaaS Choice (Firebase vs Supabase)

Decision matrix to run in discovery sprint:
- local dev ergonomics
- auth + storage + realtime primitives
- OSS/self-host path
- pricing trajectory for paid Aura tier
- row-level security and policy model

## 4) Collaboration Model (Git concepts abstracted)

User-facing actions should be plain-language equivalents:
- branch → "version lane"
- fork → "remix"
- merge → "combine changes"
- pull/push → "sync"

Technical options:
- keep git-compatible internal storage layer
- evaluate Jujutsu (`jj`) semantics for simpler UX mapping
- preserve export/interoperability guarantees in Aura format

## 5) Feature Tracks

### Track A — Accounts + Sessions
- sign-up/sign-in/sign-out
- device/session management
- profile and org scaffolding

### Track B — Cloud Project Persistence
- sync private projects and memory assets
- conflict resolution policy for async edits
- backup/restore and migration support

### Track C — Public Collaboration Surface
- publish projects publicly
- remix/fork capability
- portfolio-level organization

### Track D — Explore Discovery
- trending public projects/tools/skills
- bookmark + like signals
- abuse/moderation readiness baseline

## 6) Milestones

### M1 — Auth + Cloud Foundation
- finalize auth and BaaS stack
- implement account/session primitives
- implement secure cloud project storage API

### M2 — Sync + Collaboration Primitives
- private/public project visibility
- async collaboration flows
- simplified versioning language and UI mappings

### M3 — Explore + Portfolio
- project discovery index
- likes/bookmarks/ranking
- portfolio management and public profile views

## 7) Validation Requirements

- Security: auth/session tests, ACL tests, rate limits, tenant isolation.
- Reliability: offline-to-online sync consistency and conflict handling.
- Product: usability testing for non-technical users on collaboration verbs.

## 8) Risks & Mitigations

- **Over-complex collaboration UX** → language simplification + guided flows.
- **Cloud cost growth** → storage tiering + lifecycle policies + quota controls.
- **Vendor lock-in** → storage abstraction layer and exportable Aura artifacts.

## 9) Mandatory Discovery Outputs

- Firebase vs Supabase comparison report (cost + architecture).
- Better Auth integration architecture sketch.
- Jujutsu feasibility spike report for async collaboration semantics.
