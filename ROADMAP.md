# Aura — Project Roadmap & Development Principles

> **One app for all productivity needs, fully controlled by AI.**

Aura is an open-source, AI-powered productivity suite that generates high-quality presentations, documents, and spreadsheets from natural language. Users describe what they want; AI builds it. No manual editing — by design.

This document captures the initial vision, roadmap, architecture decisions, and development principles that govern the project.

---

## Table of Contents

- [Vision](#vision)
- [Core Concept](#core-concept)
- [MVP Scope](#mvp-scope)
- [Architecture](#architecture)
- [Roadmap](#roadmap)
  - [Phase 1 — Foundation](#phase-1--foundation)
  - [Phase 2 — Shell](#phase-2--shell)
  - [Phase 3 — Brain](#phase-3--brain)
  - [Phase 4 — Storage](#phase-4--storage)
  - [Phase 5 — Polish](#phase-5--polish)
  - [Future Phases](#future-phases)
- [Architecture Decisions](#architecture-decisions)
- [Development Principles](#development-principles)
- [Contributing](#contributing)

---

## Vision

A single productivity application — presentations, documents, spreadsheets — where every output is generated and refined through conversation with AI. Think of it as the productivity equivalent of Claude's `show_widget` rendering tool: describe what you want, get a fully styled, interactive result.

**Long-term goals:**
- Presentations with cinematic transitions and beautiful graphics
- Documents with rich formatting, high-quality visuals, and dynamic layouts
- Spreadsheets with fast rendering, live calculations, and AI-driven analysis
- A custom file format built on HTML/Markdown with granular CSS customisation by AI
- Cloud sync, collaboration, and cross-platform support (web, desktop, mobile)

---

## Core Concept

- **AI-first, not AI-assisted.** The AI is not a feature bolted onto an editor — it *is* the editor. There is no manual formatting toolbar, no drag-and-drop, no WYSIWYG. The user describes intent; the AI executes.
- **HTML/CSS under the hood.** All outputs are structured HTML styled with CSS. This gives the AI granular, unlimited control over layout, typography, color, animation, and responsiveness — far beyond what any traditional editor template system can offer.
- **Open format, open source.** The `.aura` file format is a zip bundle of standard web files (HTML, CSS, JSON). No vendor lock-in. The entire application is open source.

---

## MVP Scope

The MVP is **presentations only**. It is deliberately minimal.

### Included
- AI-generated slide decks from natural language prompts
- Chat-based iterative refinement ("make slide 3 more visual")
- Full-screen presentation mode with rich transitions and animations
- Slide navigation and thumbnail strip
- Configurable AI provider (OpenAI, Gemini, Deepseek, Anthropic)
- Save/load custom `.aura` file format (local download)
- Auto-save to browser IndexedDB
- Visible AI working feedback (shimmer, skeleton, progress indicators)

### Excluded (post-MVP)
- Cloud storage and sync
- Real-time collaboration
- Direct/manual slide editing
- Image upload and asset management
- Speaker notes
- Export to PDF, PPTX, or other formats
- Word processing (documents)
- Spreadsheets
- User accounts and authentication

---

## Architecture

### Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Framework | React 18 + TypeScript | Native JS integration with reveal.js, strong typing, large ecosystem |
| Runtime & Build | Bun + Vite | Bun for package management and script running (faster installs, native TS). Vite for HMR and bundling. Scales to Electron/PWA. |
| Presentation | reveal.js | Best-in-class embeddable presentation engine with full programmatic API |
| State | Zustand | Minimal boilerplate, no Redux ceremony, perfect for this scope |
| Styling | Tailwind CSS | Rapid iteration, consistent design system, utility-first |
| AI | Vercel AI SDK (`ai`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`) | Unified streaming + structured output, provider-agnostic, Zod validation |
| Validation | Zod | Schema validation for structured LLM output (outlines, reviews) |
| File Format | JSZip + FileSaver | Zip-based `.aura` bundles, browser-native |
| Persistence | IndexedDB | Auto-save without a server |

### Layout

```
┌──────────────────────────────────────────────────────┐
│  Toolbar: [Logo]      [Title]     [Save][DL][▶][⚙]  │
├──────────────────────────────────────────────────────┤
│                                                      │
│                                                      │
│               Presentation Canvas                    │
│                  (reveal.js)                          │
│                                                      │
│                                                      │
├──────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────┐     │
│  │       "Describe your presentation..."       │     │
│  └─────────────────────────────────────────────┘     │
│  [slide1] [slide2] [slide3] [slide4] ...             │
└──────────────────────────────────────────────────────┘
```

- **Edit mode**: Toolbar + canvas + floating chat bar + slide thumbnail strip
- **Present mode**: Pure fullscreen reveal.js, ESC to return

### `.aura` File Format

A `.aura` file is a zip archive containing:

```
presentation.aura (zip)
├── manifest.json       # { version, title, slideCount, createdAt, updatedAt }
├── slides.html         # Raw <section> elements for reveal.js
├── theme.css           # Custom CSS for the presentation
└── chat-history.json   # Message array for continued AI editing
```

### Project Structure

```
src/
├── components/
│   ├── Canvas/
│   │   ├── PresentationCanvas.tsx    # reveal.js React wrapper
│   │   ├── SlideStrip.tsx            # Horizontal thumbnail strip
│   │   └── SlideOverlay.tsx          # Controls overlay on canvas
│   ├── Chat/
│   │   ├── ChatBar.tsx               # Bottom chat input bar
│   │   ├── ChatMessage.tsx           # Message bubble
│   │   └── AIWorkingIndicator.tsx    # Shimmer/pulse generation feedback
│   ├── Toolbar/
│   │   └── Toolbar.tsx               # Top bar with actions
│   └── Settings/
│       └── ProviderModal.tsx         # AI provider configuration modal
├── services/
│   ├── ai/
│   │   ├── types.ts                  # ProviderEntry interface, AIMessage type
│   │   ├── registry.ts              # AI SDK provider factory registry
│   │   ├── schemas/                 # Zod schemas for structured LLM output
│   │   ├── prompts/                 # Modular PromptComposer system (12 sections)
│   │   ├── workflow/                # Multi-agent pipeline engine
│   │   │   ├── engine.ts           # Workflow runner, LLMClient factory
│   │   │   ├── presentation.ts     # Pipeline definition (plan→design→QA→review→revise)
│   │   │   ├── agents/             # Individual agent implementations
│   │   │   └── steps/              # Step wrappers with retry/timeout
│   │   ├── templates/              # Template registry, palettes, blueprints
│   │   ├── knowledge/              # Knowledge base docs for prompt augmentation
│   │   ├── utils/                  # HTML extraction, sanitization, font injection
│   │   └── validation/             # Intent classification, content validation
│   ├── presentation/
│   │   ├── engine.ts                # reveal.js lifecycle & API wrapper
│   │   └── themes.ts               # Built-in theme CSS
│   └── storage/
│       ├── autosave.ts              # IndexedDB auto-persist
│       └── fileFormat.ts            # .aura zip pack/unpack
├── stores/
│   ├── presentationStore.ts          # Slide HTML, navigation, mode state
│   ├── chatStore.ts                  # Chat history, streaming state
│   └── settingsStore.ts             # Provider, API key, preferences
├── types/
│   └── index.ts                      # Shared TypeScript types
└── styles/
    ├── index.css                     # Tailwind imports + resets
    └── reveal-overrides.css          # Overrides for embedded reveal.js
```

---

## Roadmap

### Completed Phases (MVP)

Phases 1–5 delivered the MVP: presentation generation, document generation, chat-based refinement, .aura file format, auto-save, and AI workflow pipeline. See git history for details.

### Next Wave — Detailed Plans

Each feature has a standalone implementation plan with milestones, validation requirements, and open questions:

- [Charts Integration Plan](docs/roadmap/charts-integration-plan.md) — chart runtime completion + DuckDB data layer
- [Spreadsheet Integration Plan](docs/roadmap/spreadsheet-integration-plan.md) — prompt-first spreadsheets on DuckDB
- [Memory Markdown Plan](docs/roadmap/memory-markdown-plan.md) — semantic file-based memory with L0/L1/L2 hierarchy
- [Account Creation, Cloud, and Collaboration Plan](docs/roadmap/account-creation-cloud-plan.md) — Supabase BaaS, portfolio, versioning
- [API Platform & Visual Automation Plan](docs/roadmap/api-platform-plan.md) — Hono API server, automation builder
- [MCP Integration Plan](docs/roadmap/mcp-integration-plan.md) — MCP server for external LLM clients
- [UX Improvements Plan](docs/roadmap/ux-improvements-plan.md) — multi-slide queue, PDF fixes, UI polish

### Dependency Graph

```
UX M1 (PDF fix + quick wins)    Phase 6: Charts M1      Phase 7: Memory M1
  (independent — start now)     (chart runtime)          (file format + local)
                                  ↓                        ↓
UX M2 (multi-slide queue)      Phase 6: Charts M2  ←→  Phase 7: Memory M2
  (independent — start now)     (DuckDB foundation)      (capture + retrieval)
                                  ↓                        ↓
UX M3 (UI polish)              Phase 8: Spreadsheets   Phase 9: Account/Cloud M1
  (incremental, any time)       M1 (grid + ingestion)   (Supabase auth + storage)
                                  ↓                        ↓
                                Phase 8: Spreadsheets   Phase 9: Account/Cloud M2
                                M2 (prompt-to-SQL)       (portfolio + sync)
                                  ↓                        ↓
                                Phase 8: Spreadsheets   Phase 9: Account/Cloud M3–M4
                                M3 (linking + interop)   (versioning + explore)
                                                           ↓
                                                    Phase 10: API M1 + MCP M1
                                                    (server + read-only tools)
                                                           ↓
                                                    Phase 10: API M2 + MCP M2
                                                    (write tools + workflows)
                                                           ↓
                                                    Phase 10: API M3 + MCP M3
                                                    (automation builder + hardening)
```

### Parallelization Guide

Multiple developers/agents can work simultaneously on these independent tracks:

| Track | Can start now | Depends on |
|-------|--------------|------------|
| **UX M1** (PDF chart fix + quick wins) | Yes | Nothing — independent |
| **UX M2** (multi-slide queue) | Yes | Nothing — touches planner + orchestrator only |
| **UX M3** (UI polish) | Yes | Nothing — incremental, do alongside other work |
| **Charts M1** (runtime completion) | Yes | Nothing — independent |
| **Charts M2** (DuckDB foundation) | Yes | Nothing — independent |
| **Memory M1** (file format + storage) | Yes | Nothing — independent |
| **Spreadsheets M1** (grid UI scaffolding) | Yes | Grid renderer is independent of DuckDB |
| **Spreadsheets M1** (DuckDB wiring) | After Charts M2 | Shared DuckDB service |
| **Memory M2** (capture + retrieval) | After Memory M1 | Memory file format |
| **Account/Cloud M1** (auth + storage) | After Memory M1 | Memory format for sync |
| **Account/Cloud M2** (portfolio) | After Account M1 | Auth + storage |
| **Account/Cloud M3** (versioning) | After Account M1 | Auth (parallel with M2) |
| **API M1** | After Account M1 | Auth tokens |
| **MCP M1** | After Account M1 | Auth tokens (parallel with API) |

### UX Improvements (cross-cutting, start immediately)
> Multi-slide queue, PDF export fixes, UI polish. No dependencies — can run in parallel with everything.

| Milestone | Key deliverables | Parallel? |
|-----------|-----------------|-----------|
| **UX M1** — Critical Fixes + Quick Wins | Chart flattening for PDF export (P0), memoized chat messages, smart loading messages, confirmation dialogs | Yes — independent |
| **UX M2** — Multi-Slide Queue | `batch_create` intent detection, shared style context, queued sequential generation, abbreviated prompts for slides 2-N (30-40% token savings), generation lock, progress UI | Yes — independent |
| **UX M3** — UI Polish | `react-resizable-panels` for chat/canvas split, state-driven animations, OKLCH color tokens, streaming feedback hierarchy, presentation PDF (slide-per-page) | Yes — incremental |

**Key design decisions:**
- Multi-slide batch only triggered when user explicitly describes multiple distinct slides
- Single-slide paradigm remains the default (no change for typical usage)
- Shared style context generated once, referenced by all slides in a batch (token savings)
- Generation lock: one generation per document type at a time
- Chart flattening: `chart.toBase64Image()` → replace `<canvas>` with `<img>` before html2pdf
- Server-side PDF (Playwright) deferred to Phase 10 when API server exists

### Phase 6 — Charts + Data Layer
> Complete chart runtime. Introduce DuckDB-WASM as shared data engine.

| Milestone | Key deliverables | Parallel? |
|-----------|-----------------|-----------|
| **Charts M1** — Runtime Completion | Document iframe chart hydration, PDF/DOCX export chart flattening, chart data editor dialog | Yes — independent |
| **Charts M2** — DuckDB Foundation | `@duckdb/duckdb-wasm` lazy singleton, Parquet↔IndexedDB persistence, extract APIs (describeTable, sampleRows, aggregateQuery), CSV/JSON/XLSX ingestion | Yes — independent |
| **Charts M3** — Data Integration | ChartSpec DataSource extension, extract APIs as AI tools, prompt guardrails, chart-from-table workflow | After M1 + M2 |

**Key technology decisions:**
- DuckDB-WASM (~10 MB gzipped, lazy-loaded) as the single analytical engine
- SheetJS for XLSX parsing (DuckDB handles CSV/JSON natively)
- No Polars initially — evaluate post-M2 benchmarks
- Parquet as persistence format in .aura files and IndexedDB

### Phase 7 — Memory System
> Semantic file-based memory with hierarchical detail and privacy boundaries.

| Milestone | Key deliverables | Parallel? |
|-----------|-----------------|-----------|
| **Memory M1** — File Standard | AMF schema + Zod validators, memory file read/write utilities, L0/L1/L2 summary generation, cross-reference `[[link]]` parser | Yes — independent |
| **Memory M2** — Capture + Retrieval | Memory extraction pipeline (LLM structured output → dedup → write), local embedding index, hierarchical retrieval (L0→L1→L2), context assembly with token budgeting | After M1 |
| **Memory M3** — Privacy + Multi-User | Per-user encryption (envelope: root→KEK→DEK), role-aware access, skill export/import, memory compaction | After M2 + Account M1 |

**Key design decisions:**
- L0/L1/L2 hierarchy (adapted from OpenViking): ~100 tokens / ~2K tokens / unlimited
- 8 memory categories with explicit update strategies (merge/append/immutable)
- Markdown + YAML frontmatter format — human-readable, portable
- Local-first retrieval (TF-IDF initially, upgrade to embeddings with cloud)

### Phase 8 — Spreadsheets
> Prompt-first spreadsheets with DuckDB-WASM backend and linked content.

| Milestone | Key deliverables | Parallel? |
|-----------|-----------------|-----------|
| **Spreadsheets M1** — Grid + Ingestion | `'spreadsheet'` document type, grid renderer (Glide Data Grid recommended), CSV/XLSX/JSON ingestion, cell editing, multi-tab workbook, Parquet persistence | Grid UI: independent. DuckDB wiring: after Charts M2 |
| **Spreadsheets M2** — Prompted Computation | Prompt-to-SQL pipeline, computed columns (FormulaEntry), named ranges, sort/filter/group UI | After M1 |
| **Spreadsheets M3** — Linking + Interop | Linked tables in docs/presentations, chart binding to table refs, dependency tracking, refresh pipeline | After M2 + Charts M3 |

**Key design decisions:**
- DuckDB as storage engine (not in-memory cell grid) — handles millions of rows
- Virtualized viewport queries (only materialize visible rows)
- Grid library: Glide Data Grid recommended (canvas-based, MIT) — decision needed before M1.4
- Formula language: DuckDB SQL expressions — decision on simplified syntax TBD

### Phase 9 — Account, Cloud, and Collaboration
> User accounts, cloud persistence, portfolio management, simplified version control.

| Milestone | Key deliverables | Parallel? |
|-----------|-----------------|-----------|
| **Account M1** — Auth + Cloud Foundation | Supabase client SDK, auth UI (sign-up/in/out), JWT session management, Supabase Storage for .aura files, RLS policies | After Memory M1 |
| **Account M2** — Portfolio + Sync | Portfolio page (project grid), project CRUD, memory sync protocol, conflict detection, offline queue | After M1 |
| **Account M3** — Versioning Abstraction | Plain-language git wrapper ("save version", "remix", "combine"), version history UI, fork/remix flow | After M1 (parallel with M2) |
| **Account M4** — Public Collaboration + Explore | Visibility toggle, public project view, remix capability, explore page, bookmark/like signals | After M2 + M3 |

**Key technology decisions:**
- **Supabase** over Firebase — self-host capability essential for open-source
- **Supabase Auth** initially — add Better Auth for org/team features when needed (paid tier)
- **isomorphic-git** kept for client-side — Jujutsu cannot run in-browser
- Plain-language abstraction layer over git ("save version" not "commit")
- Offline-first: local IndexedDB is primary, cloud sync is additive

### Phase 10 — API & MCP Platform
> External API, visual automations, and MCP server for cross-LLM continuity.

| Milestone | Key deliverables | Parallel? |
|-----------|-----------------|-----------|
| **API M1** — Contract + Server | Hono server on Bun, OpenAPI spec, auth middleware, project/document CRUD endpoints, rate limiting | After Account M1 |
| **MCP M1** — Server Skeleton | `@modelcontextprotocol/sdk` stdio transport, read-only project/document/memory tools, test with Claude Code + Cursor | After Account M1 (parallel with API M1) |
| **API M2** — Workflow Execution | Async run lifecycle, AI workflow integration, token accounting, memory/data endpoints | After API M1 |
| **MCP M2** — Write Tools | Mutation tools (create, update, generate), HTTP+SSE transport, conflict detection | After MCP M1 + API M1 |
| **API M3** — Visual Builder | Automation data model, flow editor, prompt template editor, trigger system, guardrails | After API M2 |
| **MCP M3** — Production Hardening | Audit logging, rate limiting, permission scoping, multi-client compatibility | After MCP M2 |

**Key technology decisions:**
- **Hono** as API framework — lightweight, TypeScript-native, runs on Bun/Workers/Vercel
- MCP server as separate package (doesn't affect web app bundle)
- API and MCP share service layer — no duplicate business logic
- Tiered access: free (limited), pro (full), enterprise (dedicated)

### Future Phases

| Phase | Scope |
|---|---|
| 11 — Platform Expansion | Electron desktop app, PWA, mobile considerations |
| 12 — Real-Time Collaboration | Live multi-user editing (evaluate CRDTs vs OT based on Account phase learnings) |
| 13 — Marketplace | Skill/template marketplace, automation sharing, revenue sharing |
| 14 — Enterprise | SSO/SAML, compliance, audit trails, dedicated hosting |

---

## Architecture Decisions

These decisions were made during initial planning and should be revisited only with clear justification.

| Decision | Chosen | Rejected | Rationale |
|---|---|---|---|
| Presentation engine | reveal.js | Slidev | reveal.js is embeddable with a full programmatic API (`sync()` after DOM changes). Slidev requires its own Vite dev server, cannot be embedded, and has no API for dynamic slide manipulation. |
| Backend | None (client-side only) | Express, serverless, FastAPI | User provides their own API key. Simpler, faster to ship, no hosting required. Sufficient for MVP. |
| AI integration | Vercel AI SDK with provider factories | Single provider via `fetch()`, raw SDK packages | Unified interface for streaming + structured output. Provider-agnostic — adding a provider is 5 lines of config. Zod schemas ensure reliable JSON parsing from LLMs. AI SDK handles streaming, retries, and validation automatically. |
| Framework | React + Vite + Bun | Flutter Web, Next.js, plain HTML | Native JS integration with reveal.js (no WebView bridge). Bun for fast package management and script execution. Vite for HMR and bundling. Scales to Electron/PWA. |
| State management | Zustand | Redux, Jotai, Context API | Minimal boilerplate, intuitive API, built-in middleware for localStorage persistence. |
| Styling | Tailwind CSS | CSS Modules, styled-components | Fast utility-first iteration, consistent design tokens, works well with the Apple-inspired minimal aesthetic. |
| Editing model | AI-only (no manual editing) | WYSIWYG, hybrid | Deliberate MVP constraint. Dramatically reduces scope — no drag-drop, no formatting toolbar, no selection handling. Chat is the only interface. |
| File format | `.aura` zip bundle | Single JSON file | Zip is extensible (add assets, images later), human-inspectable, and keeps concerns separated (HTML, CSS, metadata). |
| Slide thumbnails | CSS `transform: scale()` on cloned HTML | Canvas/image rendering | Cheap, accurate, real-time. No canvas overhead or library dependency. |
| Streaming strategy | Buffer full response, then inject | Progressive HTML injection | Partial HTML in reveal.js causes flicker and broken layouts. Buffer + shimmer animation provides better UX. |
| Data engine | DuckDB-WASM | Custom grid engine, IndexedDB raw storage | Columnar OLAP engine handles millions of rows in-browser. SQL is the universal query language. Shared by charts and spreadsheets. ~10 MB lazy-loaded. |
| BaaS | Supabase | Firebase | Self-hostable (essential for open-source). Postgres RLS. Predictable pricing. Firebase has better offline sync but can't be self-hosted. |
| Version control (client) | isomorphic-git | Jujutsu (jj) | jj has no WASM/browser build. isomorphic-git works in IndexedDB. Plain-language abstraction layer hides git complexity. |
| API framework | Hono | Express, Fastify | 12x smaller than Express. Native TypeScript. Runs on Bun, Workers, Vercel Edge. OpenAPI via @hono/zod-openapi. |
| Memory format | Markdown + YAML frontmatter | JSON, SQLite | Human-readable, portable, inspectable. YAML frontmatter for metadata. Three-layer hierarchy (L0/L1/L2) for token efficiency. |

---

## Development Principles

These principles guide every contribution to Aura. They are non-negotiable for the health of the project.

### 1. AI-First, Not AI-Assisted

The AI is the primary interface. Every feature should be designed around the assumption that the user interacts through natural language, not through buttons and menus. If a feature requires manual UI, ask whether the AI could handle it instead. Traditional UI should exist only for navigation, settings, and presentation playback.

### 2. Simplicity Over Features

Resist the urge to add features. The MVP deliberately excludes manual editing, image upload, export formats, and collaboration — not because they aren't valuable, but because they aren't yet necessary. Every feature added is a feature that must be maintained, documented, and tested. Prefer doing fewer things exceptionally well.

> "Perfection is achieved, not when there is nothing more to add, but when there is nothing left to take away." — Antoine de Saint-Exupéry

### 3. Open Source From Day One

- The codebase, file format, and documentation are open from the start.
- No proprietary dependencies. Every dependency must be MIT, Apache 2.0, or similarly permissive.
- The `.aura` file format is intentionally built on standard web technologies (HTML, CSS, JSON inside a zip). Users must never be locked into the Aura application to access their content.
- Architecture decisions are documented (see above) so contributors understand *why*, not just *what*.

### 4. Security First

- **No secrets in the client.** API keys are stored in localStorage and never transmitted to any server other than the chosen AI provider. There is no Aura backend that handles keys.
- **Validate all external input.** AI-generated HTML is rendered in the presentation canvas. Implement appropriate sandboxing to prevent unintended script execution outside the canvas context.
- **Content Security Policy.** Configure CSP headers to restrict what the rendered content can do (no external script loading, no `eval`, scoped network access).
- **Dependency hygiene.** Keep dependencies minimal. Audit regularly. Prefer `fetch()` over heavy SDK packages. Every dependency is an attack surface.
- **Follow OWASP guidance.** No injection vulnerabilities, no exposed credentials, no insecure defaults.

### 5. Best-in-Class Dependencies

Every `bun add` is a decision. Before adding a package, ask:
- Can this be done in 20 lines of application code?
- Is the package actively maintained?
- What is its bundle size impact?
- Does it have a permissive license?

The dependency philosophy:
- **Yes**: `reveal.js` (core engine), `zustand` (state), `jszip` (file format), `tailwindcss` (styling), `ai` + `@ai-sdk/*` (unified AI provider layer), `zod` (schema validation)
- **No**: Heavy UI component libraries (Material UI, Chakra), animation libraries (framer-motion for basic transitions), redundant utilities that can be written in a few lines

> **Note:** We use [Bun](https://bun.sh) as the package manager and script runner. It is significantly faster than npm/yarn for installs and script execution, and provides native TypeScript support. All `package.json` scripts are run via `bun run <script>`.

### 6. TypeScript Strict Mode

- All code is TypeScript with strict mode enabled.
- No `any` types except at true system boundaries (e.g., parsing unknown AI responses).
- Prefer explicit types over inference for public APIs and store definitions.
- Use discriminated unions for state variants (e.g., `{ status: 'idle' } | { status: 'generating', progress: number }`).

### 7. Clean Architecture Boundaries

The codebase is organised into clear layers with unidirectional dependencies:

```
components/ → stores/ → services/
     ↓           ↓          ↓
  (React UI)  (Zustand)  (Business logic, external APIs)
```

- **Components** read from stores and call store actions. They never call services directly.
- **Stores** orchestrate state changes and call services.
- **Services** are pure functions or stateless classes. They know nothing about React or Zustand.
- Services never import from components or stores; stores never import from components.

### 8. Consistent Code Style

- **Formatting**: Use Prettier with default settings. No debates about semicolons or trailing commas — the tool decides.
- **Linting**: ESLint with the recommended TypeScript config. No disabled rules without a comment explaining why.
- **Naming**: `camelCase` for variables and functions, `PascalCase` for components and types, `UPPER_SNAKE` for constants. File names match their default export.
- **Imports**: Group by external → internal → relative. Avoid barrel files (`index.ts` re-exports) until they demonstrably improve developer experience.

### 9. Design Quality Is Not Optional

Aura generates visual content. The application itself must reflect that standard:
- **Apple-inspired minimalism**: Generous whitespace, restrained colour palette, subtle shadows and blur effects, precise typography.
- **Every pixel matters**: Alignment, spacing, border radii, and animation curves should feel intentional. No default browser styles leaking through.
- **Smooth interactions**: Transitions between states (loading, generating, idle) should be animated. No layout jumps or flashes of unstyled content.

### 10. Accessible by Default

- Semantic HTML elements (`<button>`, `<nav>`, `<main>`, not `<div onClick>`).
- Keyboard navigation for all interactive elements.
- ARIA labels where semantic elements aren't sufficient.
- Sufficient colour contrast (WCAG AA minimum).
- Screen reader support for the editing interface (canvas content is inherently visual, but controls must be accessible).

### 11. Performance Conscious

- **Bundle size**: Tree-shake aggressively. Lazy-load the settings modal and any non-critical UI.
- **Rendering**: The presentation canvas is the hot path. Avoid unnecessary React re-renders by using Zustand selectors and `React.memo` where measured to be impactful.
- **AI streaming**: Buffer responses rather than triggering DOM updates on every token. Debounce store updates.
- **Assets**: No large bundled assets. Prefer inline SVG over icon fonts. Prefer CSS effects over images.

### 12. Test What Matters

- **Don't aim for coverage numbers.** Aim for confidence.
- **Unit test**: Services (AI provider adapters, file format pack/unpack, presentation engine helpers). These are pure logic with clear inputs and outputs.
- **Integration test**: Chat flow end-to-end with a mocked AI provider. Verify that a user prompt results in slides appearing in the store.
- **Skip testing**: React component rendering details, CSS styling, Zustand store boilerplate. These change frequently and break tests without catching real bugs.
- **Manual verification**: Visual quality of generated slides is subjective and must be reviewed by humans.

### 13. Documentation Is Part of the Code

- **README.md**: Getting started, how to configure providers, how to contribute.
- **ROADMAP.md** (this file): Living document. Update when plans change.
- **Architecture decisions**: Documented above. New non-trivial decisions should be added.
- **Code comments**: Only where the *why* is not obvious from the code itself. Never comment *what* the code does — that should be self-evident from naming and structure.
- **System prompts**: Document the prompt engineering rationale. The quality of AI output depends entirely on the system prompt; it deserves the same rigour as any other critical module.

### 14. Git Hygiene

- **Conventional commits**: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`, `style:`, `test:`.
- **Small, focused PRs**: One concern per pull request. Easier to review, easier to revert.
- **Branch naming**: `feat/chat-bar`, `fix/reveal-sync-race`, `docs/contributing-guide`.
- **No force-pushes to main.** Protect the main branch.
- **Meaningful commit messages**: Describe what changed and why. "fix stuff" is not acceptable.

### 15. Provider Agnostic

The AI layer is the most likely to change as models improve and pricing shifts:
- Every provider is registered as a `ProviderEntry` that creates AI SDK `LanguageModelV1` instances.
- No provider-specific logic leaks into components or stores.
- Adding a new provider requires only adding a `ProviderEntry` config to the registry — no changes to any other module.
- The system prompt is provider-agnostic. It produces valid reveal.js HTML regardless of which model generates it.
- Structured output (Zod schemas) works across all providers via the AI SDK abstraction.

---

## Contributing

> Detailed contributing guidelines will be added in `CONTRIBUTING.md` as the project matures.

**Quick start for contributors:**

1. Fork the repository and clone locally
2. `bun install` to install dependencies
3. `bun run dev` to start the Vite dev server
4. Configure an AI provider in the settings modal (you need your own API key)
5. Make changes on a feature branch
6. Submit a PR with a clear description of what and why

**Before submitting:**
- Run `bun run lint` and `bun run typecheck` with zero errors
- Test your changes manually (generate a deck, save/load, present)
- Follow the commit message conventions above
- Keep PRs small and focused

---

*This is a living document. Last updated: 19 April 2026.*
