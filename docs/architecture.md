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
│                              │   AI Provider    │   │
│                              │   (fetch API)    │   │
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

- **`types.ts`** — `AIProvider` interface, `AIMessage` type
- **`registry.ts`** — Factory: `getProvider(id)` returns the correct adapter
- **`providers/`** — One adapter per provider (openai, gemini, anthropic), all implementing `AIProvider`
- **`prompts.ts`** — System prompt construction, message formatting, HTML extraction from AI responses

All providers use raw `fetch()` with Server-Sent Events (SSE) for streaming. No SDK dependencies.

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
   b. Builds AI message array (system prompt + chat history + current slides context)
   c. Sets status to 'generating'
   d. Calls provider.generateStream() — streams response via fetch SSE
   e. On completion: extracts HTML from response using regex
   f. Calls presentationStore.setSlides(html) — triggers canvas re-render
   g. Adds assistant message to chatStore
   h. Sets status to 'idle'
3. PresentationCanvas reacts to slidesHtml change:
   a. Calls engine.updateContent(deck, html)
   b. reveal.js re-renders slides
```

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

1. Create `src/services/ai/providers/yourprovider.ts`
2. Implement the `AIProvider` interface:
   ```tsx
   export const yourProvider: AIProvider = {
     id: 'yourprovider',
     name: 'Your Provider',
     async generateStream(messages, onChunk, apiKey, baseUrl) {
       // Implement SSE streaming via fetch
       // Call onChunk(text) for each token
       // Return full accumulated response
     },
   };
   ```
3. Register in `src/services/ai/registry.ts`
4. Add to `PROVIDER_OPTIONS` in `src/types/index.ts`
5. Add default config in `settingsStore.ts` initial state

No other files need to change — the settings UI and chat flow pick up new providers automatically.

---

## Key Design Decisions

| Decision | Choice | Why |
|---|---|---|
| No backend | Client-only | User owns their API key; no server to maintain or trust |
| `fetch()` over SDKs | Raw HTTP | Smaller bundle, no SDK lock-in, supports any compatible API |
| reveal.js | Embedded presentation | Best programmatic API for dynamic slide manipulation |
| Buffer then render | Full response buffering | Partial HTML injection into reveal.js causes layout breakage |
| Zustand over Redux | Minimal state lib | Less boilerplate, selectors prevent over-rendering |
| shadcn/ui pattern | UI components | Accessible Radix primitives + Tailwind styling, no runtime CSS-in-JS |

See [ROADMAP.md](../ROADMAP.md) for the full architecture decisions table.
