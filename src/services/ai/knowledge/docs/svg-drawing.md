# SVG Drawing & Animation Reference

Comprehensive reference for creating inline SVGs in presentation slides. Use this to build charts, diagrams, illustrations, and animated decorative elements.

---

## 1. When to Use SVGs

| Use Case | Approach | Notes |
|----------|----------|-------|
| Data visualization (charts, gauges) | Inline SVG | Perfect scaling, animatable |
| Diagrams (flowcharts, architecture) | Inline SVG | Arrow markers, nodes, connections |
| Icons (small, in cards/lists) | Bootstrap Icons CDN | Fast, consistent, `<i class="bi bi-name">` |
| Custom icons beyond standard sets | Inline SVG | Full control over shape and color |
| Decorative illustrations | Inline SVG | Scenes, abstract shapes, backgrounds |
| Simple shapes (dividers, dots) | CSS only | No SVG needed, use border-radius/gradients |
| Text-heavy minimal slides | Skip SVG | Keep clean, no visual clutter |
| Animation level 1 presentations | Skip SVG | Minimal design, no illustrations |

**Hard rules:**
- Include at least 2-4 SVG-rich slides per deck for visual impact
- Alternate SVG-heavy slides with simpler text/card slides for rhythm
- SVG colors must match the palette tokens

---

## 2. SVG Fundamentals

### 2.1 The SVG Element

Every inline SVG needs these attributes:
```html
<svg width="200" height="150" viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg">
  <!-- content -->
</svg>
```

- `width` / `height`: Display size in the HTML layout. Use px or leave unitless.
- `viewBox="minX minY width height"`: Internal coordinate system. All child elements use these coordinates.
- `xmlns`: Required for inline SVGs in HTML.

**Responsive SVGs:** Use `width="100%"` with a fixed `viewBox` to fill container width while maintaining aspect ratio.

**Full-slide background SVG:**
```html
<svg style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
```

### 2.2 Basic Shapes

**Rectangle:**
```svg
<rect x="10" y="10" width="100" height="60" rx="8" fill="#3b82f6" opacity="0.8"/>
```
- `rx`: Corner radius (rounded rectangles)
- `opacity`: 0-1 transparency

**Circle:**
```svg
<circle cx="50" cy="50" r="30" fill="none" stroke="#3b82f6" stroke-width="2"/>
```

**Ellipse:**
```svg
<ellipse cx="100" cy="50" rx="80" ry="40" fill="rgba(59,130,246,0.1)"/>
```

**Line:**
```svg
<line x1="10" y1="10" x2="200" y2="80" stroke="#3b82f6" stroke-width="1.5" stroke-linecap="round"/>
```

**Polyline (open path):**
```svg
<polyline points="10,80 50,20 90,60 130,10 170,50" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linejoin="round"/>
```

**Polygon (closed shape):**
```svg
<polygon points="100,10 150,80 50,80" fill="rgba(59,130,246,0.15)" stroke="#3b82f6" stroke-width="1.5"/>
```

### 2.3 Path Commands

The `<path>` element uses a `d` attribute with commands:

| Command | Meaning | Example |
|---------|---------|---------|
| `M x y` | Move to | `M 10 20` |
| `L x y` | Line to | `L 100 80` |
| `H x` | Horizontal line | `H 200` |
| `V y` | Vertical line | `V 150` |
| `C x1 y1 x2 y2 x y` | Cubic bezier | `C 20 0 80 100 100 50` |
| `Q x1 y1 x y` | Quadratic bezier | `Q 50 0 100 50` |
| `A rx ry rot large sweep x y` | Arc | `A 50 50 0 0 1 100 100` |
| `Z` | Close path | `Z` |

**Common path recipes:**

Wave line:
```svg
<path d="M0 50 Q25 20 50 50 Q75 80 100 50 Q125 20 150 50 Q175 80 200 50" fill="none" stroke="#3b82f6" stroke-width="2"/>
```

