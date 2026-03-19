# Contributing to Aura

Thank you for your interest in contributing to Aura! This guide covers everything you need to get started.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Scripts](#project-scripts)
- [Branch Naming](#branch-naming)
- [Commit Conventions](#commit-conventions)
- [Pull Request Process](#pull-request-process)
- [What to Work On](#what-to-work-on)
- [Code Review Standards](#code-review-standards)

---

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/aura.git
   cd aura
   ```
3. **Install dependencies** with Bun:
   ```bash
   bun install
   ```
4. **Start the dev server**:
   ```bash
   bun run dev
   ```
5. **Configure an AI provider** — click the gear icon in the app and enter your API key

You should now see Aura running at [http://localhost:5173](http://localhost:5173).

---

## Development Setup

### Requirements

- **Bun** ≥ 1.0 — [install guide](https://bun.sh)
- **Node.js** ≥ 18 (Bun includes this, but if using npm instead)
- A **code editor** with TypeScript support (VS Code recommended)
- An **API key** from any supported provider for testing AI features

### Recommended VS Code Extensions

- [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)
- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

---

## Project Scripts

| Command | Purpose |
|---|---|
| `bun run dev` | Start Vite dev server with hot reload |
| `bun run build` | TypeScript check + production build |
| `bun run preview` | Serve the production build locally |
| `bun run lint` | Run ESLint across the codebase |
| `bun run typecheck` | Run `tsc --noEmit` to check types |

**Before submitting any PR**, ensure these pass with zero errors:

```bash
bun run lint && bun run typecheck
```

---

## Branch Naming

Use descriptive, prefixed branch names:

| Prefix | Use for |
|---|---|
| `feat/` | New features — `feat/slide-thumbnails` |
| `fix/` | Bug fixes — `fix/reveal-sync-race` |
| `docs/` | Documentation — `docs/contributing-guide` |
| `refactor/` | Code restructuring — `refactor/chat-store` |
| `chore/` | Tooling, CI, deps — `chore/update-vite` |
| `style/` | Visual / CSS changes — `style/chatbar-padding` |

---

## Commit Conventions

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): short description

Optional body explaining the change in more detail.
```

### Types

| Type | When to use |
|---|---|
| `feat` | A new feature visible to users |
| `fix` | A bug fix |
| `docs` | Documentation only |
| `refactor` | Code change that doesn't fix a bug or add a feature |
| `style` | Visual / CSS / formatting changes (no logic change) |
| `chore` | Build process, CI, dependencies |
| `test` | Adding or updating tests |
| `perf` | Performance improvement |

### Examples

```
feat(chat): add message timestamp display
fix(ai): handle empty response from Gemini provider
docs: add architecture guide
refactor(stores): simplify settings store persist logic
style(toolbar): increase button padding for touch targets
chore: update tailwindcss to v4.3
```

**Rules:**
- Keep the subject line under 72 characters
- Use imperative mood ("add", not "added" or "adds")
- No period at the end of the subject line
- Reference issues when relevant: `fix(chat): handle empty input (#42)`

---

## Pull Request Process

### Before Opening a PR

1. **Rebase** on the latest `main`:
   ```bash
   git fetch origin
   git rebase origin/main
   ```
2. **Run checks**:
   ```bash
   bun run lint && bun run typecheck && bun run build
   ```
3. **Test manually** — generate a deck, save/load a `.aura` file, present mode

### PR Description

Include:
- **What** changed and **why**
- Screenshots for visual changes
- Any breaking changes or migration steps
- Related issue numbers

### Review Criteria

PRs are reviewed for:
- Correctness and completeness
- Adherence to [coding patterns](./coding-patterns.md)
- No new lint or type errors
- Visual quality (for UI changes)
- No unnecessary scope creep

### Merging

- PRs require at least one approving review
- Squash-merge to keep the commit history clean
- Delete the branch after merge

---

## What to Work On

### Good First Issues

Look for issues tagged `good first issue` on GitHub. These are intentionally scoped for newcomers.

### Areas That Need Help

- **Slide quality** — improving the system prompt to generate more visually appealing decks
- **Accessibility** — keyboard navigation, screen reader support, ARIA labels
- **Testing** — unit tests for services, integration tests for chat flow
- **Documentation** — tutorials, examples, API docs
- **Performance** — bundle size, render optimization, lazy loading

### What NOT to Submit

- Features not on the [roadmap](../ROADMAP.md) without prior discussion
- Large refactors without an issue and design discussion first
- Changes to development principles without consensus
- Code that adds dependencies without justification (see [coding patterns](./coding-patterns.md#dependency-philosophy))

---

## Code Review Standards

When reviewing others' code, be:

- **Kind** — assume good intent, suggest improvements constructively
- **Specific** — point to the exact line and explain why, not just "this is wrong"
- **Timely** — try to review within 48 hours
- **Pragmatic** — perfect is the enemy of shipped; minor style nits shouldn't block a merge

---

## Questions?

Open a [discussion](https://github.com/your-username/aura/discussions) on GitHub or leave a comment on the relevant issue. We're happy to help new contributors get oriented.
