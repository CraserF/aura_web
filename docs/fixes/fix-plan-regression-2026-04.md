# Aura Web — Regression Fix Plan (April 2026)

**Method:** Karpathy root-cause-first. No speculative changes. Every fix traces directly to a verified root cause.

---

## Bug Index

| # | Bug | Status |
|---|-----|--------|
| 1 | Spreadsheet creates presentation instead | ✅ Fixed |
| 2 | `.aura` download hangs / save broken | ✅ Fixed |
| 3 | Autosave broken (wrong type) | ✅ Already fixed (projectAutosave.ts) |
| 4 | SVG attributes double-quoted (`x="\"0\""`) | ✅ Fixed |
| 5 | Architecture: spreadsheet logic in ChatBar monolith | ✅ Fixed |

---

## Bug 1 — Spreadsheet creates presentation

### Root Cause

Two compounding failures introduced in commit `535eb4b`:

**1a. `detectWorkflowType` lost its `activeDocType` fallback.**

Before the commit, the function accepted a second `activeDocType` parameter and returned it immediately:
```typescript
if (activeDocType) return activeDocType;
```
This was removed entirely. Now, even when a spreadsheet document is active and locked, keyword detection always runs. If the prompt has no spreadsheet keywords, it defaults to `'presentation'`.

**1b. `addDocument` in `projectStore.ts` hardcodes `userLockedDocType: false`.**

```typescript
addDocument: (doc) =>
  set((s) => ({
    userLockedDocType: false,  // ← always resets the lock
    ...
  })),
```

When a user creates a new spreadsheet via the sidebar, `addDocument` is called with `type: 'spreadsheet'`. The lock is immediately cleared before the user types their first prompt. So even if the routing logic were fixed, the lock is gone.

### Fix

**Step 1a** — Restore the `activeDocType` fallback in `workflowType.ts`:
- Add `activeDocType?: DocumentType` as a second parameter
- Add `if (activeDocType) return activeDocType;` as the first line of the function body
- Update the call site in `ChatBar.tsx` to pass `activeDocument?.type`

**Step 1b** — Fix `addDocument` in `projectStore.ts`:
- When adding a document with a known type, set `userLockedDocType: true` instead of `false`
- This reflects intent: creating a typed document IS an explicit type selection

**Files:** `src/lib/workflowType.ts`, `src/stores/projectStore.ts`, `src/components/ChatBar.tsx`

---

## Bug 2 — `.aura` download hangs

### Root Cause

**Primary cause: DuckDB loads via CDN worker URL.**

In `src/services/data/duckdb.ts`:
```typescript
const CDN_BUNDLES = duckdb.getJsDelivrBundles();
const bundle = await duckdb.selectBundle(CDN_BUNDLES);
const worker = new Worker(workerUrl);  // cross-origin CDN URL
```

Browsers block cross-origin Workers unless the server sends `Service-Worker-Allowed` headers or the URL is same-origin. The jsDelivr CDN URL is cross-origin. This causes the Worker to silently fail, which manifests as `error in duckdb worker: undefined` in the console. Once the worker is dead, any `openConnection()` call blocks forever — its promise never resolves and never rejects.

Since `exportSheetParquet` calls `openConnection()`, and the zip generation awaits them, the entire `downloadProjectFile()` hangs indefinitely even though the parquet calls are inside try-catch (the catch is never reached because the promise never settles).

**Secondary cause: No timeout on DuckDB operations.**

The `exportSheetParquet` calls in `downloadProjectFile` have no timeout, so a hung DuckDB promise blocks the entire zip generation.

### Fix

**Step 2a** — Switch from CDN bundles to locally-bundled DuckDB worker (Vite `?url` imports):
```typescript
import duckdbWorker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url';
import duckdbWasm from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';
```
This bundles the worker as a same-origin asset, eliminating the cross-origin Worker failure.

**Step 2b** — Add a per-sheet timeout to `exportSheetParquet` calls in `projectFormat.ts` so a hung DuckDB cannot block the zip indefinitely:
```typescript
const parquetPromise = exportSheetParquet(sheet.tableName);
const timeout = new Promise<never>((_, reject) =>
  setTimeout(() => reject(new Error('timeout')), 5000)
);
const parquet = await Promise.race([parquetPromise, timeout]);
```

**Files:** `src/services/data/duckdb.ts`, `src/services/storage/projectFormat.ts`

---

## Bug 3 — Autosave uses wrong type

