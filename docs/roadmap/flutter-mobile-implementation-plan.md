# Flutter Mobile Implementation Plan

> Status: planning  
> Scope: a private, cloud-backed Flutter service for iOS, Android, and optional Flutter Web  
> Last updated: 2026-04-30  
> Source app: `/Volumes/Callum_SSD/dev_projects/aura_web`  
> Jujutsu/WebAssembly reference repo: `/Volumes/Callum_SSD/dev_projects/vcs`  

## 1. Executive Summary

Build a new proprietary Flutter application and hosted service that keeps Aura's strongest product choices while changing the product posture from local-only tooling to an active user service:

- account-based access
- cloud-saved projects by default
- portfolio-first project management
- high-quality artifact generation and editing
- multi-artifact workspaces
- plain-language version history
- mobile-adaptive artifact framing
- hosted model access with optional BYOK provider configuration

The new repo should not be open source and should not be a direct port of the React app. It should be a mobile-native product plus backend service that shares the same data contracts and workflow lessons while using platform-appropriate rendering, account management, cloud persistence, and operational infrastructure.

The first signed-in screen should be a portfolio view. Users should see small project folders/cards for every cloud-saved project they own or can access. Opening a project should enter a workspace whose internal artifact logic mostly follows the current Aura model: project sidebar/artifact navigator, chat-scoped editing, document/presentation/spreadsheet artifacts, validation, export, and version history.

The MVP infrastructure decision is to use a BaaS rather than building a full custom backend. Supabase is the recommended default for the first version:

- Supabase Auth for sign up, sign in, session refresh, password recovery, and optional OAuth.
- Supabase Postgres with Row Level Security for portfolio/project metadata and access control.
- Supabase Storage for `.aura` archives, thumbnails, exports, and media.
- Supabase Edge Functions only for privileged or provider-facing operations such as the model gateway, BYOK calls, thumbnail jobs, and webhooks.
- Supabase Vault/project secrets for service credentials and encrypted secret references where appropriate.

The central technical decision inside the client is to make versioning a first-class cross-platform service:

- Native iOS/Android: use a Rust bridge around Jujutsu's `jj-lib`, not shelling out to a bundled `jj` binary.
- Flutter Web: use the worker-backed `@craserf/jj-wasm` package from `/Volumes/Callum_SSD/dev_projects/vcs`, exposed to Dart through a small JavaScript facade and `dart:js_interop`.
- Supabase-backed service layer: maintain canonical cloud project records, storage objects, user/project access controls, and sync metadata.
- Shared Dart app code: depend on cloud/project/versioning interfaces so native, web, and server implementations can evolve independently.

Flutter Web should be treated as a useful parity target and possible browser delivery surface, but the first-class product should be the signed-in mobile service. The web target should prove shared domain logic, shared artifact contracts, portfolio access, and `jj-wasm` viability, not force the mobile UX to behave like a desktop browser.

## 2. Current Aura Learnings To Preserve

### 2.1 Product and Data Lessons

The existing Aura app is a fully client-side local-first workspace. The Flutter service should preserve its project and artifact contracts while moving default persistence and identity into the cloud. Important current contracts:

- A project can contain documents, presentations, and spreadsheets.
- A `.aura` file is a zip archive with `manifest.json`, `chat-history.json`, `project-rules.md`, `context-policy.json`, `workflow-presets.json`, optional `media/`, optional `memory/`, and per-artifact files under `documents/`.
- Format version is currently `2.4`.
- Projects use stable document IDs, active document ID, lifecycle state, validation profile metadata, linked table references, media assets, memories, and project rules.
- Version history currently writes normalized project snapshot files into a browser virtual filesystem and commits them with `isomorphic-git`.
- The current app is intentionally local-first. The Flutter service should instead be cloud-backed by default, with local device storage used as cache, offline working state, and export/backup support.

Mobile should therefore start by supporting the current `.aura` format rather than inventing a new project format. A future format can be introduced through a migration layer once the mobile app has enough real usage.

The cloud service should still keep `.aura` export/import as a user trust and interoperability feature. Users should be able to leave with their work, even though the default experience is signed-in and cloud-saved.

### 2.2 Workflow Lessons

Aura's AI surface is not a single prompt-to-HTML call. It has evolved into:

- intent resolution and routing
- artifact-specific run plans
- provider-aware behavior for frontier versus local models
- streaming/progress events
- structured run result envelopes
- validation and publish-readiness summaries
- separate document, presentation, spreadsheet, and project operations
- context compaction and project memory

Flutter should port these contracts in layers. Do not begin by recreating every prompt and agent. Begin by preserving the run-result envelope, progress events, project mutations, and artifact persistence. Then reintroduce the richer workflow engine.

### 2.3 Mobile UI Lessons

The current mobile workstream reached a critical conclusion:

- The app shell should adapt to mobile.
- Artifacts should retain explicit contracts.
- Presentations stay fixed 16:9 and are contained, not stretched.
- Documents need a visible bounded frame while remaining readable.
- Sidebar and chat become drawers/sheets below desktop breakpoints.

For Flutter, this becomes:

- mobile-first shell
- bottom-sheet chat
- drawer or sheet artifact navigator
- contained 16:9 presentation stage
- readable document viewer with clear page/artifact bounds
- touch-first controls
- no attempt to make generated slide HTML itself fluid beyond established prompt guidance

## 3. Current Jujutsu Learnings

### 3.1 Upstream `jj`

Jujutsu is a Git-compatible VCS implemented in Rust. The key concepts that map well to Aura:

