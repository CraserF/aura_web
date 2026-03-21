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
\`\`\`

**Gradient Text Title (dark mode hero slides only):**
\`\`\`css
background: linear-gradient(135deg, PRIMARY_TOKEN 0%, ACCENT_TOKEN 100%);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
background-clip: text;
font-size: 3.5em;
font-weight: 800;
line-height: 1.1;
\`\`\`

**Elevated Dark Section (for visual break slides):**
\`\`\`css
data-background-color: /* slightly lighter or darker shade of main bg */
background: linear-gradient(180deg, rgba(PRIMARY_RGB, 0.04) 0%, transparent 100%);
\`\`\`

**Frosted Sidebar (for split layouts):**
\`\`\`css
background: rgba(255, 255, 255, 0.03);
border-left: 1px solid rgba(255, 255, 255, 0.06);
padding: 2rem;
backdrop-filter: blur(8px);
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
\`\`\`

**Elevated Card (for callouts or important content):**
\`\`\`css
background: SURFACE_TOKEN;
border: 1px solid BORDER_TOKEN;
border-radius: 12px;
padding: 1.5rem;
box-shadow: 0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05);
border-left: 3px solid PRIMARY_TOKEN;
\`\`\`

**Soft Colored Banner (for section intros or tips):**
\`\`\`css
background: rgba(PRIMARY_RGB, 0.06);
border-radius: 8px;
padding: 1.25rem 1.5rem;
border: 1px solid rgba(PRIMARY_RGB, 0.10);
\`\`\`

**Clean Table Row Stripe (for data tables):**
\`\`\`css
/* Even rows */
background: rgba(0, 0, 0, 0.02);
/* Header */
border-bottom: 2px solid rgba(0, 0, 0, 0.08);
font-weight: 600;
text-transform: uppercase;
font-size: 0.75em;
letter-spacing: 0.05em;
color: MUTED_TOKEN;
\`\`\`

**Light Mode Hero Title (NEVER use gradient text on light modes):**
\`\`\`css
color: HEADING_TOKEN;
font-size: 3.5em;
font-weight: 800;
line-height: 1.1;
letter-spacing: -0.02em;
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

**Progress Bar (for goals, skill levels, completion):**
\`\`\`html
<div style="width:100%;">
  <div style="display:flex; justify-content:space-between; font-size:0.75em; margin-bottom:0.3em;">
    <span style="color:BODY_TOKEN;">Label</span>
    <span style="font-weight:600; color:PRIMARY_TOKEN;">75%</span>
  </div>
  <div style="height:6px; background:rgba(PRIMARY_RGB,0.10); border-radius:3px; overflow:hidden;">
    <div style="width:75%; height:100%; background:PRIMARY_TOKEN; border-radius:3px;"></div>
  </div>
</div>
\`\`\`

**Step/Process Indicator (for numbered workflows):**
\`\`\`html
<div style="display:flex; align-items:center; gap:0.75em;">
  <div style="width:32px; height:32px; border-radius:50%; background:PRIMARY_TOKEN; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:0.85em;">1</div>
  <div>
    <div style="font-weight:600; color:HEADING_TOKEN; font-size:1em;">Step Title</div>
    <div style="font-size:0.8em; color:MUTED_TOKEN;">Description text</div>
  </div>
</div>
\`\`\`

**Comparison Row (for before/after or vs layouts):**
\`\`\`html
<div style="display:grid; grid-template-columns:1fr auto 1fr; gap:1.5rem; align-items:center;">
  <div style="padding:1.5rem; border-radius:12px; text-align:center; border:1px solid rgba(239,68,68,0.15); background:rgba(239,68,68,0.04);">
    <!-- Before -->
  </div>
  <div style="font-size:1.5em; color:MUTED_TOKEN;">→</div>
  <div style="padding:1.5rem; border-radius:12px; text-align:center; border:1px solid rgba(34,197,94,0.15); background:rgba(34,197,94,0.04);">
    <!-- After -->
  </div>
</div>
\`\`\`

**Quote Block (centered emphasis):**
\`\`\`html
<blockquote style="font-size:1.6em; font-weight:300; line-height:1.6; max-width:20em; margin:0 auto; text-align:center; color:HEADING_TOKEN; border:none; padding:0;">
  "The quote text goes here with <span style="color:PRIMARY_TOKEN; font-weight:600;">emphasis words</span> highlighted."
</blockquote>
<p style="text-align:center; margin-top:1em; font-size:0.85em; color:MUTED_TOKEN;">— Attribution</p>
\`\`\`

**Feature List Item (icon + text rows):**
\`\`\`html
<div style="display:flex; gap:1em; align-items:flex-start; margin-bottom:1.25em;">
  <div style="width:36px; height:36px; border-radius:8px; background:rgba(PRIMARY_RGB,0.10); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="PRIMARY_TOKEN" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">...</svg>
  </div>
  <div>
    <div style="font-weight:600; color:HEADING_TOKEN; margin-bottom:0.2em;">Feature Title</div>
    <div style="font-size:0.85em; color:BODY_TOKEN; line-height:1.5;">Description of this feature point.</div>
  </div>
</div>
\`\`\`

**CTA Button (for closing/action slides):**
\`\`\`html
<a style="display:inline-flex; align-items:center; gap:0.5em; padding:0.75em 2em; background:PRIMARY_TOKEN; color:#fff; border-radius:8px; font-weight:600; font-size:0.9em; text-decoration:none; letter-spacing:0.01em;">
  Get Started
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
</a>
\`\`\`

### Tailwind-Inspired Spacing & Typography Scale:

**Slides are 1920×1080px — everything must be sized for this large canvas.**

Use these spacing values for consistency (Tailwind's 4px base, scaled up for slides):
- **Padding:** slide-wrapper=4rem 5rem, cards=2rem (p-8), pills=0.3rem 1rem (py-1 px-4), inner-sections=2.5rem
- **Gaps:** card grids=1.5rem-2rem (gap-6 to gap-8), tight lists=1rem (gap-4), loose grids=3rem (gap-12)
- **Margins:** heading-to-divider=1rem, divider-to-content=2rem, between-content-blocks=2.5rem
- **Border radius:** cards=12px (rounded-xl), pills=999px (rounded-full), buttons=8px (rounded-lg), icons=10px (rounded-lg)
- **Font sizes:** hero=4em (~144px), h2=2.4em (~86px), h3/card-title=1.2em (~43px), body=1.1em (~40px), labels=0.8em (~29px), badges=0.75em (~27px)
- **Font weights:** hero=800, headings=700, card-titles=600, body=400, labels=600
- **Letter spacing:** labels/badges=0.03-0.05em, headings=-0.02em, body=normal

**IMPORTANT: If your text is smaller than 27px (0.75em) it will be unreadable. If your body text is under 36px it will look like fine print. Scale up, not down.**

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
