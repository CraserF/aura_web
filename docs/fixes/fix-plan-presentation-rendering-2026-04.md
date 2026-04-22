# Aura Web — Presentation Rendering Fix Plan (April 2026)

**Scope:** Four distinct bugs affecting slide output quality, canvas layout, and PDF export.

---

## Bug Index

| # | Bug | Severity | Status |
|---|-----|----------|--------|
| 1 | `submitFinalSlide` text leaks into stored slide HTML | Correctness | ⬜ Pending |
| 2 | Slide cropped / content overflows frame | UX | ⬜ Pending |
| 3 | Slide visually shifts when canvas is resized | UX | ⬜ Pending |
| 4 | PDF/print preview breaks with oklch colours | Correctness | ⬜ Pending |

---

## Bug 1 — `submitFinalSlide` text leaks into HTML

### Root Cause

`stripIncompleteTrailingSection` in `extractHtml.ts` only strips *unclosed* `<section>` elements that trail the final `</section>`. It does **not** strip arbitrary text (like `submitFinalSlide`) that appears after the closing tag.

When the LLM streams its draft, it sometimes writes the tool name as literal text after the closing `</section>` — either as a prompt-following artefact ("...and then I call submitFinalSlide") or as a hallucinated tool invocation. The current guard is:

```typescript
const afterLastClose = html.slice(lastClose + '</section>'.length);
if (/<section[\s>]/i.test(afterLastClose)) {
  return html.slice(0, lastClose + '</section>'.length).trim();
}
return html;  // ← bug: returns everything including "submitFinalSlide"
```

Evidence from `.aura` file:
```
'...    </div>\n  </div>\n</section>\nsubmitFinalSlide'
```

### Fix

Truncate unconditionally at the last `</section>`. Nothing meaningful can appear after it — `<link>` and `<style>` come before `<section>`, so trailing text is always junk.

```typescript
function stripIncompleteTrailingSection(html: string): string {
  const lastClose = html.lastIndexOf('</section>');
  if (lastClose === -1) return html;
  // Always discard anything after the last </section>
  return html.slice(0, lastClose + '</section>'.length).trim();
}
```

**Files:** `src/services/ai/utils/extractHtml.ts`

---

## Bug 2 & 3 — Slide cropped and shifts on resize

These two bugs share a root cause: the presentation frame's CSS sizing is fragile and Reveal.js doesn't re-layout when the container changes size dynamically.

### Root Cause A — Fragile `dvh` magic number

```css
.aura-presentation-frame {
  width: min(100%, calc((100dvh - 11.75rem) * 1.7778));
  max-height: 100%;
}
```

`11.75rem` is supposed to account for the total height consumed by the header, chat bar, and padding. Problems:

1. The chat bar grows during generation (status bar appears), so the actual consumed height is variable.
2. `max-height: 100%` cannot retroactively reduce an explicitly-set `width`. When `max-height` kicks in (because the calculated width produces a height taller than the container), the frame ends up **wider than its height demands** — content overflows and gets clipped by `overflow: hidden`.

### Root Cause B — Reveal.js doesn't re-layout on container resize

`reveal.layout()` is only called when toggling presentation mode (`isPresenting` effect). When the chat bar height changes (e.g. status indicator appears/disappears), the frame's effective size changes but Reveal.js keeps its last calculated scale, causing the slide to render misaligned within the frame.

### Fix A — CSS: use container queries (no magic numbers)

Add `container-type: size` to the presentation shell so child elements can use `cqi` (inline/width) and `cqb` (block/height) container units. The frame then sizes itself as the largest 16:9 box that fits in both dimensions — no hardcoded rem arithmetic.

```css
/* Remove dvh hack; shell becomes a size container */
.aura-presentation-shell {
  display: flex;
  align-items: center;
  justify-content: center;
  container-type: size;    /* NEW */
}

.aura-presentation-frame {
  aspect-ratio: 16 / 9;
  /* Largest 16:9 box that fits within both width and height of the shell */
  width: min(100cqi, calc(100cqb * 16 / 9));
  max-width: 1620px;
  /* Remove the old dvh calculation and max-height: 100% — no longer needed */
}
```

`cqi` = container inline size (width), `cqb` = container block size (height). This always produces the correct constrained 16:9 box regardless of how the surrounding layout shifts.

Note: remove the inner wrapper `<div className="relative flex min-h-0 flex-1 ...">` in PresentationCanvas — it adds an extra flex layer that can break `100%` height resolution. The shell itself is already a flex centering context.

### Fix B — ResizeObserver: re-layout Reveal.js on container size change

```typescript
// In PresentationCanvas, after deck is initialised:
useEffect(() => {
  const frame = containerRef.current?.parentElement;
  if (!frame || !deckRef.current) return;
  const ro = new ResizeObserver(() => {
    deckRef.current?.reveal.layout();
  });
  ro.observe(frame);
  return () => ro.disconnect();
}, [/* run once after deck init */]);
```

This ensures Reveal.js recalculates its scale matrix whenever the frame's rendered dimensions change (chat bar height fluctuates, window resize, etc.).

**Files:** `src/styles/index.css`, `src/components/PresentationCanvas.tsx`

---

## Bug 4 — PDF / print preview breaks with oklch colours

### Root Cause

`index.css` defines all theme CSS variables using `oklch()` syntax:

```css
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.09 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  /* etc. */
}
```

Two separate contexts fail:

**Print preview** (`openDocumentPrintPreview`): opens a new browser window and calls `window.print()`. Safari's WebKit print engine does not support `oklch()` in print stylesheets, causing the page to render with missing colours.

**Presentation PDF** (`exportPresentationPdf`): appends slides to `document.body` and renders with html2canvas. html2canvas does not implement the oklch colour space — any computed style that resolves through an oklch variable becomes transparent or black.

The slides themselves use concrete hex colours (enforced by the `palette-compliance` QA rule), but the *app chrome* styles — which bleed into offscreen export containers and new print windows via the global stylesheet — all use oklch variables.

### Fix

Convert every `oklch()` value in `index.css` to its hex equivalent. All theme values except `--destructive` are achromatic (chroma = 0), so the conversion is deterministic: lightness maps linearly to grey.

| oklch value | hex equivalent |
|-------------|---------------|
| `oklch(1 0 0)` | `#ffffff` |
| `oklch(0.09 0 0)` | `#171717` |
| `oklch(0.961 0 0)` | `#f5f5f5` |
| `oklch(0.493 0 0)` | `#737373` |
| `oklch(0.902 0 0)` | `#e5e5e5` |
| `oklch(0.857 0 0)` | `#d9d9d9` |
| `oklch(0.577 0.245 27.325)` | `#dc2626` |

This has zero visual impact in modern browsers (which support oklch natively) but makes all export contexts work correctly.

**Secondary fix**: in `exportPresentationPdf`, inject an inline CSS reset into the export container that overrides any remaining theme vars with their hex equivalents, as belt-and-suspenders for any future oklch additions.

**Files:** `src/styles/index.css`, `src/services/export/pdf.ts`

---

## Implementation Order

```
[ ] 1. extractHtml.ts: truncate at last </section> unconditionally
[ ] 2a. index.css: convert all oklch() values to hex
[ ] 2b. pdf.ts: inject hex override vars into export container
[ ] 3a. index.css: add container-type: size to .aura-presentation-shell,
         remove dvh calculation from .aura-presentation-frame
[ ] 3b. PresentationCanvas.tsx: remove inner wrapper div,
         add ResizeObserver → reveal.layout()
```

Items 1 and 2 are independent and can be done in any order.
Item 3 must be done as a pair (CSS + React together).
