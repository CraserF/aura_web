<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License" />
  <img src="https://img.shields.io/badge/react-19-blue" alt="React" />
  <img src="https://img.shields.io/badge/typescript-strict-blue" alt="TypeScript" />
  <img src="https://img.shields.io/badge/bun-%E2%89%A51.0-orange" alt="Bun" />
</p>

# Aura

**A local-first AI workspace for creating and editing high-quality presentations, documents, and spreadsheets.**

Aura combines chat, structured artifact runtimes, starter kits, project files, and version history so you can move from idea to polished output with less manual assembly. Most creation and editing flows are driven through conversation, with less reliance on manual layout tools.

---

## What Aura creates

- **Presentations** - reveal.js slide decks generated as HTML/CSS, with support for themes and visual treatments
- **Documents** - structured HTML documents for reports, proposals, and reference materials
- **Spreadsheets** - workbook-style artifacts for structured tables and project data
- **Multi-artifact projects** - a single project can contain any combination of the above, sharing context and local project state

---

## Features

- **Chat-driven creation and editing** - describe what you want; follow up with refinements in plain English
- **Starter kits** - pre-built project templates for executive briefings, research packs, launch plans, and more
- **In-app previews** - inspect generated presentations, documents, and spreadsheets inside the workspace
- **Project files** - projects save as `.aura` zip archives for local ownership and inspection
- **Local version history** - project changes can be committed to a local git repository using `isomorphic-git`
- **BYOK provider settings** - connect OpenAI, Anthropic, Google Gemini, DeepSeek, or an OpenAI-compatible local model
- **100% client-side** - no backend, no telemetry, your API keys never leave your browser

---

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) ≥ 1.0 (or Node.js ≥ 18 with npm)
- An API key from a supported provider, or a local model via Ollama

### Install & Run

```bash
git clone https://github.com/your-username/aura.git
cd aura
bun install
bun run dev
```

Open [http://localhost:5173](http://localhost:5173), configure your AI provider in Settings (gear icon), and start a new project.

### Available Scripts

| Command | Description |
|---|---|
| `bun run dev` | Start Vite dev server with HMR |
| `bun run build` | Type-check and production build |
| `bun run preview` | Preview the production build locally |
| `bun run typecheck` | Run TypeScript compiler check |
| `bun run lint` | Run ESLint |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript (strict) |
| Build | Vite 5 + Bun |
| Presentations | reveal.js 5 |
| State | Zustand 5 |
| Styling | Tailwind CSS 4 + shadcn/ui + Radix Primitives |
| AI | Vercel AI SDK (`ai`) — `streamText`, `generateText`, `ToolLoopAgent` |
| Provider adapters | `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google` |
| Spreadsheets | DuckDB (WASM) |
| Version history | `isomorphic-git` + `@isomorphic-git/lightning-fs` (IndexedDB) |
| File format | JSZip + FileSaver |
| Persistence | IndexedDB (idb-keyval) |

---

## Projects and the `.aura` File Format

Each Aura project is saved as a `.aura` file, which is currently a standard zip archive. You can rename any `.aura` file to `.zip` and inspect its contents directly.

The current implementation writes a package like this:

```
project.aura
├── manifest.json           # Project id, title, artifact list, format version
├── chat-history.json       # Full message history for continued editing
├── project-rules.md        # Project-level style and output rules
├── context-policy.json     # Context inclusion policy
├── workflow-presets.json   # Saved workflow presets
├── media/                  # Packaged media assets, when present
├── memory/                 # Project memory tree
└── documents/              # Artifact HTML, metadata, CSS, and spreadsheet Parquet data
```

The current format version is `2.4`. A clean replacement `.aura` format is planned, so treat this structure as current-state documentation rather than a long-term compatibility contract.

---

## Connecting AI Providers

Click the provider icon in the toolbar to configure your connection. All API calls are made directly from your browser to the provider.

| Provider | Notes |
|---|---|
| **OpenAI** | GPT-4o, o3, and other OpenAI models |
| **Anthropic** | Claude models (Sonnet, Opus, Haiku) |
| **Google Gemini** | Gemini Pro and Flash |
| **DeepSeek** | OpenAI-compatible, budget-friendly |
| **Ollama / local models** | Any OpenAI-compatible endpoint via custom base URL |

---

## Project Structure

```
src/
├── components/               # React UI components
│   ├── ui/                   # shadcn/ui base components
│   ├── ChatBar.tsx            # Chat input and active-run controls
│   ├── PresentationCanvas.tsx # reveal.js wrapper
│   ├── DocumentCanvas.tsx     # Document iframe renderer
│   ├── SpreadsheetCanvas.tsx  # Spreadsheet grid
│   ├── Toolbar.tsx            # Top bar actions
│   └── ProjectSidebar.tsx     # Artifact navigation
├── services/
│   ├── ai/                   # AI workflow orchestration, prompts, templates
│   │   ├── workflow/         # Orchestrators and agents (designer, evaluator, planner)
│   │   ├── prompts/          # Prompt section modules
│   │   └── templates/        # Visual theme registry and exemplar packs
│   ├── artifactRuntime/      # Artifact generation runtimes (presentation, document, spreadsheet)
│   ├── bootstrap/            # Starter kits and project initialization
│   ├── chat/                 # Chat routing, run request building, progress
│   ├── storage/              # .aura file format, autosave, version history
│   └── runs/                 # Run registry, types, status
├── stores/                   # Zustand state stores (chat, presentation, settings)
├── types/                    # Shared TypeScript types
└── styles/                   # Global CSS and theme tokens
```

See [docs/architecture.md](docs/architecture.md) for a detailed architecture guide.

---

## Current Limitations

- Version history uses a shared git repository path; project isolation is planned for a future release.
- Version history coverage is being refined so artifact-changing AI responses and manual user edits are captured consistently.
- The `.aura` format is planned for a clean redesign; backwards compatibility with older `.aura` files is not a future requirement.
- Screenshot-based slide quality validation is not yet implemented; validation is currently heuristic and LLM-based.
- PDF and PPTX export are not yet available (HTML and email export are).
- Cloud sync and collaboration are not planned for the near term; Aura is intentionally local-first.

---

## Contributing

Please read [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for setup instructions, coding standards, and PR guidelines.

```bash
# Fork, clone, then:
bun install && bun run dev
# Create a feature branch, make changes, then:
bun run typecheck && bun run build
```

---

## License

[MIT](LICENSE) — use it, fork it, build on it.
