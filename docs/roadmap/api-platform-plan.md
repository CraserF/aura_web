# API Platform & Visual Automation — Implementation Plan

> Status: planning (no implementation in this document)  
> Scope: external API surface, in-app automation builder, prompt customization  
> Last updated: 2026-04-19  
> Depends on: Account/Cloud M1 (auth + user identity required for API access)  
> Parallel with: MCP Integration (shares API contract and auth model)

## 1) Goals

- Expose Aura capabilities through a stable, versioned API surface.
- Allow users to build automations visually (not code-first) with prompt customization.
- Make workflows reusable across projects and organizations.
- Support both self-hosted and Aura-cloud deployment modes.
- Gate API access by account tier (free = limited, paid = full access).

## 2) Current-State Summary

| Area | Status | Notes |
|------|--------|-------|
| Internal workflow architecture | Done | `src/services/ai/workflow/*` — modular, service-oriented |
| Project/document model | Done | Suitable as API resource boundaries |
| Chart/spreadsheet services | In progress | Will become API resources |
| Memory system | Planned | Will become API-accessible |
| External API gateway | Not started | No HTTP server, no API keys |
| Auth/user model | Not started | Required before API can launch |

## 3) Architecture

### 3.1 API Deployment Model

Two deployment modes that share the same codebase:

```
┌─────────────────────────────────────────────────────┐
│  Mode A: Aura Cloud (managed)                        │
│                                                       │
│  User → API Gateway → Aura API Server → Supabase     │
│         (rate limits)  (Express/Hono)   (storage)     │
│                              ↓                        │
│                        AI Provider APIs               │
│                        (user's own keys)              │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Mode B: Self-Hosted                                  │
│                                                       │
│  User → Aura API Server → Local/Self-hosted Supabase  │
│         (Docker)          (storage)                    │
│              ↓                                        │
│        AI Provider APIs                               │
│        (user's own keys)                              │
└─────────────────────────────────────────────────────┘
```

### 3.2 Server Framework

**Recommendation: Hono** — lightweight, TypeScript-native, works on Node.js/Bun/Deno/Cloudflare Workers/Vercel Edge. Perfect for a framework that needs to run both self-hosted and on edge platforms.

