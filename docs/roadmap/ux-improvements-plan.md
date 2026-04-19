# UX Improvements — Implementation Plan

> Status: planning (no implementation in this document)  
> Scope: multi-slide generation queue, PDF export improvements, UI polish from Dyad learnings  
> Last updated: 2026-04-19  
> Depends on: nothing (can start independently)  
> Applies across: all existing features + new features as they ship

## 1) Goals

- Improve generation workflow: support queued multi-slide creation from a single prompt.
- Fix critical PDF export gaps (chart flattening) and improve fidelity.
- Apply targeted UI polish patterns learned from Dyad to raise the perceived quality of the app.
- Maintain the current single-slide paradigm as default while enabling batch mode when explicitly requested.

## 2) Multi-Slide Generation Queue

### 2.1 Problem

Currently Aura generates ONE slide per request (the single-slide paradigm). If a user explicitly requests multiple slides with details for each, they must send separate prompts and wait for each to complete. This is friction when the user has a clear multi-slide vision.

### 2.2 Design: Queued Batch Generation

When the user explicitly requests multiple slides with distinct content for each, the system should:

1. **Detect multi-slide intent** in the planner phase (e.g., "Create 5 slides: intro, problem, solution, timeline, and CTA").
2. **Decompose** the request into individual slide briefs.
3. **Generate shared styling context** once (palette, fonts, layout principles) — this is the "template" all slides share.
4. **Queue slides** and generate them sequentially, one after another.
5. **Stream each slide** as it completes — the user sees slides appearing progressively.

```
User prompt: "Create a 4-slide pitch deck: intro, problem, solution, pricing"
                │
                ▼
        ┌───────────────┐
        │  Planner       │  Detects multi-slide intent
        │  (rule-based)  │  Decomposes into 4 slide briefs
        └───────┬───────┘  Generates shared style context
                │
        ┌───────┴───────┐
        │  Style Context │  Palette, fonts, layout, tone
        │  (generated    │  Shared across all slides
        │   once)        │  (~500 tokens, amortized)
        └───────┬───────┘
                │
    ┌───────────┼───────────┬───────────┐
    ▼           ▼           ▼           ▼
  Slide 1    Slide 2    Slide 3    Slide 4
  (queued)   (queued)   (queued)   (queued)
    │
    ▼
  Design → Validate → Finalize → Stream to canvas
              │
              ▼
           Slide 2 starts...
```

### 2.3 Token Efficiency

Batch mode saves tokens compared to individual requests:

| Individual (4 separate requests) | Batch (1 request, queued) |
|----------------------------------|--------------------------|
| 4 × full system prompt (~4K tokens each) = ~16K | 1 × full system prompt + 3 × abbreviated (~4K + 3×2K) = ~10K |
| 4 × palette/font/layout instructions | 1 × shared style context, referenced by each slide |
| No visual consistency guarantee | Consistent palette, fonts, and layout across all slides |

**How it saves tokens:**
- System prompt sent in full for slide 1. Slides 2-4 receive an abbreviated prompt with a reference to the shared style context.
- The shared style context (~500 tokens) replaces repeated palette/font/layout instructions (~1500 tokens each).
- Estimated saving: **30-40% fewer input tokens** for a 4-slide deck.

### 2.4 Intent Detection Rules

The planner already classifies intent. Add a new intent type:

```typescript
interface PlanResult {
  intent: 'create' | 'modify' | 'refine_style' | 'add_slides' | 'batch_create';
  // For batch_create:
  slideBriefs?: SlideBrief[];
  sharedStyle?: SharedStyleContext;
}

interface SlideBrief {
  index: number;
  title: string;
  contentGuidance: string;  // What this slide should cover
  visualGuidance?: string;  // Any specific visual requests
}

interface SharedStyleContext {
  palette: string;
  fonts: string;
  layoutStyle: string;
  tone: string;
}
```

