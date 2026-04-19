# MCP Integration & External LLM Connectivity — Implementation Plan

> Status: planning (no implementation in this document)  
> Scope: Aura MCP server enabling external LLM clients to use Aura tools/workflows as a source of truth  
> Last updated: 2026-04-19  
> Depends on: Account/Cloud M1 (auth), API M1 (shared endpoint contract)  
> Parallel with: API Platform (shares auth model and service contracts)

## 1) Goals

- Provide an MCP server exposing Aura tools and project/memory operations.
- Allow users to leverage Aura from external LLM clients (Claude, ChatGPT, Cursor, etc.) while keeping data consistent.
- Enable cross-provider continuity by using Aura as durable storage of knowledge and artifacts.
- Support both self-hosted and Aura-cloud deployment modes.

## 2) Current-State Summary

| Area | Status | Notes |
|------|--------|-------|
| Internal workflow abstractions | Done | Modular, service-oriented — ready to expose |
| Project persistence | Done | .aura format, IndexedDB, Supabase Storage (Account phase) |
| Memory system | Planned | Will be exposed as MCP read/write tools |
| MCP transport/server | Not started | No protocol implementation |
| Auth token model | Not started | Comes from Account/Cloud phase |

## 3) MCP Server Architecture

### 3.1 Transport

MCP supports multiple transports. Aura will implement:

| Transport | Use Case | Phase |
|-----------|----------|-------|
| **stdio** | Local integration (Claude Code, Cursor) | M1 |
| **HTTP+SSE** | Remote/cloud integration | M2 |

**stdio** is simpler and covers the most common local dev scenario. **HTTP+SSE** enables cloud-hosted MCP server for users who don't self-host.

### 3.2 Tool Surface

**Phase 1 — Read-only tools:**

| Tool | Description | Parameters |
|------|-------------|------------|
| `aura_list_projects` | List user's projects | `{ limit?, offset? }` |
| `aura_get_project` | Get project metadata | `{ projectId }` |
| `aura_list_documents` | List documents in a project | `{ projectId }` |
| `aura_get_document` | Get document content (HTML) | `{ projectId, documentId }` |
| `aura_get_chart` | Get chart spec | `{ projectId, chartId }` |
| `aura_describe_table` | Get schema/profile of data table | `{ projectId, tableName }` |
| `aura_sample_rows` | Get sample rows from data table | `{ projectId, tableName, n }` |
| `aura_query_data` | Run SQL query on project data | `{ projectId, query }` |
| `aura_search_memories` | Search user memories | `{ query, scope? }` |
| `aura_get_memory` | Get specific memory file | `{ memoryPath }` |

**Phase 2 — Write tools:**

| Tool | Description | Parameters |
|------|-------------|------------|
| `aura_create_document` | Create a new document/presentation | `{ projectId, type, title }` |
| `aura_generate` | Trigger AI generation | `{ projectId, documentId, prompt, options? }` |
| `aura_update_document` | Update document content | `{ projectId, documentId, content }` |
| `aura_ingest_data` | Ingest CSV/JSON data into project | `{ projectId, tableName, data, format }` |
| `aura_write_memory` | Write/update a memory file | `{ path, content, updateStrategy }` |
| `aura_export` | Export document to PDF/DOCX/CSV | `{ projectId, documentId, format }` |
| `aura_create_chart` | Create a chart from data | `{ projectId, chartSpec }` |

**Phase 3 — Workflow tools:**

| Tool | Description | Parameters |
|------|-------------|------------|
| `aura_run_workflow` | Execute a saved automation | `{ automationId, variables? }` |
| `aura_get_run_status` | Check workflow run status | `{ runId }` |
| `aura_list_skills` | List available skills | `{ scope? }` |
| `aura_execute_skill` | Run a specific skill | `{ skillId, input }` |

### 3.3 Resource Exposure

MCP resources for context loading:

| Resource URI | Description |
|-------------|-------------|
| `aura://projects` | List of user projects with metadata |
| `aura://projects/{id}` | Project details |
| `aura://projects/{id}/documents/{id}` | Document content |
| `aura://memories/{path}` | Memory file content |
| `aura://skills` | Available skills |

### 3.4 Auth Model

**For stdio transport (local):**
- Read auth token from local config file (`~/.aura/config.json`).
- Token obtained via `aura auth login` CLI command or copied from web app settings.
- Supports API keys for headless usage.

**For HTTP+SSE transport (remote):**
- Standard `Authorization: Bearer <jwt>` header.
- Session-scoped tokens linked to Aura account system.
- Project-level authorization checks on every tool call.

## 4) Consistency Model

- Aura project storage is the **source of truth** — MCP tools read/write to the same storage as the web app.
- Optimistic concurrency: include `etag` / `revisionId` on write operations.
- Conflict response: if a stale client writes, return error with current revision and merge guidance.
- Read-after-write consistency: all reads return the latest written state.

## 5) Safety & Governance

| Control | Description |
|---------|-------------|
| Tool-level permissions | Scopes: `read`, `write`, `admin`. API keys can be scoped to specific tools. |
| Audit log | Every MCP tool call logged with: user, tool, params, result, timestamp. |
| Memory namespace protection | Encrypted memories never exposed via MCP. Private memories require explicit scope. |
| SQL injection prevention | `aura_query_data` uses parameterized queries. DuckDB runs in sandboxed WASM. |
| Rate limiting | Per-user, per-tool rate limits matching API tier. |
| Data size limits | Maximum response size per tool call (e.g., 100 KB for document content). |

## 6) Implementation — MCP SDK

Use the official `@modelcontextprotocol/sdk` TypeScript package:

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server({
  name: 'aura-mcp-server',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {},
    resources: {},
  },
});

