/**
 * Modern CSS patterns section — concrete, copy-pasteable CSS recipes
 * for dark and light modes. Inspired by shadcn/ui, Radix Themes, Tailwind.
 */

export function buildModernPatternsSection(mode: 'light' | 'dark'): string {
  const darkPatterns = `### Dark Mode Component Recipes:

**Glass Card (standard card for dark backgrounds):**
\`\`\`css
background: SURFACE_TOKEN;
border: 1px solid BORDER_TOKEN;
border-radius: 12px;
padding: 1.5rem;
backdrop-filter: blur(12px);
-webkit-backdrop-filter: blur(12px);
\`\`\`

**Accent Glow Card (use sparingly — max 1 per slide for a highlight card):**
\`\`\`css
background: ACCENT_MUTED_TOKEN;
border: 1px solid rgba(PRIMARY_RGB, 0.20);
border-radius: 12px;
padding: 1.5rem;
box-shadow: 0 0 30px rgba(PRIMARY_RGB, 0.08);
\`\`\`

**Gradient Mesh Background (for hero/title slides only):**
\`\`\`html
<div style="position:absolute; inset:0; z-index:0; pointer-events:none;">
  <div style="position:absolute; top:20%; left:10%; width:40%; height:40%; border-radius:50%; background:radial-gradient(circle, rgba(PRIMARY_RGB,0.12) 0%, transparent 70%); filter:blur(60px);"></div>
  <div style="position:absolute; bottom:20%; right:10%; width:30%; height:30%; border-radius:50%; background:radial-gradient(circle, rgba(ACCENT_RGB,0.08) 0%, transparent 70%); filter:blur(60px);"></div>
</div>
\`\`\``;

  const lightPatterns = `### Light Mode Component Recipes:

**Clean Card (standard card for light backgrounds):**
\`\`\`css
background: SURFACE_TOKEN;
border: 1px solid BORDER_TOKEN;
border-radius: 12px;
padding: 1.5rem;
box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);
\`\`\`

**Colored Accent Card (for highlight content, 1 per slide max):**
\`\`\`css
background: rgba(PRIMARY_RGB, 0.04);
border: 1px solid rgba(PRIMARY_RGB, 0.12);
border-radius: 12px;
padding: 1.5rem;
\`\`\`

**Subtle Gradient Background (for hero/title slides — NOT gradient text):**
\`\`\`css
background: linear-gradient(135deg, BG_TOKEN 0%, BG_SUBTLE_TOKEN 100%);
\`\`\``;

  return `## MODERN CSS PATTERNS

Use these exact recipes. Do NOT invent custom patterns — these are tested and produce beautiful results.

${mode === 'dark' ? darkPatterns : lightPatterns}

### Universal Patterns (both dark and light modes):

**Pill / Badge (for category labels, tags):**
\`\`\`html
<div style="display:inline-flex; padding:0.25em 0.75em; border-radius:999px; font-size:0.7em; font-weight:600; letter-spacing:0.03em; background:rgba(PRIMARY_RGB,0.10); color:PRIMARY_TOKEN; border:1px solid rgba(PRIMARY_RGB,0.20);">
  Label Text
</div>
\`\`\`

**Accent Divider (placed below every h2 heading):**
\`\`\`html
<div style="width:48px; height:3px; background:PRIMARY_TOKEN; border-radius:2px; margin:0.8rem 0 1.5rem;"></div>
\`\`\`

**Icon Container (for feature grid icons):**
\`\`\`html
<div style="width:44px; height:44px; border-radius:10px; background:rgba(PRIMARY_RGB,0.10); display:flex; align-items:center; justify-content:center;">
  <svg width="22" height="22" ...></svg>
</div>
\`\`\`

**Large Metric Number:**
\`\`\`html
<div style="font-family:var(--heading-font); font-size:3em; font-weight:800; color:var(--primary); line-height:1; letter-spacing:-0.02em;">$4.2M</div>
<div style="font-family:var(--body-font); font-size:0.7em; color:MUTED_TOKEN; margin-top:0.5em; text-transform:uppercase; letter-spacing:0.05em;">Label</div>
\`\`\`

**Split Layout (text left, visual right):**
\`\`\`html
<div style="display:grid; grid-template-columns:1fr 1fr; gap:2.5rem; align-items:center;">
  <div><!-- text content --></div>
  <div><!-- visual / cards / graphic --></div>
</div>
\`\`\`

### Layout Variety Mandate:
You MUST use at least 4 different layout patterns across a deck. Choose from:
1. **Centered Hero** — full-height centered title + subtitle + pill badge
2. **Bento Grid** — 2-3 column card grid with icon + title + description per card
3. **Split 50/50** — text left, visual/cards right (or reverse)
4. **Metrics Row** — 3-4 metric cards in a horizontal row
5. **Pull Quote** — large centered quote text with attribution below
6. **Timeline** — horizontal stepped cards with top accent border
7. **Icon List** — vertical stack of icon + text rows
8. **Full Statement** — bold, large typography on accent/gradient background

NEVER use the same layout pattern on two consecutive slides.`;
}