Rounded arrow:
```svg
<path d="M10 40 L70 40 L70 25 L100 50 L70 75 L70 60 L10 60 Z" fill="#3b82f6"/>
```

Speech bubble:
```svg
<path d="M20 10 H180 Q195 10 195 25 V75 Q195 90 180 90 H60 L40 110 L50 90 H20 Q5 90 5 75 V25 Q5 10 20 10 Z" fill="rgba(255,255,255,0.06)" stroke="#3b82f6" stroke-width="1"/>
```

### 2.4 Gradients

**Linear gradient:**
```svg
<defs>
  <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="#3b82f6"/>
    <stop offset="100%" stop-color="#8b5cf6"/>
  </linearGradient>
</defs>
<rect width="200" height="100" rx="10" fill="url(#grad1)"/>
```

**Radial gradient:**
```svg
<defs>
  <radialGradient id="glow" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.3"/>
    <stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/>
  </radialGradient>
</defs>
<circle cx="100" cy="100" r="80" fill="url(#glow)"/>
```

### 2.5 Patterns

**Dot grid pattern:**
```svg
<defs>
  <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
    <circle cx="10" cy="10" r="1.5" fill="rgba(255,255,255,0.08)"/>
  </pattern>
</defs>
<rect width="100%" height="100%" fill="url(#dots)"/>
```

**Diagonal lines:**
```svg
<defs>
  <pattern id="diag" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <line x1="0" y1="0" x2="0" y2="10" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
  </pattern>
</defs>
```

### 2.6 Text in SVG

```svg
<text x="100" y="50" text-anchor="middle" dominant-baseline="central"
      fill="#ffffff" font-family="Inter,sans-serif" font-size="14" font-weight="600">
  Label Text
</text>
```

- `text-anchor`: `start` | `middle` | `end` (horizontal alignment)
- `dominant-baseline`: `central` | `hanging` | `auto` (vertical alignment)
- Font sizing: 12-14px for labels, 8-10px for annotations, 16-20px for titles

**Multi-line text:**
```svg
<text x="100" y="40" text-anchor="middle" fill="#fff" font-size="14">
  <tspan x="100" dy="0">First Line</tspan>
  <tspan x="100" dy="18">Second Line</tspan>
</text>
```

### 2.7 Markers (Arrowheads)

```svg
<defs>
  <marker id="arrowhead" viewBox="0 0 10 7" refX="10" refY="3.5"
          markerWidth="8" markerHeight="8" orient="auto-start-reverse">
    <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6"/>
  </marker>
</defs>
<line x1="50" y1="50" x2="200" y2="50" stroke="#3b82f6" stroke-width="1.5" marker-end="url(#arrowhead)"/>
```

### 2.8 Groups and Transforms

```svg
<g transform="translate(100, 50)" opacity="0.8">
  <rect width="80" height="40" rx="6" fill="#3b82f6"/>
  <text x="40" y="25" text-anchor="middle" fill="#fff" font-size="12">Node</text>
</g>
```

- `translate(x, y)`: Move group
- `rotate(deg)` or `rotate(deg, cx, cy)`: Rotate around point
- `scale(sx, sy)`: Scale group

---

## 3. CSS Animation for SVGs

### 3.1 Stroke Draw-In Animation

The signature SVG animation. Draws a path as if being written:

```html
<style>
@keyframes drawPath {
  from { stroke-dashoffset: 300; }
  to { stroke-dashoffset: 0; }
}
</style>
<path d="M10 50 Q50 10 100 50 Q150 90 200 50"
      fill="none" stroke="#3b82f6" stroke-width="2"
      stroke-dasharray="300"
      style="animation: drawPath 2s ease forwards;"/>
```

**How it works:** `stroke-dasharray` sets the total dash length equal to the path length. `stroke-dashoffset` starts at that length (invisible) and animates to 0 (fully visible).

### 3.2 Transform Animations

