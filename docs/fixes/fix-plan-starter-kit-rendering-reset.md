# Fix Plan: Starter Kit Rendering Reset

**Status:** Planned  
**Author:** Investigation — April 2026  
**Scope:** `src/services/bootstrap/projectStarter.ts`, `src/services/export/presentationHtml.ts`, `src/services/bootstrap/starterKits.ts`, `src/test/project-starter-kits.test.ts`

---

## Problem Statement

Presentation starter kits produce visually broken slides in two distinct ways:

1. **CSS leaks into the app shell.** Starter kit slide HTML contains raw `<style>` blocks from the template files. These are injected directly into the Reveal.js canvas without scoping, so selectors like `body`, `h1`, `.slides section` affect the surrounding React UI.

2. **Hero slides appear blank.** Token replacement blanks optional fields (`{{SUBTITLE}}`, `{{PRESENTER}}`, `{{ONE_LINE_DESCRIPTION}}`). The hero structure still renders the empty shells — presenter rows, subtitle lines, one-liner paragraphs — leaving prominent whitespace where meaningful content should be.

These two bugs combine to make every presentation starter look broken on first load.

---

## Root Cause Analysis

### 1. `sanitizeSlideHtml()` is never called for starter kits

Generated presentations (via `presentationHandler.ts`) pass their output through `sanitizeSlideHtml()` in `src/services/ai/utils/sanitizeHtml.ts`. This function scopes all `<style>` blocks to `.reveal .slides` using CSS `@scope`, strips external images, and hoists global at-rules (`@keyframes`, `@font-face`, `@import`).

`buildPresentationStarterResult()` in `projectStarter.ts` builds its `contentHtml` directly from template HTML without calling this function. The result is unscoped CSS in the stored document.

### 2. CSS is stored in both `contentHtml` and `themeCss`

The app has one canonical storage invariant for presentations:

> `contentHtml` is the complete, scoped slide HTML (including `<style>` blocks).  
> `themeCss` is a secondary legacy field used only at export time to inject extra styles into the standalone HTML wrapper. Generated presentations always set `themeCss: ''`.

`buildPresentationStarterResult()` currently sets both:
```typescript
// projectStarter.ts (current — WRONG)
const contentHtml = styles ? `<style>\n${styles}\n</style>\n${sectionHtml}` : sectionHtml;
return { contentHtml, themeCss: styles, ... };  // CSS duplicated in both fields
```

At export (`presentationHtml.ts` line 50), `themeCss` is unconditionally injected as a second `<style>` block in the standalone wrapper. For starter kit documents this doubles all CSS in the exported file. For generated documents (where `themeCss` is `''`) there is no issue.

### 3. Token replacement clears hero content instead of providing defaults

The current replacement map sets optional hero fields to empty strings:
```typescript
SUBTITLE: '',
PRESENTER: '',
PRESENTER_ROLE: '',
ONE_LINE_DESCRIPTION: '',
```

The template HTML still renders the full hero DOM structure with these tokens replaced by nothing. The result is rows of whitespace for presenter, subtitle, and one-liner areas. Structural cleanup (removing the empty shells) is not performed.

### 4. All 24 templates are exposed as presentation quick-starts

`listPresentationStarters()` iterates `Object.values(TEMPLATE_REGISTRY)` and returns every template. Only two templates (`corporate`, `pitch-deck`) are used by curated starter kits. The other 22 have no curated token values and no kit-level context, so their quick-start slides will have worse blank-hero problems.

**Agreed decision:** hide non-kit-backed templates from the presentation quick-start list. Only `corporate` and `pitch-deck` are surfaced as quick-starts (matching the two kits that use them). The full template list remains accessible via the AI generation flow.

---

## Presentation Storage Invariant (Reference)

This invariant must be maintained for all code paths that create or update `ProjectDocument` with `type: 'presentation'`:

| Field | Canonical meaning | Who sets it |
|---|---|---|
| `contentHtml` | Complete scoped slide HTML. Includes `<style>` blocks already processed by `sanitizeSlideHtml()`. | AI generation, starters, edit handlers |
| `themeCss` | Legacy secondary CSS injected by export only. Set to `''` for all new documents. Non-empty only for documents saved before this invariant was established. | Export reader (legacy), never written by new code |
| `slideCount` | Count of `<section>` elements in `contentHtml`. | Same as above |

---

## Implementation Plan

### Step 1 — Route starter HTML through `sanitizeSlideHtml()`

**File:** `src/services/bootstrap/projectStarter.ts`  
**What:** Import and call `sanitizeSlideHtml()` on the assembled `contentHtml` before returning it from `buildPresentationStarterResult()`.

`sanitizeSlideHtml` is already exported from `src/services/ai/utils/sanitizeHtml.ts`. It is not currently imported in `projectStarter.ts`.