**Detection heuristics:**
- User mentions multiple distinct topics with slide-level separation (numbered list, "first slide... second slide...", "create X slides").
- User explicitly requests a "deck" or "presentation with N slides".
- If the user says "create a presentation" without specifying slide count or content breakdown, generate ONE slide (current behavior).

### 2.5 Generation Lock

- While a batch is in progress, the queue is locked — no new generation can start.
- If a user explicitly creates a presentation/spreadsheet/document, that type is active and another of the same type cannot be generated simultaneously.
- If the user did not specify a type (ambiguous prompt), allow the system to choose.
- Cancel button aborts the remaining queue without discarding already-completed slides.

### 2.6 UI Feedback

- Show a progress indicator: "Generating slide 2 of 4..."
- Each slide appears in the canvas and slide strip as it completes.
- Slide strip shows completed slides + skeleton placeholders for pending slides.
- Chat shows step-by-step progress: "Planning deck... → Designing slide 1... → Slide 1 complete → Designing slide 2..."

## 3) PDF Export Improvements

### 3.1 Current State

| Area | Status | Issue |
|------|--------|-------|
| html2pdf.js pipeline | Working | Text slightly soft due to canvas rasterization |
| Chart.js in PDFs | **Broken** | `html2canvas` cannot capture `<canvas>` elements — charts appear blank |
| Mobile PDF | Partial | A4 fixed width clips on mobile viewports |
| Print dialog fallback | Working | Sharper text but requires user interaction, clips on mobile |

### 3.2 Critical Fix: Chart Flattening

**Priority: P0 — blocks chart-containing PDFs.**

Before the html2pdf pipeline runs, pre-process the export container:

```typescript
// src/services/export/chartExport.ts
export async function flattenChartsForExport(container: HTMLElement): Promise<void> {
  const chartContainers = container.querySelectorAll('[data-aura-chart]');
  
  for (const el of chartContainers) {
    const canvas = el.querySelector('canvas');
    if (!canvas) continue;
    
    // Get the Chart.js instance
    const chart = Chart.getChart(canvas);
    if (!chart) continue;
    
    // Disable animations for clean snapshot
    chart.options.animation = false;
    chart.update('none');
    
    // Render to high-DPI image
    const dataUrl = chart.toBase64Image('image/png', 2);
    
    // Replace canvas with static image
    const img = document.createElement('img');
    img.src = dataUrl;
    img.style.width = canvas.style.width || `${canvas.width}px`;
    img.style.height = canvas.style.height || `${canvas.height}px`;
    canvas.replaceWith(img);
  }
}
```

Hook into `createDocumentPdfBlob()`:
```typescript
const container = createExportContainer(markup);
await flattenChartsForExport(container);  // ← Add this
const blob = await html2pdf().from(container).outputPdf('blob');
```

### 3.3 Presentation PDF Export

For presentations (Reveal.js slides), PDF export needs a slide-by-slide approach:

```
For each slide:
  1. Navigate Reveal.js to slide N
  2. Flatten any charts in the current slide
  3. Capture slide viewport as canvas (1920×1080)
  4. Add as page to PDF (landscape A4 or 16:9)
```

This produces one PDF page per slide, which is the expected format for presentation PDFs.

### 3.4 Future: Server-Side PDF (Phase 10)

When the API server exists (Phase 10), offer a premium server-side PDF path:

- Use Playwright headless browser for pixel-perfect rendering.
- No canvas rasterization softness — real browser renders the HTML.
- Chart.js canvases render natively (no flattening needed).
- Client sends HTML to API endpoint, receives PDF blob.
- Keep client-side html2pdf.js as free/offline fallback.

### 3.5 Milestones

| Task | Description | Priority | Est. |
|------|-------------|----------|------|
| P3.1 | Implement `flattenChartsForExport()` for document PDFs | P0 | S |
| P3.2 | Wire chart flattening into `createDocumentPdfBlob()` | P0 | S |
| P3.3 | Implement slide-by-slide presentation PDF export | P1 | M |
| P3.4 | Add PDF export tests (with chart, without chart, multi-page) | P1 | M |
| P3.5 | Improve mobile print preview with viewport scaling | P2 | M |
| P3.6 | Server-side Playwright PDF endpoint (Phase 10) | P3 | L |

