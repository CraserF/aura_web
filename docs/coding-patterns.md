# Coding Patterns & Conventions

This document describes the coding patterns, conventions, and idioms used throughout the Aura codebase. Follow these when contributing to keep the code consistent and maintainable.

---

## Table of Contents

- [TypeScript](#typescript)
- [React Components](#react-components)
- [State Management (Zustand)](#state-management-zustand)
- [Services](#services)
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

AI providers use `async/await` with streaming callbacks:

```tsx
async generateStream(
  messages: AIMessage[],
  onChunk: (text: string) => void,
  apiKey: string,
  baseUrl: string,
): Promise<string>
```

The callback pattern allows the store to update streaming content in real-time while the service remains framework-agnostic.

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

### Responsive Design

The app currently targets desktop browsers. Use these breakpoints if adding responsive behavior:

- `sm:` — 640px (small tablets)
- `md:` — 768px (tablets)
- `lg:` — 1024px (desktops)

---

## AI Provider Pattern

All providers implement the same interface:

```tsx
interface AIProvider {
  id: string;
  name: string;
  generateStream(
    messages: AIMessage[],
    onChunk: (text: string) => void,
    apiKey: string,
    baseUrl: string,
  ): Promise<string>;
}
```

### Adding a Provider

1. Create `src/services/ai/providers/yourprovider.ts`
2. Implement `AIProvider` using `fetch()` + SSE parsing
3. Register in `src/services/ai/registry.ts`
4. Add to `PROVIDER_OPTIONS` in `src/types/index.ts`

The settings UI and chat flow automatically pick up registered providers.

### Provider Adapter Rules

- Use `fetch()` only — no SDK packages
- Parse SSE streams manually (see existing adapters for patterns)
- Never throw for empty responses — return empty string
- Let HTTP errors propagate as standard `Error` objects

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

| ✅ Approved | ❌ Avoid |
|---|---|
| **Radix primitives** — accessibility is hard | **Full UI frameworks** (MUI, Chakra) — too heavy |
| **Zustand** — minimal state management | **Redux** — too much boilerplate |
| **reveal.js** — core presentation engine | **AI SDKs** (openai, anthropic) — fetch is enough |
| **JSZip** — file format requirement | **Animation libraries** — CSS transitions suffice |
| **tailwind-merge, clsx** — className merging | **CSS-in-JS runtime** (styled-components, emotion) |

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
