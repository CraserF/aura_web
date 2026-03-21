# Advanced Workflows

> In-depth step-by-step guides for complex presentation scenarios.
> Goes beyond the basic 8 skills in `slide-generation.md`.

---

## Table of Contents

1. [Multi-Deck Management](#1-multi-deck-management)
2. [Progressive Disclosure Patterns](#2-progressive-disclosure-patterns)
3. [Data-Driven Slide Generation](#3-data-driven-slide-generation)
4. [Complex Animation Sequencing](#4-complex-animation-sequencing)
5. [Accessible Presentation Workflow](#5-accessible-presentation-workflow)
6. [Export & PDF Workflow](#6-export--pdf-workflow)
7. [Audience-Adaptive Design](#7-audience-adaptive-design)
8. [Live Demo Integration](#8-live-demo-integration)
9. [Multi-Language / i18n Presentations](#9-multi-language--i18n-presentations)
10. [Brand System Workflow](#10-brand-system-workflow)
11. [Component Composition Recipes](#11-component-composition-recipes)

---

## 1. Multi-Deck Management

When a presentation exceeds 20 slides, split into logical decks.

### Structure
```
project/
  deck-intro.html        ← Overview (5-8 slides)
  deck-technical.html    ← Deep-dive (10-15 slides)
  deck-demo.html         ← Live demo (5 slides)
  deck-appendix.html     ← Backup slides
  shared/
    brand.css            ← Shared styles
    custom-plugins.js    ← Shared plugins
```

### Shared Brand CSS
Create one CSS file imported by all decks:
```css
/* shared/brand.css */
:root {
  --primary: #6366f1;
  --accent: #f59e0b;
  --bg-dark: #0a0a1a;
  --heading-font: 'Space Grotesk', sans-serif;
  --body-font: 'Inter', sans-serif;
}
.reveal { font-family: var(--body-font); color: rgba(255,255,255,0.85); }
.reveal h1, .reveal h2, .reveal h3 { font-family: var(--heading-font); }
```

### Navigation Between Decks
Add links on the final slide of each deck:
```html
<section>
  <h2>Continue to…</h2>
  <div style="display:flex; gap:1rem; justify-content:center; margin-top:1em;">
    <a href="deck-technical.html" style="background:var(--primary); color:#fff; padding:0.7em 1.5em; border-radius:8px; text-decoration:none;">Technical Deep-Dive →</a>
    <a href="deck-appendix.html" style="border:1px solid var(--primary); color:var(--primary); padding:0.7em 1.5em; border-radius:8px; text-decoration:none;">Appendix</a>
  </div>
</section>
```

---

## 2. Progressive Disclosure Patterns

Reveal information in layers to manage cognitive load.

### Pattern A: Fragment Waterfall
Show a heading, then subpoints one at a time:
```html
<section>
  <h2>Three Pillars</h2>
  <div class="fragment fade-in" data-fragment-index="1">
    <h3 style="color:var(--primary);">1. Speed</h3>
    <p style="font-size:0.7em;">Sub-millisecond response times</p>
  </div>
  <div class="fragment fade-in" data-fragment-index="2">
    <h3 style="color:var(--primary);">2. Scale</h3>
    <p style="font-size:0.7em;">10M concurrent connections</p>
  </div>
  <div class="fragment fade-in" data-fragment-index="3">
    <h3 style="color:var(--primary);">3. Security</h3>
    <p style="font-size:0.7em;">Zero-trust architecture</p>
  </div>
</section>
```

### Pattern B: Replace-and-Reveal
Show content then replace it with updated version:
```html
<section>
  <h2>Evolution</h2>
  <div class="fragment fade-out" data-fragment-index="1">
    <p>Version 1: Basic CRUD</p>
  </div>
  <div class="fragment fade-in" data-fragment-index="1">
    <p style="color:var(--primary);">Version 2: Event-Driven Architecture</p>
  </div>
</section>
```

### Pattern C: Highlight-Then-Expand
Show all items dimmed, highlight each in turn:
```html
<section>
  <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:1rem;">
    <div class="fragment highlight-current-blue" data-fragment-index="1">
      <h4>Module A</h4><p style="font-size:0.7em;">Auth service</p>
    </div>
    <div class="fragment highlight-current-blue" data-fragment-index="2">
      <h4>Module B</h4><p style="font-size:0.7em;">Data pipeline</p>
    </div>
    <div class="fragment highlight-current-blue" data-fragment-index="3">
      <h4>Module C</h4><p style="font-size:0.7em;">API gateway</p>
    </div>
  </div>
</section>
```

### Pattern D: Nested Vertical Slides
Use vertical stacks for drill-down:
```html
<section>
  <!-- Top-level overview slide -->
  <section>
    <h2>Architecture Overview</h2>
    <p>Swipe down for details on each layer ↓</p>
  </section>
  <!-- Drill-down slides -->
  <section><h3>Frontend Layer</h3><p>React + Next.js</p></section>
  <section><h3>API Layer</h3><p>GraphQL Federation</p></section>
  <section><h3>Data Layer</h3><p>PostgreSQL + Redis</p></section>
</section>
```

---

## 3. Data-Driven Slide Generation

When generating slides from data (JSON, CSV, API responses).

### Step 1: Define the Data Shape
```json
{
  "metrics": [
    { "label": "Revenue", "value": "$4.2M", "change": "+24%", "positive": true },
    { "label": "Users", "value": "125K", "change": "+18%", "positive": true },
    { "label": "Churn", "value": "2.1%", "change": "-0.3%", "positive": true }
  ]
}
```

### Step 2: Map to Component
For each item in the `metrics` array, emit a Metric Card from `reference/components.md`:
```
For each metric:
  → Use "Metric Row" component
  → Set the number as {{value}}
  → Set label as {{label}}
  → Set change color: green if positive, red if negative
```

### Step 3: Generate the Slide
```html
<section>
  <h2>Key Metrics — Q4 2024</h2>
  <div class="anim-stagger" style="display:grid; grid-template-columns:repeat(3,1fr); gap:1rem;">
    <!-- Generated from data -->
    <div class="anim-fade-in-up" style="text-align:center; background:rgba(255,255,255,0.05); border-radius:10px; padding:1.2rem;">
      <div style="font-size:2.2em; font-weight:700; color:var(--primary);">$4.2M</div>
      <div style="font-size:0.65em; color:rgba(255,255,255,0.5);">Revenue</div>
      <div style="font-size:0.6em; color:#4ade80;">+24%</div>
    </div>
    <!-- ... repeat per item -->
  </div>
</section>
```

### Step 4: Validate
- Check that the grid column count matches the item count (3 items → 3 columns; 4+ → 2 columns per row)
- Verify all `{{placeholders}}` are replaced
- Test that animations fire correctly with `anim-stagger`

---

## 4. Complex Animation Sequencing

Orchestrate multi-element choreography.

### Sequence Recipe: "The Build-Up"
Elements enter one at a time, building to a complete picture.

```html
<section>
  <!-- Step 1: Title enters -->
  <h2 class="anim-fade-in-up">Our Platform</h2>

  <!-- Step 2: Diagram layers appear (staggered) -->
  <div class="anim-stagger" style="display:flex; flex-direction:column; gap:0.5rem; max-width:400px; margin:1em auto 0;">
    <div class="anim-fade-in-up" style="background:rgba(99,102,241,0.15); border-radius:8px; padding:0.6em; text-align:center; font-size:0.75em;">Frontend</div>
    <div class="anim-fade-in-up" style="background:rgba(59,130,246,0.15); border-radius:8px; padding:0.6em; text-align:center; font-size:0.75em;">API Gateway</div>
    <div class="anim-fade-in-up" style="background:rgba(16,185,129,0.15); border-radius:8px; padding:0.6em; text-align:center; font-size:0.75em;">Microservices</div>
    <div class="anim-fade-in-up" style="background:rgba(245,158,11,0.15); border-radius:8px; padding:0.6em; text-align:center; font-size:0.75em;">Database</div>
  </div>

  <!-- Step 3: After all layers, a summary fades in (fragment) -->
  <p class="fragment fade-in" style="font-size:0.8em; color:rgba(255,255,255,0.6); margin-top:1em;">
    4 layers, each independently scalable
  </p>
</section>
```

### Sequence Recipe: "Spotlight Walk"
Highlight each item in turn while dimming others.

Use `data-fragment-index` with matched `fade-out` / `fade-in`:
```html
<section>
  <h2>Key Features</h2>
  <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:1rem;">
    <div id="f1" style="transition:opacity 0.5s;">
      <h4 style="color:var(--primary);">Speed</h4>
      <p style="font-size:0.7em;">Blazing fast.</p>
    </div>
    <div id="f2" style="opacity:0.3; transition:opacity 0.5s;">
      <h4>Scale</h4>
      <p style="font-size:0.7em;">Infinite scale.</p>
    </div>
    <div id="f3" style="opacity:0.3; transition:opacity 0.5s;">
      <h4>Security</h4>
      <p style="font-size:0.7em;">Zero-trust.</p>
    </div>
  </div>
</section>
```

Advance the spotlight via fragments or the Animation Engine plugin's auto-stagger.

### Timing Guide
| Effect | Recommended Duration | Delay Between |
|---|---|---|
| Fade-in text | 400-600ms | 100-200ms |
| Card entrance | 500-800ms | 150ms stagger |
| Background transition | 800-1200ms | — |
| Number counter | 1500-2500ms | — |
| Diagram build | 300-500ms per layer | 200ms |

---

## 5. Accessible Presentation Workflow

Ensure slides are usable with assistive technology.

### Checklist
1. **Color contrast**: Minimum 4.5:1 for body text, 3:1 for large text (>18px bold)
2. **Alt text**: Every `<img>` gets meaningful `alt=""`
3. **Semantic headings**: Use `<h1>` → `<h2>` → `<h3>` hierarchy per slide
4. **Focus visible**: Don't hide `:focus` outlines
5. **Reduced motion**: Already handled by `core-animations.css` via `prefers-reduced-motion`
6. **aria-hidden**: Decorative elements (scene backgrounds, particles) get `aria-hidden="true"`
7. **Language**: Set `<html lang="en">` (or appropriate language)

### Reduced Motion Implementation
Already built into the CSS libraries:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Screen Reader Testing
- Use Reveal.js keyboard navigation (arrow keys, Esc for overview)
- Test with NVDA (Windows) or VoiceOver (Mac)
- Add `role="img" aria-label="..."` to complex CSS-only visuals

### Accessible Color Palette
| Pair | Foreground | Background | Ratio |
|---|---|---|---|
| Primary on dark | `#818cf8` | `#0a0a1a` | 7.2:1 ✅ |
| Green on dark | `#4ade80` | `#0a0a1a` | 8.1:1 ✅ |
| Yellow on dark | `#fbbf24` | `#0a0a1a` | 10.4:1 ✅ |
| Red on dark | `#f87171` | `#0a0a1a` | 5.8:1 ✅ |
| White on dark | `#e2e8f0` | `#0a0a1a` | 15.1:1 ✅ |

---

## 6. Export & PDF Workflow

### Built-in Print Stylesheet
Reveal.js has PDF export via the print query:
```
your-presentation.html?print-pdf
```

Open that URL in Chrome, then **Print → Save as PDF** with:
- Layout: **Landscape**
- Margins: **None**
- Background graphics: **Enabled** ✅

### Tips for Clean PDFs
1. Avoid pure CSS animations in print (they freeze at frame 0)
2. Scene backgrounds won't render — use `data-background-color` as fallback
3. Three.js canvases won't export — provide a static fallback image:
   ```html
   <section data-three-bg="particles" data-background-color="#0a0a1a">
   ```
4. Fragments are shown all-at-once in print mode
5. Speaker notes are excluded from PDF (use `?print-pdf&showNotes=separate-page` to include them)

### Decktape (Headless Export)
For automation:
```bash
npx decktape reveal your-presentation.html output.pdf
```

### Screenshot Export (for thumbnails / social)
```bash
npx decktape reveal --screenshots --screenshots-directory ./thumbs your-presentation.html output.pdf
```

---

## 7. Audience-Adaptive Design

Tailor the same content for different audiences.

### Strategy: CSS Custom Property Swap
Define audience themes:
```css
/* Executive audience */
.audience-exec {
  --primary: #6366f1;
  --animation-level: 2;  /* subtle */
  font-size: 1.1em;       /* larger text, fewer details */
}

/* Technical audience */
.audience-tech {
  --primary: #22d3ee;
  --animation-level: 3;  /* moderate */
  font-size: 0.9em;       /* denser information */
}
```

Apply by adding the class to `.reveal`:
```html
<div class="reveal audience-exec">
```

### Strategy: Conditional Slide Visibility
Use `data-visibility="uncounted"` for slides only shown to specific audiences:
```html
<!-- Only show in technical version -->
<section data-visibility="uncounted" class="tech-only">
  <h2>API Documentation Details</h2>
  ...
</section>
```

Then hide/show via CSS:
```css
.audience-exec .tech-only { display: none; }
```

### Strategy: Speaker Notes as Talking Points
Put audience-specific talking points in notes:
```html
<section>
  <h2>Security Model</h2>
  <aside class="notes">
    EXEC: Focus on compliance certifications (SOC2, ISO27001).
    TECH: Discuss mTLS, RBAC policies, encryption at rest.
  </aside>
</section>
```

---

## 8. Live Demo Integration

Embed live content in presentation slides.

### Iframe Embed
```html
<section data-background-iframe="https://your-app.example.com/demo" data-background-interactive>
  <div style="position:absolute; bottom:1em; left:1em; background:rgba(0,0,0,0.7); padding:0.5em 1em; border-radius:8px; font-size:0.6em;">
    Live Demo — interact directly ↗
  </div>
</section>
```

### Code + Preview Split
```html
<section>
  <h3>Live Preview</h3>
  <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; height:60vh;">
    <div style="background:#1a1a2e; border-radius:8px; overflow:auto; text-align:left;">
      <pre><code class="language-html" data-trim>
&lt;button class="btn"&gt;Click Me&lt;/button&gt;
      </code></pre>
    </div>
    <iframe src="demo-preview.html" style="border:1px solid rgba(255,255,255,0.1); border-radius:8px; width:100%; height:100%;"></iframe>
  </div>
</section>
```

### Terminal Recording (asciinema)
```html
<section>
  <h3>Terminal Demo</h3>
  <!-- Use an actual asciinema player or a styled pre block -->
  <div style="background:#000; border-radius:10px; max-width:700px; margin:0 auto; text-align:left;">
    <div id="terminal-player" style="padding:1em;"></div>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/asciinema-player@3/dist/bundle/asciinema-player.min.js"></script>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/asciinema-player@3/dist/bundle/asciinema-player.min.css">
  <script>
    AsciinemaPlayer.create('demo.cast', document.getElementById('terminal-player'), {
      theme: 'monokai', cols: 80, rows: 24, autoPlay: true
    });
  </script>
</section>
```

---

## 9. Multi-Language / i18n Presentations

### File Naming Convention
```
presentation-en.html
presentation-fr.html
presentation-ja.html
```

### Shared Structure
Keep the same slide structure; only change text content. Use `{{PLACEHOLDER}}` pattern:
```html
<section>
  <h2>{{SLIDE_TITLE}}</h2>
  <p>{{SLIDE_BODY}}</p>
</section>
```

### Language Toggle (runtime)
```html
<script>
  const translations = {
    en: { title: 'Welcome', subtitle: 'A modern platform' },
    fr: { title: 'Bienvenue', subtitle: 'Une plateforme moderne' },
  };
  function setLang(lang) {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = translations[lang][el.dataset.i18n] || el.textContent;
    });
  }
</script>

<!-- Usage -->
<h2 data-i18n="title">Welcome</h2>
<p data-i18n="subtitle">A modern platform</p>
```

### Font Considerations
- **CJK (Chinese, Japanese, Korean)**: Use `Noto Sans CJK` — covers all three
- **Arabic / Hebrew (RTL)**: Set `dir="rtl"` on `<section>` and use `Noto Sans Arabic`
- **Devanagari**: Use `Noto Sans Devanagari`

---

## 10. Brand System Workflow

When applying a company's brand to a presentation.

### Step 1: Gather Brand Assets
Collect:
- Primary color (hex)
- Secondary / accent color
- Logo SVG (light and dark versions)
- Brand fonts (or closest Google Font match)
- Approved imagery style

### Step 2: Create Brand CSS
```css
:root {
  --primary: #BRAND_PRIMARY;
  --accent: #BRAND_ACCENT;
  --bg-dark: #BRAND_BG;
  --text-primary: #BRAND_TEXT;
  --heading-font: 'BRAND_HEADING_FONT', sans-serif;
  --body-font: 'BRAND_BODY_FONT', sans-serif;
}
```

### Step 3: Apply to Template
1. Pick the closest template from `TEMPLATE-SELECTOR.md`
2. Replace CSS custom properties
3. Replace `{{LOGO}}` placeholder with brand logo
4. Adjust animation level to match brand energy:
   - Conservative brands → Level 1-2
   - Tech / startup brands → Level 3
   - Creative / entertainment → Level 4

### Step 4: Verify
- Logo renders at correct size (max-height: 40-60px for header logos)
- Colors meet WCAG contrast ratios
- Fonts load correctly via Google Fonts or self-hosted
- No animation conflicts with brand guidelines

---

## 11. Component Composition Recipes

How to combine components from `reference/components.md` into complete slides.

### Recipe: "Investor Metrics Slide"
Combines: Metric Row + Progress Bar + Callout Box
```html
<section>
  <h2 class="anim-fade-in-up">Traction Metrics</h2>

  <!-- Metric Row (from components.md §2) -->
  <div class="anim-stagger" style="display:grid; grid-template-columns:repeat(3,1fr); gap:1rem; margin:1em 0;">
    <div class="anim-fade-in-up" style="text-align:center; background:rgba(255,255,255,0.05); border-radius:10px; padding:1rem;">
      <div style="font-size:2em; font-weight:700; color:var(--primary);">$2.4M</div>
      <div style="font-size:0.6em; color:rgba(255,255,255,0.5);">ARR</div>
    </div>
    <div class="anim-fade-in-up" style="text-align:center; background:rgba(255,255,255,0.05); border-radius:10px; padding:1rem;">
      <div style="font-size:2em; font-weight:700; color:var(--primary);">47K</div>
      <div style="font-size:0.6em; color:rgba(255,255,255,0.5);">MAU</div>
    </div>
    <div class="anim-fade-in-up" style="text-align:center; background:rgba(255,255,255,0.05); border-radius:10px; padding:1rem;">
      <div style="font-size:2em; font-weight:700; color:var(--primary);">142%</div>
      <div style="font-size:0.6em; color:rgba(255,255,255,0.5);">NRR</div>
    </div>
  </div>

  <!-- Progress Bar (from components.md §2) -->
  <div class="fragment fade-in" style="max-width:500px; margin:0 auto;">
    <div style="display:flex; justify-content:space-between; font-size:0.65em; margin-bottom:0.2em;">
      <span>Runway</span><span style="color:var(--primary);">18 months</span>
    </div>
    <div style="background:rgba(255,255,255,0.1); border-radius:100px; height:8px; overflow:hidden;">
      <div class="progress-bar-animated"><div class="fill" style="--target-width:65%; height:100%; border-radius:100px; background:var(--primary);"></div></div>
    </div>
  </div>
</section>
```

### Recipe: "Feature Announcement Slide"
Combines: Icon Card Grid + CTA
```html
<section>
  <h2 class="anim-fade-in-up" style="font-size:2em;">What's New in v3.0</h2>

  <!-- Icon Card Grid (from components.md §1) -->
  <div class="anim-stagger" style="display:grid; grid-template-columns:repeat(3,1fr); gap:1.2rem; margin:1.5em 0;">
    <div class="anim-fade-in-up" style="background:rgba(255,255,255,0.05); border-radius:12px; padding:1.2rem; text-align:center;">
      <div style="font-size:2em;">⚡</div>
      <h4 style="margin:0.3em 0;">3x Faster</h4>
      <p style="font-size:0.65em; color:rgba(255,255,255,0.5); margin:0;">New Rust-based engine</p>
    </div>
    <div class="anim-fade-in-up" style="background:rgba(255,255,255,0.05); border-radius:12px; padding:1.2rem; text-align:center;">
      <div style="font-size:2em;">🔌</div>
      <h4 style="margin:0.3em 0;">Plugin API</h4>
      <p style="font-size:0.65em; color:rgba(255,255,255,0.5); margin:0;">Extend with custom logic</p>
    </div>
    <div class="anim-fade-in-up" style="background:rgba(255,255,255,0.05); border-radius:12px; padding:1.2rem; text-align:center;">
      <div style="font-size:2em;">🌍</div>
      <h4 style="margin:0.3em 0;">i18n Ready</h4>
      <p style="font-size:0.65em; color:rgba(255,255,255,0.5); margin:0;">30+ languages supported</p>
    </div>
  </div>

  <!-- Two-Button CTA (from components.md §10) -->
  <div class="fragment fade-in" style="display:flex; gap:1rem; justify-content:center;">
    <a href="#" style="display:inline-block; background:var(--primary); color:#fff; padding:0.6em 1.5em; border-radius:8px; text-decoration:none; font-weight:600; font-size:0.8em;">Upgrade Now</a>
    <a href="#" style="display:inline-block; border:1px solid var(--primary); color:var(--primary); padding:0.6em 1.5em; border-radius:8px; text-decoration:none; font-weight:600; font-size:0.8em;">Release Notes</a>
  </div>
</section>
```

### Recipe: "Problem → Solution Slide"
Combines: Two-Column Comparison + Quote
```html
<section>
  <h2 class="anim-fade-in-up">The Challenge</h2>

  <!-- Two-Column Comparison (from components.md §6) -->
  <div style="display:grid; grid-template-columns:1fr 1fr; gap:0; margin:1em 0;">
    <div class="fragment fade-in" style="background:rgba(239,68,68,0.08); border-radius:12px 0 0 12px; padding:1.5rem; text-align:left;">
      <h3 style="color:#ef4444; margin-top:0; font-size:1em;">The Problem</h3>
      <ul style="font-size:0.7em; color:rgba(255,255,255,0.6);">
        <li>Teams waste 40% of time on manual tasks</li>
        <li>Data silos prevent collaboration</li>
        <li>No real-time visibility</li>
      </ul>
    </div>
    <div class="fragment fade-in" style="background:rgba(34,197,94,0.08); border-radius:0 12px 12px 0; padding:1.5rem; text-align:left;">
      <h3 style="color:#22c55e; margin-top:0; font-size:1em;">Our Solution</h3>
      <ul style="font-size:0.7em; color:rgba(255,255,255,0.6);">
        <li>Automate 90% of repetitive workflows</li>
        <li>Single unified data layer</li>
        <li>Real-time dashboards for everyone</li>
      </ul>
    </div>
  </div>

  <!-- Pull Quote (from components.md §4) -->
  <blockquote class="fragment fade-in" style="border:none; font-size:0.85em; font-style:italic; max-width:600px; margin:1em auto 0; color:rgba(255,255,255,0.6);">
    "We reduced our operational overhead by 60% in the first quarter."
    <footer style="font-size:0.7em; font-style:normal; margin-top:0.3em;">— VP Ops, Fortune 500 Customer</footer>
  </blockquote>
</section>
```
