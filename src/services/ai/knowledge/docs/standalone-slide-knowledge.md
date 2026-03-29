# Standalone HTML Slide — Agent Knowledge Base

> **Purpose:** This document contains EVERYTHING an AI agent needs to produce
> beautiful, self-contained HTML slides without any framework — just raw HTML,
> inline CSS, and inline SVG. Paste this into a conversation alongside the prompt
> template in `prompts/standalone-slide-prompt.md`.
>
> If context window is limited, paste **Part 1 + Part 2 + Part 3** at minimum.
> Parts 4-7 add depth; include them for best results.
>
> **Extended Reference:** For advanced slide types (SWOT, pricing, flow diagrams,
> dark mode, etc.), also include `reference/standalone-slide-extended.md` which
> adds Parts 8-12 with additional layouts, animations, components, SVG recipes,
> and theme variants.

---

## Table of Contents

**This file — Core (Parts 1-7):**

1. [Architecture — How a Standalone Slide Is Built](#part-1-architecture)
2. [Responsive Sizing — The clamp() System](#part-2-responsive-sizing)
3. [CSS Animation Cookbook](#part-3-css-animation-cookbook)
4. [Inline SVG Illustration Guide](#part-4-inline-svg-illustration-guide)
5. [Color & Typography Systems](#part-5-color--typography-systems)
6. [Layout Patterns](#part-6-layout-patterns)
7. [Component Recipes](#part-7-component-recipes)

**Extended file** (`standalone-slide-extended.md` — Parts 8-12):

8. Extended Layout Patterns (Section Divider, Agenda, Process/Flow, SWOT, Big Number, Icon Grid, Pricing, Team, Table, Logo Grid, Before/After)
9. Extended CSS Animation Library (text shimmer, elastic/spring, draw-on stroke, gradient shift, orbit, morphing, counters, cascades)
10. Extended Component Recipes (donut chart, sparkline, callout box, numbered steps, bar chart, code block, segmented progress, before/after)
11. Extended SVG Illustration Recipes (pie/donut, funnel, pyramid, flow diagram, radial/hub-spoke, 10 additional icon paths)
12. Dark Mode & Alternate Themes (dark, warm/earth, neon/cyberpunk, accessibility)

---

## Part 1: Architecture

### File Structure

Every slide is a **single `.html` file** with this skeleton:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>[Slide Title]</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=...');

    /* 1. Reset */
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body { width:100%; height:100%; display:flex;
                 align-items:center; justify-content:center;
                 background:#f0f0f0; /* page background behind the slide */ }

    /* 2. Slide container — enforces aspect ratio */
    .slide {
      width:  min(100vw, 177.78vh);   /* 16:9 lock */
      height: min(56.25vw, 100vh);
      position:relative; overflow:hidden;
      font-family: 'Body Font', sans-serif;
      background: #FFFFFF;
      display:flex; flex-direction:column;
    }

    /* 3. Background layers (position:absolute, z-index 0-2) */
    /* 4. Content layer  (position:relative, z-index 10) */
    /* 5. @keyframes animations */
    /* 6. Animation utility classes */
  </style>
</head>
<body>
  <div class="slide">
    <!-- Background layers (absolute positioned) -->
    <!-- SVG overlay (absolute, pointer-events:none) -->
    <!-- Content (relative, z-index:10) -->
    <!-- Footer (absolute, bottom) -->
  </div>
</body>
</html>
```

### Layer Stack (z-index order)

| z-index | Layer | Purpose |
|---------|-------|---------|
| 0 | Background panels | Split colors, gradients |
| 1 | Decorative seams/dividers | Glowing lines between panels |
| 2 | Background SVG canvas | Full-slide animated illustrations (waves, grids, shapes) |
| 10 | Content div | Text, badges, content-level SVG strips |
| 10 | Footer | Bottom-positioned brand marks, dots |

### Key Constraints

- **No external files** except Google Fonts `@import` or `<link>`.
- **No JavaScript** — all motion is pure CSS `@keyframes`.
- **No images** — all visuals are inline SVG.
- Must render correctly by opening the `.html` file directly in a browser (no server).

---

## Part 2: Sizing for Reveal.js

### CRITICAL: Use Fixed px — Never vw/vh

Slides render at 1920×1080, uniformly scaled via CSS `transform`. **Use only fixed px** for sizing — never vw/vh/clamp() as they cause double-scaling with the transform.

**See example files** (example-title-slide.html, example-editorial.html, example-interstitial.html) for correct px sizing patterns. The LLM learns by example.

### Letter-spacing Scale

| Purpose | Value |
|---------|-------|
| Eyebrow / brand tags | `4px` |
| Section labels | `2-4px` |
| Subtitles | `1px` |
| Body text | `0.5px` or `normal` |
| Metric values | `-1px` (tight) |

---

## Part 3: CSS Animation Cookbook

### Core @keyframes Library

Copy these into your `<style>` block and apply via classes or inline styles.

#### Entrance Animations (play once)

```css
@keyframes fadeInUp {
  from { opacity:0; transform:translateY(20px); }
  to   { opacity:1; transform:translateY(0); }
}
```

#### Continuous Oscillation (infinite)

```css
/* Gentle bobbing — for floating icons, drops */
@keyframes bob {
  0%, 100% { transform:translateY(0); }
  50%      { transform:translateY(-7px); }
}

/* Breathing pulse — for brand tags, subtle text */
@keyframes breathe {
  0%, 100% { opacity:1; }
  50%      { opacity:0.5; }
}

/* Dot pulse — for status indicators */
@keyframes dotPulse {
  0%, 100% { transform:scale(1);   opacity:1; }
  50%      { transform:scale(1.6); opacity:0.4; }
}
```

#### Flowing / Streaming (infinite)

```css
/* Horizontal wave scroll — for wave patterns */
@keyframes waveFlow {
  from { transform:translateX(0); }
  to   { transform:translateX(-320px); }
  /* Distance = one full wave period in the SVG path */
}

/* Stroke dash flow — for dashed pipeline/flow lines */
@keyframes streamFlow {
  to { stroke-dashoffset:-40; }
  /* Value = sum of stroke-dasharray values (e.g., 16+8=24 or 12+8=20) */
}
```

#### Expansion / Ripple (infinite)

```css
/* Expanding ring ripple — for emphasis circles, water drops */
@keyframes rippleOut {
  0%   { transform:scale(0.2); opacity:0.7; }
  100% { transform:scale(1.6); opacity:0; }
}
```

#### Blinking / Scanning (infinite)

```css
/* LED blink — for server rack indicators */
@keyframes blinkLED {
  0%, 100% { opacity:0.4; }
  50%      { opacity:1; }
}

/* Vertical scan — for server rack sweep effect */
@keyframes serverScan {
  0%   { transform:translateY(-100%); opacity:0; }
  10%  { opacity:0.6; }
  90%  { opacity:0.6; }
  100% { transform:translateY(200%); opacity:0; }
}
```

#### Particle / Data Effects (infinite)

```css
/* Rising particle — for floating binary digits, data motes */
@keyframes particleUp {
  0%   { transform:translateY(0);     opacity:0; }
  20%  { opacity:1; }
  100% { transform:translateY(-60px); opacity:0; }
}

/* Floating data bit — combines translate + opacity */
@keyframes floatData {
  0%   { transform:translateY(0) translateX(0); opacity:0; }
  20%  { opacity:0.7; }
  80%  { opacity:0.4; }
  100% { transform:translateY(-40px) translateX(8px); opacity:0; }
}
```

#### Rotation (infinite)

```css
@keyframes spin {
  from { transform:rotate(0deg); }
  to   { transform:rotate(360deg); }
}
```

### Animation Timing Properties Cheatsheet

| Property | Recommended Values |
|----------|-------------------|
| `animation-duration` | 1.2s (blink), 2-3s (bob/pulse), 3-4s (particle), 8s (wave scroll) |
| `animation-timing-function` | `ease-in-out` (oscillation), `linear` (scroll/spin), `ease-out` (particles) |
| `animation-iteration-count` | `infinite` for all decorative animations |
| `animation-delay` | Stagger by 0.2-0.4s per element in a group |

### Staggering Pattern

For a group of N similar elements, apply incrementing delays:

```css
.element:nth-child(1) { animation-delay: 0s; }
.element:nth-child(2) { animation-delay: 0.3s; }
.element:nth-child(3) { animation-delay: 0.6s; }
.element:nth-child(4) { animation-delay: 0.9s; }
```

Or use inline `style="animation-delay: 0.3s"` for SVG elements.

### Performance Rules

- **Only animate `transform` and `opacity`** — never `width`, `height`, `top`, `left`, `margin`, `padding`.
- Use `will-change: transform` sparingly on heavily animated elements.
- Keep total animated elements under ~50 per slide for smooth 60fps.
- For SVG animations, set `transform-box: fill-box` and `transform-origin: center` on the element.

---

## Part 4: Inline SVG Illustration Guide

### SVG Canvas Setup

Full-slide background SVG overlay:

```html
<svg style="position:absolute; inset:0; width:100%; height:100%;
            z-index:2; pointer-events:none;"
     viewBox="0 0 1280 720"
     preserveAspectRatio="xMidYMid slice"
     xmlns="http://www.w3.org/2000/svg">
  <!-- All background illustrations go here -->
</svg>
```

Content-level SVG strip (inside the content div):

```html
<div class="vis-strip" style="width:100%; height:clamp(100px,18vh,165px);">
  <svg width="100%" height="100%"
       viewBox="0 0 900 140"
       preserveAspectRatio="xMidYMid meet">
    <!-- Illustrations sized to fit the strip -->
  </svg>
</div>
```

### viewBox Coordinate Spaces

| Context | viewBox | Why |
|---------|---------|-----|
| Full-slide background | `0 0 1280 720` | Matches 16:9 aspect ratio |
| Content strip | `0 0 900 140` | Wide but short — fits between title rows |
| Square icon area | `0 0 100 100` | Simple icon canvas |

### preserveAspectRatio Values

| Value | Behavior | Use When |
|-------|----------|----------|
| `xMidYMid slice` | Fill container, crop edges | Background canvases |
| `xMidYMid meet` | Fit inside container, letterbox | Content SVG strips |
| `none` | Stretch to fill | Never (distorts) |

### Clipping with clipPath (Split Layouts)

Constrain elements to one side of the slide:

```xml
<defs>
  <clipPath id="leftClip"><rect x="0" y="0" width="638" height="720"/></clipPath>
  <clipPath id="rightClip"><rect x="642" y="0" width="638" height="720"/></clipPath>
</defs>
<g clip-path="url(#leftClip)" opacity="0.55">
  <!-- Water-themed elements only visible on left half -->
</g>
<g clip-path="url(#rightClip)" opacity="0.55">
  <!-- Data-themed elements only visible on right half -->
</g>
```

### SVG Element Recipes

#### Water Drop

```xml
<g style="animation:bob 3s ease-in-out infinite; transform-origin:160px 340px;">
  <!-- Filled shape (low opacity) -->
  <path d="M160,280 Q185,305 192,330 Q200,358 160,372 Q120,358 128,330 Q135,305 160,280 Z"
        fill="#0098B8" opacity="0.22"/>
  <!-- Outline stroke -->
  <path d="M160,280 Q185,305 192,330 Q200,358 160,372 Q120,358 128,330 Q135,305 160,280 Z"
        fill="none" stroke="#00C8E8" stroke-width="2"/>
  <!-- Highlight arc -->
  <path d="M144,300 Q152,294 160,300"
        fill="none" stroke="#60D8F0" stroke-width="1.5" stroke-linecap="round" opacity="0.7"/>
</g>
```

**Pattern:** Shape = filled path (opacity 0.15-0.25) + stroke path (1.5-2.5px) + detail highlight.

#### Server Rack

```xml
<g style="animation:bob 3s ease-in-out infinite 0.8s; transform-origin:790px 70px;">
  <!-- Rack units (4 stacked rectangles) -->
  <rect x="740" y="22" width="100" height="16" rx="3" fill="#D8F4EC" stroke="#00D898" stroke-width="2"/>
  <rect x="740" y="42" width="100" height="16" rx="3" fill="#D8F4EC" stroke="#00D898" stroke-width="2"/>
  <rect x="740" y="62" width="100" height="16" rx="3" fill="#D8F4EC" stroke="#00D898" stroke-width="2"/>
  <rect x="740" y="82" width="100" height="16" rx="3" fill="#D8F4EC" stroke="#00D898" stroke-width="2"/>

  <!-- LED indicators (two per row, staggered blink) -->
  <circle style="animation:blinkLED 1.2s ease-in-out infinite 0s;"    cx="752" cy="30" r="3" fill="#00D898"/>
  <circle style="animation:blinkLED 1.2s ease-in-out infinite 0.25s;" cx="752" cy="50" r="3" fill="#00D898"/>
  <circle style="animation:blinkLED 1.2s ease-in-out infinite 0.5s;"  cx="752" cy="70" r="3" fill="#00D898"/>
  <circle style="animation:blinkLED 1.2s ease-in-out infinite 0.75s;" cx="752" cy="90" r="3" fill="#00C878"/>
  <!-- Smaller secondary LEDs -->
  <circle style="animation:blinkLED 1.2s ease-in-out infinite 0.12s;" cx="762" cy="30" r="2" fill="#00A870" opacity="0.7"/>

  <!-- Horizontal data lines -->
  <line x1="773" y1="30" x2="832" y2="30" stroke="#00C878" stroke-width="1.2" opacity="0.5"/>

  <!-- Scan line overlay -->
  <rect style="animation:serverScan 3s ease-in-out infinite; transform-box:fill-box;"
        x="740" y="18" width="100" height="3" rx="1" fill="#00D898" opacity="0.6"/>
</g>
```

#### Flowing Pipeline / Connection

```xml
<!-- Primary flow line -->
<path style="animation:streamFlow 2s linear infinite;"
      d="M180,70 Q250,55 330,70 Q410,85 450,70 Q490,55 570,70 Q650,85 720,70"
      fill="none" stroke="#00C8A0" stroke-width="2.5"
      stroke-dasharray="16 8" opacity="0.6"/>

<!-- Secondary flow line (offset delay) -->
<path style="animation:streamFlow 2s linear infinite; animation-delay:-1s;"
      d="M180,82 Q250,70 330,82 Q410,94 450,82 Q490,70 570,82 Q650,94 720,82"
      fill="none" stroke="#0098B8" stroke-width="1.5"
      stroke-dasharray="10 6" opacity="0.35"/>
```

**Pattern:** Quadratic Bézier curves (Q) creating gentle S-waves. Two lines at different widths, opacities, and delays for depth.

#### Nexus / Hub Node

```xml
<!-- Outer ring -->
<circle cx="450" cy="70" r="22" fill="#E8F8F4" stroke="#00C8A0" stroke-width="2.5" opacity="0.9"/>
<!-- Inner fill -->
<circle cx="450" cy="70" r="14" fill="#00C8A0" opacity="0.15"/>
<!-- Core dot -->
<circle cx="450" cy="70" r="6"  fill="#00C8A0" opacity="0.7"/>
<!-- Pulsing rings -->
<circle style="animation:rippleOut 2.5s ease-out infinite 0s;"
        cx="450" cy="70" r="22" fill="none" stroke="#00C8A0" stroke-width="1.5"/>
<circle style="animation:rippleOut 2.5s ease-out infinite 1.2s;"
        cx="450" cy="70" r="22" fill="none" stroke="#00C8A0" stroke-width="1"/>
```

#### Wave Bands (Background)

```xml
<g style="animation:waveFlow 8s linear infinite;">
  <path d="M0,560 Q80,540 160,560 Q240,580 320,560 Q400,540 480,560
           Q560,580 640,560 Q720,540 800,560 Q880,580 960,560
           L960,720 L0,720 Z"
        fill="#0090B8" opacity="0.12"/>
</g>
<g style="animation:waveFlow 8s linear infinite; animation-delay:-4s;">
  <path d="M0,580 Q80,562 160,580 Q240,598 320,580 Q400,562 480,580
           Q560,598 640,580 Q720,562 800,580 Q880,598 960,580
           L960,720 L0,720 Z"
        fill="#00A8C0" opacity="0.18"/>
</g>
```

**Pattern:** Two (or more) wave layers at different Y offsets, opacities, and animation delays. Waves extend past the viewBox width so the scroll animation loops seamlessly. Close the path down to the bottom to create filled wave shapes.

#### Data Stream Lines (Background)

```xml
<!-- Vertical guide lines (static) -->
<line x1="720" y1="0" x2="720" y2="720" stroke="#00D898" stroke-width="1" opacity="0.08"/>
<line x1="800" y1="0" x2="800" y2="720" stroke="#00D898" stroke-width="0.7" opacity="0.06"/>

<!-- Horizontal grid lines (static) -->
<line x1="642" y1="180" x2="1280" y2="180" stroke="#00B878" stroke-width="0.5" opacity="0.08"/>

<!-- Floating binary particles (animated) -->
<text style="animation:particleUp 3s ease-out infinite 0s;
             transform-box:fill-box; transform-origin:center;"
      x="700" y="600" font-family="monospace" font-size="9"
      fill="#00D898" opacity="0.4">01</text>
<text style="animation:particleUp 3.5s ease-out infinite 0.7s;
             transform-box:fill-box; transform-origin:center;"
      x="740" y="580" font-family="monospace" font-size="8"
      fill="#00B878" opacity="0.3">10</text>
```

**Pattern:** Static grid lines (very low opacity 0.06-0.08) + animated text particles drifting upward with staggered delays and durations.

#### Network/Connection Nodes

```xml
<!-- Node: outer ring + inner dot -->
<circle cx="1100" cy="280" r="8" fill="none" stroke="#00D898" stroke-width="1.5" opacity="0.5"/>
<circle cx="1100" cy="280" r="4" fill="#00D898" opacity="0.4"/>

<!-- Dashed connection line between nodes -->
<line x1="1100" y1="280" x2="1160" y2="350"
      stroke="#00C888" stroke-width="1" stroke-dasharray="4 3" opacity="0.3"/>
```

#### Glowing Seam / Divider

```xml
<defs>
  <linearGradient id="seamGrad" x1="0" y1="0" x2="0" y2="1"
                  gradientUnits="objectBoundingBox">
    <stop offset="0%"   stop-color="#00C8A0" stop-opacity="0"/>
    <stop offset="30%"  stop-color="#00C8E8" stop-opacity="0.8"/>
    <stop offset="50%"  stop-color="#00D8A8" stop-opacity="1"/>
    <stop offset="70%"  stop-color="#00C8E8" stop-opacity="0.8"/>
    <stop offset="100%" stop-color="#00C8A0" stop-opacity="0"/>
  </linearGradient>
</defs>
<rect x="635" y="0" width="10" height="720" fill="url(#seamGrad)" opacity="0.6"/>
```

**Pattern:** Vertical gradient that fades out at top and bottom edges, peaks in the middle. Creates a "living light" effect at the seam between two panels.

#### Country / Region Outline (Decorative)

```xml
<!-- Simplified continent outline — very faint, purely decorative -->
<path d="M580,130 Q600,118 624,125 ... Z"
      fill="none" stroke="#00C8A0" stroke-width="1.5" opacity="0.2"/>
```

Use simplified/approximate paths. Keep opacity at 0.15-0.25 — these are atmospheric, not informational.

### SVG Style Guidelines

| Property | Value Range | Notes |
|----------|-------------|-------|
| Stroke width (detail elements) | 0.5-1.2px | Grid lines, connections |
| Stroke width (primary elements) | 1.5-2.5px | Icons, outlines, pipelines |
| Fill opacity (shapes) | 0.08-0.25 | Low enough to be atmospheric |
| Fill opacity (indicator dots) | 0.4-0.7 | Visible but not dominant |
| Element group opacity | 0.55 | Clipped background groups |
| stroke-linecap | `round` | Always, for cleaner line endings |
| rx (rounded rectangles) | 3px | Server racks, badges |

### Constructing Custom Illustrations

The agent should build illustrations by composing these atomic elements:

1. **Identify the concepts** — What are the 2-3 key themes? (e.g., water + data)
2. **Pick a representative icon for each** — Drop, gear, server, globe, chart, shield, etc.
3. **Connect them** — Use flowing pipeline paths (Q-curve Béziers) or connection lines.
4. **Add atmosphere** — Background grid lines, wave bands, particles, network nodes.
5. **Add a nexus point** — Where concepts meet, place a hub node with ripple animation.
6. **Layer into split halves** — Use clipPath to confine each theme to its panel side.

---

## Part 5: Color & Typography Systems

### Building a Palette from a Theme Description

The agent should derive 8 color roles from the user's description:

| Role | Variable | Example (Ocean + Nature) |
|------|----------|--------------------------|
| Page background | `bg-page` | `#C0DCE8` |
| Slide background | `bg-slide` | `#EAF6FA` |
| Panel left | `bg-panel-left` | `#D8EEF8` |
| Panel right | `bg-panel-right` | `#D4F0E8` |
| Text primary | `text-primary` | `#041828` |
| Text secondary | `text-secondary` | `#2A6878` |
| Accent 1 | `accent-1` | `#0090B8` (water blue) |
| Accent 2 | `accent-2` | `#008858` (data green) |

### Gradient Recipes

**Panel gradients** — Use 3 stops minimum for smoothness:

```css
background: linear-gradient(135deg, #D8EEF8 0%, #C8E6F4 60%, #D4ECF8 100%);
```

**Divider line gradients** — Fade at both ends:

```css
background: linear-gradient(to right, transparent, #0098B8, transparent);
opacity: 0.4;
```

**Seam/glow gradients** — Vertical with 5 stops:

```css
/* Defined as SVG linearGradient — see Part 4 */
stops: transparent → 0.8 → 1.0 → 0.8 → transparent
```

### Typography Rules

**Font loading pattern:**
```css
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;700;900&family=Source+Sans+3:wght@300;400;600;700&display=swap');
```

**Heading vs Body font assignment:**

| Element | Font | Weight | Transform | Line-height |
|---------|------|--------|-----------|-------------|
| Eyebrow labels | Body font | 700 | uppercase | 1.2 |
| Main title | Display font | 900 | uppercase | 0.9 |
| Subtitle | Display font | 700 | uppercase | 1.0 |
| Body/descriptive text | Body font | 400 | none | 1.4 |
| Small labels | Body font | 300-400 | uppercase | 1.2 |

### Font Pairing Suggestions

| Mood | Display Font | Body Font | Google Fonts URL |
|------|-------------|-----------|------------------|
| Bold / Corporate | Barlow Condensed (900) | Source Sans 3 (300-700) | `Barlow+Condensed:wght@400;700;900&family=Source+Sans+3:wght@300;400;600;700` |
| Modern / Tech | Space Grotesk (700) | Inter (300-600) | `Space+Grotesk:wght@400;600;700&family=Inter:wght@300;400;600` |
| Elegant / Minimal | Playfair Display (700) | Lato (300-400) | `Playfair+Display:wght@400;700&family=Lato:wght@300;400` |
| Start-up / Friendly | Poppins (700) | Nunito (300-400) | `Poppins:wght@400;600;700&family=Nunito:wght@300;400` |
| Futuristic / Sci-Fi | Orbitron (700) | Rajdhani (300-500) | `Orbitron:wght@400;700&family=Rajdhani:wght@300;400;500` |
| Classic / Academic | Merriweather (700) | Source Serif 4 (300-400) | `Merriweather:wght@400;700&family=Source+Serif+4:wght@300;400` |
| Creative / Expressive | Bebas Neue (400) | Work Sans (300-500) | `Bebas+Neue&family=Work+Sans:wght@300;400;500` |
| Data / Dashboard | JetBrains Mono (700) | Inter (400) | `JetBrains+Mono:wght@400;700&family=Inter:wght@300;400;600` |

### Accent Color with Text

Color key words in the title to reinforce the theme:

```html
<div class="title-main">
  <span style="color:#0090B8;">Water</span> &amp;
  <span style="color:#008858;">Data Centre</span>
</div>
```

Only color 1-3 key words per line. The rest stays in the primary text color.

---

## Part 6: Layout Patterns

### Pattern: Centered Vertical Stack (Title Slide)

```
┌──────────────────────────────────────────┐
│              [Brand Tag]                 │ ← eyebrow, uppercase, small
│                                          │
│          ╔══════════════════╗             │
│          ║  SVG Vis Strip   ║             │ ← icons + pipeline + nexus
│          ╚══════════════════╝             │
│                                          │
│     Title Slide · Category Label         │ ← eyebrow
│       MAIN HEADLINE LINE 1              │ ← biggest text, accent-colored words
│       MAIN HEADLINE LINE 2              │ ← slightly smaller
│                                          │
│    ─────── The Tagline Here ──────       │ ← divider row
│                                          │
│      [ Pillar A ]  +  [ Pillar B ]       │ ← pill badges
│                                          │
│        Presented by Company              │ ← small, muted
│                                    ● ● ● │ ← footer dots
└──────────────────────────────────────────┘
```

CSS structure:

```css
.content {
  position:relative; z-index:10;
  width:100%; height:100%;
  display:flex; flex-direction:column;
  align-items:center; justify-content:center;
  padding:3% 4%;
  gap: clamp(10px, 1.6vh, 22px);
}
```

### Pattern: Split Panel Background

```css
.bg-left {
  position:absolute; left:0; top:0; bottom:0; width:50%;
  background:linear-gradient(135deg, #D8EEF8 0%, #C8E6F4 60%, #D4ECF8 100%);
  z-index:0;
}
.bg-right {
  position:absolute; right:0; top:0; bottom:0; width:50%;
  background:linear-gradient(225deg, #D4F0E8 0%, #C8EDE0 60%, #D0EEE8 100%);
  z-index:0;
}
.bg-slash {
  position:absolute; top:0; bottom:0;
  left:calc(50% - 2px); width:4px;
  background:linear-gradient(to bottom, #00C8A0, #0098B8, #00C8A0);
  z-index:1; opacity:0.6;
}
```

### Pattern: Top Hero + Bottom Grid (Content Slide)

```
┌──────────────────────────────────────────┐
│                                          │
│          SECTION HEADING                 │
│     A supporting paragraph of text       │
│                                          │
│  ┌──────┐  ┌──────┐  ┌──────┐           │
│  │Card 1│  │Card 2│  │Card 3│           │
│  │      │  │      │  │      │           │
│  └──────┘  └──────┘  └──────┘           │
│                                          │
└──────────────────────────────────────────┘
```

### Pattern: Two-Column Comparison

```
┌──────────────────────────────────────────┐
│            COMPARISON HEADING            │
│                                          │
│   ┌──────────┐  │  ┌──────────┐         │
│   │  Option A │  │  │  Option B│         │
│   │  ● Point  │  │  │  ● Point │         │
│   │  ● Point  │  │  │  ● Point │         │
│   │  ● Point  │  │  │  ● Point │         │
│   └──────────┘  │  └──────────┘         │
│                                          │
└──────────────────────────────────────────┘
```

### Pattern: Metrics Dashboard

```
┌──────────────────────────────────────────┐
│            KEY METRICS                   │
│                                          │
│  ┌────────┐ ┌────────┐ ┌────────┐       │
│  │  $4.2M │ │  125K  │ │  99.9% │       │
│  │Revenue │ │ Users  │ │Uptime  │       │
│  │ ↑ 18%  │ │ ↑ 42%  │ │ ↑ 0.2% │       │
│  └────────┘ └────────┘ └────────┘       │
│                                          │
│  ━━━━━━━━━━━━━━━━━━━━ 78% Progress      │
│                                          │
└──────────────────────────────────────────┘
```

### Pattern: Timeline Rail

```
┌──────────────────────────────────────────┐
│              ROADMAP                     │
│                                          │
│   ●──────●──────●──────●──────●         │
│   Q1     Q2     Q3     Q4    Q1'        │
│  Launch  Beta  Scale  Expand  IPO       │
│                                          │
└──────────────────────────────────────────┘
```

### Pattern: Quote / Testimonial

```
┌──────────────────────────────────────────┐
│                                          │
│                  "                        │
│     "The best investment we ever         │
│      made in infrastructure."            │
│                                          │
│         — Jane Doe, CEO, Acme Corp       │
│                                          │
└──────────────────────────────────────────┘
```

---

## Part 7: Component Recipes

### Pill Badges / Tags

```html
<div class="pillars" style="display:flex; gap:clamp(12px,1.5vw,22px); align-items:center;">
  <div class="pillar" style="display:flex; align-items:center; gap:8px;
       padding:clamp(5px,0.6vh,9px) clamp(12px,1.3vw,18px);
       border-radius:30px; font-size:clamp(10px,1vw,13.5px);
       font-weight:700; letter-spacing:0.5px;
       background:rgba(0,140,184,0.12); border:1.5px solid rgba(0,152,184,0.5); color:#004870;">
    <div style="width:8px; height:8px; border-radius:50%; background:#0098B8;
         animation:dotPulse 2s ease-in-out infinite;"></div>
    Water Infrastructure Finance
  </div>
  <div style="font-size:clamp(14px,1.5vw,20px); color:#2A7888; font-weight:300;">+</div>
  <div class="pillar" style="display:flex; align-items:center; gap:8px;
       padding:clamp(5px,0.6vh,9px) clamp(12px,1.3vw,18px);
       border-radius:30px; font-size:clamp(10px,1vw,13.5px);
       font-weight:700; letter-spacing:0.5px;
       background:rgba(0,160,100,0.12); border:1.5px solid rgba(0,168,120,0.5); color:#003A28;">
    <div style="width:8px; height:8px; border-radius:50%; background:#00A868;
         animation:dotPulse 2s ease-in-out infinite 0.4s;"></div>
    AI Data Centre Advisory
  </div>
</div>
```

### Divider Row with Tagline

```html
<div style="display:flex; align-items:center;
            gap:clamp(10px,1.2vw,18px); width:80%;">
  <div style="flex:1; height:1px;
       background:linear-gradient(to right, transparent, #0098B8, transparent);
       opacity:0.4;"></div>
  <div style="font-size:clamp(10px,1vw,13.5px);
       color:#2A7888; font-weight:400;
       letter-spacing:2px; text-transform:uppercase;
       white-space:nowrap; font-style:italic;">
    The Future of Urban Capital
  </div>
  <div style="flex:1; height:1px;
       background:linear-gradient(to right, transparent, #0098B8, transparent);
       opacity:0.4;"></div>
</div>
```

### Animated Footer Dots

```html
<div style="position:absolute; bottom:clamp(10px,1.5vh,16px);
            right:clamp(18px,2.2vw,28px); display:flex; gap:6px; z-index:10;">
  <div style="width:clamp(6px,0.6vw,9px); height:clamp(6px,0.6vw,9px);
       border-radius:50%; background:#00C8E8;"></div>
  <div style="width:clamp(6px,0.6vw,9px); height:clamp(6px,0.6vw,9px);
       border-radius:50%; background:#00D898;"></div>
  <div style="width:clamp(6px,0.6vw,9px); height:clamp(6px,0.6vw,9px);
       border-radius:50%; background:#00C8A0;"></div>
</div>
```

### Metric Card

```html
<div style="background:rgba(0,0,0,0.03); border:1.5px solid rgba(0,150,180,0.2);
            border-radius:12px; padding:clamp(12px,1.5vh,20px) clamp(16px,1.5vw,24px);
            text-align:center; min-width:clamp(100px,12vw,160px);">
  <div style="font-family:'Barlow Condensed',sans-serif;
              font-size:clamp(28px,4vw,56px); font-weight:900;
              color:#0090B8; line-height:1;">$4.2M</div>
  <div style="font-size:clamp(10px,0.9vw,13px);
              color:#4A7888; margin-top:4px;">Revenue</div>
  <div style="font-size:clamp(9px,0.8vw,11px);
              color:#00A868; font-weight:600;">↑ 18% YoY</div>
</div>
```

### Progress Bar

```html
<div style="width:100%; height:clamp(6px,0.8vh,10px);
            background:rgba(0,0,0,0.06); border-radius:5px; overflow:hidden;">
  <div style="width:78%; height:100%; border-radius:5px;
       background:linear-gradient(90deg, #0090B8, #00C8A0);"></div>
</div>
<div style="font-size:clamp(9px,0.8vw,11px); color:#4A7888; margin-top:4px;">
  78% Complete
</div>
```

### Timeline Node

```html
<svg width="100%" height="80" viewBox="0 0 900 80" preserveAspectRatio="xMidYMid meet">
  <!-- Rail line -->
  <line x1="50" y1="40" x2="850" y2="40" stroke="#C0DCE8" stroke-width="2"/>

  <!-- Nodes -->
  <circle cx="50"  cy="40" r="10" fill="#0090B8" stroke="#EAF6FA" stroke-width="3"/>
  <circle cx="250" cy="40" r="10" fill="#0090B8" stroke="#EAF6FA" stroke-width="3"/>
  <circle cx="450" cy="40" r="10" fill="#00C8A0" stroke="#EAF6FA" stroke-width="3"/>
  <!-- Active node with pulse -->
  <circle cx="450" cy="40" r="10" fill="none" stroke="#00C8A0" stroke-width="1.5"
          style="animation:rippleOut 2s ease-out infinite;"/>

  <!-- Labels -->
  <text x="50"  y="16" text-anchor="middle" font-size="11" fill="#2A6878" font-weight="600">Q1 2026</text>
  <text x="50"  y="68" text-anchor="middle" font-size="10" fill="#4A7888">Launch</text>
  <text x="250" y="16" text-anchor="middle" font-size="11" fill="#2A6878" font-weight="600">Q2 2026</text>
  <text x="250" y="68" text-anchor="middle" font-size="10" fill="#4A7888">Scale</text>
  <text x="450" y="16" text-anchor="middle" font-size="11" fill="#2A6878" font-weight="600">Q3 2026</text>
  <text x="450" y="68" text-anchor="middle" font-size="10" fill="#4A7888">Expand</text>
</svg>
```

### Quote Block

```html
<div style="text-align:center; max-width:75%; margin:0 auto;">
  <div style="font-size:clamp(40px,5vw,72px); color:#C0DCE8; line-height:0.8;
       font-family:Georgia,serif;">"</div>
  <div style="font-size:clamp(16px,2vw,28px); font-weight:300;
       font-style:italic; color:#1A3848; line-height:1.4; margin-top:-10px;">
    The best investment we ever made in infrastructure.
  </div>
  <div style="font-size:clamp(10px,1vw,14px); color:#4A7888;
       margin-top:clamp(8px,1vh,16px); letter-spacing:1px;">
    — Jane Doe, CEO, Acme Corp
  </div>
</div>
```

---

## Appendix: Common SVG Icon Paths

Simplified SVG icon paths the agent can use as illustration building blocks.
All paths fit a ~100x100 coordinate space. Scale via the parent `<g>` transform.

### Water Drop
```
M50,10 Q72,35 78,55 Q85,80 50,92 Q15,80 22,55 Q28,35 50,10 Z
```

### Server / Rack Unit
```
<rect x="10" y="Y" width="80" height="16" rx="3"/>  (repeat at Y=10,30,50,70)
<circle cx="22" cy="Y+8" r="3"/>  (LED per row)
<line x1="34" y1="Y+8" x2="82" y2="Y+8"/>  (data line per row)
```

### Gear / Cog
```
M50,15 L55,25 L65,22 L62,32 L72,35 L65,42 L70,52 L60,50 L55,60 L50,50
L45,60 L40,50 L30,52 L35,42 L28,35 L38,32 L35,22 L45,25 Z
```

### Shield
```
M50,10 L80,25 L80,55 Q80,80 50,95 Q20,80 20,55 L20,25 Z
```

### Globe / World
```
<circle cx="50" cy="50" r="38" fill="none" stroke="..." stroke-width="2"/>
<ellipse cx="50" cy="50" rx="20" ry="38" fill="none" stroke="..." stroke-width="1"/>
<line x1="12" y1="50" x2="88" y2="50" stroke="..." stroke-width="1"/>
```

### Bar Chart
```
<rect x="15" y="50" width="15" height="40" rx="2"/>
<rect x="35" y="30" width="15" height="60" rx="2"/>
<rect x="55" y="15" width="15" height="75" rx="2"/>
<rect x="75" y="40" width="15" height="50" rx="2"/>
```

### Lightning Bolt
```
M55,10 L30,50 L48,50 L42,90 L70,45 L52,45 Z
```

### Leaf / Eco
```
M50,90 Q30,70 20,50 Q10,25 40,15 Q55,10 65,20 Q80,35 75,55 Q70,75 50,90 Z
```

### Cloud
```
M25,65 Q10,65 10,52 Q10,40 22,38 Q20,22 38,20 Q52,18 58,30 Q62,20 75,25
Q88,30 88,45 Q88,58 78,62 Q80,65 75,65 Z
```

### Arrow Right (Simple)
```
M15,50 L70,50 M55,30 L75,50 L55,70
```

---

## How to Use This Document

### Minimal Setup (Paste These to Any Agent)

1. Your filled-in prompt from `prompts/standalone-slide-prompt.md`
2. **Part 1** (Architecture) — so the agent knows the file skeleton
3. **Part 2** (Responsive Sizing) — so everything scales correctly
4. **Part 3** (Animations) — the @keyframes recipes

### Full Setup (Best Results)

Paste all 7 parts. The agent will have complete knowledge to:
- Build any layout pattern from Part 6
- Construct custom SVG illustrations from Part 4 atomic elements
- Choose fonts and colors that work together from Part 5
- Assemble components from Part 7 recipes
- Ensure responsive scaling from Part 2
- Animate everything from Part 3