Why Hono over Express:
- 12x smaller bundle
- Native TypeScript (no `@types/express`)
- Built-in middleware (CORS, JWT, rate limiting)
- Runs on Bun natively (matching Aura's toolchain)
- OpenAPI integration via `@hono/zod-openapi`

### 3.3 API Resource Families

| Resource | Methods | Auth | Notes |
|----------|---------|------|-------|
| `/projects` | CRUD + list | Required | User's own projects |
| `/projects/:id/documents` | CRUD + list | Required | Presentations, documents, spreadsheets |
| `/projects/:id/documents/:id/generate` | POST | Required | Trigger AI generation |
| `/projects/:id/documents/:id/export` | GET | Required | PDF, DOCX, CSV export |
| `/projects/:id/charts` | CRUD + list | Required | Chart specs within project |
| `/projects/:id/data` | query, ingest, describe | Required | DuckDB-backed data operations |
| `/memories` | read, write, search | Required | Scoped to user |
| `/workflows/runs` | create, status, cancel | Required | Async job lifecycle |
| `/skills` | list, get, create | Required | Shareable skill definitions |
| `/user/settings` | get, update | Required | User preferences |

### 3.4 Async Job Model

Long-running operations (generation, export, data ingestion) use an async pattern:

```typescript
// POST /workflows/runs
// Request:
{
  "action": "generate",
  "projectId": "proj_abc",
  "documentId": "doc_xyz",
  "prompt": "Create a sales presentation for Q2",
  "options": { "model": "claude-sonnet-4-20250514" }
}

// Response (immediate):
{
  "runId": "run_123",
  "status": "queued",
  "createdAt": "2026-04-19T10:00:00Z"
}

// GET /workflows/runs/run_123
// Response (polling or webhook):
{
  "runId": "run_123",
  "status": "succeeded",  // queued | running | succeeded | failed | cancelled
  "result": { "documentId": "doc_xyz", "slideCount": 8 },
  "duration": 12400,
  "tokenUsage": { "input": 3200, "output": 8500 }
}
```

### 3.5 Auth + Rate Limiting

| Tier | Rate limit | Features |
|------|-----------|----------|
| Free | 10 requests/min, 100/day | Read-only projects, limited generation |
| Pro | 60 requests/min, 5000/day | Full CRUD, automations, priority queue |
| Enterprise | Custom | Dedicated instance, SLA, custom models |

Auth via Supabase JWT tokens (from Account/Cloud phase). API keys as an alternative for automation/MCP access:

```
Authorization: Bearer <supabase_jwt>
  -- or --
X-API-Key: aura_key_<random>
```

## 4) Visual Automation Builder

### 4.1 Automation Primitives

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Trigger     │────→│   Context    │────→│   Action     │
│              │     │  Selection   │     │              │
│ • Manual     │     │ • Project    │     │ • Generate   │
│ • Schedule   │     │ • Memory     │     │ • Update     │
│ • Webhook    │     │ • Data scope │     │ • Export     │
│ • Event      │     │              │     │ • Sync       │
└──────────────┘     └──────────────┘     └──────────────┘
                                                │
                                                ▼
                                          ┌──────────────┐
                                          │  Guardrails  │
                                          │              │
                                          │ • Token cap  │
                                          │ • Safety     │
                                          │ • Cost limit │
                                          └──────────────┘
                                                │
                                                ▼
                                          ┌──────────────┐
                                          │   Output     │
                                          │              │
                                          │ • New doc    │
                                          │ • Update doc │
                                          │ • Publish    │
                                          │ • Notify     │
                                          │ • Webhook    │
                                          └──────────────┘
```

### 4.2 Automation stored as JSON

```typescript
interface Automation {
  id: string;
  name: string;
  trigger: TriggerConfig;
  context: ContextConfig;
  actions: ActionBlock[];
  guardrails: GuardrailConfig;
  output: OutputConfig;
  promptTemplate: PromptTemplate;
  enabled: boolean;
  lastRunAt?: string;
  runCount: number;
}

interface PromptTemplate {
  id: string;
  template: string;          // Prompt with {{variable}} placeholders
  variables: TemplateVar[];  // Variable definitions with types + defaults
  version: number;
  model?: string;            // Optional model override
}
```

### 4.3 Builder UI

- **Flow editor**: drag-and-drop blocks in a linear chain (not a graph — keep it simple).
- **Prompt template editor**: syntax-highlighted editor with variable insertion, preview mode.
- **Run history**: table of past runs with status, duration, token usage.
- **Test mode**: dry-run that shows what would happen without actually executing.

## 5) Prompt Customization Framework

- Prompt templates with safe variable injection (mustache-style `{{variable}}`).
- Variables typed: `text`, `number`, `select` (from predefined options), `project-ref`, `memory-ref`.
- Versioned templates with diff view and rollback.
- Template linting: validate variable references, check for injection risks (no raw SQL/code execution).
- Prompt recipes: pre-built templates for common tasks (weekly report, meeting notes, data summary).

## 6) Milestones

### M1 — API Contract + Server Foundation
**Depends on: Account/Cloud M1 (auth)**

| Task | Description | Est. |
|------|-------------|------|
| M1.1 | Set up Hono server with Bun runtime | S |
| M1.2 | OpenAPI spec draft (Zod schemas → OpenAPI via `@hono/zod-openapi`) | M |
| M1.3 | Auth middleware (Supabase JWT + API key validation) | M |
| M1.4 | Project CRUD endpoints (wired to Supabase) | M |
| M1.5 | Document CRUD endpoints | M |
| M1.6 | Rate limiting middleware (per-tier) | S |
| M1.7 | API documentation site (auto-generated from OpenAPI) | S |

### M2 — Workflow Execution APIs
**Depends on: M1**

| Task | Description | Est. |
|------|-------------|------|
| M2.1 | Async run lifecycle (queue, execute, status, cancel) | L |
| M2.2 | Wire existing AI workflows to API execution context | L |
| M2.3 | Run logs and result artifacts (store in Supabase Storage) | M |
| M2.4 | Token usage accounting | M |
| M2.5 | Memory read/write API endpoints | M |
| M2.6 | Data operations API (query, ingest, describe via DuckDB) | M |

### M3 — Visual Automation Builder
**Depends on: M2**

| Task | Description | Est. |
|------|-------------|------|
| M3.1 | Automation data model and storage | M |
| M3.2 | Flow editor UI (linear block chain) | L |
| M3.3 | Prompt template editor with variable insertion | L |
| M3.4 | Trigger implementations (manual, schedule, webhook) | L |
| M3.5 | Guardrail enforcement (token cap, cost limit, safety) | M |
| M3.6 | Run history UI and dry-run mode | M |
| M3.7 | Pre-built prompt recipes | M |

**Size estimates: S = < 1 day, M = 1-3 days, L = 3-5 days**

## 7) Validation Requirements

- **Contract tests**: All API resources validated against OpenAPI spec. Request/response schemas enforced by Zod.
- **Auth tests**: JWT validation, API key lifecycle, tier-based rate limiting, unauthorized access rejection.
- **Load tests**: Generation queue under concurrent requests, rate limiter accuracy.
- **Security tests**: Project isolation (user A can't access user B's projects), prompt injection via template variables, API key rotation.
- **UX tests**: Automation builder usability for non-technical users. Template editor clarity.

## 8) Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| API surface sprawl | Strict versioning (`/v1/`). Bounded initial endpoints. Review before adding new resources. |
| Unsafe automation loops | Execution limits per automation (max runs/day, max tokens/run). Safety stop controls. Dry-run mode. |
| Prompt injection via variables | Template linting. Variable type enforcement. Sanitize all user input before prompt injection. |
| Server infrastructure cost | Self-hosted mode uses user's own compute. Aura Cloud tiers offset costs. Monitor per-user usage. |
| API key security | Keys scoped to specific projects/actions. Rotation support. Audit log of API key usage. |

## 9) Open Questions

1. **Server deployment**: Hono on Bun vs Hono on Cloudflare Workers for managed tier? Bun for self-hosted, Workers for cloud — share codebase via adapter pattern.
2. **Webhook reliability**: Need a queue (BullMQ, Inngest) for reliable webhook delivery? Start with direct HTTP calls, add queue if delivery failures become an issue.
3. **Automation marketplace**: Should users be able to publish and sell automation templates? Deferred to post-M3. Design the data model to support it.
4. **Multi-model support in API**: Should the API accept model preferences per request, or use the user's default? Both — default from settings, override per request.
