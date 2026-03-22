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

### Phase 1 — Foundation
> Get a React app rendering reveal.js slides programmatically.

| # | Task | Details |
|---|---|---|
| 1 | Init project scaffold | Vite + React-TS (via `bun create vite`), install reveal.js, zustand, jszip, file-saver, lucide-react, tailwindcss |
| 2 | PresentationCanvas component | React wrapper: init reveal.js in `useEffect`, `updateSlides(html)` → innerHTML + `deck.sync()`, navigation state synced to store |
| 3 | Presentation engine service | `initDeck()`, `updateContent()`, `navigateTo()`, `enterFullscreen()`, `exitFullscreen()`, `getSlideCount()`, `getCurrentIndex()` |
| 4 | Zustand stores | `presentationStore` (slides, index, mode), `chatStore` (messages, streaming), `settingsStore` (provider, key → localStorage) |
| 5 | Verify with test slides | Hardcode 3–4 beautiful demo slides; confirm transitions, navigation, and React lifecycle integration |

### Phase 2 — Shell
> Build the app chrome: toolbar, canvas layout, chat bar, slide strip.
> *Can begin in parallel with Phase 1, step 5.*

| # | Task | Details |
|---|---|---|
| 6 | App layout & modes | Edit mode (toolbar + canvas + strip + chat) vs Present mode (fullscreen reveal.js, ESC exits) |
| 7 | Toolbar | Logo, editable title, Save/Download/Present/Settings buttons. Frosted glass aesthetic (`backdrop-blur-xl bg-white/80`) |
| 8 | ChatBar | Floating pill input (`rounded-full max-w-2xl`), "Describe your presentation..." placeholder, Enter to send, expandable message history |
| 9 | SlideStrip | `h-20` horizontal scroll, CSS-scaled (`transform: scale(0.15)`) mini slide clones, click to navigate, current highlighted |
| 10 | AI working indicator | Shimmer gradient bar under toolbar, skeleton placeholders on canvas, animated dots in chat |

### Phase 3 — Brain
> Wire up AI to generate and refine slides from user prompts.
> *Depends on Phase 1 completion.*

| # | Task | Details |
|---|---|---|
| 11 | AI provider interface | `ProviderEntry { id, name, defaultModel, createModel(config): LanguageModelV1 }` via Vercel AI SDK |
| 12 | Provider adapters | `ProviderEntry` configs in `registry.ts` using Vercel AI SDK factories (`@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`). DeepSeek and Ollama via OpenAI-compatible adapter. |
| 13 | System prompt | Instruct AI to output `<section>` HTML with inline CSS. Enforce design principles, palettes, typography, `data-transition`, `fragment` animations. Include examples. |
| 14 | Chat flow wiring | Prompt → stream → extract HTML → `setSlides()` → canvas re-renders → done |
| 15 | Iterative refinement | Follow-up messages include current slides HTML as context; AI modifies specific slides |

### Phase 4 — Storage
> Save/load `.aura` files, auto-save to IndexedDB.
> *Can run in parallel with Phase 3.*

| # | Task | Details |
|---|---|---|
| 16 | `.aura` file format | Pack/unpack zip: manifest.json, slides.html, theme.css, chat-history.json |
| 17 | Auto-save | IndexedDB, debounced 2s, restore prompt on app load |
| 18 | Toolbar integration | Wire Save, Download, Open, New actions to storage services |

### Phase 5 — Polish
> Premium look and feel, error handling, keyboard shortcuts.
> *Depends on all previous phases.*

| # | Task | Details |
|---|---|---|
| 19 | Slide quality tuning | Enhance system prompt: palettes, inline SVG icons, typography hierarchy, layout patterns, consistent transitions |
| 20 | Settings modal | Provider dropdown, API key input, optional base URL, test connection button |
| 21 | App UI animations | Chat expand/collapse, slide strip momentum scroll, mode transitions, AI shimmer — CSS transitions primarily |
| 22 | Keyboard shortcuts | `⌘/Ctrl+Enter` send, `⌘/Ctrl+S` save, `F5` present, `Esc` exit, `←/→` navigate |
| 23 | Error handling | No key → settings prompt, API error → retry in chat, empty state → welcome screen |

### Future Phases

| Phase | Scope |
|---|---|
| 6 — Documents | Word processing mode with AI-generated rich HTML documents |
| 7 — Spreadsheets | Grid rendering, AI-driven formulas and calculations |
| 8 — Cloud | User accounts, cloud storage, sync across devices |
| 9 — Collaboration | Real-time multi-user editing via CRDT or OT |
| 10 — Platform Expansion | Electron desktop app, PWA, potential Flutter native |

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

*This is a living document. Last updated: 22 March 2026.*
