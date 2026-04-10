# Agent Architecture

This document describes Aura's multi-agent AI system — how presentation slides are planned, generated, validated, reviewed, and revised through a structured workflow pipeline.

---

## Overview

Aura uses a **5-stage multi-agent pipeline** powered by the Vercel AI SDK. Each stage is a discrete "agent" with a specific role, and the workflow engine orchestrates them with retry, timeout, branching, and event emission for real-time UI feedback.

For create requests, Aura renders the initial draft immediately, then continues QA/review/polish in the background. Final output only replaces the draft when actionable errors are found.

```
User Prompt
    │
    ▼
┌─────────┐    ┌──────────┐    ┌─────────────┐    ┌─────────────┐
│ Planner │ →  │ Designer │ →  │ QA Validator │ →  │   Branch    │
│  (LLM)  │    │  (LLM)   │    │(programmatic)│    │ pass / fail │
└─────────┘    └──────────┘    └─────────────┘    └──────┬──────┘
                                                    pass │  │ fail
                                                         │  ▼
                                                         │ ┌──────────┐
                                                         │ │ QA Revise│
                                                         │ │  (LLM)   │
                                                         │ └────┬─────┘
                                                         │      │
                                                         ▼      ▼
                                                    ┌──────────┐
                                                    │ Reviewer  │
                                                    │  (LLM)    │
                                                    └────┬──────┘
                                                         │
                                                         ▼
                                                    ┌──────────┐
                                                    │  Revise   │
                                                    │  (LLM)    │
                                                    └────┬──────┘
                                                         │
                                                         ▼
                                                    Final HTML
```

---

## Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| AI SDK | `ai` (Vercel AI SDK v6) | Unified model interface, streaming, structured output |
| Providers | `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google` | Provider-specific model factories |
| Validation | `zod` v4 | Schema validation for structured LLM output |
| Workflow | Custom engine (`workflow/engine.ts`) | Mastra-inspired step orchestration |

---

## Pipeline Stages

### 1. Planner (`workflow/agents/planner.ts`)

**Role:** Analyze the user's prompt and produce a structured presentation outline.

**Input:** User prompt, whether existing slides exist
**Output:** `PlanResult` containing intent, style, animation level, template blueprint, and slide outline

**Key behaviors:**
- Classifies intent: `create`, `modify`, `refine_style`, `add_slides`, `blocked`, `off_topic`
- Detects template style (tech, corporate, creative, etc.) and animation level (1-4)
- Generates a Zod-validated slide outline via `generateStructured()` using `OutlineArraySchema`
- Falls back to raw JSON parsing, then to a generic 10-slide outline if all parsing fails
- The outline becomes a binding contract for the designer — specifying exact slide count, layouts, and key points

**Structured output:** Uses `OutlineArraySchema` (Zod) → AI SDK `generateObject()` with retry

### 2. Designer (`workflow/agents/designer.ts`)

**Role:** Generate the actual HTML/CSS slides from the plan.

**Input:** `PlanResult`, existing slides (for modify), chat history
**Output:** `DesignResult` with sanitized HTML, title, and slide count

**Key behaviors:**
- Selects the best template from the registry based on the enhanced prompt
- Builds a comprehensive system prompt via `PromptComposer` (12 sections: base rules, typography, layout, modern patterns, decorative, animation, SVG, narrative, anti-patterns, template examples, knowledge, quality)
- Streams the response for real-time UI feedback
- Post-processes: extracts HTML from response, sanitizes external URLs, injects Google Fonts
- For `add_slides` intent, preserves existing slide sections and appends only newly generated sections

### 3. QA Validator (`workflow/agents/qa-validator.ts`)

**Role:** Programmatic quality checks — no LLM call, instant execution.

**Input:** Generated HTML, expected slide count, expected background color
**Output:** `QAResult` with violations array and pass/fail verdict

**Checks performed:**
- Missing `data-background-color` on `<section>` elements
- External images (`<img src="http...">`, `background-image: url(http...)`, SVG `<image>`)
- Slide count mismatch (expected vs actual)
- Empty sections
- Missing CSS custom properties on first section

### 3b. QA Branch

**Predicate:** `qaResult.passed ? 'pass' : 'fail'`

- **Pass:** Identity step — data flows through unchanged
- **Fail:** QA Revise step — LLM fixes QA violations using full designer context, then re-validates

### 4. Reviewer (`workflow/agents/reviewer.ts`)

**Role:** LLM-based design quality audit against strict rules.

**Input:** Generated HTML
**Output:** `ReviewResult` with pass/fail, score (0-100), issues array, summary

