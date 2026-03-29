# Architecture Guide

This document describes Aura's architecture, data flow, and the reasoning behind key technical decisions. It is intended for contributors who want to understand the codebase before making changes.

---

## High-Level Overview

Aura is a **fully client-side** React single-page application. There is no backend server — all AI communication happens directly from the browser to the configured provider's API using the user's own API key.

```
┌──────────────────────────────────────────────────────┐
│                     Browser                          │
│                                                      │
│  ┌────────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │ Components │→ │  Stores  │→ │    Services      │ │
│  │  (React)   │  │ (Zustand)│  │ (business logic) │ │
│  └────────────┘  └──────────┘  └──────────────────┘ │
│                                        │             │
│                                        ▼             │
│                              ┌──────────────────┐   │
│                              │   AI SDK Layer   │   │
│                              │ (Vercel AI SDK)  │   │
│                              └──────────────────┘   │
└──────────────────────────────────────────────────────┘
```

---

## Layer Architecture

Dependencies flow in one direction: **Components → Stores → Services**.

### Components (`src/components/`)

React components that render the UI and respond to user interactions. Components:

- Read state from Zustand stores via selectors
- Dispatch actions by calling store methods
- **Never** import or call services directly

Key components:

| Component | Responsibility |
|---|---|
| `App.tsx` | Root layout, autosave orchestration, mode management |
| `Toolbar.tsx` | Top bar — logo, title, file actions, settings |
| `PresentationCanvas.tsx` | reveal.js wrapper, slide rendering, navigation |
| `ChatBar.tsx` | Chat input, message history, AI generation trigger |
| `ChatMessage.tsx` | Individual message display |
| `AIWorkingIndicator.tsx` | Generation loading feedback |
| `ProviderModal.tsx` | AI provider configuration dialog |

### UI Primitives (`src/components/ui/`)

