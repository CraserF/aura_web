# Coding Patterns & Conventions

This document describes the coding patterns, conventions, and idioms used throughout the Aura codebase. Follow these when contributing to keep the code consistent and maintainable.

---

## Table of Contents

- [TypeScript](#typescript)
- [React Components](#react-components)
- [Separation of Concerns & File Size](#separation-of-concerns--file-size)
- [State Management (Zustand)](#state-management-zustand)
- [Services](#services)
- [Document Design System](#document-design-system)
- [Styling](#styling)
- [AI Provider Pattern](#ai-provider-pattern)
- [Error Handling](#error-handling)
- [File & Naming Conventions](#file--naming-conventions)
- [Dependency Philosophy](#dependency-philosophy)
- [Import Order](#import-order)

---

## TypeScript

### Strict Mode

The project runs with TypeScript strict mode. All code must pass `tsc --noEmit` with zero errors.

```tsx
// Good — explicit types on public interfaces
interface ProviderConfig {
  apiKey: string;
  baseUrl?: string;
}

// Bad — avoid `any` except at true system boundaries
const data: any = response.json(); // ❌
```

### Discriminated Unions

Use discriminated unions for state that has distinct modes:

```tsx
// Good — each state carries only its relevant data
type GenerationStatus =
  | { state: 'idle' }
  | { state: 'generating'; startedAt: number }
  | { state: 'error'; message: string };

// Usage — TypeScript narrows the type automatically
if (status.state === 'error') {
  console.log(status.message); // ✅ TypeScript knows `message` exists
}
```

### Type Imports

Use `import type` for type-only imports to keep the runtime bundle clean:

```tsx
import type { ChatMessage } from '@/types';
import type { AIMessage } from '@/services/ai/types';
```

---

## React Components

### Function Components Only

All components are function components. No class components.

```tsx
// Component file exports a single named function
export function ChatMessage({ message }: { message: ChatMessageType }) {
  // ...
}
```

### Props

- Inline prop types for simple components (1-3 props)
- Extract an interface for complex props

```tsx
// Simple — inline
export function Badge({ label }: { label: string }) { ... }

// Complex — extracted
interface ProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  providers: ProviderConfig[];
}
export function ProviderModal({ isOpen, onClose, providers }: ProviderModalProps) { ... }
```

### Hooks

- Keep hooks at the top of the component
- Group by source: React hooks → store hooks → local state → effects

```tsx
export function ChatBar() {
  // React hooks
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Store hooks
  const messages = useChatStore((s) => s.messages);
  const addMessage = useChatStore((s) => s.addMessage);

  // Effects
  useEffect(() => { ... }, [messages]);

  // Handlers
  const handleSubmit = useCallback(() => { ... }, [input]);

  // Render
  return ( ... );
}
```

### Co-located Sub-components

Small helper components that are only used by one parent should live in the same file:

```tsx
// PresentationCanvas.tsx
export function PresentationCanvas() { ... }

// Private to this file
function EmptyState() { ... }
function SlideNavOverlay({ ... }) { ... }
```

---

## Separation of Concerns & File Size

Aim for **~500 lines max per file**. If a file starts pushing beyond that, split by responsibility instead of stacking more helpers into the same module.

**Recommended split pattern:**

- workflow runner (`document.ts`, `presentation.ts`)
- prompt composition (`*-prompt.ts`)
- rendering / transforms (`*-render.ts`)
- theme tokens / style helpers (`*-themes.ts`)

**Rules of thumb:**

- Components own UI and user interaction only
- Stores own state and simple actions only
- Services own pure business logic and transformations
- Avoid files that mix prompt building, DOM rendering, persistence, and store updates together

---

## State Management (Zustand)

### Store Structure

Each store is a single `create()` call in its own file:

```tsx
import { create } from 'zustand';

interface ChatState {
  messages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
}));
```

### Selectors

**Always** use individual selectors. Never destructure the entire store:

```tsx
// Good — granular, prevents unnecessary re-renders
const messages = useChatStore((s) => s.messages);
const addMessage = useChatStore((s) => s.addMessage);

// Bad — re-renders on ANY store change
const { messages, addMessage } = useChatStore();
```

### Persistence

Use Zustand's `persist` middleware for state that should survive page reloads:

```tsx
import { persist } from 'zustand/middleware';

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({ ... }),
    { name: 'aura-settings' },
  ),
);
```

Only `settingsStore` is persisted. Presentation and chat state use IndexedDB autosave instead (see `services/storage/autosave.ts`).

---

## Services

### Pure Functions

Services are stateless. They take inputs and return outputs with no side effects on React or Zustand:

```tsx
// Good — pure function
export function extractHtmlFromResponse(response: string): string | null {
  const match = response.match(/<section[\s\S]*<\/section>/i);
  return match ? match[0] : null;
}
```

### No Framework Imports

Service files must never import from React, Zustand, or any component:

```
✅ services/ can import from: other services, types
❌ services/ cannot import from: components, stores
```

### Async Patterns

The workflow `LLMClient` provides two async methods:

```tsx
interface LLMClient {
  generate(messages: AIMessage[], onChunk?: (text: string) => void): Promise<string>;
  generateStructured<T>(messages: AIMessage[], schema: z.ZodType<T>, schemaName?: string): Promise<T>;
}
```

- `generate()` streams text via AI SDK's `streamText()` and calls `onChunk` for each piece
- `generateStructured()` uses AI SDK's `generateObject()` with Zod schema validation and automatic retry

The callback pattern in `generate()` allows the store to update streaming content in real-time while the service remains framework-agnostic.

---

## Document Design System

Aura documents should reuse the shared `doc-*` classes rather than inventing one-off patterns in every prompt.

**Preferred document patterns:**

- `doc-status-badge` for draft/review/final state chips
- `doc-meta-grid` for compact top-of-page facts
- `doc-callout` for note / tip / warning / success blocks
- `doc-type-tag` for reference fields (`string`, `int`, `bool`)
- `doc-progress` for multi-stage runbooks or SOPs

**Section color map:**

- blue = context / background / summary
- green = process / steps / implementation
- coral = warnings / risks / limits
- gray = reference / glossary / appendix

**Motion rules:**

- keep animations subtle using `aura-fade-in`, `aura-rise-in`, or `aura-pulse-soft`
- animations must be disabled for `@media print` and `prefers-reduced-motion`
- never rely on animation to communicate critical meaning

---

## Styling

### Tailwind CSS + Design Tokens

All styling uses Tailwind CSS utility classes referencing the design token system:

```tsx
// Good — uses design tokens
<div className="bg-background text-foreground border-border" />
<button className="bg-primary text-primary-foreground" />

// Avoid — hardcoded colors bypass theming
<div className="bg-white text-gray-900" /> // ❌
```

### The `cn()` Utility

Use `cn()` for conditional or merged class names:

```tsx
import { cn } from '@/lib/utils';

<div className={cn(
  'flex items-center gap-2',
  isActive && 'bg-accent',
  isDisabled && 'opacity-50 cursor-not-allowed',
)} />
```

### shadcn/ui Components

Base UI components live in `src/components/ui/` and follow shadcn/ui conventions:

- Use [Radix primitives](https://www.radix-ui.com/) for accessible behavior
- Use [CVA](https://cva.style) for variant definitions
- Accept `className` prop for composition
- Forward refs where needed

```tsx
// Example: button with variants
const buttonVariants = cva('inline-flex items-center ...', {
  variants: {
    variant: {
      default: 'bg-primary text-primary-foreground',
      ghost: 'hover:bg-accent',
    },
    size: {
      default: 'h-9 px-4',
      icon: 'size-9',
    },
  },
});
```

## Canvas Frame Contract

Use a shared shell/frame contract for document and presentation canvases so artifact bounds are always visible and proportions are never distorted.

Rules:

- Wrap artifact canvases in `aura-canvas-shell` and `aura-canvas-frame`.
- Keep presentation stages at a fixed 16:9 ratio with fit/contain behavior.
- Treat extra viewport area as intentional gutters, not stretchable artifact background.
- Keep frame styles in app shell CSS only; do not inject frame chrome into generated artifact HTML.
- Preserve sandbox isolation for document iframe content while framing at the host-app layer.

When adding new canvas behaviors, verify mobile/tablet/desktop behavior before marking work complete.

### Responsive Design

The app is moving from desktop-first toward responsive shell behavior. Keep desktop layouts stable while introducing mobile-specific overlays, drawers, or condensed controls behind explicit UI flags when needed. Use these breakpoints if adding responsive behavior:

- `sm:` — 640px (small tablets)
- `md:` — 768px (tablets)
- `lg:` — 1024px (desktops)

When rolling out unfinished responsive UI, prefer a persisted settings flag in `settingsStore` over deleting the existing code path. Example: the document Pages toggle can be hidden with `showDocumentPagesView` while the underlying `pagesEnabled` rendering logic remains intact for later iteration.

---

## AI Provider Pattern

All providers are registered as `ProviderEntry` objects in `src/services/ai/registry.ts`. Each entry creates AI SDK `LanguageModelV1` instances on demand:

```tsx
interface ProviderEntry {
  id: ProviderId;
  name: string;
  defaultModel: string;
  createModel: (config: ProviderModelConfig) => LanguageModelV1;
}
```

### Adding a Provider

1. Add a `ProviderEntry` to `src/services/ai/registry.ts` using the appropriate AI SDK factory (`createOpenAI`, `createAnthropic`, `createGoogleGenerativeAI`)
2. Add to `ProviderId` union and `PROVIDER_OPTIONS` in `src/types/index.ts`
3. Add default config in `settingsStore.ts`

The settings UI and workflow pipeline automatically pick up registered providers.

### AI SDK Usage Patterns

**Streaming text (HTML generation):**
```tsx
import { streamText } from 'ai';
const result = streamText({ model, messages, temperature: 0.7 });
for await (const chunk of result.textStream) {
  onChunk(chunk);
}
```

**Structured output (Zod-validated JSON):**
```tsx
import { generateObject } from 'ai';
const result = await generateObject({
  model, messages, schema: MyZodSchema, schemaName: 'my-object', maxRetries: 2,
});
return result.object; // Typed as z.infer<typeof MyZodSchema>
```

### Zod Schema Patterns

Schemas live in `src/services/ai/schemas/index.ts`:

```tsx
import { z } from 'zod';

export const MySchema = z.object({
  field: z.string().min(1).max(100),
  score: z.number().int().min(0).max(100),
  items: z.array(z.string()).min(1).max(10),
});

export type MyType = z.infer<typeof MySchema>;
```

When using structured output, always provide a fallback for providers that may not support it natively.

---

## Error Handling

### In Components

Let errors from async operations (AI generation) propagate to the chat as error messages:

```tsx
try {
  const response = await provider.generateStream(...);
  // handle success
} catch (err) {
  const message = err instanceof Error ? err.message : 'Generation failed';
  addMessage({ role: 'assistant', content: `Error: ${message}`, ... });
  setStatus({ state: 'error', message });
}
```

### In Services

Services throw standard `Error` objects. Don't catch and swallow errors in services — let the caller decide how to handle them.

```tsx
// In a provider adapter
const res = await fetch(url, options);
if (!res.ok) {
  throw new Error(`${res.status}: ${res.statusText}`);
}
```

---

## File & Naming Conventions

| Item | Convention | Example |
|---|---|---|
| Components | `PascalCase.tsx` | `ChatBar.tsx` |
| Services | `camelCase.ts` | `autosave.ts` |
| Stores | `camelCase.ts` | `chatStore.ts` |
| Types | `camelCase.ts` or `index.ts` | `types/index.ts` |
| Utilities | `camelCase.ts` | `utils.ts` |
| Constants | `UPPER_SNAKE_CASE` | `PROVIDER_OPTIONS` |
| Variables / functions | `camelCase` | `handleSubmit` |
| Components / types | `PascalCase` | `ChatMessage` |

### Directory Structure

- Group by feature, not by type (components near their related logic)
- Keep files small — one main export per file
- Co-locate sub-components and helpers in the same file when they're private

---

## Dependency Philosophy

Before running `bun add`, ask:

1. **Can this be done in ≤30 lines of code?** If yes, write it inline.
2. **Is the package actively maintained?** Check last publish date and open issues.
3. **What's the bundle impact?** Use [bundlephobia](https://bundlephobia.com) to check.
4. **Is the license permissive?** MIT, Apache 2.0, or BSD only.

### Approved Categories

| Category | Approved |
|---|---|
| **AI SDK** | `ai`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google` — unified provider interface, structured output |
| **Validation** | `zod` — schema validation for structured LLM output |
| **Radix primitives** | Accessibility is hard — use battle-tested primitives |
| **Zustand** | Minimal state management |
| **reveal.js** | Core presentation engine |
| **JSZip** | File format requirement |
| **tailwind-merge, clsx** | className merging |

| Category | Avoid |
|---|---|
| **Full UI frameworks** (MUI, Chakra) | Too heavy |
| **Redux** | Too much boilerplate |
| **CSS-in-JS runtime** (styled-components, emotion) | Unnecessary with Tailwind |
| **Animation libraries** | CSS transitions suffice |

---

## Import Order

Group imports in this order, separated by blank lines:

```tsx
// 1. React / framework
import { useState, useEffect } from 'react';

// 2. External packages
import { Send, Sparkles } from 'lucide-react';

// 3. Internal — stores, services, types (absolute paths with @/)
import { useChatStore } from '@/stores/chatStore';
import type { ChatMessage } from '@/types';

// 4. Internal — components (relative paths for siblings, absolute for others)
import { ChatMessage } from './ChatMessage';
import { Button } from '@/components/ui/button';

// 5. Internal — utilities
import { cn } from '@/lib/utils';
```

Use `@/` path aliases (configured in `tsconfig.json`) for all non-relative imports. Use relative paths only for files in the same directory.
