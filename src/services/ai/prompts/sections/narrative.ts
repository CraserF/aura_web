/**
 * Narrative section — single-slide composition guidance.
 *
 * Replaces the deck-level narrative arc with per-slide type composition rules.
 * Each slide type has specific layout, content structure, and visual priorities.
 */

export function buildNarrativeSection(_slideCount?: number): string {
  return `## SLIDE COMPOSITION — SINGLE-SLIDE EXCELLENCE

You are producing ONE slide. Make it breathtaking. Every element must serve the slide's purpose.

### Slide Types — Identify and Compose:

| Type | Layout | Visual Priority |
|------|--------|----------------|
| **Title** | Centered vertical stack | Hero SVG illustration + bold typography + animated accents |
| **Content** | Heading + body grid (2-3 cols) | Clear hierarchy, cards or columns, supporting SVG |
| **Data / Metrics** | Card grid or dashboard | Large numbers, progress rings, SVG bar/donut charts |
| **Comparison** | Side-by-side columns | Split panels, accent borders, clear visual divide |
| **Timeline** | Horizontal/vertical rail | SVG rail with nodes, animated connections, milestone labels |
| **Quote** | Centered, generous whitespace | Large decorative quotation mark, italic text, muted attribution |
| **Diagram / Flow** | Full-slide SVG or centered diagram | SVG boxes/nodes connected by animated dashed arrows |
| **Editorial / Infographic** | Asymmetric grid with cards | Cards with inline SVG mini-illustrations, accent borders, big numbers |
| **Interstitial / Pop** | Centered, bold, animated | Large icon/illustration with pulsing rings, bold headline, minimal text |
| **CTA / Closing** | Centered with action element | Bold heading, styled button element, animated accent dots |

### Composition Rules (apply to EVERY slide):

1. **Background layers first** — Split panels, gradients, or solid color. These set the mood.
2. **Full-canvas SVG overlay** (optional) — Decorative background elements at z-index 2: waves, grid lines, floating shapes, data streams. Very low opacity (0.06-0.15).
3. **Content at z-index 10** — The main content layer: headings, body text, cards, SVG illustrations.
4. **Footer elements** — Animated dots, brand marks, slide indicators at the bottom.
5. **Content should fill the 1920×1080 canvas** — use the full space. Cards should be substantial, text should be large.

### What Makes a Slide Spectacular:

- **Cards with inline SVG mini-illustrations** — each card gets a unique SVG (funnel, shield, circular flow, bar chart, network) instead of just text or emoji. The SVG is small (80-150px) but composed (5-15 elements) with animation.
- **Asymmetric layouts** — not every grid column the same width: use \`1.15fr 0.85fr\` or \`1.2fr 1fr\`.
- **Animated data visualizations** — progress rings with animated stroke-dasharray, tapered capital stacks with sweep animations, flowing dashed pipelines.
- **Magazine-style typographic hierarchy** — serif headings (Playfair Display) + sans-serif body (Source Sans 3), uppercase spaced-out labels at 9-10px.
- **Accent borders on cards** — \`border-left: 5px solid [color]\` with different accent colors per card.
- **Pill badges** — small rounded pills (\`border-radius:20px; padding:3px 10px; font-size:0.7em\`) for tags and statuses.
- **Animated footer dots** — small colored circles at the bottom with staggered pulsing animations.

### Anti-patterns — The Boring Slide:
- ❌ Just text on a plain background = forgettable
- ❌ Only emoji for visual interest = lazy
- ❌ Inline styles on every element with no CSS classes = messy, hard to maintain
- ❌ No @keyframes animations = static and lifeless
- ❌ Generic card layout with no visual variety between cards = template-like
- ✅ Rich CSS architecture + inline SVG illustrations + animated accents = spectacular`;
}
