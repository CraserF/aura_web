# Bootstrap Contracts

This document reserves the canonical location for artifact bootstrap rules and records the current Phase 0 behavior.

## Current Bootstrap Behavior

| Artifact | Current bootstrap behavior |
| --- | --- |
| Presentation | Creates a new presentation document when no presentation is active; otherwise edits the active presentation |
| Document | Creates a new document when no document is active; otherwise edits the active document and preserves the selected style preset |
| Spreadsheet | Reuses the default starter sheet when possible, otherwise appends a new sheet or creates a new spreadsheet document |

## Current Inputs That Influence Bootstrap

- Active document type
- Prompt keywords through `detectWorkflowType()`
- Multi-document scope toggle
- Style preset for documents
- Attached text and images
- Existing workbook state for spreadsheets

## Reserved For Later Phases

- Template-first project bootstrap contracts
- Whole-project augmentation contracts
- Validation and publish bootstrap profiles
- Automation-friendly run presets
