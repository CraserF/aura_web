# Standalone HTML Slide Generator — Prompt Template

> **Purpose:** Turn any PowerPoint slide content into a single, self-contained HTML file with professional-grade design, inline SVG illustrations, and CSS animations.
>
> Copy the template below, fill in the `[BRACKETS]`, and send to Copilot or any AI agent.

---

## Quick Reference — Slide Types

| Type | Layout | Best For |
|------|--------|----------|
| Title | Centered, split-panel or hero | Opening / cover slides |
| Content | Heading + body grid | Bullet points, paragraphs |
| Data / Metrics | Card grid or dashboard | KPIs, numbers, stats |
| Comparison | Side-by-side columns | A vs B, before/after |
| Timeline | Horizontal or vertical rail | Roadmaps, milestones |
| Quote | Centered pull-quote | Testimonials, callouts |
| Diagram / Flow | SVG-based illustration | Architecture, processes |
| Image Feature | Full-bleed or split with text | Photos, product shots |
| Team / People | Avatar grid | Org charts, team intros |
| CTA / Closing | Centered with action | Final slide, next steps |

---

## Master Prompt

````
Create a standalone HTML slide with the specifications below.
Output a single self-contained .html file — all CSS and SVG inline, no external dependencies except Google Fonts.

═══════════════════════════════════════════════════════════
CONTENT (fill in your slide's information)
═══════════════════════════════════════════════════════════

Slide type:       [SLIDE_TYPE — e.g., Title, Content, Data/Metrics, Comparison, Timeline, Quote, Diagram, Image Feature, Team, CTA]
Headline:         [MAIN_HEADLINE — the largest text on the slide]
Subheadline:      [SUBHEADLINE — secondary text, or "none"]
Body content:     [BODY — bullet points, paragraphs, metrics, quotes — paste the raw text from the PowerPoint slide]
Brand / Company:  [BRAND_NAME — shown in footer or header tag]
Tagline:          [TAGLINE — e.g., "The Future of AI" or "none"]
Footer text:      [FOOTER — e.g., "Presented by Acme Corp" or "none"]

═══════════════════════════════════════════════════════════
VISUAL THEME
═══════════════════════════════════════════════════════════

Color palette:    [PALETTE — describe in words OR give hex codes]
                  Examples:
                    "Ocean blues and teal greens"
                    "Primary: #0090B8, Accent: #00A868, Background: #EAF6FA"
                    "Dark mode with neon purple and cyan"
                    "Corporate navy and gold"

Mood / Tone:      [MOOD — e.g., corporate, futuristic, elegant, playful, cinematic, minimal, bold]
Font style:       [FONTS — e.g., "Modern sans-serif", "Condensed bold headings + light body", or specific: "Barlow Condensed + Source Sans 3"]

═══════════════════════════════════════════════════════════
ILLUSTRATION & ICONOGRAPHY
═══════════════════════════════════════════════════════════

Visual elements:  [VISUALS — describe the imagery or icons on the PowerPoint slide]
                  Examples:
                    "Water drop icon on left, server rack on right, connected by a flowing pipeline"
                    "Three pie charts showing market share"
                    "World map with highlighted regions"
                    "Gear/cog icons for each process step"
                    "No illustrations needed — text only"

SVG style:        [SVG_STYLE — line art, flat, isometric, geometric, organic, schematic, or "agent's choice"]

═══════════════════════════════════════════════════════════
ANIMATION LEVEL (pick one)
═══════════════════════════════════════════════════════════

Animation level:  [LEVEL — 1, 2, 3, or 4]

  Level 1 — Subtle:     Gentle fades, no looping. Static elegance.
  Level 2 — Moderate:   Fades + staggered entrances, subtle pulsing dots.
  Level 3 — Immersive:  Flowing motion (waves, particles), bobbing elements, pulsing indicators.
  Level 4 — Cinematic:  Full scene — ripples, data streams, scan lines, particle effects, continuous motion.

═══════════════════════════════════════════════════════════
LAYOUT PREFERENCES (optional — leave blank for agent's choice)
═══════════════════════════════════════════════════════════

Layout:           [LAYOUT — e.g., "Split 50/50 left-right", "Centered stack", "Top hero + bottom grid", "Three columns", or "agent's choice"]
Background:       [BG — e.g., "Split panel with gradient", "Solid dark", "Soft gradient", "Full-bleed image placeholder", or "agent's choice"]
Aspect ratio:     [RATIO — "16:9" (default), "4:3", or "1:1"]

═══════════════════════════════════════════════════════════
````

---

## Design System Rules (Include These in Every Prompt)

Append the block below **as-is** after your filled-in prompt. These rules encode the design DNA that makes the slides look professional.

````
═══════════════════════════════════════════════════════════
DESIGN SYSTEM RULES — FOLLOW ALL OF THESE
═══════════════════════════════════════════════════════════

FILE STRUCTURE:
- Single self-contained HTML file. ALL CSS inline in <style>. ALL SVG inline in the HTML.
- Only external dependency allowed: Google Fonts via @import or <link>.
- No JavaScript unless animation absolutely requires it (prefer pure CSS animations).

ASPECT RATIO & SIZING:
ASPECT RATIO & SIZING:
- Slides are 1920×1080 and uniformly scaled via transform.
- Use fixed px ONLY for all sizing (font-size, padding, gap, margin).
- **Never use vw/vh/clamp()** — they cause double-scaling with the transform.
- See example files for correct px sizing patterns (LLM learns by example).

TYPOGRAPHY HIERARCHY:
- Use exactly 2 fonts: one display/heading font (bold/condensed), one body font (clean/readable).
- Load via Google Fonts @import at the top of <style>.
- Heading hierarchy (all fixed px):
    Eyebrow label:  12px, uppercase, letter-spacing 3px
    Main title:     96px, font-weight 800, line-height 1.0
    Subtitle:       36px, font-weight 700
    Body text:      24px, font-weight 400
    Small/label:    12px, uppercase, letter-spacing 2px

COLOR SYSTEM:
- Define a cohesive palette with these roles:
    Background (primary):   The dominant slide background
    Background (secondary): Panel or section contrast
    Text (primary):         Headings — near-black or near-white depending on theme
    Text (secondary):       Body — slightly muted
    Accent 1:               Primary brand/topic color
    Accent 2:               Secondary/complementary accent
    Subtle:                 Borders, dividers, faint lines — very low opacity
- Use rgba() and opacity for layering (e.g., border: 1.5px solid rgba(accent, 0.5)).
- Gradients should be smooth, multi-stop, and subtle (not harsh two-color).

BACKGROUND PATTERNS:
- Split panels: Use position:absolute divs behind content for left/right or top/bottom splits.
- Each panel gets a subtle multi-stop gradient (3+ stops for smoothness).
- Optional: add a divider seam (thin gradient line or glowing strip between panels).
- Optional: add a full-canvas SVG overlay with decorative elements (grid lines, shapes, geometry).

INLINE SVG ILLUSTRATIONS:
- All illustrations are inline <svg> elements in the HTML — never external files.
- Use viewBox for scalable sizing, preserveAspectRatio="xMidYMid meet" or "slice".
- Style guide for SVG:
    Strokes:  1-2.5px, use stroke-linecap="round"
    Fills:    Low opacity (0.1-0.3) for shapes, higher for accent dots
    Colors:   Pull from the slide's accent palette
    Detail:   Include small details (LED dots, connection lines, subtle gridlines)
- Use clipPath to constrain elements to left/right halves if using split layout.
- Layer SVGs: background canvas SVG (z-index:2) + content-level SVG strip (inside the content div).

ANIMATION CSS:
- Define all @keyframes in the <style> block.
- Core animation types to use based on level:

  LEVEL 1 (Subtle):
    - fadeIn on content load

  LEVEL 2 (Moderate):
    - fadeIn + translateY entrances
    - Gentle pulsing opacity on brand tags or dots
    - Staggered animation-delay on repeated elements

  LEVEL 3 (Immersive):
    - Flowing/translating paths (wave scrolling, data streams)
    - Bobbing/floating elements (translateY oscillation)
    - Ripple/expanding rings (scale + opacity fade)
    - Pulsing indicator dots
    - Dashed stroke-dashoffset animation for flow lines

  LEVEL 4 (Cinematic):
    - All of Level 3 plus:
    - Scan lines sweeping across elements
    - Particle drift (floating text/shapes with translateY + opacity)
    - Multiple overlapping wave layers at different speeds/delays
    - Glowing seam/divider gradients
    - Data stream indicators (blinking LEDs with staggered delays)

- Animation properties pattern:
    animation: NAME DURATION TIMING-FUNCTION infinite;
    Use staggered animation-delay for groups (0s, 0.3s, 0.6s, 0.9s...)
    Use transform-origin correctly for scale animations
    Use transform-box: fill-box for SVG element animations

LAYOUT COMPONENTS:
LAYOUT COMPONENTS:
- Content: padding 56px 72px, gap 16–22px.
- Pill badges: padding 8px 16px, border-radius 30px.
- Footer: position absolute, bottom 16px.
- See example files for complete component patterns.

QUALITY CHECKLIST:
- [ ] No text overflows its container at any viewport size
- [ ] All colors are from the defined palette (no random hex values)
- [ ] All sizes use fixed **px** values (font-size, padding, gap) — no vw/vh/clamp() — Reveal.js CSS transform handles scaling
- [ ] SVG viewBox matches the intended coordinate space
- [ ] Animations are smooth (use transform/opacity only, never animate layout properties)
- [ ] The slide renders correctly in a plain browser tab (no server needed)
- [ ] No external images, scripts, or stylesheets (except Google Fonts)
- [ ] HTML passes basic validity (no unclosed tags)
═══════════════════════════════════════════════════════════
````

---

## Example — Filled-In Prompt

Here's a complete example showing how to fill in the template:

````
Create a standalone HTML slide with the specifications below.
Output a single self-contained .html file — all CSS and SVG inline, no external dependencies except Google Fonts.

═══════════════════════════════════════════════════════════
CONTENT
═══════════════════════════════════════════════════════════

Slide type:       Title
Headline:         Water & Data Centre Opportunities in Africa
Subheadline:      The Future of Company
Body content:     Two pillars: "Water Infrastructure Finance" and "AI Data Centre Advisory"
Brand / Company:  Example company name
Tagline:          Example company name · Presentation
Footer text:      Presented by Example company name

═══════════════════════════════════════════════════════════
VISUAL THEME
═══════════════════════════════════════════════════════════

Color palette:    Ocean teal (#0090B8, #00C8E8) for water side, green (#008858, #00A868, #00D898) for data side,
                  soft light blue background (#EAF6FA), dark navy text (#041828)
Mood / Tone:      Corporate but forward-looking, clean and sophisticated
Font style:       Barlow Condensed (900 weight, uppercase headings) + Source Sans 3 (300-700 body)

═══════════════════════════════════════════════════════════
ILLUSTRATION & ICONOGRAPHY
═══════════════════════════════════════════════════════════

Visual elements:  Water drop icon on the left, server rack icon on the right, connected by a flowing
                  dashed pipeline through a central nexus node. Background has wave patterns on the
                  water side and vertical data stream lines with server rack on the data side.
                  Faint Africa continent outline in the center seam.
SVG style:        Line art, geometric, clean strokes

═══════════════════════════════════════════════════════════
ANIMATION LEVEL
═══════════════════════════════════════════════════════════

Animation level:  4

═══════════════════════════════════════════════════════════
LAYOUT PREFERENCES
═══════════════════════════════════════════════════════════

Layout:           Split 50/50 left (water/blue) and right (data/green) with a glowing teal seam divider
Background:       Split panel gradients — soft blue-white on left, soft green-white on right
Aspect ratio:     16:9

[PASTE THE DESIGN SYSTEM RULES BLOCK HERE]
````

---

## Slide Type Cheatsheets

Below are layout hints for each slide type. Include the relevant one in your prompt if you want more precision.

### Title Slide
```
Layout: Centered vertical stack
Elements (top to bottom):
  1. Brand tag (small uppercase)
  2. Visual strip (SVG illustration — icons representing the topic connected by flow lines)
  3. Eyebrow label (small uppercase, e.g., "Title Slide · Strategic Advisory")
  4. Main headline (largest text, 2 lines max, key words in accent colors)
  5. Divider row (thin gradient lines flanking a centered tagline)
  6. Pill badges (rounded tags for key themes/pillars)
  7. Presented-by line (small, muted)
  8. Footer dots (animated colored circles, bottom-right)
```

### Content / Bullet Slide
```
Layout: Heading top, content below (optionally split into 2-3 columns)
Elements:
  1. Section eyebrow (small label)
  2. Slide heading (large, left or center aligned)
  3. Body text or bullet list (staggered fade-in)
  4. Optional: side illustration or icon column
  5. Subtle background pattern (grid lines, faint shapes)
  6. Footer: slide number or brand mark
```

### Data / Metrics Slide
```
Layout: Heading top, card grid below (2-4 columns)
Elements:
  1. Section heading
  2. Metric cards (each card: large number, label, optional delta/arrow)
  3. Optional: progress bars, mini charts (SVG), sparklines
  4. Background: subtle grid or dot pattern
Animations: Counter roll-up on numbers, staggered card entrances, pulsing accent dots
```

### Comparison Slide
```
Layout: Two-column split (50/50 or 40/60)
Elements:
  1. Heading spanning full width
  2. Left column: Option A (icon, title, bullet points)
  3. Right column: Option B (icon, title, bullet points)
  4. Center divider: vertical line or "VS" badge
  5. Optional: highlight row showing the winner/recommendation
Background: Split-tone (each half gets a tinted panel)
```

### Timeline / Roadmap Slide
```
Layout: Horizontal rail with nodes, or vertical list
Elements:
  1. Heading
  2. Timeline rail (SVG line with circle nodes at each milestone)
  3. Labels above/below each node (date + event)
  4. Optional: "current" indicator (glowing or pulsing node)
Animations: Nodes appear sequentially (staggered delay), rail draws in (stroke-dashoffset)
```

### Quote Slide
```
Layout: Centered, generous whitespace
Elements:
  1. Large quotation mark (decorative SVG or Unicode)
  2. Quote text (large italic, 2-4 lines max)
  3. Attribution (name, title, company — smaller, muted)
  4. Subtle background: radial gradient or faint pattern
Animations: Text fades in, quotation mark scales in
```

### Diagram / Flow Slide
```
Layout: Full-slide SVG or centered SVG with labels
Elements:
  1. Heading (top or side)
  2. SVG diagram: boxes/nodes connected by arrows/lines
  3. Labels inside or beside each node
  4. Color coding to group related elements
Animations: Nodes fade in sequentially, connection lines draw (stroke-dashoffset), data flow particles along paths
```

### Image Feature Slide
```
Layout: Split (image one side, text other) or full-bleed with overlay
Elements:
  1. Image area (use a colored placeholder rectangle with a label for now — no external images)
  2. Heading + body text
  3. Optional: caption or credit line
Background: Use the image placeholder as the background for one panel
```

### Team / People Slide
```
Layout: Grid of avatar cards (2x2, 3x2, 4x2)
Elements:
  1. Heading
  2. Person cards: circle avatar placeholder, name, title, optional one-line bio
  3. Optional: social/contact icons below each card
Animations: Cards stagger in, avatar circles pulse on hover
```

### CTA / Closing Slide
```
Layout: Centered, bold
Elements:
  1. Large heading (call to action or thank you)
  2. Subtext (next steps, contact info, URL)
  3. Optional: button-style element (rounded rect with accent fill)
  4. Brand mark / logo placeholder
  5. Decorative footer (animated dots, subtle pattern)
Animations: Heading elastic-in, button pulses gently
```

---

## Supporting Knowledge Base

For best results, also paste the knowledge base document(s) alongside this prompt:

- **Core:** `reference/standalone-slide-knowledge.md` (Parts 1-7)
- **Extended:** `reference/standalone-slide-extended.md` (Parts 8-12)

The core file gives the agent all the HOW — responsive sizing formulas, @keyframes recipes, SVG construction techniques, color system rules, layout blueprints, and ready-to-use component code.

The extended file adds advanced slide types (SWOT, process flow, pricing, funnel, agenda), more animations (elastic, shimmer, draw-on, morphing), more SVG illustrations, and dark/alternate theme systems.

### What to paste by context window size:

| Context Budget | What to Include |
|---------------|-----------------|
| **Small** (~8K tokens) | This prompt + Design System Rules block only |
| **Medium** (~16K tokens) | This prompt + Core Knowledge Base Parts 1-3 (Architecture, Sizing, Animations) |
| **Large** (~32K tokens) | This prompt + Full Core Knowledge Base (Parts 1-7) |
| **XL** (~64K+ tokens) | This prompt + Core (Parts 1-7) + Extended (Parts 8-12) |

### Quick-paste checklist:

1. ✅ Filled-in prompt (from this file)
2. ✅ Design System Rules block (from this file)
3. ✅ Core Part 1: Architecture (`standalone-slide-knowledge.md` §1)
4. ✅ Core Part 3: CSS Animation Cookbook (§3)
5. ✅ Core Part 4: Inline SVG Guide (§4) — if illustrations needed
6. ✅ Core Part 5: Color & Typography (§5) — if you want font/color suggestions
7. ✅ Core Part 7: Component Recipes (§7) — if using pills, cards, timelines, etc.
8. ✅ Extended Part 8: Extra Layouts (`standalone-slide-extended.md` §8) — for SWOT, pricing, process flow, etc.
9. ✅ Extended Part 9: Extra Animations (§9) — for elastic, shimmer, draw-on stroke, morphing
10. ✅ Extended Part 10: Extra Components (§10) — donut charts, sparklines, callouts, bar charts
11. ✅ Extended Part 11: Extra SVG Illustrations (§11) — funnels, pyramids, radial diagrams
12. ✅ Extended Part 12: Dark Mode & Themes (§12) — if non-default color scheme needed

---

## Tips for Best Results

1. **Be specific about visuals.** Instead of "add some icons," say "gear icon for process, chart icon for analytics, shield icon for security — all in line-art style with 2px strokes."

2. **Paste the actual slide text.** Don't summarize — give the agent the exact words from your PowerPoint so it can size and layout for the real content length.

3. **Reference the title slide.** If you want consistency with an existing slide, say: "Match the visual style of title_slide.html — same fonts, color palette, animation level, and SVG illustration approach."

4. **One slide per prompt.** For best quality, generate one slide at a time rather than a full deck. You can chain them later.

5. **Iterate on illustrations.** The first SVG illustration may need refinement. Ask: "Make the server rack more detailed" or "Simplify the diagram to just 3 nodes."

6. **Test at multiple widths.** Open the HTML file and resize the browser window. The clamp() sizing should keep everything readable from laptop to ultrawide.
