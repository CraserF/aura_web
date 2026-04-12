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

- [x] Candidate A: keep current stack with targeted improvements
- [x] Candidate B: replace html2pdf.js with browser-native print/PDF using the shared export markup path (`prepareDocumentPdfMarkup()` + `openDocumentPrintPreview()`)

## Evaluation Matrix

Score each category 1 to 5, where 5 is best.

| Category | Current | Candidate | Notes |
|---|---:|---:|---|
| Rendering fidelity (layout, fonts, spacing) | 3 | 4 | Candidate text is sharper on desktop because it avoids rasterization; current stack is slightly softer but still structurally faithful. |
| Handling complex styled HTML | 3 | 3 | Both paths inherit the same export CSS simplifications; initial dark-module contrast tuning is now landed on the current stack. |
| Rendering speed | 3 | 4 | Native print avoids the html2canvas raster step, so it reaches an inspectable result faster on the same corpus. |
| Memory impact | 2 | 4 | Current stack pays for canvas rasterization before PDF packaging; candidate avoids that extra bitmap stage. |
| Bundle/runtime complexity | 3 | 5 | Candidate leans on browser primitives instead of `html2canvas` + `jsPDF`. |
| Integration risk in current app | 4 | 2 | Current stack already supports blob preview + direct download; candidate would need new preview-fit logic and loses drop-in download automation. |
| Maintenance cost | 4 | 3 | Current stack is heavier, but already integrated; candidate reduces library load while increasing UX and cross-browser behavior risk. |

## Test Corpus

Use at least three representative documents:

- [x] Long-form narrative report
- [x] Rich visual document with cards/sections
- [x] Mixed content with lists, tables, and links

## Decision

Status: complete

- [x] Keep current stack
- [ ] Replace current stack

Rationale:

- Native browser print is visibly sharper on desktop, but it is not a drop-in replacement for Aura's current in-app preview/export flow.
- In mobile-width preview frames, the native-print candidate clips horizontally because the fixed A4 page is not being fit-contained, while the current raster preview remains contained and inspectable.
- Replacing the current stack now would trade a known, integrated blob-preview + direct-download path for a browser-print dependency before Workstream C artifact work is ready.

## Evidence

- Date: 2026-04-12
- Agent: GitHub Copilot
- Build (`bun run build`): pass; production build completed successfully. Vite still reports the existing `isomorphic-git` browser `crypto` externalization warning during bundling.
- Tests (`bun run test`): pass; 6 files, 52 tests.
- Manual corpus review: pass; compared current html2pdf raster output against the browser-native print candidate using `example/pdf_preview_spike.html` across all three corpus documents in desktop and mobile widths. Desktop: candidate text is sharper, but current layout remains faithful. Mobile: candidate clips horizontally in the fixed A4 print layout across the corpus, while the current stack remains fit-contained and readable.
- Final recommendation: keep the current html2pdf.js stack for now, add targeted fidelity improvements, and retain the native-print path as a comparison/fallback option rather than a full replacement.

## Implementation Follow-up

If keeping current stack:
- [x] List specific preview fixes to implement
- [x] Add tests or manual verification steps

Specific fixes:

- [x] Improve export CSS for dark infographic bands and KPI cards so contrast survives both raster and print-oriented outputs.
- Add explicit fit/contain scaling rules if the browser-native print path is reused for future preview work, especially on mobile-width surfaces.
- Keep the shared export markup helper (`prepareDocumentPdfMarkup()`) as the single source of truth for candidate comparisons.

Verification assets added:

- `src/test/pdf-export.test.ts` covers the shared markup contract and print-preview error path.
- `example/pdf_preview_spike.html` provides a repeatable manual comparison harness for desktop and mobile corpus checks.

If replacing stack:
- [ ] List migration tasks
- [ ] List rollback strategy
- [ ] Document any behavior differences
