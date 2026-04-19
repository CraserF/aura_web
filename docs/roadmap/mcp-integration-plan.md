# MCP Integration & External LLM Connectivity — Implementation Plan

> Status: planning (no implementation in this document)  
> Scope: Aura MCP server enabling external LLM clients to use Aura tools/workflows as a source of truth

## 1) Goals

- Provide an MCP server exposing Aura tools and project/memory operations.
- Allow users to leverage Aura from external LLM clients while keeping data consistent.
- Enable cross-provider continuity by using Aura as durable storage of knowledge and artifacts.

## 2) Current-State Findings (repo investigation)

- Aura already has strong internal workflow abstractions and project persistence structures.
- No MCP transport/server implementation exists yet.
- Memory and cloud identity systems are prerequisites for full multi-client continuity.

## 3) MCP Scope (Phase 1)

Core tool surfaces:
- project read/write/list
- document generate/update
- chart/table extract operations
- memory read/write (permission-scoped)
- workflow run + status retrieval

Transport and auth:
- session-scoped auth tokens linked to Aura account system
- project-level authorization checks on every tool call

## 4) Consistency Model

- Treat Aura project storage as source of truth.
- Include optimistic concurrency controls (`etag`/`revisionId`).
- Emit conflict responses with merge guidance when stale clients write.

## 5) Safety & Governance

- Tool-level permission scopes (read/write/admin).
- Audit log of MCP tool calls and affected resources.
- Policy controls for sensitive memory namespaces.

## 6) Milestones

### M1 — MCP Server Skeleton
- implement protocol transport
- implement auth handshake
- implement read-only project/document tools

### M2 — Write Tools + Workflow Execution
- add mutation endpoints/tools
- add workflow execution hooks
- add conflict detection controls

### M3 — Production Hardening
- add audit logging
- add rate limits and abuse controls
- add compatibility testing across major MCP clients

## 7) Validation Requirements

- Protocol conformance tests.
- Permission and tenancy tests.
- Failure-mode tests (timeouts, partial writes, retries).
- End-to-end tests with at least two external MCP-capable clients.

## 8) Risks & Mitigations

- **Cross-client state drift** → revision checks + conflict-first responses.
- **over-privileged tools** → strict scoped auth model and deny-by-default policies.
- **operational complexity** → phased rollout with read-only first.