**Change:**
```typescript
// Add import at top of file
import { sanitizeSlideHtml } from '@/services/ai/utils/sanitizeHtml';

// In buildPresentationStarterResult(), after assembling rawHtml:
const rawHtml = styles ? `<style>\n${styles}\n</style>\n${sectionHtml}` : sectionHtml;
const contentHtml = sanitizeSlideHtml(rawHtml);
```

After this change, all CSS in starter kit documents will be scoped to `.reveal .slides`. The CSS leakage into the app shell is eliminated.

---

### Step 2 — Restore single-field invariant: `themeCss: ''` for new starters

**File:** `src/services/bootstrap/projectStarter.ts`  
**What:** Set `themeCss: ''` in the return value of `buildPresentationStarterResult()`. CSS is already in `contentHtml` via Step 1; no second copy should be stored.

**Change:**
```typescript
return {
  title,
  type: 'presentation',
  contentHtml,   // scoped via sanitizeSlideHtml()
  themeCss: '',  // invariant: empty for new documents
  slideCount: 1,
  ...
};
```

This aligns starter kit documents with the same invariant used by AI-generated presentations (see `presentationHandler.ts`).

---

### Step 3 — Guard export against CSS duplication from legacy documents

**File:** `src/services/export/presentationHtml.ts`  
**What:** The export function unconditionally injects `themeCss` as a second `<style>` block (line 50). For legacy documents where `themeCss` is non-empty and `contentHtml` also contains `<style>` blocks, this doubles the CSS in the export. Add a guard so `themeCss` is only injected when `contentHtml` contains no `<style>` blocks.

**Current code (line ~48–50):**
```typescript
const head = `
<style>...</style>
<style>${input.document.themeCss ?? ''}</style>`.trim();
```

**Change:**
```typescript
// Only inject themeCss if contentHtml contains no <style> blocks (legacy documents)
const hasInlineStyles = /<style[\s>]/i.test(input.document.contentHtml);
const legacyCss = !hasInlineStyles ? (input.document.themeCss ?? '') : '';

const head = `
<style>...</style>
${legacyCss ? `<style>${legacyCss}</style>` : ''}`.trim();
```

This is a conservative guard that does not break existing exports. Documents with `themeCss` set and no inline styles (legacy format) continue to export correctly. Documents following the current invariant (scoped inline styles, `themeCss: ''`) are unaffected.

---

### Step 4 — Curated starter content for `corporate` and `pitch-deck`

**File:** `src/services/bootstrap/projectStarter.ts`  
**What:** Replace the blanket token-clearing map with curated, meaningful defaults for the two templates used by starter kits. Empty optional fields should either be given a concrete placeholder value or have their DOM structure removed (see Step 5).

Replace the generic token map with a per-template data object:

**Corporate template tokens** (used by `executive-briefing` kit):
```
TITLE           → (artifact.initialTitle)
COMPANY         → (artifact.initialTitle)
SUBTITLE        → "Prepared for Leadership Review"
DATE            → (today)
PRESENTER       → "Your Name"
PRESENTER_ROLE  → "Title, Organization"
CONTACT_INFO    → ""   ← DOM node removed in Step 5
WORKSHOP_TITLE  → (artifact.initialTitle)
INSTRUCTOR      → "Your Name"
FACILITATOR_NAME→ "Your Name"
```

**Pitch-deck template tokens** (used by `launch-plan` kit):
```
TITLE                → (artifact.initialTitle)
COMPANY              → (artifact.initialTitle)
ONE_LINE_DESCRIPTION → "One sentence that explains what you do."
STAGE                → "Seed"
DATE                 → (today)
PRESENTER            → "Your Name"
SUBTITLE             → ""  ← DOM node removed in Step 5
```

The strategy is: if a field has a safe, meaningful generic value, use it. If a field is optional decoration (contact info, taglines), mark it for DOM removal rather than leaving it blank.

Implementation approach: create a `TEMPLATE_STARTER_CONTENT` map keyed by `templateId` in `projectStarter.ts`, and use it to populate tokens before the catch-all regex wipe.

---

### Step 5 — Structural DOM cleanup for empty optional fields

**File:** `src/services/bootstrap/projectStarter.ts`  
**What:** After token replacement, walk the cloned `<section>` DOM and remove elements whose text content is empty or contains only whitespace, when those elements match patterns for optional hero decoration.

**Elements to remove when empty:**
- Any `<p>` or `<div>` whose `textContent.trim()` is `''` and has no child images or icons — these are blank presenter rows, tagline paragraphs, separator lines
- `<hr>` or `<div class="separator">` that immediately follows a now-empty element

This should be done as a post-pass on the cloned DOM section before calling `.outerHTML`, so the markup passed to `sanitizeSlideHtml()` is already clean.