Reusable base components following [shadcn/ui](https://ui.shadcn.com) conventions:

- Built on [Radix UI](https://www.radix-ui.com/) primitives for accessibility
- Styled with Tailwind CSS using [CVA](https://cva.style) for variants
- Composed with the `cn()` utility (clsx + tailwind-merge)

Components: `Button`, `Dialog`, `Input`, `Label`, `Badge`, `ScrollArea`, `Separator`, `Tooltip`

### Stores (`src/stores/`)

Zustand stores manage application state. Each store is a single `create()` call exporting a hook.

| Store | State |
|---|---|
| `presentationStore` | `title`, `slidesHtml`, `themeCss`, `currentIndex`, `slideCount`, `isPresenting` |
| `chatStore` | `messages[]`, `status` (idle/generating/error), `streamingContent` |
| `settingsStore` | `providerId`, `providers` record (per-provider config), `showSettings` — persisted to localStorage |

### Services (`src/services/`)

Pure business logic with no React or Zustand dependencies.

#### AI (`src/services/ai/`)

- **`types.ts`** — `ProviderEntry` interface (AI SDK model factory), `AIMessage` type
- **`registry.ts`** — Factory: `getProviderEntry(id)` returns a `ProviderEntry` with `createModel()` for AI SDK
- **`schemas/`** — Zod schemas for structured LLM output (outlines, review results)
- **`prompts/`** — Modular `PromptComposer` with 12 composable sections for system prompts
- **`workflow/`** — Multi-agent pipeline engine with steps, agents, retry, branching, and events
- **`utils/`** — HTML extraction, sanitization, font injection

Providers are implemented via the [Vercel AI SDK](https://sdk.vercel.ai/) (`@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`). Each provider creates a `LanguageModelV1` instance used for both streaming text and Zod-validated structured output.

See [agent-architecture.md](./agent-architecture.md) for the full multi-agent pipeline documentation.

#### Presentation (`src/services/presentation/`)

- **`engine.ts`** — reveal.js lifecycle: `initDeck()`, `updateContent()`, `navigateTo()`, `enterFullscreen()`, `destroyDeck()`
- **`themes.ts`** — Built-in theme CSS strings (dark, light, gradient)

#### Storage (`src/services/storage/`)

- **`fileFormat.ts`** — Pack/unpack `.aura` zip files (manifest.json + slides.html + theme.css + chat-history.json)
- **`autosave.ts`** — IndexedDB persistence with 2-second debounce

---

## Data Flow: Chat → Slides

This is the core flow of the application:

```
1. User types prompt in ChatBar
2. ChatBar.handleSubmit():
   a. Adds user message to chatStore
   b. Builds AI message array from chat history
   c. Sets status to 'generating'
   d. Calls runPresentationWorkflow() — the multi-agent pipeline:
      Plan → Design → Draft Complete → QA → [Branch] → Review → Revise
   e. On draft-complete event: the canvas is updated immediately with the initial design
   f. QA/review/polish continue in the background
   g. Final HTML replaces draft only when actionable errors are detected
   h. Workflow emits real-time events (progress, streaming, step status)
   i. On completion: result contains sanitized HTML, title, slide count
   j. Calls presentationStore.setSlides(html) — triggers canvas re-render when needed
   k. Adds assistant message to chatStore
   l. Sets status to 'idle'

Edit-mode invariants:
- For `add_slides` requests, existing slides are treated as immutable and new sections are appended.
- Existing slides are modified only when the request is a true modify/refine-style operation.
3. PresentationCanvas reacts to slidesHtml change:
   a. Calls engine.updateContent(deck, html)
   b. reveal.js re-renders slides
```

For detailed pipeline documentation, see [agent-architecture.md](./agent-architecture.md).

---

## State Management Patterns

### Zustand Selectors

Always use individual selectors to prevent unnecessary re-renders:

```tsx
// Good — only re-renders when slidesHtml changes
const slidesHtml = usePresentationStore((s) => s.slidesHtml);

// Bad — re-renders on any store change
const store = usePresentationStore();
```

### Discriminated Unions for Status

The chat store uses a discriminated union for generation status:

```tsx
type GenerationStatus =
  | { state: 'idle' }
  | { state: 'generating'; startedAt: number }
  | { state: 'error'; message: string };
```

This makes it impossible to have an error message without being in the error state, or a start time without being in the generating state.

---

## Styling Architecture

Aura uses **Tailwind CSS v4** with a shadcn/ui-compatible theme system:

- **CSS variables** defined in `src/styles/index.css` using oklch color space
- **`@theme inline` block** maps CSS variables to Tailwind color utilities
- **`cn()` utility** (`src/lib/utils.ts`) merges class names with tailwind-merge to prevent conflicts
- **CVA** (class-variance-authority) defines component variants (see `button.tsx`, `badge.tsx`)

### Theme Tokens

All colors reference CSS variables, making theming straightforward:

```css
--background    /* Page background */
--foreground    /* Default text */
--primary       /* Primary actions */
--muted         /* Subdued backgrounds */
--border        /* Border color */
--ring          /* Focus ring */
--destructive   /* Error states */
```

---

## File Format: `.aura`

A `.aura` file is a zip archive:

```
├── manifest.json       # { version, title, slideCount, createdAt, updatedAt }
├── slides.html         # Raw <section> elements
├── theme.css           # Custom CSS for the deck
└── chat-history.json   # Full message array for continued editing
```

The format is intentionally built on standard web technologies so users are never locked in. Rename to `.zip` and inspect freely.

---

## Adding a New AI Provider

1. Add the provider ID to `ProviderId` union in `src/types/index.ts`
2. Add a `ProviderEntry` in `src/services/ai/registry.ts` using the appropriate AI SDK factory:
   ```tsx
   yourprovider: {
     id: 'yourprovider',
     name: 'Your Provider',
     defaultModel: 'your-model-id',
     createModel: (config: ProviderModelConfig) =>
       createYourProvider({
         apiKey: config.apiKey,
         baseURL: config.baseUrl || 'https://api.yourprovider.com/v1',
       })(config.model || 'your-model-id'),
   },
   ```
3. Add to `PROVIDER_OPTIONS` in `src/types/index.ts`
4. Add default config in `settingsStore.ts` initial state

No other files need to change — the settings UI, workflow, and chat flow pick up new providers automatically.

---

## Key Design Decisions

| Decision | Choice | Why |
|---|---|---|
| No backend | Client-only | User owns their API key; no server to maintain or trust |
| Vercel AI SDK | Unified provider layer | Consistent streaming, structured output, and model interface across all providers |
| Zod structured output | Schema-validated LLM responses | Reliable JSON parsing for outlines and reviews; automatic retry on validation failure |
| Multi-agent pipeline | Plan → Design → Draft Complete → QA → Review → Revise | Draft appears quickly, then polish runs only for actionable errors to avoid unnecessary quality regression |
| reveal.js | Embedded presentation | Best programmatic API for dynamic slide manipulation |
| Buffer then render | Full response buffering | Partial HTML injection into reveal.js causes layout breakage |
| Zustand over Redux | Minimal state lib | Less boilerplate, selectors prevent over-rendering |
| shadcn/ui pattern | UI components | Accessible Radix primitives + Tailwind styling, no runtime CSS-in-JS |
| HTML sanitization | Post-generation URL stripping | Last line of defense against external image URLs leaking through |

See [ROADMAP.md](../ROADMAP.md) for the full architecture decisions table.
