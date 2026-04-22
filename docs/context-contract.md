# Context Contract

This document captures the current Phase 0 context assembly behavior so later phases can change it deliberately.

## Current Context Inputs

| Context input | Current source |
| --- | --- |
| Prompt text | `ChatBar` textarea or pending auto-submit prompt |
| Attachment text | `buildAttachmentContext()` in `src/lib/fileAttachment.ts` |
| Scoped chat history | `src/services/chat/routing.ts` filters visible messages before handlers run |
| Memory context | `buildWorkflowMemoryContext()` inside `ChatBar` |
| Active artifact context | Existing presentation HTML, existing document HTML and markdown, or spreadsheet workbook snapshot |
| Related artifact context | Document workflow includes `projectLinks` for other non-spreadsheet artifacts |
| Image attachments | Passed to the document workflow as multi-modal `imageParts` |

## Current Scope Rules

- If there is no active document, all visible chat is treated as project-scoped.
- If multi-document mode is enabled, outgoing user messages are project-scoped.
- If a document is active and multi-document mode is off, outgoing user messages are document-scoped.
- When chat is filtered to a single document, project-scoped messages remain visible.

## Baseline Metrics

Phase 0 records the following development-only metrics through `src/services/ai/debug.ts`:

- `promptChars`
- `promptWithContextChars`
- `attachmentContextChars`
- `chatHistoryChars`
- `memoryContextChars`
- `artifactContextChars`
- `estimatedTotalTokens`

These metrics are currently logged in:

- `src/components/chat/handlers/presentationHandler.ts`
- `src/components/chat/handlers/documentHandler.ts`
- `src/components/chat/handlers/spreadsheetHandler.ts`

## Current Limitations

- There is no typed `ContextBundle` yet.
- Context budgets are advisory only and not enforced before dispatch.
- Artifact context selection is handler-specific instead of centrally assembled.
- Spreadsheet context is currently approximated from the active workbook snapshot rather than curated data slices.