Keep the cleanup conservative: only remove elements that are demonstrably empty after token replacement. Do not touch structural containers (`<div class="slide-content">`, `.layout-*`).

---

### Step 6 — Limit presentation quick-starts to kit-backed templates only

**File:** `src/services/bootstrap/projectStarter.ts`  
**What:** `listPresentationStarters()` currently returns all 24 templates. Replace this with a curated list containing only the two templates used by the starter kits: `corporate` and `pitch-deck`.

**Current:**
```typescript
export function listPresentationStarters(): PresentationStarterTemplate[] {
  return Object.values(TEMPLATE_REGISTRY).map((entry) => ({
    id: entry.id,
    label: titleCase(entry.id),
    ...
  }));
}
```

**Change:** Replace with an explicit curated list:
```typescript
const CURATED_PRESENTATION_QUICK_STARTS: PresentationStarterTemplate[] = [
  {
    id: 'corporate',
    label: 'Executive Deck',
    description: 'Professional corporate presentation for leadership briefings.',
    templateId: 'corporate',
    initialTitle: 'Executive Deck',
  },
  {
    id: 'pitch-deck',
    label: 'Pitch Deck',
    description: 'Startup pitch deck for fundraising and investor meetings.',
    templateId: 'pitch-deck',
    initialTitle: 'Pitch Deck',
  },
];

export function listPresentationStarters(): PresentationStarterTemplate[] {
  return CURATED_PRESENTATION_QUICK_STARTS;
}
```

The full `TEMPLATE_REGISTRY` remains available for the AI generation flow (it is imported and used separately). This change only affects the quick-start picker. The two curated entries align exactly with the starters used by `executive-briefing` and `launch-plan` starter kits, so all existing tests pass.

---

### Step 7 — Expand regression tests

**File:** `src/test/project-starter-kits.test.ts`  
**What:** The existing test only checks that starter IDs exist in registries. Extend it with assertions that verify the rendering contract, token resolution, and export safety.

**New test cases to add:**

**a) CSS scoping** — for each presentation starter kit artifact, build the result and assert:
- `contentHtml` contains `@scope (.reveal .slides)` (CSS was routed through `sanitizeSlideHtml`)
- `themeCss` equals `''` (invariant respected)

**b) No unresolved tokens** — assert that `contentHtml` does not match `/\{\{[A-Z0-9_]+\}\}/`

**c) No blank hero shells** — assert that `contentHtml` does not contain `<p></p>` or `<p> </p>` (empty paragraph nodes from cleared tokens)

**d) Export non-duplication (guard check)** — verify that the export guard in `presentationHtml.ts` does not inject `themeCss` when `contentHtml` already has inline `<style>` blocks. This can be tested by calling the export function with a mock document where `themeCss` is non-empty and `contentHtml` has a `<style>` tag, and asserting the output contains only one `<style>` block for that CSS.

**e) Quick-start list is curated** — assert `listPresentationStarters()` returns exactly `['corporate', 'pitch-deck']`

---

## Files Changed

| File | Change type | Description |
|---|---|---|
| `src/services/bootstrap/projectStarter.ts` | Modify | Import `sanitizeSlideHtml`, curated token map, DOM cleanup, `themeCss: ''`, curated quick-start list |
| `src/services/export/presentationHtml.ts` | Modify | Guard `themeCss` injection against legacy CSS duplication |
| `src/test/project-starter-kits.test.ts` | Modify | Add CSS scope, token, export duplication, and quick-start list assertions |

No template HTML files are modified. No other code paths are affected.

---

## Out of Scope

- Modifying template HTML files (`src/services/ai/templates/html/*.html`)
- Changing the Reveal.js rendering engine or canvas sizing
- Adding multi-slide starter kits (single hero slide remains the starter)
- Changing the AI generation path (`presentationHandler.ts`) — it already follows the invariant correctly
- Spreadsheet or document starter kits — unaffected

---

## Manual Verification Steps

After implementation:

1. Create a new project using the **Executive Briefing** starter kit. Open the presentation. Confirm:
   - Slide renders with correct colours (no CSS bleed into the page chrome)
   - Hero shows "Executive Deck" as the title, "Prepared for Leadership Review" as subtitle, "Your Name" as presenter
   - No empty whitespace rows where tokens used to be blank

2. Create a new project using the **Launch Plan** starter kit. Open the presentation. Confirm:
   - Slide renders correctly
   - Hero shows company name, "One sentence that explains what you do." as one-liner, "Seed" as stage
   - No blank hero shells

3. Open the **New Presentation** quick-start picker. Confirm only two options appear: "Executive Deck" and "Pitch Deck".

4. Export either presentation as standalone HTML. Open the file in a browser. Confirm CSS appears exactly once (no doubled rules causing visual artifacts).

5. Run `npm test` — all tests pass.

6. Run `npm run build` — clean build, no TypeScript errors.
