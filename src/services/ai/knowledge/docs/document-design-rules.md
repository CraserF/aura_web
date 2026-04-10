# Document Design Rules

> Mandatory rules for generating premium document HTML.
> These rules are injected into every document creation prompt.

---

## Typography Hierarchy

1. **Title (h1)** — 2.2–2.8rem, weight 800, tight letter-spacing (-0.03em), gradient or primary colour.
2. **Section heading (h2)** — 1.3–1.5rem, weight 700, letter-spacing -0.02em, subtle accent underline.
3. **Sub-heading (h3)** — 1.0–1.1rem, weight 700, used sparingly within sections.
4. **Body** — 15px, line-height 1.7–1.8, paragraph max-width ~680px.
5. **Eyebrow / Label** — 11px, weight 600–700, uppercase, letter-spacing 0.08–0.12em.

**Rule**: Every document must use at least h1 + h2. Three heading levels create a professional hierarchy.

---

## Spacing Discipline

- Vertical rhythm: 24–32px between major sections.
- Component internal padding: 16–24px.
- Never stack two components with zero gap.
- Use `gap` in flex/grid containers; avoid margin hacks.

---

## Colour & Surface

- Define CSS custom properties at the top: `--doc-primary`, `--doc-accent`, `--doc-text`, `--doc-muted`, `--doc-bg`, `--doc-surface`, `--doc-surface-alt`, `--doc-border`.
- **Surface cards**: subtle gradient backgrounds (`linear-gradient(180deg, rgba(255,255,255,0.94), var(--doc-surface))`), 1px border, 14–18px radius, light box-shadow.
- **Accent moments**: border-left on callouts, gradient on title text, coloured timeline markers.
- **Contrast**: muted text (`--doc-muted`) for secondary info, full `--doc-text` for body, `--doc-primary` for headings.

---

## Component Variety

A premium document uses **3–5 different component types** — not just paragraphs.

| Document Length | Minimum Components |
|---|---|
| Short (< 400 words) | 2 (e.g. header + callout or stats) |
| Medium (400–800) | 3 (e.g. header + feature grid + pullquote) |
| Long (> 800) | 4–5 (e.g. header + stats + grid + table + timeline) |

Choose components that match the content:
- **Metrics / numbers** → stat row or comparison table
- **Pros vs cons / options** → two-column layout or comparison table
- **Steps / process** → timeline
- **Key takeaway** → callout or pull quote
- **Features / benefits** → feature grid

---

## Layout Principles

- Single column for readability, max-width 780–850px, centred.
- Use grid layouts (2–4 columns) only for cards, stats, and features — never for body text.
- No fixed heights on content containers.
- All layouts must be responsive-friendly (use `auto-fit`, `minmax`).

---

## Anti-Patterns — NEVER Do These

1. ❌ **Wall of text** — more than 4 consecutive paragraphs without a visual break.
2. ❌ **Naked lists** — `<ul>` / `<ol>` without any styled container or context.
3. ❌ **Generic headings** — "Introduction", "Conclusion", "Overview" without specificity.
4. ❌ **Missing `<style>` block** — every document MUST have a `<style>` tag with custom properties.
5. ❌ **Inline style soup** — prefer classes defined in the `<style>` block over per-element inline styles.
6. ❌ **Same component repeated** — don't use 3 callouts in a row or 2 stat rows back-to-back.
7. ❌ **Placeholder / Lorem content** — every word must be real, relevant content.
8. ❌ **No visual hierarchy** — flat text with uniform font sizes.
9. ❌ **Excessive emoji** — max 1 emoji per component icon; zero in body text.
10. ❌ **Unlabelled tables** — every table needs a section heading above it.

---

## Art Direction Tiers

### Clean (wiki, readme, how-to)
- Minimal surface treatment, no gradients on title.
- 2 component types max. Focus on clarity and scanability.
- Monochrome palette with one accent colour.

### Polished (reports, briefs, proposals)
- Surface cards with subtle gradients, stat rows, comparison tables.
- 3–4 component types. Professional but not flashy.
- Full palette with primary + accent.

### Editorial (articles, pitches, thought leadership)
- Gradient title, hero header, pull quotes, feature grids.
- 4–5 component types. Magazine-quality layout.
- Rich palette, intentional white space, typographic contrast.