- working copy as a commit
- operation log and undo
- Git-backed storage and regular Git remotes
- no staging-area mental model
- powerful revision selection and history rewriting
- safe history and undo as a product primitive

This is a much better mental model for Aura users than exposing Git commits, staging, branches, and checkout directly. In the cloud-backed service, `jj` should power local/device history and eventually server-side canonical project history, while the user sees plain-language save, restore, undo, and variant actions.

### 3.2 Local `/vcs` Web Work

The `/Volumes/Callum_SSD/dev_projects/vcs` repo has an experimental browser package:

- package name: `@craserf/jj-wasm`
- current package version: `0.40.0-browser.0`
- worker-first client: `createJjWorkerClient`
- storage: LightningFS plus isomorphic-git-compatible browser filesystem
- supported: `init`, `open`, `clone`, `fetch`, `push`, `status`, `snapshot`, `describe`, `new`, `restore`, `undo`, `log`, `opLog`, refs, raw objects, worker file helpers
- unsupported or intentionally incomplete: full CLI parity, advanced rewrites, real conflict UI, submodules, symlink/executable fidelity, signing, multi-tab collaboration, guaranteed native parity for all revsets

This supersedes older planning that assumed `jj` could not run in the browser. The Flutter plan should treat `jj-wasm` as the web versioning backend, but it should not assume `jj-wasm` has native `jj` parity yet.

## 4. Product Scope

### 4.1 MVP Product Definition

The first mobile version should let a user:

- sign up, sign in, sign out, and recover access
- land on a cloud portfolio showing all their projects as folder/card tiles
- create a cloud-backed Aura project from the portfolio
- automatically save every project mutation to the cloud
- continue editing from local cache while temporary connectivity gaps resolve
- open and save `.aura` files
- view and manage multiple artifacts in a project
- generate and edit documents and presentations through chat
- view spreadsheet artifacts, with full spreadsheet editing staged later
- inspect version history
- undo recent project changes
- export/share artifacts or the full `.aura` project
- use Aura-managed model access by default, when the product tier supports it
- optionally provide their own model keys at the account or project level
- sync portfolio/project metadata across devices

### 4.2 Explicit Non-Goals For MVP

- Full desktop authoring parity
- Real-time collaboration
- Anonymous/offline-only use as the primary experience
- Open-source distribution
- Advanced `jj` operations exposed to users
- Full spreadsheet formula/query parity
- Pixel-perfect mobile editing for every generated HTML layout
- Native PowerPoint/PDF export parity on day one
- Team workspaces and organization-level admin controls

### 4.3 Target Platforms

Priority order:

1. iOS
2. Android
3. Flutter Web as a parity and optional web delivery target
4. macOS/Windows/Linux desktop only if useful for development and internal testing

## 5. Recommended Repository Structure

Use a private monorepo with Flutter apps, shared Dart packages, a Rust workspace, and Supabase configuration/functions:

```text
aura_flutter/
  apps/
    aura_mobile/
      lib/
      ios/
      android/
      web/
      test/
      integration_test/
  packages/
    aura_core/
      lib/src/models/
      lib/src/project_archive/
      lib/src/run_contracts/
      lib/src/artifacts/
    aura_ai/
      lib/src/providers/
      lib/src/workflows/
      lib/src/prompts/
    aura_cloud/
      lib/src/auth/
      lib/src/portfolio/
      lib/src/sync/
      lib/src/model_gateway/
    aura_ui/
      lib/src/shell/
      lib/src/auth/
      lib/src/portfolio/
      lib/src/artifacts/
      lib/src/chat/
      lib/src/version_history/
    aura_versioning/
      lib/src/versioning_repository.dart
      lib/src/snapshot_writer.dart
    aura_versioning_native/
      lib/
      rust/
    aura_versioning_web/
      lib/
      web/
  native/
    aura_jj_bridge/
      Cargo.toml
      src/
  web_jj_host/
    package.json
    src/
    dist/
  infra/
    supabase/
      config.toml
      migrations/
      functions/
        model-gateway/
        project-thumbnail/
        archive-validate/
        billing-webhook/
      seed.sql
    migrations/
    policies/
    deploy/
  tooling/
    fixtures/
    scripts/
  docs/
```

Recommended repo tooling:

- `melos` for Dart package orchestration
- `flutter_rust_bridge` or UniFFI for Rust bindings
- `build_runner` with `freezed` and `json_serializable` for stable Dart models
- `go_router` for navigation
- `riverpod` for state management and dependency injection
- `drift` or SQLite for local metadata/cache indexes
- Supabase Auth, Postgres/RLS, Storage, Edge Functions, and Vault/project secrets for MVP service needs
- direct Supabase client access for ordinary portfolio/project metadata operations protected by RLS
- Edge Functions for model proxying, secret use, archive validation, thumbnail generation, billing webhooks, and other privileged flows

## 6. Architecture Overview

```text
Flutter UI
  |
  v
App state and feature controllers
  |
  +-- Auth/session controller
  +-- Portfolio controller
  +-- Aura project domain models
  +-- Artifact renderers
  +-- AI workflow service
  +-- CloudProjectRepository
  +-- ModelGatewayRepository
  +-- VersioningRepository interface
          |
          +-- NativeJjRepository -> Rust bridge -> jj-lib
          |
          +-- WebJjRepository -> JS interop -> jj-wasm worker
          |
          +-- CloudVersionMetadata -> Supabase Postgres/Storage
```

The UI should never know whether versioning is native Rust, WASM, server-side, or a test fake. It should only know:

- write project snapshot
- snapshot/version project
- get status
- list history
- read version
- restore version
- undo operation
- fetch/push when remote support is enabled

