# PDF Preview Spike

Goal: decide whether to keep the current PDF preview stack or replace it.

## Validation Gate (Required)

Do not finalize this spike decision without recorded validation evidence.

Minimum required checks:

- `bun run build`
- `bun run test`
- Manual preview comparison for all corpus documents in desktop and mobile viewport sizes

Decision cannot be marked complete unless the evidence section is filled.

## Scope

Compare current implementation against at least one candidate with the same document inputs.

Current implementation:
- html2pdf.js (html2canvas + jsPDF)
- Surface: src/components/DocumentPdfPreview.tsx and src/services/export/pdf.ts

## Candidates

- [ ] Candidate A: keep current stack with targeted improvements
- [ ] Candidate B: replacement path (to be chosen by assignee)

## Evaluation Matrix

Score each category 1 to 5, where 5 is best.

| Category | Current | Candidate | Notes |
|---|---:|---:|---|
| Rendering fidelity (layout, fonts, spacing) |  |  |  |
| Handling complex styled HTML |  |  |  |
| Rendering speed |  |  |  |
| Memory impact |  |  |  |
| Bundle/runtime complexity |  |  |  |
| Integration risk in current app |  |  |  |
| Maintenance cost |  |  |  |

## Test Corpus

Use at least three representative documents:

- [ ] Long-form narrative report
- [ ] Rich visual document with cards/sections
- [ ] Mixed content with lists, tables, and links

## Decision

Status: pending

- [ ] Keep current stack
- [ ] Replace current stack

Rationale:

-
-
-

## Evidence

- Date:
- Agent:
- Build (`bun run build`):
- Tests (`bun run test`):
- Manual corpus review:
- Final recommendation:

## Implementation Follow-up

If keeping current stack:
- [ ] List specific preview fixes to implement
- [ ] Add tests or manual verification steps

If replacing stack:
- [ ] List migration tasks
- [ ] List rollback strategy
- [ ] Document any behavior differences