```css
/* Pulse */
@keyframes svgPulse {
  0%, 100% { transform: scale(1); opacity: 0.7; }
  50% { transform: scale(1.1); opacity: 1; }
}

/* Float / Bob */
@keyframes svgFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

/* Spin */
@keyframes svgSpin {
  to { transform: rotate(360deg); }
}

/* Ripple */
@keyframes svgRipple {
  from { transform: scale(0.5); opacity: 0.6; }
  to { transform: scale(2); opacity: 0; }
}
```

**Important:** Set `transform-origin: center;` on SVG elements for rotation/scale.

### 3.3 Stagger Patterns

Apply increasing `animation-delay` for sequential reveals:
```html
<rect style="animation: fadeIn 0.5s ease forwards; animation-delay: 0s;"/>
<rect style="animation: fadeIn 0.5s ease forwards; animation-delay: 0.1s;"/>
<rect style="animation: fadeIn 0.5s ease forwards; animation-delay: 0.2s;"/>
```

### 3.4 Flowing Connection Lines

```css
@keyframes flowDash {
  to { stroke-dashoffset: -20; }
}
```
```svg
<line stroke-dasharray="8 4" style="animation: flowDash 1s linear infinite;"/>
```

### 3.5 Performance Rules

- Only animate `transform` and `opacity` — avoid animating `fill`, `stroke`, `r`, or path `d`
- Use `will-change: transform` on heavily animated elements
- Maximum 3-4 animated SVGs per slide
- Use `animation-play-state: paused` on non-visible slides
- Keep total SVG complexity under ~50 elements per illustration

---

## 4. Pre-Built SVG Library

The `templates/svg/` folder contains ready-to-use illustrations:

### People Avatars (30 files)
- Location: `templates/svg/People/`
- Style: Semi-realistic, flat-design human faces
- ViewBox: `0 0 366.34 366.34`, display at 800x800
- Features: Diverse skin tones, hairstyles, clothing, linear gradients for depth
- Use for: Team slides, persona cards, user testimonials, profile grids

### Animal Characters (17 files)
- Location: `templates/svg/characters/`
- Characters: crab, dinosaur, fox, hedgehog, lion, penguin, polar bear, rabbit, raccoon, shrimp, squirrel, cow, turtle, whale, wild boar, elk, cute-animals (composite)
- ViewBox: `0 0 1024 1024`, display at 800x800
- Style: Cute cartoon with consistent `#524F75` outlines, flat fills, no gradients
- Use for: Educational slides, storytelling, creative presentations, fun gamification

### How to Use

Embed as inline SVG in slide HTML. Scale with CSS width/height:
```html
<!-- In a team member card -->
<div style="width:80px; height:80px; border-radius:50%; overflow:hidden;">
  <svg viewBox="0 0 366.34 366.34" width="80" height="80">
    <!-- Paste avatar SVG content here -->
  </svg>
</div>
```

---

## 5. Common SVG Patterns for Slides

### 5.1 Metric Sparkline

```svg
<svg width="120" height="40" viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg">
  <polyline points="0,35 15,28 30,30 45,18 60,22 75,10 90,15 105,5 120,8"
            fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="120" cy="8" r="3" fill="#3b82f6"/>
</svg>
```

### 5.2 Status Indicator with Pulse

```svg
<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <circle cx="8" cy="8" r="4" fill="#22c55e"/>
  <circle cx="8" cy="8" r="6" fill="none" stroke="#22c55e" stroke-width="1" opacity="0.4"
          style="animation:svgPulse 2s ease-in-out infinite;transform-origin:center;"/>
</svg>
```

### 5.3 Layered Architecture Diagram