**Key behaviors:**
- Uses Zod-validated structured output (`ReviewResultSchema`) via `generateStructured()`
- Falls back to raw text parsing if structured output fails
- On total parse failure: returns `passed: false, score: 0` to trigger revision (never silently passes)
- Treats single-slide output as valid by default (no fixed minimum slide-count penalty)
- Scoring: errors = -10 points each, warnings = -3 points each, pass threshold = 75

### Document Pipeline (`workflow/document.ts`)

Aura documents deliberately use a **lean, single-pass workflow** with programmatic QA rather than the full presentation review loop:

```text
plan → generate → qa → finalize
```

**Key behaviors:**

- `planDocumentRequest()` resolves document type, visual tone, and theme without another model call
- `DocumentPromptComposer` keeps prompts compact and focused on the current artifact
- the renderer supports reusable `doc-*` patterns (accent headers, metadata grids, callouts, progress rows, type tags)
- subtle `aura-*` motion classes are allowed in-app but must degrade cleanly in print, PDF, and DOCX export
- document chat should stay artifact-scoped by default, with project-scope context opt-in via the UI toggle

### 5. Revise (`workflow/steps/index.ts`)

**Role:** Fix issues from review and/or remaining QA violations.

**Input:** Review result, QA result, design result, plan result
**Output:** `PresentationOutput` with final HTML

**Key behaviors:**
- Skips entirely when no actionable errors are present (returns original HTML)
- Ignores non-actionable review findings (for example, generic slide-count guidance in single-slide runs)
- Sends only actionable error issues into revision prompts to minimize unnecessary style rewrites
- Uses full revision system prompt via `buildRevisionSystemPrompt()` (includes palette, layout, anti-patterns, SVG guidance)
- Merges all issues from both QA and reviewer into a single revision prompt
- Post-processes revised output through the same sanitize pipeline
- Falls back to original HTML if revision produces empty output

---

## Workflow Engine (`workflow/engine.ts`)