### 6.1 MVP BaaS Architecture

Supabase should be the canonical user and project layer for MVP:

```text
Flutter app / Flutter Web
  |
  v
Supabase client SDK
  |
  +-- Supabase Auth
  +-- Postgres tables with RLS
  +-- Supabase Storage buckets
  +-- Supabase Realtime where useful
  +-- Edge Functions for privileged work
  |
  +-- model-gateway function
  +-- project-thumbnail function
  +-- archive-validate function
  +-- billing-webhook function
  +-- Supabase Vault/project secrets
```

Recommended MVP posture:

- Use Supabase Auth for email/password, magic link, password recovery, and optional OAuth.
- Use Postgres tables for profiles, projects, project versions, run records, sync metadata, and billing/entitlement state.
- Enable Row Level Security on exposed tables and write explicit owner/member policies before any client access ships.
- Use Supabase Storage buckets for `.aura` archives, generated thumbnails, exported artifacts, and large media.
- Use signed upload/download URLs or RLS-backed storage policies so users can only access their own project objects.
- Use Edge Functions for model gateway calls, provider secret use, archive validation, thumbnails, billing webhooks, and any operation requiring service-role access.
- Use Supabase Vault or Edge Function secrets for Aura-managed provider keys and BYOK references.
- Defer a full custom API/backend and long-running job system until there is a proven need. Heavy exports, collaborative editing, and server-side `jj` operations can graduate to a dedicated backend later.

### 6.2 Auth And Account Model

Authentication is part of MVP:

- sign up
- sign in
- magic link or password reset
- OAuth providers if configured
- session refresh
- secure token storage on mobile
- web session persistence for Flutter Web

Data ownership model:

- every project has an owner user ID
- future shared projects can add `project_members`
- MVP portfolio lists projects owned by the signed-in user
- imported `.aura` files become cloud projects owned by the importer

### 6.3 Cloud-Saved Project Model

Every project mutation should follow this sequence:

1. Apply the change to local in-memory project state.
2. Write the normalized snapshot to local device storage.
3. Create a local `jj` snapshot when available.
4. Upload the updated project archive or delta to Supabase Storage.
5. Upsert portfolio metadata in Supabase Postgres: title, updated time, artifact counts, thumbnail, sync status.
6. Mark local state as synced, pending, or conflicted.

The cloud current version should be the source of truth across devices. The local repository is a fast working cache and history tool. If a device is offline, changes enter a pending-sync queue and appear clearly in the UI.

### 6.4 Portfolio-First Routing

Route order:

```text
Launch
  -> Auth gate
      -> Sign in / Sign up
      -> Portfolio
          -> Project workspace
```

The portfolio is the first real product surface. It should show:

- project folder/card grid
- project title
- thumbnail or artifact-type icon stack
- last edited time
- sync status
- artifact count
- quick actions: open, rename, duplicate, export, delete
- create project button
- import `.aura` button
- search/filter

Opening a project should preserve the current Aura mental model inside the workspace.

## 7. Core Domain Model

### 7.1 Port The Current Project Types

Create Dart models matching the current TypeScript contracts:

- `AuraProject`
- `AuraCloudProject`
- `AuraPortfolioProject`
- `AuraDocument`
- `AuraDocumentType`
- `AuraChatMessage`
- `AuraProjectRules`
- `AuraContextPolicy`
- `AuraWorkflowPresetCollection`
- `AuraMediaAsset`
- `AuraMemoryTree`
- `AuraWorkbookMeta`
- `AuraChartSpec`
- `AuraRunResult`
- `AuraRunOutputsEnvelope`
- `AuraUser`
- `AuraSession`
- `AuraSyncState`
- `AuraModelCredentialRef`

Use generated JSON serialization, explicit schema version fields, and validation errors that can be shown in the UI.

Cloud-specific fields should be additive to the existing project model:

- `cloudProjectId`
- `ownerUserId`
- `lastSyncedAt`
- `syncState`
- `cloudVersionId`
- `thumbnailUrl`
- `storageObjectKey`
- `providerMode`: `aura-managed` or `byok`
- `modelCredentialRef`, never the raw key

### 7.2 `.aura` Archive Compatibility

Implement `aura_core/project_archive`:

- `readAuraArchive(bytes) -> AuraProject`
- `writeAuraArchive(project) -> Uint8List`
- `validateAuraArchive(bytes) -> ArchiveValidationReport`
- `normalizeProject(project) -> AuraProject`
- `migrateProject(project, fromVersion, toVersion)`

Initial compatibility target:

- read and write format `2.4`
- preserve unknown fields where possible
- reject legacy presentation-only archives consistently with the web app
- support version-history import/export only after the `jj` repository layout is stable

### 7.3 Normalized Snapshot Tree

Define a canonical working-copy tree for versioning:

```text
manifest.json
chat-history.json
project-rules.md
context-policy.json
workflow-presets.json
media.json
memory.json
documents/
  {documentId}.json
  {documentId}.html
  {documentId}.css
  {documentId}.{sheetId}.parquet
```

This mirrors the current browser snapshot strategy but should be treated as the versioning working tree, not necessarily as the exported `.aura` zip layout.

### 7.4 Cloud Data Model

Minimum MVP Supabase tables:

```text
users
  id
  email
  display_name
  avatar_url
  created_at

projects
  id
  owner_user_id
  title
  description
  visibility
  thumbnail_object_key
  current_archive_object_key
  current_version_id
  document_count
  artifact_type_counts
  created_at
  updated_at
  deleted_at

project_versions
  id
  project_id
  author_user_id
  message
  jj_change_id
  jj_commit_id
  archive_object_key
  changed_targets_json
  created_at

model_credentials
  id
  owner_user_id
  provider_id
  encrypted_secret_ref
  display_name
  created_at
  last_used_at

project_runs
  id
  project_id
  user_id
  status
  provider_mode
  model
  started_at
  completed_at
  error_code
```

