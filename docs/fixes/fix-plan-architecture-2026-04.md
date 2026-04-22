# Aura Web — Architecture & Workflow Fix Plan (April 2026)

**Scope:** Complete the workflow separation, simplify routing, restore presentation quality.

**Note:** The `.aura` file used for analysis was generated *before* the previous fix session.
`addDocument` now sets `userLockedDocType: true`, which resolves the immediate routing bugs.
However the design is still fragile. See Bug 1 for the correct long-term model.

---

## Bug Index

| # | Bug | Severity | Status |
|---|-----|----------|--------|
| 1 | Routing relies on fragile `userLockedDocType` flag instead of doc type | Architectural | ⬜ Pending |
| 2 | Presentation and document handlers still inline in ChatBar | Architectural | ⬜ Pending |
| 3 | No `spreadsheet.ts` workflow orchestrator (unlike presentation/document) | Architectural | ⬜ Pending |
| 4 | Presentation QA loop too tight (stepCountIs 3) causes long cycles | Quality | ⬜ Pending |
| 5 | SpreadsheetCanvas chart button does not lock doc type before auto-submit | Correctness | ⬜ Pending |

---

## Bug 1 — Routing relies on fragile flag instead of document type

### Design Intent (user-stated)

> "The system should choose a document type based on what the user manually chose from the new doc option, and only use keywords as a fallback."

When a user creates or selects a document of a specific type, that type **is** the workflow. Keyword detection is a fallback for the case where no document has been chosen yet — i.e., first-time creation from scratch.

### Current Model (fragile)

```typescript
const workflowType =
  userLockedDocType && activeDocument
    ? activeDocument.type
    : detectWorkflowType(prompt);
```

`userLockedDocType` is a global boolean in the store. It can be stale, incorrect, or reset unexpectedly. It is an indirect proxy for "what document is active" — but `activeDocument` already encodes this directly.

### Correct Model

```typescript
const workflowType = activeDocument
  ? activeDocument.type              // always trust the active document's type
  : detectWorkflowType(prompt);      // only keyword-detect when creating from scratch
```

**If a document is active, its type is the workflow.** Always. No exception. Keywords are only consulted when the user is creating their first document in an empty project, or when no document is focused.

This eliminates the `userLockedDocType` dependency from the routing path entirely. The flag can remain in the store for other purposes, but routing should not depend on it.

### Fix

- `src/components/ChatBar.tsx`: replace the routing ternary as above
- `src/lib/workflowType.ts`: the function signature is already correct; no change needed there

**Files:** `src/components/ChatBar.tsx`

---

## Bug 2 — Presentation and document handlers still inline in ChatBar

### Root Cause

After the previous fix session, only `spreadsheetHandler.ts` was extracted. ChatBar is still 933 lines with the presentation (~210 lines) and document (~160 lines) workflow paths inlined. The three workflows are still woven together in a single `useCallback`.

### Fix

Extract two more handlers following the same pattern as `spreadsheetHandler.ts`:

**`src/components/chat/handlers/presentationHandler.ts`**
- Takes a typed `PresentationHandlerContext` (prompt, chatHistory, activeDocument, store callbacks, LLM config getters, event handlers)
- Handles ambiguity detection, step initialisation, `runPresentationWorkflow` call, result application, memory extraction, version commit
- Returns `void` (communicates via callbacks, same pattern as spreadsheetHandler)

**`src/components/chat/handlers/documentHandler.ts`**
- Takes a typed `DocumentHandlerContext`
- Handles step initialisation, `runDocumentWorkflow` call, result application, memory extraction, version commit

**ChatBar `handleSubmit` becomes a pure router:**
```typescript
if (workflowType === 'spreadsheet') {
  await handleSpreadsheetWorkflow(context);
} else if (workflowType === 'presentation') {
  await handlePresentationWorkflow(context);
} else {
  await handleDocumentWorkflow(context);
}
```

The body of `handleSubmit` should be ~80 lines: build context, route, done.

**Files:** New handler files, `src/components/ChatBar.tsx`

---

## Bug 3 — No `spreadsheet.ts` workflow orchestrator

### Root Cause

`presentation.ts` and `document.ts` have clean orchestrators with typed `Input`/`Output` interfaces. `spreadsheetHandler.ts` (the only spreadsheet module) mixes UI callback plumbing with business logic — there's no layer that is purely "given inputs, produce outputs" without touching React state.