```svg
<svg viewBox="0 0 400 200" width="100%" xmlns="http://www.w3.org/2000/svg">
  <rect x="20" y="10" width="360" height="40" rx="8" fill="rgba(59,130,246,0.15)" stroke="#3b82f6" stroke-width="1"/>
  <text x="200" y="35" text-anchor="middle" fill="#fff" font-size="13" font-weight="600">Presentation Layer</text>
  <rect x="20" y="60" width="360" height="40" rx="8" fill="rgba(139,92,246,0.15)" stroke="#8b5cf6" stroke-width="1"/>
  <text x="200" y="85" text-anchor="middle" fill="#fff" font-size="13" font-weight="600">Business Logic</text>
  <rect x="20" y="110" width="360" height="40" rx="8" fill="rgba(34,197,94,0.15)" stroke="#22c55e" stroke-width="1"/>
  <text x="200" y="135" text-anchor="middle" fill="#fff" font-size="13" font-weight="600">Data Access Layer</text>
  <rect x="20" y="160" width="360" height="40" rx="8" fill="rgba(234,179,8,0.15)" stroke="#eab308" stroke-width="1"/>
  <text x="200" y="185" text-anchor="middle" fill="#fff" font-size="13" font-weight="600">Database</text>
</svg>
```

### 5.4 Hub-Spoke Diagram

```svg
<svg viewBox="0 0 300 300" width="250" height="250" xmlns="http://www.w3.org/2000/svg">
  <!-- Spokes -->
  <line x1="150" y1="150" x2="150" y2="30" stroke="#3b82f6" stroke-width="1" opacity="0.4"/>
  <line x1="150" y1="150" x2="264" y2="85" stroke="#3b82f6" stroke-width="1" opacity="0.4"/>
  <line x1="150" y1="150" x2="264" y2="215" stroke="#3b82f6" stroke-width="1" opacity="0.4"/>
  <line x1="150" y1="150" x2="150" y2="270" stroke="#3b82f6" stroke-width="1" opacity="0.4"/>
  <line x1="150" y1="150" x2="36" y2="215" stroke="#3b82f6" stroke-width="1" opacity="0.4"/>
  <line x1="150" y1="150" x2="36" y2="85" stroke="#3b82f6" stroke-width="1" opacity="0.4"/>
  <!-- Hub -->
  <circle cx="150" cy="150" r="35" fill="rgba(59,130,246,0.15)" stroke="#3b82f6" stroke-width="2"/>
  <text x="150" y="153" text-anchor="middle" fill="#fff" font-size="11" font-weight="600">Core</text>
  <!-- Satellite nodes -->
  <circle cx="150" cy="30" r="22" fill="rgba(59,130,246,0.08)" stroke="#3b82f6" stroke-width="1"/>
  <text x="150" y="33" text-anchor="middle" fill="#fff" font-size="9">API</text>
</svg>
```

### 5.5 Animated Scene Element (Floating Clouds)

```svg
<g style="animation: svgFloat 4s ease-in-out infinite;">
  <ellipse cx="80" cy="40" rx="30" ry="12" fill="rgba(255,255,255,0.06)"/>
  <ellipse cx="65" cy="38" rx="18" ry="10" fill="rgba(255,255,255,0.04)"/>
  <ellipse cx="95" cy="38" rx="20" ry="10" fill="rgba(255,255,255,0.04)"/>
</g>
```

---

## 6. Common Mistakes

| Mistake | Fix |
|---------|-----|
| Missing `viewBox` | SVG won't scale. Always include `viewBox="0 0 W H"` |
| Using `px` units inside SVG | Use unitless numbers. `width="100"` not `width="100px"` |
| Missing `xmlns` attribute | Add `xmlns="http://www.w3.org/2000/svg"` to the `<svg>` element |
| Animating too many elements | Keep to 3-4 animated elements per slide max |
| No `width`/`height` on outer SVG | SVG may render at 0x0 or fill entire viewport |
| Gradient IDs colliding across slides | Use unique IDs per slide: `grad-slide1`, `grad-slide2` |
| `transform-origin` not set for rotations | SVG elements default to top-left. Add `transform-origin:center;` |
| SVG fills not matching palette | Always use palette token colors, not hardcoded values |
| Overly complex SVGs (100+ elements) | Simplify. Wireframe style with minimal elements looks better in slides |
| Using SVGs on minimal/level-1 slides | Level 1 = no SVGs. Keep it text and cards only |