In practice, `users` should usually be split between Supabase's built-in `auth.users` table and an app-owned `profiles` table keyed by `auth.users.id`.

Minimum object storage layout:

```text
users/{userId}/projects/{projectId}/current/project.aura
users/{userId}/projects/{projectId}/versions/{versionId}/project.aura
users/{userId}/projects/{projectId}/thumbnails/latest.png
users/{userId}/projects/{projectId}/exports/{exportId}/...
```

The portfolio screen should read from project metadata first, not by downloading every `.aura` archive. Archives are loaded only when opening, restoring, exporting, or validating a project.

RLS requirements:

- `profiles`: users can read/update their own profile.
- `projects`: users can select/insert/update/delete rows they own; future member access should go through `project_members`.
- `project_versions`: users can select/insert versions for projects they can access.
- `model_credentials`: users can manage only their own credential metadata; raw secrets should not be readable by the client.
- Storage buckets: users can access only object keys under projects they own or are members of.

## 8. Versioning Plan With Jujutsu

### 8.1 User-Facing Versioning Language

Do not expose raw `jj` terms in the primary UI. Use:

- Save version
- Recent changes
- Restore this version
- Undo last operation
- Create variant
- Saved to cloud
- Sync pending
- Resolve sync issue
- Compare versions

Advanced screens can reveal `jj` metadata for power users later.

### 8.2 Shared Dart Interface

Create `AuraVersioningRepository`:

```dart
abstract interface class AuraVersioningRepository {
  Future<void> initProjectRepo(AuraProjectRef project);
  Future<void> openProjectRepo(AuraProjectRef project);
  Future<VersionStatus> status();
  Future<SnapshotResult> snapshotProject({
    required AuraProject project,
    required String message,
    required VersionAuthor author,
    String? cloudVersionId,
  });
  Future<List<VersionEntry>> log({int limit = 50});
  Future<List<OperationEntry>> opLog({int limit = 50});
  Future<RestoreResult> restoreVersion(String revisionId);
  Future<UndoResult> undoLastOperation();
  Future<RemoteSyncResult> fetch();
  Future<RemoteSyncResult> push({String? remoteRef});
  Future<void> dispose();
}
```

The snapshot implementation should:

1. Serialize the project into the normalized snapshot tree.
2. Write that tree into the `jj` working copy.
3. Exclude `.jj`, `.git`, temp files, previews, and caches.
4. Call the platform backend's snapshot/describe equivalent.
5. Return version metadata for UI display and cloud sync.

Cloud save should be represented by a separate `CloudProjectRepository`:

```dart
abstract interface class CloudProjectRepository {
  Future<List<AuraPortfolioProject>> listPortfolio();
  Future<AuraProject> createProject(CreateProjectRequest request);
  Future<AuraProject> openProject(String cloudProjectId);
  Future<CloudSaveResult> saveProject({
    required AuraProject project,
    required Uint8List archiveBytes,
    required SnapshotResult? localSnapshot,
  });
  Future<void> deleteProject(String cloudProjectId);
  Future<AuraProject> restoreCloudVersion(String cloudProjectId, String versionId);
}
```

The versioning layer should not own account permissions or portfolio queries. The cloud repository owns the service contract; the `jj` layer owns local and eventual server-side history semantics.

MVP implementation detail:

- `listPortfolio`, `createProject`, `openProject`, and ordinary metadata updates can use the Supabase Flutter client directly with RLS.
- `saveProject` should upload the archive to Supabase Storage, then upsert `projects` and `project_versions` rows in a transaction-like flow. If this cannot be made sufficiently atomic from the client, wrap it in an Edge Function.
- `restoreCloudVersion` should prefer an Edge Function if it needs privileged copy/update behavior across Storage object keys.

### 8.3 Native Backend

Use a Rust crate, `aura_jj_bridge`, that wraps `jj-lib` directly.

Why direct Rust library integration:

- iOS should not rely on spawning a bundled executable.
- Android binary execution has packaging and permission friction.
- `jj-lib` was explicitly designed to be usable outside the CLI.
- A library bridge gives typed errors, cancellation, and progress events.

Native backend phases:

1. Build a desktop-only spike that shells out to local `jj` strictly to validate UX and snapshot semantics.
2. Replace the spike with a Rust `jj-lib` wrapper before mobile release.
3. Compile Rust for iOS and Android through the Flutter plugin.
4. Add HTTPS Git remote auth support.
5. Add parity tests against known `jj` CLI output for selected workflows.

Native API surface should start small:

- init/open repo
- write/read project files
- status
- snapshot
- describe
- log
- op log
- restore
- undo
- fetch/push

Defer:

- conflict-resolution UI
- rebase UI
- advanced revsets
- submodules
- signing
- multi-workspace workflows

### 8.4 Flutter Web Backend

Use the local `/vcs` package:

```json
{
  "dependencies": {
    "@craserf/jj-wasm": "github:CraserF/jj#<pinned-sha>"
  }
}
```

Do not import the worker package directly from Dart. Instead:

1. Create `web_jj_host`, a small TypeScript facade.
2. Bundle it with Vite or esbuild into a static web asset.
3. Expose a stable JavaScript API such as `globalThis.AuraJjWasm`.
4. Call that facade from Dart with `dart:js_interop`.