### Fix

Create `src/services/ai/workflow/spreadsheet.ts` as a pure orchestrator:

```typescript
export interface SpreadsheetInput {
  prompt: string;
  activeSheet: SheetMeta | null;
  activeDocumentId: string | null;
  projectDocumentCount: number;
}

export type SpreadsheetOutput =
  | { kind: 'chart-created'; chartHtml: string; message: string; chartType: string; rowCount: number }
  | { kind: 'action-executed'; updatedSheets: SheetMeta[]; message: string }
  | { kind: 'spreadsheet-created'; schema: ColumnSchema[]; rows: Record<string, unknown>[]; sheetName: string; workbookTitle: string; summary: string; chartHint?: string }
  | { kind: 'no-intent'; message: string };

export async function runSpreadsheetWorkflow(input: SpreadsheetInput): Promise<SpreadsheetOutput>
```

`spreadsheetHandler.ts` becomes thin: call `runSpreadsheetWorkflow`, receive a typed result, apply it to the React store. No DuckDB calls, no starter logic, no action detection — all of that moves to `spreadsheet.ts`.

**Files:** New `src/services/ai/workflow/spreadsheet.ts`, updated `src/components/chat/handlers/spreadsheetHandler.ts`

---

## Bug 4 — Presentation QA loop too tight

### Root Cause

`stepCountIs(3)` was set in commit `ad9d996` to prevent infinite loops. With only 3 agent steps, the model's budget is: stream draft → call validateSlideHtml → call submitFinalSlide. There's no room to actually fix anything. Any validation failure immediately exhausts the budget.

The result is the evaluator-revise phase receiving a slide that still has issues, leading to long "Fixing QA issues…" cycles (as seen: 22m 26s at 65%).

A sensible budget is: 1 stream + 1 validate + 1-2 fix iterations + 1 final submit = **5 steps**.

### Fix

- `designer.ts`: raise `stopWhen: stepCountIs(3)` to `stopWhen: stepCountIs(5)`
- Review the `mapBlockingIssue` error messages added in `535eb4b`: ensure each message gives the model a clear, actionable instruction rather than just naming the rule

**Files:** `src/services/ai/workflow/agents/designer.ts`

---

## Bug 5 — SpreadsheetCanvas chart button bypasses doc-type lock

### Root Cause

With the new routing model from Bug 1, this becomes a non-issue — if `activeDocument` is a spreadsheet, the spreadsheet workflow will always handle the prompt, regardless of what `userLockedDocType` says.

**However**, as a belt-and-suspenders measure, `SpreadsheetCanvas.tsx` should still explicitly call `setUserLockedDocType(true)` before firing the auto-submit. This costs nothing and ensures the intent is explicit in the code.

**Files:** `src/components/SpreadsheetCanvas.tsx`

---

## Target Architecture

```
src/
  lib/
    workflowType.ts                  — fallback keyword detection only

  services/ai/workflow/
    presentation.ts                  — unchanged
    document.ts                      — unchanged
    spreadsheet.ts                   — NEW: pure orchestrator (no React deps)

  components/
    SpreadsheetCanvas.tsx            — setUserLockedDocType before chart auto-submit
    ChatBar.tsx                      — pure router; ~80 lines in handleSubmit
    chat/handlers/
      spreadsheetHandler.ts          — thin: calls runSpreadsheetWorkflow, applies results
      presentationHandler.ts         — NEW: extracted from ChatBar
      documentHandler.ts             — NEW: extracted from ChatBar
```

**Invariant:** If a document is active, its type determines the workflow — no keywords, no flags.
Keywords are only for first-creation routing when no document context exists.

---

## Implementation Order

```
[ ] 1.  ChatBar: simplify routing to activeDocument?.type ?? detectWorkflowType(prompt)
[ ] 2a. Create presentationHandler.ts (extract from ChatBar)
[ ] 2b. Create documentHandler.ts (extract from ChatBar)
[ ] 2c. Update ChatBar to delegate to all three handlers (pure router)
[ ] 3a. Create spreadsheet.ts orchestrator (business logic)
[ ] 3b. Thin down spreadsheetHandler.ts to call orchestrator
[ ] 4.  designer.ts: raise stepCountIs from 3 to 5
[ ] 5.  SpreadsheetCanvas: setUserLockedDocType(true) before chart auto-submit
```
