# PowerPoint Export — Implementation Plan

> Status: planning (no implementation in this document)  
> Scope: client-side PPTX generation from rendered Reveal.js slides using PptxGenJS  
> Last updated: 2026-04-20  
> Depends on: nothing (can start independently)  
> Note: PPTX output is a clean editable skeleton, not a pixel-perfect replica. CSS effects that don't map to PowerPoint primitives are gracefully omitted.

## 1) Goals

- Allow users to export presentations to `.pptx` format for editing in PowerPoint or Keynote.
- Produce a clean, editable slide skeleton — readable headings, body text, solid backgrounds, shapes, and images.
- Accept that CSS-heavy effects (gradients, animations, web fonts, complex clamp() layouts) will not transfer exactly — this is a feature, not a bug (editable > pixel-perfect).
- Keep the implementation client-side: no server round-trip required.
- Lazy-load the PPTX library so it has zero cost on page load.

## 2) Library: PptxGenJS

**Selected: [PptxGenJS](https://gitbrent.github.io/PptxGenJS/) v3.x**

| Property | Value |
|----------|-------|
| Bundle size | ~120 KB gzipped |
| Runtime | Pure browser (no server, no canvas, no Puppeteer) |
| API style | Programmatic (no HTML parser) |
| License | MIT |
| Maintenance | Active (v3.x) |

### 2.1 What PptxGenJS can produce

| Element | Support | Notes |
|---------|---------|-------|
| Text blocks (headings, body, labels) | ✅ Full | Font name, size, bold, italic, color, alignment |
| Solid color backgrounds | ✅ Full | Hex colors only |
| Rectangles and basic shapes | ✅ Full | `addShape()` with fill + border |
| Raster images (PNG, JPG, GIF, WebP) | ✅ Full | Via base64 data URI or URL |
| SVG images | ✅ Full | Embedded as image or native SVG |
| Tables | ✅ Full | Headers, rows, column widths, cell styles |
| Hyperlinks on text | ✅ Full | `hyperlink` property on text runs |
| Slide layout (16:9) | ✅ Full | `pres.layout = 'LAYOUT_16x9'` |
| Master slides / themes | ✅ Partial | Basic master with background |

### 2.2 What PptxGenJS cannot produce

| Element | Status | Impact |
|---------|--------|--------|
| CSS gradients | ❌ No | Replaced with dominant solid color |
| CSS animations / @keyframes | ❌ No | Omitted (static export by nature) |
| Web font embedding | ❌ No | Font referenced by name — PowerPoint substitutes |
| `clamp()` / `calc()` sizing | ❌ N/A | Extraction layer reads computed pixel sizes instead |
| Box shadows, text shadows | ❌ No | Omitted silently |
| Backdrop blur, mix-blend-mode | ❌ No | Omitted silently |
| Complex SVG filters | ⚠️ Partial | Simple SVGs export fine; filter effects stripped |
| CSS Grid / Flexbox layouts | ❌ N/A | Extraction layer computes element positions from DOM |

## 3) Architecture

### 3.1 Extraction Layer Overview

PptxGenJS has no HTML parser — all content must be added programmatically. The extraction layer bridges the gap:

```
Reveal.js rendered DOM
        │
        ▼
┌─────────────────────────────────┐
│  extractSlideContent(section)   │
│                                 │
│  Walk DOM → find semantic       │
│  elements → build ElementSpec[] │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  mapToPptxElements(specs)       │
│                                 │
│  ElementSpec[] → PptxGenJS      │
│  addText / addShape / addImage  │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  PptxGenJS slide                │
│  (writeFile or ArrayBuffer)     │
└─────────────────────────────────┘
```

### 3.2 ElementSpec — Internal Representation

```typescript
type ElementSpec =
  | TextSpec
  | ImageSpec
  | ShapeSpec
  | TableSpec;

interface BaseSpec {
  x: number;     // inches from left
  y: number;     // inches from top
  w: number;     // width in inches
  h: number;     // height in inches
}

interface TextSpec extends BaseSpec {
  kind: 'text';
  text: string;
  fontSize: number;      // pt
  bold: boolean;
  italic: boolean;
  color: string;         // hex
  align: 'left' | 'center' | 'right';
  fontFamily: string;
  isTitle?: boolean;     // h1/h2 → isTitle hint for slide layout
}

interface ImageSpec extends BaseSpec {
  kind: 'image';
  dataUri: string;       // base64 PNG/JPG/SVG
  altText?: string;
}

interface ShapeSpec extends BaseSpec {
  kind: 'shape';
  shapeType: string;     // 'rect', 'roundRect', etc.
  fillColor: string;     // hex solid fill
  lineColor?: string;
  lineWidth?: number;
}

interface TableSpec extends BaseSpec {
  kind: 'table';
  headers: string[];
  rows: string[][];
  headerFill: string;    // hex
  rowFill: string;       // hex (alternating)
}
```

### 3.3 DOM Extraction Strategy

The extraction layer works on the *rendered* DOM (after Reveal.js has positioned everything):

1. **Background**: Read `background-color` computed style of `<section>`. If CSS gradient detected, extract the first/dominant color stop as a solid fallback.

2. **Text elements**: Query `h1, h2, h3, p, li, span[class]` within the section. For each:
   - `getBoundingClientRect()` → convert px → inches (1 inch = 96px / slide scale)
   - `getComputedStyle()` → font-size (pt), font-family, color, font-weight, text-align
   - `.textContent.trim()` → text string

3. **Images** (`<img>` and inline SVGs):
   - `<img src="...">` → fetch and convert to base64 if needed, or use src directly
   - `<svg>` → `new XMLSerializer().serializeToString(el)` → base64 data URI

4. **Canvas elements** (Chart.js charts):
   - Use the same `flattenChartsForExport()` approach from PDF export
   - `chart.toBase64Image('image/png', 2)` → treat as ImageSpec

5. **Tables** (`<table>`): Extract headers and cell values as strings.

6. **Coordinate conversion**:
   ```typescript
   // Reveal.js scales slides to fill the viewport. Read the actual rendered scale.
   const slideEl = section.closest('.reveal .slides');
   const scaleX = 1920 / slideEl.getBoundingClientRect().width;
   const pxToInches = (px: number) => (px * scaleX) / 96;
   ```

### 3.4 Slide Dimensions

```typescript
const pres = new PptxGenJS();
pres.layout = 'LAYOUT_16x9';   // 10" × 5.625" (matches 16:9)
pres.author = 'Aura';
pres.company = 'Aura';
```

All coordinates are in inches. Slide is 10" wide × 5.625" tall.

### 3.5 Export Flow

```typescript
// src/services/export/pptx.ts

export async function exportToPptx(projectTitle: string, sections: HTMLElement[]): Promise<void> {
  // Lazy-load PptxGenJS only when needed
  const { default: PptxGenJS } = await import('pptxgenjs');
  
  const pres = new PptxGenJS();
  pres.layout = 'LAYOUT_16x9';
  
  for (const section of sections) {
    const slide = pres.addSlide();
    const specs = extractSlideContent(section);
    applySpecsToSlide(slide, specs);
  }
  
  await pres.writeFile({ fileName: `${projectTitle}.pptx` });
}
```

## 4) Feasibility Matrix

| Aura Slide Feature | PPTX Output | Notes |
|--------------------|-------------|-------|
| Heading text | ✅ Text block | Font size/weight/color preserved |
| Body paragraph text | ✅ Text block | Font size/weight/color preserved |
| Solid background color | ✅ Slide background | hex color |
| Gradient background | ⚠️ Solid fallback | First color stop used |
| Rectangular shapes | ✅ Shape | Fill color from computed style |
| Images (PNG/JPG) | ✅ Image | Embedded as base64 |
| Inline SVG illustrations | ✅ Image | Serialized and embedded |
| Chart.js charts | ✅ Image | Via toBase64Image() |
| `@keyframes` animations | ❌ Omitted | Static export |
| Web font (Google Fonts) | ⚠️ Name only | PowerPoint substitutes similar font |
| CSS `clamp()` sizing | ✅ Computed | getBoundingClientRect() reads actual px |
| CSS blur / shadow effects | ❌ Omitted | Silently dropped |
| Emoji | ✅ Text | Renders as text; platform emoji font used |
| `<ul>` / `<ol>` lists | ✅ Bullet text | `bullet: true` in addText |
| `<table>` | ✅ Table | addTable with headers + rows |
| Multi-column layout | ⚠️ Positioned | Each column extracted as separate text block |

## 5) User-Facing Design

### 5.1 Export Button Placement

- Add "Export → PowerPoint (.pptx)" option alongside existing "Export → PDF".
- Single slide: exports current slide only.
- Full deck: exports all slides in the current project.

### 5.2 Export Quality Disclaimer

Show a brief tooltip or note on the export option:

> "PPTX export produces a clean, editable version of your slides. Complex visual effects (gradients, animations, special fonts) are simplified. For full fidelity, use PDF export."

### 5.3 Filename

`{project-title}.pptx` — sanitized (replace `/\s+/g` with `-`, strip non-alphanumeric except `-_`).

## 6) Milestones

### M1 — Core Export Pipeline
**Parallel-safe: yes — isolated to a new export service file**

| Task | Description | Est. |
|------|-------------|------|
| M1.1 | Install `pptxgenjs` and configure lazy dynamic `import()` | S |
| M1.2 | Implement `ElementSpec` types and coordinate converter | S |
| M1.3 | Implement DOM text extraction (headings, body, lists) | M |
| M1.4 | Implement background color extraction (solid + gradient fallback) | S |
| M1.5 | Implement image extraction (img src + base64, SVG serialization) | M |
| M1.6 | Implement chart flattening for PPTX (reuse `flattenChartsForExport()`) | S |
| M1.7 | Wire specs → PptxGenJS `addText` / `addImage` / `addShape` | M |
| M1.8 | Expose `exportToPptx()` service function | S |

### M2 — UI Integration + Polish
**Depends on: M1**

| Task | Description | Est. |
|------|-------------|------|
| M2.1 | Add "Export → PowerPoint" button to presentation toolbar | S |
| M2.2 | Support single-slide export vs full-deck export | S |
| M2.3 | Add table extraction (`<table>` → `addTable`) | M |
| M2.4 | Filename sanitization utility | S |
| M2.5 | Export quality disclaimer tooltip | S |
| M2.6 | Tests: text extraction, coordinate conversion, round-trip filename | M |

**Size estimates: S = < 1 day, M = 1-3 days, L = 3-5 days**

## 7) Validation Requirements

- **Unit tests**: coordinate px→inches conversion, background color extraction (solid and gradient), text extraction from heading/paragraph/list, filename sanitization.
- **Visual tests**: open generated PPTX in LibreOffice Impress — verify text readable, images present, backgrounds correct.
- **Edge cases**: slide with only SVG illustration (no text), slide with gradient background, slide with Chart.js chart, slide with emoji, slide with multi-column layout.
- **Performance**: export 10-slide deck should complete < 3 seconds in browser.
- **Bundle impact**: verify PptxGenJS loaded only on export action (not in initial bundle).

## 8) Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Font substitution degrades readability | Use widely-available system fonts (Arial, Calibri, Georgia) as fallbacks. Reference Google Font names — PowerPoint substitutes are usually acceptable. |
| Coordinate extraction fails on scaled slides | Always read through Reveal.js scale transform, not raw DOM rect. Test at multiple viewport sizes. |
| SVG serialization produces invalid SVG | Wrap in try/catch; fall back to blank placeholder image with alt text. |
| PptxGenJS bundle size affects load time | Lazy dynamic import — zero cost until user clicks export. |
| Chart.js instance not found | Reuse existing PDF `flattenChartsForExport()` — same fallback logic. |
| Gradient backgrounds silently lost | Show note in export disclaimer. Consider extracting two color stops as a simple two-stop gradient if PptxGenJS adds support in future. |

## 9) Open Questions

1. **Export scope toggle**: Should the UI default to exporting the entire deck or just the current slide? Recommendation: offer both options (current slide / all slides).
2. **Speaker notes**: If speaker notes are added in a future phase, should they be included in the PPTX notes field? Yes — `slide.addNotes(notesText)` is straightforward to add.
3. **Master slide template**: Should the PPTX use a minimal master slide with the project's primary color as accent? Could improve theme consistency. Low priority for M1.
4. **DOCX export parity**: The DOM extraction layer is reusable. Consider a future `exportToDocx()` that extracts the same specs and maps to `docx` npm package primitives.