The facade should wrap:

- `createJjWorkerClient`
- progress subscriptions
- request timeout handling
- typed error normalization
- byte/string file writes
- repository locking errors

Web constraints:

- Browser remotes require CORS or a proxy.
- Storage quota can block large repos.
- Multi-tab support is intentionally narrow today.
- `rebase` and advanced rewrite operations are not ready.
- The app should detect unsupported operations and explain them plainly.

### 8.5 Versioning Parity Matrix

Every versioning operation should have tests for:

| Operation | Native | Web | Cloud service | MVP |
| --- | --- | --- | --- | --- |
| init local project | required | required | project row + storage path | yes |
| snapshot project | required | required | version row + archive upload | yes |
| status | required | required | sync state | yes |
| log | required | required | version metadata | yes |
| op log | required | required | sync/audit events | yes |
| undo | required | required | upload resulting archive | yes |
| restore | required | required | restore version archive | yes |
| clone | required | required | cloud import/share later | after MVP |
| fetch | required | required with CORS/proxy | cloud open/refresh | yes |
| push | required | required with CORS/proxy | cloud save | yes |
| conflicts | detect only | detect only | detect divergent cloud version | after MVP |
| advanced revsets | partial | partial | not exposed | after MVP |

## 9. AI Workflow Plan

### 9.1 Provider Strategy

Start with a Supabase Edge Function model gateway as the default path, then keep direct BYOK/device calls as an explicit advanced option.

Default mode:

- user signs in
- app invokes the Supabase `model-gateway` Edge Function
- the function validates the Supabase JWT and checks entitlements/usage limits
- the function calls Aura-managed model providers with secrets unavailable to the client
- app receives streamed progress and output events

BYOK mode:

- user adds provider credentials in account settings or project settings
- secrets are stored via Supabase Vault/project secrets, an encrypted secret reference, or on-device only if the user explicitly chooses local-only BYOK
- the workflow still uses the same model gateway contract
- users can choose a provider/model per project when their plan allows it

Provider support should include:

- OpenAI
- Anthropic
- Google Gemini
- OpenAI-compatible endpoints
- Ollama/local endpoint when reachable from the device

The app-facing provider layer should expose:

```dart
abstract interface class AuraModelProvider {
  Stream<ModelChunk> streamText(ModelRequest request);
  Future<ModelObjectResult<T>> generateObject<T>(
    ModelRequest request,
    JsonSchema schema,
  );
}
```

This mirrors the existing AI SDK capabilities without importing browser-specific dependencies.

The Edge Function should expose a streaming endpoint with the same conceptual shape, so Flutter does not care whether the request is fulfilled by Aura-managed keys, encrypted BYOK, or a direct local provider.

### 9.2 Workflow Runtime

Port the run engine concepts:

- run ID
- status state
- abort signal/cancellation
- step start/done/error events
- streaming chunks
- progress events
- structured run result envelope
- warnings
- changed targets
- validation summary

Begin with documents and presentations:

- Document create/edit: plan -> generate -> QA -> finalize
- Presentation create/edit: plan -> design -> QA -> optional review/revise -> finalize

Spreadsheet prompt operations should be staged after the project and versioning foundations are stable.

### 9.3 Prompt and Template Sharing

Do not hard-code copied prompt strings in several places. Create a migration path:

1. Extract stable prompt sections from the React app into versioned Markdown/JSON assets.
2. Load them in Flutter as bundled assets.
3. Add prompt snapshot tests to verify meaningful parity.
4. Later, consider moving shared prompt assets to a separate package consumed by both repos.

### 9.4 Local Model Constraints

Carry over the current local-model learnings:

- provider capability profiles
- stricter prompt constraints for local models
- bounded correction loops
- continuous progress heartbeats
- fallback to usable drafts when polish exceeds budget

Mobile networks and local-provider connectivity will be less predictable than desktop browser use, so progress and cancellation need to be first-class.

## 10. Artifact Rendering Plan

### 10.1 Presentations

MVP:

- Render existing Reveal-style slide HTML inside a WebView on iOS/Android.
- Render through `HtmlElementView` or an iframe-like host on Flutter Web.
- Keep the fixed 16:9 stage.
- Use Flutter chrome for navigation, thumbnails, chat, validation, and version history.
- Inject a small bridge script for slide navigation and measurement.

Later:

- Native thumbnail generation
- slide outline editor
- element-level edit affordances
- server/native export improvements

### 10.2 Documents

MVP:

- Render sanitized document HTML in a WebView.
- Add Flutter-native document metadata, outline, and quick actions.
- Provide basic source Markdown/text editing when available.

Later:

- Native rich-text document editor
- page preview mode
- improved DOCX/PDF export
- linked table refresh UI

### 10.3 Spreadsheets

MVP:

- Preserve spreadsheet artifacts in `.aura` archives.
- Show workbook metadata and lightweight table previews where possible.
- Avoid corrupting spreadsheet data on round trip.

Phase 2:

- Native grid renderer
- CSV/XLSX import
- basic cell editing
- local persistence for workbook tables

Phase 3:

- Analytical engine parity with the web app's DuckDB design
- prompt-to-formula/query
- linked charts and tables
- Parquet round-trip

Do not block the first mobile release on full spreadsheet parity.

### 10.4 Renderer Security

All HTML artifact rendering should use:

- local-only asset loading by default
- strict navigation delegate
- blocked arbitrary external navigation
- sanitized HTML from the workflow layer
- no ambient access to API keys
- explicit bridge channels with narrow message schemas

## 11. Mobile UX Plan

### 11.1 Navigation Model