## 4) UI Polish — Dyad-Inspired Patterns

These are targeted improvements that raise the perceived quality of the app without major architectural changes.

### 4.1 Resizable Panel Layout

**Pattern**: Replace fixed layout with `react-resizable-panels`.

**Where to apply**: Chat panel / Canvas split. When the portfolio view is built, sidebar / content split.

```
┌──────────────────────────────────────────────────────┐
│  Toolbar                                              │
├──────────────────┬───────────────────────────────────┤
│                  │                                    │
│   Chat Panel     ║           Canvas                  │
│   (collapsible)  ║    (presentation/document/         │
│                  ║     spreadsheet)                   │
│                  │                                    │
├──────────────────┴───────────────────────────────────┤
│  Slide Strip / Tab Bar                               │
└──────────────────────────────────────────────────────┘
```

- Panel sizes persist across sessions (autoSaveId).
- Chat panel can collapse fully to maximize canvas space.
- Resize handle is subtle (1px line, wider on hover).

**Package**: `react-resizable-panels` (~8 KB, MIT).

### 4.2 State-Driven Animations

**Pattern**: Tie all motion to state changes, not arbitrary timing.

```typescript
// Example: slide generation complete animation
<div className={cn(
  'transition-all duration-300',
  isGenerating && 'opacity-50 scale-[0.98]',
  isComplete && 'animate-in fade-in-0 slide-in-from-bottom-2'
)}>
```

**Where to apply**:
- Chat message appearance (fade-in from bottom).
- Slide strip: new slide slides in from right.
- Step indicators: fade-in/out on step transitions.
- Settings/modal open: slide-up + fade-in.

### 4.3 Streaming Feedback Hierarchy

**Pattern**: Always show loading → status → action state progression.

```
[Spinner + "Designing slide..."]
      ↓
[Checkmark + "Slide complete"]
      ↓
[Action buttons: Retry | Edit | Next slide]
```

For multi-slide batch:
```
Slide 1: ✓ Complete
Slide 2: ⟳ Generating...
Slide 3: ○ Queued
Slide 4: ○ Queued
```

### 4.4 OKLCH Color Tokens

**Pattern**: Migrate CSS variables from HSL to OKLCH for better perceptual uniformity across light/dark modes.

```css
:root {
  --primary: oklch(0.59 0.16 287.69);
  --destructive: oklch(0.577 0.245 27.325);
  --muted: oklch(0.922 0 0);
}
.dark {
  --primary: oklch(0.75 0.12 287.69);
  --destructive: oklch(0.396 0.141 25.723);
}
```

**Impact**: Colors that look equally vibrant in both modes without manual tuning per-color.

### 4.5 Memoized Chat Messages

**Pattern**: Prevent re-renders in the message list using `React.memo` and stable callback dependencies.

```typescript
const MemoizedChatMessage = React.memo(ChatMessage);
```

**Impact**: Noticeable improvement with 20+ messages. Prevents cascading re-renders when new messages stream in.

### 4.6 Confirmation Dialogs for Destructive Actions

**Pattern**: Multi-step confirmation for actions that can't be undone.

**Where to apply**:
- Delete a document/slide.
- Clear all slides.
- Overwrite local data with cloud version.
- Delete a project from portfolio.

### 4.7 Smart Loading Messages

**Pattern**: Loading overlays with context-specific messages instead of generic spinners.

| Action | Message |
|--------|---------|
| Generating slide | "Designing your slide..." |
| Evaluating quality | "Reviewing for quality..." |
| Importing data | "Importing 12,847 rows..." |
| Syncing to cloud | "Syncing your project..." |
| Loading project | "Loading 'Q2 Sales Report'..." |

## 5) Milestones