### Root Cause

`src/services/storage/autosave.ts` was never updated when the app moved from single-presentation `PresentationData` to multi-document `ProjectData`. It still imports `PresentationData` and its `AutosaveData` interface wraps `presentation: PresentationData`. The functions `autosave()`, `saveNow()`, `getAutosave()` all operate on the old shape.

There is no autosave for the new `ProjectData` model — changes are silently lost between sessions.

### Fix

Rewrite `autosave.ts` to operate on `ProjectData`:
- `autosave(project: ProjectData)` — debounced save
- `saveNow(project: ProjectData)` — immediate save  
- `getAutosave(): Promise<ProjectData | null>` — restore
- Remove `buildPresentationData` helper (no longer needed)
- Update callers (wherever `autosave()` is called in the app)

**Files:** `src/services/storage/autosave.ts`, callers in `src/components/`

---

## Bug 4 — SVG double-quoted attributes

### Root Cause

The AI submits its final slide HTML via the `submitFinalSlide` tool as a JSON string. The tool call payload looks like:
```json
{ "html": "...<rect x=\"0\" y=\"0\" width=\"1280\" ...>..." }
```

When the AI SDK deserializes this tool call, the escaped `\"` sequences inside the JSON string become literal `"` characters in the extracted string — which is correct. However, if the model re-encodes the attribute values as JSON strings themselves (treating `0` as a JSON string `"0"`), the deserialized result contains:
```
x=""0""
```
which when written to HTML becomes `x="&quot;0&quot;"` or `x="\"0\""` depending on the serializer.

The QA error messaging changes in commit `535eb4b` likely changed which SVG validation error messages the model sees, causing it to regenerate SVG in a subtly different format.

### Fix

Add a post-processing normalization step in `designer.ts` after receiving `call.input.html` from the `submitFinalSlide` tool. Strip double-encoded attribute quote wrappers:

```typescript
// Remove extra quote-wrapping in SVG attributes: x="\"0\"" → x="0"
function normalizeAttributeQuotes(html: string): string {
  return html.replace(/="\\?"([^"]*?)\\?"/g, (_, val) => `="${val}"`);
}
```

Apply this before passing the HTML to `sanitizeSlideHtml`.

**Files:** `src/services/ai/workflow/agents/designer.ts`

---

## Bug 5 — Architecture: spreadsheet logic in ChatBar

### Root Cause

`ChatBar.tsx` is a 1169-line monolith routing all three workflow types inline. Lines 267–505 are the spreadsheet path (chart intent, sheet actions, starter creation), lines 507–718 are the presentation path, lines 719–879 are the document path. All three are woven together. Any change to one risks breaking the others.

### Fix

Extract per-workflow handlers into separate files that ChatBar imports and delegates to:

**New files:**
```
src/services/ai/workflow/spreadsheet.ts    — spreadsheet AI orchestrator
src/components/chat/handlers/
  spreadsheetHandler.ts                    — extracted from ChatBar lines 267–505
  presentationHandler.ts                   — extracted from ChatBar lines 507–718
  documentHandler.ts                       — extracted from ChatBar lines 719–879
```

**ChatBar becomes a router only:**
```typescript
if (workflowType === 'spreadsheet') {
  await handleSpreadsheetPrompt(prompt, context, callbacks);
} else if (workflowType === 'presentation') {
  await handlePresentationPrompt(prompt, context, callbacks);
} else {
  await handleDocumentPrompt(prompt, context, callbacks);
}
```

Each handler imports only what it needs. No spreadsheet logic touches presentation code and vice versa.

**Files:** `src/components/ChatBar.tsx`, new handler files

---

## Implementation Order

```
[x] 1a. Restore activeDocType param in detectWorkflowType      (workflowType.ts)
[x] 1b. Fix addDocument to set userLockedDocType: true          (projectStore.ts)
[x] 1c. ChatBar routing — no change needed (bypass already correct)
[x] 2a. Switch DuckDB to local ?url bundle                      (duckdb.ts — rewrote initDB)
[x] 2b. Add timeout to exportSheetParquet in downloadProjectFile (projectFormat.ts)
[x] 3.  Autosave — projectAutosave.ts already correct; autosave.ts is orphaned legacy
[x] 4.  Add normalizeAttributeQuotes post-processor in designer  (designer.ts)
[x] 5.  Extract spreadsheet handler from ChatBar                 (new spreadsheetHandler.ts + ChatBar edit)
```