Primary screens:

- Auth gate
- Sign in / sign up
- Project portfolio
- Project workspace
- Artifact viewer
- Chat sheet
- Version history
- Provider settings
- Import/export/share
- Validation and publish readiness

The first screen after authentication is always the portfolio. The portfolio should feel like a project shelf: compact folders/cards, quick recognition, and fast re-entry. It should not start the user inside a blank editor.

Portfolio layout:

```text
Top app bar
  logo, search, account/avatar

Project grid/list
  folder/card tiles with thumbnail, title, artifact icons, last edited, sync state

Primary actions
  new project, import .aura

Secondary actions
  filter/sort, account settings, provider settings
```

Workspace layout:

```text
Top app bar
  project title, active artifact, actions

Main artifact surface
  contained presentation/document/spreadsheet viewer

Bottom command bar
  chat, artifacts, history, validate, export

Modal/bottom sheets
  chat thread
  artifact navigator
  version history
  settings
  validation results
```

### 11.2 Chat UX

Use a persistent bottom command field plus expandable chat sheet:

- one-line prompt bar
- attachment button
- provider/status indicator
- send/cancel button
- progress timeline while running
- scoped chat chips: current artifact, all project, selected artifacts

Carry over existing chat scoping:

- active artifact scope by default
- all chat view
- multi-doc/project context opt-in

### 11.3 Version History UX

Mobile version history should be human-first:

- timeline of saved versions
- generated summary and changed artifact chips
- restore button
- undo last operation
- compare later

Each version entry should show:

- title/message
- timestamp
- changed targets
- author/device
- short generated summary when available

### 11.4 Artifact Controls

Presentation:

- previous/next
- fit/zoom
- slide strip sheet
- present/share

Document:

- outline
- find
- page/scroll toggle if supported
- export/share

Spreadsheet:

- sheet tabs
- filter/search
- edit later

## 12. Flutter Web Strategy

Flutter Web has three possible roles:

1. Shared-code parity target for the mobile app.
2. Standalone authenticated web build for users who prefer the Flutter experience.
3. Embedded module inside the existing React app for selected surfaces.

Recommended sequence:

1. Build standalone Flutter Web first.
2. Use it to validate auth, portfolio access, `aura_core`, cloud save/load, AI workflows, and `jj-wasm`.
3. Only then evaluate embedding into the React app with Flutter web embedded mode or iframe/full-page mode.

Do not make the React app depend on Flutter during the mobile MVP. Keep repo boundaries clean.

## 13. Implementation Phases

### Phase 0: Technical Spikes

Duration: 1-2 weeks

Deliverables:

- private repo skeleton
- Supabase project/local stack setup
- Supabase Auth hello-world
- Supabase Postgres/RLS and Storage spike
- first Edge Function hello-world
- `.aura` archive read/write spike
- Rust bridge hello-world on iOS and Android
- `jj-lib` feasibility spike for init/status/snapshot
- Flutter Web JS interop spike calling a bundled `jj-wasm` facade
- WebView artifact rendering spike for one presentation and one document

Acceptance:

- iOS and Android builds run on device/simulator
- Flutter Web build runs locally
- a signed-in test user can create a cloud project record
- a fixture `.aura` archive round-trips without data loss
- the archive uploads to and downloads from Supabase Storage
- a `jj` snapshot is created on native and web backends

### Phase 1: Auth, Portfolio, Core Project Model, And Cloud Storage

Duration: 3-4 weeks

Deliverables:

- sign up/sign in/sign out
- session persistence and refresh
- first-route auth gate
- portfolio grid/list screen
- cloud project create/open/rename/delete
- Dart project/domain models
- archive serializer/deserializer
- local project cache index
- open/import `.aura`
- create blank project
- save/export `.aura`
- automatic cloud save for every opened project
- project thumbnail/icon metadata
- RLS policies for project metadata and storage access
- fixture-based compatibility tests from current Aura

Acceptance:

- unauthenticated users see sign in/sign up before product screens
- signed-in users land on portfolio
- new projects appear in the cloud portfolio without manual export
- fixtures from the React app load in Flutter
- Flutter-exported archives load in the React app
- cloud-downloaded archives match locally saved archives
- unknown optional fields are preserved or safely ignored
- local cache can re-open the last project while cloud refresh is pending

### Phase 2: Versioning Backend And Cloud Version Records

Duration: 3-5 weeks

Deliverables:

- `AuraVersioningRepository` interface
- `CloudProjectRepository` sync integration
- native Rust bridge for init/status/snapshot/log/opLog/undo/restore
- web JS facade for `jj-wasm`
- snapshot writer
- Supabase project version records and archive object keys
- version history sheet
- versioning test matrix

Acceptance:

- native and web pass the same versioning contract tests
- user can save a version, view history, undo, and restore across cloud-backed projects
- every successful save updates cloud metadata and the project archive
- portfolio tiles reflect updated title/thumbnail/last-edited state
- versioning errors are recoverable and human-readable
- no direct Git/JJ jargon appears in primary UI

### Phase 3: Artifact Viewer And Mobile Shell

Duration: 3-4 weeks

Deliverables:

- project workspace shell
- artifact navigator
- presentation renderer
- document renderer
- basic spreadsheet placeholder/preview
- bottom chat command surface without AI execution yet
- responsive Flutter Web layout
- cloud sync indicator in the workspace shell

Acceptance:

- presentation frames preserve 16:9 on mobile portrait, mobile landscape, tablet, and web desktop
- document boundaries remain visible and readable
- artifact switching is fast
- WebView navigation is locked down
- returning to portfolio shows the updated project state

