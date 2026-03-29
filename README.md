<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License" />
  <img src="https://img.shields.io/badge/react-19-blue" alt="React" />
  <img src="https://img.shields.io/badge/typescript-strict-blue" alt="TypeScript" />
  <img src="https://img.shields.io/badge/bun-%E2%89%A51.0-orange" alt="Bun" />
</p>

# Aura

**AI-powered presentations from natural language.** Describe what you want; Aura builds it.

Aura is an open-source productivity tool where every slide deck is generated and refined through conversation with AI. There is no manual formatting toolbar, no drag-and-drop — the AI _is_ the editor.

> **Status:** Early alpha — presentations only. Documents and spreadsheets are on the [roadmap](ROADMAP.md).

---

## Features

- **Chat-driven creation** — describe a presentation in plain English and get a complete slide deck
- **Iterative refinement** — follow up with changes ("make slide 3 more visual", "add a conclusion slide")
- **Draft-first generation** — see the designed slide immediately while QA/review run in the background
- **Multiple AI providers** — OpenAI, Gemini, DeepSeek, Anthropic (bring your own API key)
- **Presentation mode** — full-screen reveal.js with rich transitions and animations
- **`.aura` file format** — open zip-based format (HTML + CSS + JSON), no vendor lock-in
- **Auto-save** — session persists to IndexedDB automatically
- **100% client-side** — no backend, no telemetry, your API keys stay in your browser

---

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) ≥ 1.0 (or Node.js ≥ 18 with npm)
- An API key from any supported provider (OpenAI, Google Gemini, DeepSeek, or Anthropic)

### Install & Run

```bash
# Clone the repository
git clone https://github.com/your-username/aura.git
cd aura

# Install dependencies
bun install

# Start the dev server
bun run dev
```

Open [http://localhost:5173](http://localhost:5173), configure your AI provider in Settings (gear icon), and start describing your presentation.

### Available Scripts

| Command | Description |
|---|---|
| `bun run dev` | Start Vite dev server with HMR |
| `bun run build` | Type-check and production build |
| `bun run preview` | Preview the production build locally |
| `bun run lint` | Run ESLint |
| `bun run typecheck` | Run TypeScript compiler check |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript (strict) |
| Build | Vite 5 + Bun |
| Presentation | reveal.js 5 |
| State | Zustand 5 |
| Styling | Tailwind CSS 4 + shadcn/ui + Radix Primitives |
| AI | Vercel AI SDK (`ai`) + provider adapters (`@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`) |
| File Format | JSZip + FileSaver |
| Persistence | IndexedDB (idb-keyval) |

---

## Project Structure

```
src/
├── components/           # React UI components
│   ├── ui/               # shadcn/ui base components (Button, Dialog, etc.)
│   ├── ChatBar.tsx        # Bottom chat input + message history
│   ├── ChatMessage.tsx    # Individual message display
│   ├── AIWorkingIndicator.tsx  # Generation loading state
│   ├── PresentationCanvas.tsx  # reveal.js wrapper
│   ├── Toolbar.tsx        # Top bar with actions
│   └── ProviderModal.tsx  # AI provider settings dialog
├── services/
│   ├── ai/               # AI provider adapters + prompt engineering
│   ├── presentation/     # reveal.js lifecycle + themes
│   └── storage/          # .aura file format + IndexedDB autosave
├── stores/               # Zustand state stores
├── types/                # Shared TypeScript types
├── lib/                  # Utilities (cn helper, etc.)
└── styles/               # Global CSS + theme tokens
```

See [docs/architecture.md](docs/architecture.md) for a detailed architecture guide.

---

## Configuring AI Providers

Aura supports four AI providers out of the box. Click the **gear icon** in the toolbar to configure:

| Provider | Model | Notes |
|---|---|---|
| **OpenAI** | GPT-4o, GPT-4 | Best overall quality |
| **Google Gemini** | Gemini Pro | Good value for cost |
| **DeepSeek** | DeepSeek Chat | Budget-friendly, OpenAI-compatible |
| **Anthropic** | Claude 3.5 | Strong at structured output |

All API calls are made directly from your browser to the provider. **Aura never sees or stores your API key on any server.**

You can also point OpenAI-compatible providers to a custom base URL for local models (Ollama, vLLM, etc.).

---

## The `.aura` File Format

A `.aura` file is a standard zip archive containing:

```
presentation.aura
├── manifest.json       # Title, slide count, timestamps
├── slides.html         # Raw <section> elements for reveal.js
├── theme.css           # Custom CSS
└── chat-history.json   # Message history for continued editing
```

You can rename any `.aura` file to `.zip` and inspect its contents. No lock-in.

---

## Contributing

We welcome contributions! Please read [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for setup instructions, coding standards, and PR guidelines.

**Quick version:**

1. Fork & clone
2. `bun install && bun run dev`
3. Create a feature branch (`feat/my-feature`)
4. Make changes, run `bun run lint && bun run typecheck`
5. Submit a PR with a clear description

---

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the full project vision, phased roadmap, architecture decisions, and development principles.

**What's next:**
- Slide thumbnail strip
- Export to PDF / PPTX
- Speaker notes
- Document mode (word processing)
- Cloud sync & collaboration

---

## License

[MIT](LICENSE) — use it, fork it, build on it.