### M1 — Critical Fixes + Quick Wins (no dependencies)
**Parallel-safe: yes — independent of all other features**

| Task | Description | Est. |
|------|-------------|------|
| M1.1 | Chart flattening for PDF export (P0 fix) | S |
| M1.2 | Wire chart flattening into document + presentation PDF pipelines | S |
| M1.3 | PDF export tests (chart, multi-page, snapshot fidelity) | M |
| M1.4 | Memoized chat messages (`React.memo`) | S |
| M1.5 | Smart loading messages (replace generic spinners) | S |
| M1.6 | Confirmation dialogs for destructive actions | S |

### M2 — Multi-Slide Queue
**Parallel-safe: yes — touches planner + workflow orchestrator only**

| Task | Description | Est. |
|------|-------------|------|
| M2.1 | Add `batch_create` intent to planner with detection heuristics | M |
| M2.2 | Implement `SharedStyleContext` generation (palette/fonts once) | M |
| M2.3 | Implement slide queue runner (sequential generation with shared context) | L |
| M2.4 | Abbreviated system prompt for slides 2-N (reference shared context) | M |
| M2.5 | Generation lock (prevent concurrent generation of same type) | S |
| M2.6 | Queue progress UI (step indicator, skeleton placeholders, cancel) | M |
| M2.7 | Tests: batch intent detection, queue cancellation, style consistency | M |

### M3 — UI Polish Pass
**Can be done incrementally alongside other features**

| Task | Description | Est. |
|------|-------------|------|
| M3.1 | Add `react-resizable-panels` for chat/canvas split | M |
| M3.2 | State-driven animations (message appear, slide-strip transitions) | M |
| M3.3 | OKLCH color token migration | S |
| M3.4 | Streaming feedback hierarchy (loading → complete → actions) | M |
| M3.5 | Presentation PDF export (slide-by-slide to landscape pages) | M |
| M3.6 | Mobile print preview improvements | M |

**Size estimates: S = < 1 day, M = 1-3 days, L = 3-5 days**

## 6) Validation Requirements

- **Multi-slide queue**: Test intent detection accuracy (single vs batch prompts). Test style consistency across queued slides (same palette, fonts). Test cancel mid-queue (completed slides preserved). Test generation lock (reject concurrent requests).
- **PDF export**: Chart appears in exported PDF (not blank). Multi-page documents paginate correctly. Presentation PDF has one slide per page. Font rendering quality check (visual comparison).
- **UI polish**: Panel resize persists across sessions. Animations don't cause layout shifts. Memoization reduces re-render count (measure with React DevTools profiler). Destructive action requires confirmation.

## 7) Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Multi-slide intent false positives | Conservative detection: only trigger batch when user explicitly describes multiple distinct slides. Default to single-slide. |
| Style drift across queued slides | Shared style context injected into every slide prompt. Post-generation QA check for palette consistency. |
| Chart flattening breaks edge cases | Test all chart types (bar, line, doughnut, sparkline). Fallback to placeholder image if Chart.js instance not found. |
| react-resizable-panels bundle size | ~8 KB gzipped — negligible. |
| OKLCH browser support | Supported in all modern browsers (Chrome 111+, Firefox 113+, Safari 15.4+). Aura already targets modern browsers only. |

## 8) Open Questions

1. **Batch slide count limit**: Should there be a max number of slides in a single batch? Recommendation: cap at 10 slides per batch to prevent runaway token usage and long wait times.
2. **Parallel vs sequential generation**: Could slides 2-N be generated in parallel (multiple LLM calls)? Sequential is safer for token budgeting and progress UX. Parallel saves time but complicates error handling and ordering. Start sequential, evaluate parallel later.
3. **Presentation PDF layout**: Landscape A4 (fits 16:9 roughly) or exact 16:9 custom page size? Exact 16:9 matches screen output better but may not print well. Recommend 16:9 custom.
4. **DOCX chart export**: Same chart flattening utility should work for DOCX export (chart → PNG image in docx). Confirm with docx npm package.