### Phase 4: AI Workflow MVP

Duration: 4-6 weeks

Deliverables:

- Supabase Edge Function model gateway
- Aura-managed model route
- BYOK credential setup and encrypted credential references
- provider settings
- OpenAI-compatible streaming adapter
- Anthropic and Gemini adapters if needed for parity
- document create/edit workflow
- presentation create/edit workflow
- run progress/events
- cancellation
- run result envelope
- mutation of active project documents
- automatic version snapshot after successful artifact mutation
- automatic cloud save after successful artifact mutation

Acceptance:

- create and edit one document
- create and edit one presentation
- default hosted model mode works for a signed-in entitled test user
- BYOK mode works for at least one OpenAI-compatible provider
- progress stays visible during long runs
- failed runs do not corrupt the project
- successful runs create a version history entry and update the cloud portfolio

### Phase 5: Export, Share, And Validation

Duration: 2-4 weeks

Deliverables:

- share `.aura`
- download/export project archive from cloud
- export document HTML
- export presentation HTML
- mobile-friendly validation panel
- publish/readiness summary
- basic PDF/share path where platform allows

Acceptance:

- mobile-created project can be shared to desktop Aura
- cloud project can be exported as `.aura`
- validation issues are actionable
- export failures preserve project state

### Phase 6: Advanced Sync, Sharing, And Service Hardening

Duration: after MVP

Deliverables:

- cross-device conflict detection
- project duplicate/fork
- private share links or invited project viewers
- Supabase Edge Functions for lightweight preview/export orchestration
- optional dedicated workers for heavy exports or long-running jobs
- billing/entitlement enforcement
- audit/run history
- optional Git remote URL configuration
- clone/fetch/push for native power-user workflows
- web remote support with documented CORS/proxy path if exposed
- credential storage
- sync status UI

Acceptance:

- cloud sync works across two signed-in devices
- divergent edits are detected and recoverable
- service entitlements can limit Aura-managed model usage
- optional remote sync works against a controlled Git fixture
- credentials are stored in platform secure storage
- web clearly reports CORS/proxy constraints

### Phase 7: Spreadsheet And Advanced Editing

Duration: after document/presentation parity

Deliverables:

- native spreadsheet grid
- data import
- formula/query workflows
- linked table/chart refresh
- Parquet round-trip

Acceptance:

- spreadsheet artifacts no longer only preserve data, they become editable
- linked tables and charts refresh correctly
- large-table workflows are tested on device

## 14. Testing Strategy

### 14.1 Cross-Repo Fixtures

Create shared fixture packs:

- blank project
- single document project
- single presentation project
- multi-artifact project
- project with media
- project with memory
- project with version history
- spreadsheet project
- malformed archives

Run every fixture through:

- React app load
- Flutter load
- Flutter save
- cloud upload
- cloud download
- React reload
- snapshot normalization diff

### 14.2 Versioning Tests

Contract tests should run against:

- fake in-memory repository
- native Rust backend
- web `jj-wasm` backend

Test:

- initial snapshot
- no-op snapshot
- document update
- artifact delete
- restore old version
- undo last operation
- corrupt metadata handling
- remote fixture when enabled

### 14.3 Visual Tests

Use golden or screenshot tests for:

- mobile portrait presentation frame
- mobile landscape presentation frame
- tablet document frame
- chat sheet
- version history sheet
- provider settings

Use real device integration tests before release.

### 14.4 AI Workflow Tests

Port the current scenario approach:

- prompt routing
- active artifact scoping
- run result envelope
- progress event sequence
- cancellation
- provider failure
- validation warnings
- mobile-safe generated layout checks

### 14.5 Auth And Cloud Tests

Add service-level and app integration coverage for:

- sign up/sign in/session refresh/sign out
- RLS owner isolation for project metadata
- Storage access isolation for project archives
- portfolio list after project create/rename/delete
- import `.aura` into cloud project
- automatic save after artifact mutation
- local pending-sync queue
- cloud restore of older version
- BYOK credential create/use/delete without exposing raw keys to app logs
- entitlement failure for Aura-managed model usage
- two-device stale project detection

## 15. Security And Privacy

MVP requirements:

- authenticated access required for project creation and cloud portfolio
- short-lived access tokens and refresh tokens handled by Supabase Auth
- tokens stored with platform secure storage on mobile
- API keys stored with platform secure storage on mobile
- server-stored BYOK secrets encrypted through Supabase Vault/project secrets or an equivalent managed secret path
- Aura-managed model provider keys never shipped to clients
- privacy-conscious operational analytics for reliability, abuse prevention, and product health
- Supabase required for default project persistence and model gateway
- local projects stored inside app sandbox
- cloud projects stored in per-user object paths with access-control checks
- share/export only through explicit user action
- WebView bridge messages validated
- rendered artifact HTML cannot read provider keys
- sync credentials separated from model credentials
- logs redact prompts, project content, and provider secrets unless explicit debug consent is given

Flutter Web requirements:

- warn users about browser storage limits
- do not expose API keys to artifact iframes/WebViews
- CORS proxy must be trusted and configurable for any optional Git remote workflows
- session cookies/tokens must use secure browser settings