The workflow engine is a lightweight, browser-compatible orchestration system inspired by [Mastra](https://mastra.ai).

### Step Types

| Type | Method | Behavior |
|------|--------|----------|
| Sequential | `.then(step)` | Runs step, passes output to next |
| Parallel | `.parallel([steps])` | Runs all steps concurrently, keyed output |
| Branch | `.branch({ predicate, branches })` | Evaluates predicate, runs matching branch |

### Features

- **Retry with backoff:** Per-step `retry: { maxAttempts, backoffMs, retryOn? }`
- **Timeout:** Per-step `timeoutMs` — races step execution against a timer
- **Event emission:** Real-time events for UI updates (`step-start`, `step-done`, `streaming`, `progress`, etc.)
- **Abort:** `AbortSignal` support for user cancellation
- **Branch events:** `branch-taken` and `step-skipped` for UI indication

### Event Types

```typescript
type WorkflowEvent =
  | { type: 'step-start';    stepId: string; label: string }
  | { type: 'step-done';     stepId: string; label: string }
  | { type: 'step-error';    stepId: string; error: string }
  | { type: 'step-skipped';  stepId: string; label: string }
  | { type: 'streaming';     stepId: string; chunk: string }
  | { type: 'progress';      message: string; pct?: number }
  | { type: 'branch-taken';  stepId: string; branch: string }
  | { type: 'retry-attempt'; stepId: string; attempt: number; maxAttempts: number }
  | { type: 'complete';      result: unknown };
```

---

## LLM Client (`createLLMClient`)

The `LLMClient` interface abstracts all LLM interactions:

```typescript
interface LLMClient {
  generate(messages: AIMessage[], onChunk?: (text: string) => void): Promise<string>;
  generateStructured<T>(messages: AIMessage[], schema: z.ZodType<T>, schemaName?: string): Promise<T>;
}
```

- **`generate()`** — Uses `streamText()` from AI SDK for streaming HTML generation. Consumes the async text stream, calling `onChunk` for each piece.
- **`generateStructured()`** — Uses `generateObject()` from AI SDK with Zod schema validation and automatic retry (max 2 retries).

---

## Provider Registry (`registry.ts`)

Providers are registered as `ProviderEntry` objects that create AI SDK `LanguageModelV1` instances on demand:

```typescript
interface ProviderEntry {
  id: ProviderId;
  name: string;
  defaultModel: string;
  createModel: (config: ProviderModelConfig) => LanguageModelV1;
}
```

### Supported Providers

| Provider | SDK Package | Default Model |
|----------|-------------|---------------|
| OpenAI | `@ai-sdk/openai` | `gpt-4o` |
| Anthropic | `@ai-sdk/anthropic` | `claude-sonnet-4-20250514` |
| Gemini | `@ai-sdk/google` | `gemini-2.5-flash` |
| DeepSeek | `@ai-sdk/openai` (custom baseURL) | `deepseek-chat` |
| Ollama | `@ai-sdk/openai` (custom baseURL) | `llama3.1` |

### Adding a New Provider

1. Add the provider ID to `ProviderId` in `src/types/index.ts`
2. Add a `ProviderEntry` to `src/services/ai/registry.ts` using the appropriate AI SDK factory
3. Add to `PROVIDER_OPTIONS` in `src/types/index.ts`
4. Add default config in `src/stores/settingsStore.ts`

No other files need to change.

---

## Zod Schemas (`schemas/index.ts`)

### `OutlineArraySchema`

Validates the planner's slide outline output:

```typescript
SlideOutlineSchema = z.object({
  index: z.number().int().min(0),
  title: z.string().min(1).max(80),
  layout: z.enum(['hero-title', 'bento-grid', 'split-text-visual', ...]),
  keyPoints: z.array(z.string().min(1)).min(1).max(6),
});
OutlineArraySchema = z.array(SlideOutlineSchema).min(6).max(20);
```

### `ReviewResultSchema`

Validates the reviewer's quality audit output:

```typescript
ReviewResultSchema = z.object({
  passed: z.boolean(),
  score: z.number().min(0).max(100),
  issues: z.array(ReviewIssueSchema),
  summary: z.string().min(1),
});
```

---

## Prompt Composition (`prompts/composer.ts`)

The `PromptComposer` builds system prompts from modular sections using a chainable API:

```typescript
new PromptComposer()
  .addBase(palette)        // Design philosophy, output format, absolute rules
  .addTypography()         // Font scale and sizing guidance
  .addLayout()             // Layout system, glassmorphism patterns
  .addModernPatterns()     // Mode-aware card/layout recipes
  .addDecorative()         // Gradient text, SVG icons, decorative elements
  .addAnimation(level)     // Animation framework (gated by level 1-4)
  .addSvg()                // SVG drawing skills (gated by animation level)
  .addNarrative(count)     // Slide structure, narrative arc
  .addAntiPatterns()       // Common mistakes to avoid
  .addTemplateExamples()   // HTML examples from template registry
  .addKnowledge()          // Knowledge base docs
  .addQuality()            // Quality checklist and response format
  .build()
```

### Key Design Choices

- **Palette as contract:** Colors are presented as a binding table with DO/DON'T examples
- **Mode-aware rules:** Dark/light mode have different card, shadow, and text rules
- **SVG gating:** Level 1 gets only Bootstrap Icons + decision guide; level 2+ gets drawing recipes; level 3+ gets animation recipes
- **Anti-patterns in generation:** Design anti-patterns are included in the generation prompt, not just the review prompt

---

## HTML Sanitization (`utils/sanitizeHtml.ts`)

Post-generation sanitizer acts as last line of defense:

- Strips `<img src="http(s)://...">` except allowed hosts
- Strips `background-image: url("http(s)://...")` from inline styles
- Strips SVG `<image href="...">` / `<image xlink:href="...">`
- Allowed hosts: `fonts.googleapis.com`, `fonts.gstatic.com`, `cdn.jsdelivr.net`
- Applied after both the design step and the revise step

---

## How-To Guides

### Add a New QA Check

1. Edit `workflow/agents/qa-validator.ts`
2. Add a new check in the `validateSlides()` function
3. Push violations to the `violations` array with `slide`, `severity`, `rule`, and `detail`
4. The QA branch will automatically route to revision if any QA errors are found

### Add a New Prompt Section

1. Create `prompts/sections/your-section.ts` exporting a `buildYourSection()` function
2. Add an `addYourSection()` method to `PromptComposer` in `prompts/composer.ts`
3. Wire it into `buildDesignerPrompt()` and/or `buildRevisionSystemPrompt()` as appropriate

### Modify the Workflow Pipeline

1. Create a new step in `workflow/steps/index.ts` using `createStep()`
2. Define input/output interfaces
3. Register in the workflow chain in `workflow/presentation.ts` using `.then()`, `.parallel()`, or `.branch()`
4. Add the step ID to `ChatBar.tsx`'s `workflowStepsRef` for UI tracking

### Update a Provider's Default Model

Edit the `defaultModel` and `createModel` fallback in `src/services/ai/registry.ts`.