// Register tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'aura_list_projects',
      description: 'List all projects in the user\'s Aura portfolio',
      inputSchema: { type: 'object', properties: { limit: { type: 'number' } } },
    },
    // ... more tools
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case 'aura_list_projects':
      return handleListProjects(request.params.arguments);
    // ... more handlers
  }
});

// Start
const transport = new StdioServerTransport();
await server.connect(transport);
```

### 6.1 Service Reuse

MCP tool handlers should call the same service layer as the web app API. No duplicate business logic:

```
MCP Server  ─┐
              ├──→  src/services/*  (shared business logic)
API Server  ─┘        ↓
                   Supabase / DuckDB / AI workflows
```

This means the MCP server is a thin adapter over the service layer, not a separate implementation.

## 7) Milestones

### M1 — MCP Server Skeleton (stdio, read-only)
**Depends on: Account/Cloud M1 (auth tokens)**

| Task | Description | Est. |
|------|-------------|------|
| M1.1 | Set up MCP server package with `@modelcontextprotocol/sdk` | S |
| M1.2 | Implement stdio transport | S |
| M1.3 | Implement auth (read token from local config) | S |
| M1.4 | Implement read-only project/document tools | M |
| M1.5 | Implement memory search/read tools | M |
| M1.6 | Implement data describe/sample/query tools | M |
| M1.7 | Test with Claude Code and Cursor | M |
| M1.8 | MCP server installation docs (npx, config files) | S |

### M2 — Write Tools + HTTP Transport
**Depends on: M1, API M1**

| Task | Description | Est. |
|------|-------------|------|
| M2.1 | Implement write tools (create, update, generate, ingest) | L |
| M2.2 | Implement HTTP+SSE transport | M |
| M2.3 | Conflict detection (etag/revision checks) | M |
| M2.4 | Wire generation tools to existing AI workflows | L |
| M2.5 | Memory write tools with update strategy enforcement | M |

### M3 — Production Hardening
**Depends on: M2**

| Task | Description | Est. |
|------|-------------|------|
| M3.1 | Audit logging for all tool calls | M |
| M3.2 | Rate limiting per user per tool | S |
| M3.3 | Tool-level permission scoping | M |
| M3.4 | Data size limits and pagination | S |
| M3.5 | Compatibility testing (Claude Code, Cursor, ChatGPT, Windsurf) | L |
| M3.6 | Workflow execution tools (run automation, check status) | M |
| M3.7 | Error handling and retry guidance in tool responses | S |

**Size estimates: S = < 1 day, M = 1-3 days, L = 3-5 days**

## 8) Validation Requirements

- **Protocol conformance**: Test against MCP spec. Verify tool listing, tool calling, resource listing, resource reading all follow protocol.
- **Auth tests**: Valid/invalid/expired tokens. API key scoping. Unauthorized tool access rejection.
- **Permission tests**: Read-only keys can't write. Project isolation (user A can't access user B's tools).
- **Consistency tests**: Write via MCP → read via web app (and vice versa). Concurrent write conflict detection.
- **Failure modes**: Timeouts, partial writes, network interruption during generation, retry behavior.
- **Client compatibility**: End-to-end tests with at least 3 MCP-capable clients (Claude Code, Cursor, and one more).
- **Performance**: Tool response latency benchmarks. Large resource retrieval (pagination correctness).

## 9) Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Cross-client state drift | Revision checks on writes. Conflict-first responses with current state. |
| Over-privileged tools | Deny-by-default. Scoped API keys. Tool-level permission model. |
| SQL injection via `aura_query_data` | Parameterized queries only. DuckDB WASM sandbox. Read-only by default (no DDL via MCP). |
| MCP spec instability | Pin to specific protocol version. Abstract transport layer for easy migration. |
| Operational complexity | Phased rollout: read-only first (M1), then writes (M2), then workflows (M3). |
| Bundle size for stdio server | MCP server is a separate package/binary — doesn't affect web app bundle. |

## 10) User Experience

### 10.1 Setup flow (Claude Code example)

```bash
# Install
npx aura-mcp-server auth login

# Configure in Claude Code settings
# ~/.claude/mcp_settings.json:
{
  "mcpServers": {
    "aura": {
      "command": "npx",
      "args": ["aura-mcp-server"],
      "env": {}
    }
  }
}
```

### 10.2 Usage examples

```
User (in Claude Code): "Use my Aura project 'Q2 Sales' to create a presentation about our revenue growth"

Claude → aura_list_projects → finds "Q2 Sales"
Claude → aura_describe_table(tableName: "revenue") → gets schema
Claude → aura_sample_rows(tableName: "revenue", n: 10) → sees data patterns  
Claude → aura_generate(prompt: "Create a presentation about revenue growth trends", projectId: "...")
Claude → aura_get_document → retrieves the generated presentation
Claude: "I've created an 8-slide presentation in your Aura project. Here's what each slide covers..."
```

## 11) Open Questions

1. **MCP server distribution**: npm package (`npx aura-mcp-server`) vs standalone binary? npm is easier for JS ecosystem users. Binary (via `pkg` or Bun compile) for non-JS users. Do both.
2. **Real-time updates**: Should the MCP server emit notifications when projects change (via MCP notifications)? Useful for long-running workflows. Add in M2.
3. **Skill execution**: When a user runs `aura_execute_skill` from an external client, does it use the external client's model or Aura's configured model? Use Aura's model by default, with optional override.
4. **Multi-project context**: Should MCP tools support cross-project queries (e.g., search memories across all projects)? Yes, with explicit scope parameter. Default to current project.