## 16. Key Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Cloud-first scope grows MVP | Release delays | Treat auth/portfolio/cloud current-save as P0, defer collaboration and advanced sync |
| Supabase lock-in or limits | Migration cost | Keep storage/archive and repository interfaces app-owned; isolate Supabase calls in `aura_cloud` |
| RLS policy mistakes | Data exposure risk | Write policy tests, default-deny tables, use least-privilege Edge Functions |
| Edge Functions are a poor fit for long jobs | Export/AI workflow limits | Keep Edge Functions short and idempotent; graduate heavy jobs to dedicated workers later |
| Service outage blocks access | User trust damage | Local cache, clear status, export support, retry queue |
| BYOK secret handling mistakes | Severe security risk | Use Supabase Vault/project secrets or equivalent managed secret storage, never log secrets, narrow model gateway access |
| Aura-managed model costs spike | Margin risk | Entitlements, quotas, per-run cost tracking, budget alerts |
| Proprietary repo slows external feedback | Quality risk | Strong internal QA, private beta, crash/error reporting, fixture sharing |
| `jj-lib` API instability | Native bridge churn | Keep bridge small, pin upstream SHA, wrap in app-owned DTOs |
| iOS native Rust build complexity | Release delays | Spike first, use generated bridge tooling, CI on iOS simulator early |
| Web `jj-wasm` parity gaps | Flutter Web differences | Capability-detect and keep shared interface conservative |
| Optional Git remote auth and CORS | Sync delays | Keep default sync on Aura cloud; defer direct Git remotes |
| WebView artifact rendering quirks | Visual regressions | Keep Flutter frame controls outside WebView and test real devices |
| Large `.aura` files | Mobile memory pressure | Stream archive reads/writes where possible, add size warnings |
| AI provider API drift | Runtime failures | Keep provider adapters isolated and covered by mock HTTP tests |
| Spreadsheet parity complexity | MVP slip | Preserve spreadsheets first, edit them later |

## 17. Recommended First Milestone

Create a private repo and aim for a six-spike milestone:

1. Authenticated test user can sign in and land on a portfolio screen.
2. Portfolio can create a Supabase-backed cloud project, upload a `.aura` archive, and reopen it.
3. `.aura` archive round-trip with fixtures from Aura.
4. Native Rust bridge creates a local `jj` snapshot for a normalized project tree.
5. Flutter Web calls the `/vcs` `jj-wasm` worker facade and creates the same snapshot.
6. Flutter renders one presentation and one document fixture in a mobile shell after opening a portfolio project.

This milestone proves the hard parts without committing to the full AI port too early: Supabase auth, portfolio-first routing, cloud persistence, archive compatibility, native/web `jj`, and mobile artifact rendering.

## 18. Open Decisions

- Confirm Supabase as MVP BaaS, or define the specific blocker that would force an alternative.
- Which project storage shape should be canonical: full archive upload per save, archive plus deltas, or server-side normalized tree?
- Should BYOK secrets be server-stored by default, device-stored only, or user-selectable?
- What is included in Aura-managed model access for the first beta tier?
- Should Flutter Web be shipped to users or remain an internal parity target at first?
- Which provider should be first for AI MVP: OpenAI-compatible only, or full OpenAI/Anthropic/Gemini parity?
- Should the first release support editing existing projects only, or full create/edit generation?
- Should project sharing be included in beta, or delayed until after personal cloud portfolios are stable?
- Which Supabase features are acceptable for MVP versus requiring a dedicated backend later: Edge Functions, Realtime, Vault, Storage signed URLs, or external workers?

## 19. External References

- Upstream Jujutsu: https://github.com/jj-vcs/jj
- Jujutsu documentation: https://docs.jj-vcs.dev
- Flutter Web support: https://docs.flutter.dev/platform-integration/web
- Flutter Web embedding: https://docs.flutter.dev/platform-integration/web/embedding-flutter-web
- Flutter native FFI: https://docs.flutter.dev/platform-integration/bind-native-code
- Dart C interop: https://dart.dev/interop/c-interop
- Dart JS interop: https://dart.dev/interop/js-interop
- `flutter_rust_bridge`: https://pub.dev/packages/flutter_rust_bridge
- `webview_flutter`: https://pub.dev/packages/webview_flutter
- Supabase Auth: https://supabase.com/docs/guides/auth
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Storage: https://supabase.com/docs/guides/storage
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Supabase Vault: https://supabase.com/docs/guides/database/vault

## 20. Local References Inspected

- `/Volumes/Callum_SSD/dev_projects/aura_web/README.md`
- `/Volumes/Callum_SSD/dev_projects/aura_web/docs/architecture.md`
- `/Volumes/Callum_SSD/dev_projects/aura_web/docs/agent-architecture.md`
- `/Volumes/Callum_SSD/dev_projects/aura_web/docs/workstream-f-mobile-adaptive-artifacts.md`
- `/Volumes/Callum_SSD/dev_projects/aura_web/docs/roadmap/account-creation-cloud-plan.md`
- `/Volumes/Callum_SSD/dev_projects/aura_web/src/services/storage/projectFormat.ts`
- `/Volumes/Callum_SSD/dev_projects/aura_web/src/services/storage/versionHistory.ts`
- `/Volumes/Callum_SSD/dev_projects/aura_web/src/types/project.ts`
- `/Volumes/Callum_SSD/dev_projects/vcs/jj-wasm/README.md`
- `/Volumes/Callum_SSD/dev_projects/vcs/jj-wasm/API.md`
- `/Volumes/Callum_SSD/dev_projects/vcs/jj-wasm/COVERAGE.md`
- `/Volumes/Callum_SSD/dev_projects/vcs/npm/jj-wasm/worker-client.js`
- `/Volumes/Callum_SSD/dev_projects/vcs/npm/jj-wasm/types.d.ts`
- `/Volumes/Callum_SSD/dev_projects/vcs/docs/technical/architecture.md`
- `/Volumes/Callum_SSD/dev_projects/vcs/docs/technical/concurrency.md`
