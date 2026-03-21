# Reusable Slide Components

> Copy-paste HTML/CSS blocks for common slide elements.
> Every component works with `core-animations.css` and any template.
> Components are grouped by category. Each includes the HTML, required CSS (inline or via class), and animation suggestions.

---

## Table of Contents

1. [Cards & Tiles](#1-cards--tiles)
2. [Metrics & KPIs](#2-metrics--kpis)
3. [Lists & Bullets](#3-lists--bullets)
4. [Quotes & Testimonials](#4-quotes--testimonials)
5. [Timelines](#5-timelines)
6. [Comparison / Versus](#6-comparison--versus)
7. [Image Layouts](#7-image-layouts)
8. [Code Blocks](#8-code-blocks)
9. [Navigation & Progress](#9-navigation--progress)
10. [Call to Action](#10-call-to-action)
11. [Tables](#11-tables)
12. [Icon Grids & Feature Lists](#12-icon-grids--feature-lists)
13. [Diagrams & Flows](#13-diagrams--flows)
14. [Pricing Tables](#14-pricing-tables)
15. [Team / People](#15-team--people)
16. [Logos / Partner Grids](#16-logos--partner-grids)
17. [Alert & Callout Boxes](#17-alert--callout-boxes)

---

## 1. Cards & Tiles

### Basic Card
```html
<div style="background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:1.5rem; text-align:left;">
  <h3 style="margin-top:0; color:var(--primary);">Card Title</h3>
  <p style="font-size:0.8em; color:rgba(255,255,255,0.6); margin:0;">Card description goes here with supporting details.</p>
</div>
```

### Icon Card (with emoji or SVG icon)
```html
<div style="background:rgba(255,255,255,0.05); border-radius:12px; padding:1.5rem; text-align:center;">
  <div style="font-size:2em; margin-bottom:0.5em;">🚀</div>
  <h4 style="margin:0 0 0.3em;">Feature Name</h4>
  <p style="font-size:0.7em; color:rgba(255,255,255,0.6); margin:0;">Short description.</p>
</div>
```

### Card Grid (3 columns)
```html
<div class="anim-stagger" style="display:grid; grid-template-columns:repeat(3,1fr); gap:1.5rem; margin-top:1.5rem;">
  <div class="anim-fade-in-up" style="background:rgba(255,255,255,0.05); border-radius:12px; padding:1.5rem; text-align:center;">
    <div style="font-size:2em;">📊</div>
    <h4 style="margin:0.5em 0 0.3em;">Analytics</h4>
    <p style="font-size:0.7em; color:rgba(255,255,255,0.6); margin:0;">Real-time dashboards</p>
  </div>
  <div class="anim-fade-in-up" style="background:rgba(255,255,255,0.05); border-radius:12px; padding:1.5rem; text-align:center;">
    <div style="font-size:2em;">🔒</div>
    <h4 style="margin:0.5em 0 0.3em;">Security</h4>
    <p style="font-size:0.7em; color:rgba(255,255,255,0.6); margin:0;">Enterprise-grade protection</p>
  </div>
  <div class="anim-fade-in-up" style="background:rgba(255,255,255,0.05); border-radius:12px; padding:1.5rem; text-align:center;">
    <div style="font-size:2em;">⚡</div>
    <h4 style="margin:0.5em 0 0.3em;">Speed</h4>
    <p style="font-size:0.7em; color:rgba(255,255,255,0.6); margin:0;">Sub-millisecond latency</p>
  </div>
</div>
```

### Bordered Card (with neon border — requires `advanced-effects.css`)
```html
<div class="border-neon anim-fade-in-up" style="--neon-color:#00ff88; padding:1.5rem; text-align:center;">
  <h3 style="color:#00ff88; margin-top:0;">Highlighted Feature</h3>
  <p style="font-size:0.8em; color:rgba(255,255,255,0.6); margin:0;">This card grabs attention with an animated neon border.</p>
</div>
```

---

## 2. Metrics & KPIs

### Single Metric (large)
```html
<div style="text-align:center;">
  <div style="font-size:5em; font-weight:700; color:var(--primary); line-height:1;">42K</div>
  <div style="font-size:0.85em; color:rgba(255,255,255,0.6); margin-top:0.3em;">Active Users</div>
  <div style="font-size:0.75em; color:#4ade80;">↑ 18% MoM</div>
</div>
```

### Metric Row (4 across)
```html
<div class="anim-stagger" style="display:grid; grid-template-columns:repeat(4,1fr); gap:1rem;">
  <div class="anim-fade-in-up" style="text-align:center; background:rgba(255,255,255,0.05); border-radius:10px; padding:1.2rem;">
    <div style="font-size:2.2em; font-weight:700; color:var(--primary);">$4.2M</div>
    <div style="font-size:0.65em; color:rgba(255,255,255,0.5);">Revenue</div>
  </div>
  <div class="anim-fade-in-up" style="text-align:center; background:rgba(255,255,255,0.05); border-radius:10px; padding:1.2rem;">
    <div style="font-size:2.2em; font-weight:700; color:var(--primary);">125K</div>
    <div style="font-size:0.65em; color:rgba(255,255,255,0.5);">Users</div>
  </div>
  <div class="anim-fade-in-up" style="text-align:center; background:rgba(255,255,255,0.05); border-radius:10px; padding:1.2rem;">
    <div style="font-size:2.2em; font-weight:700; color:var(--primary);">99.9%</div>
    <div style="font-size:0.65em; color:rgba(255,255,255,0.5);">Uptime</div>
  </div>
  <div class="anim-fade-in-up" style="text-align:center; background:rgba(255,255,255,0.05); border-radius:10px; padding:1.2rem;">
    <div style="font-size:2.2em; font-weight:700; color:var(--primary);">72</div>
    <div style="font-size:0.65em; color:rgba(255,255,255,0.5);">NPS Score</div>
  </div>
</div>
```

### Progress Bar with Label
```html
<div style="max-width:600px; margin:0 auto; text-align:left;">
  <div style="display:flex; justify-content:space-between; font-size:0.75em; margin-bottom:0.3em;">
    <span>Project Alpha</span>
    <span style="color:var(--primary);">78%</span>
  </div>
  <div style="background:rgba(255,255,255,0.1); border-radius:100px; height:10px; overflow:hidden;">
    <div class="progress-bar-animated">
      <div class="fill" style="--target-width:78%; height:100%; border-radius:100px; background:var(--primary);"></div>
    </div>
  </div>
</div>
```

### Gauge / Donut (CSS only)
```html
<div style="width:150px; height:150px; border-radius:50%; background:conic-gradient(var(--primary) 0% 73%, rgba(255,255,255,0.1) 73% 100%); display:flex; align-items:center; justify-content:center; margin:0 auto;">
  <div style="width:110px; height:110px; border-radius:50%; background:var(--bg-dark,#0a0a1a); display:flex; align-items:center; justify-content:center;">
    <span style="font-size:1.8em; font-weight:700;">73%</span>
  </div>
</div>
```

---

## 3. Lists & Bullets

### Animated Fragment List
```html
<ul style="list-style:none; padding:0; text-align:left; max-width:600px; margin:0 auto;">
  <li class="fragment scale-up" style="padding:0.5em 0; border-bottom:1px solid rgba(255,255,255,0.06);">
    <strong style="color:var(--primary);">Point One</strong> — Supporting detail here
  </li>
  <li class="fragment scale-up" style="padding:0.5em 0; border-bottom:1px solid rgba(255,255,255,0.06);">
    <strong style="color:var(--primary);">Point Two</strong> — Supporting detail here
  </li>
  <li class="fragment scale-up" style="padding:0.5em 0;">
    <strong style="color:var(--primary);">Point Three</strong> — Supporting detail here
  </li>
</ul>
```

### Numbered Steps
```html
<div class="anim-stagger" style="display:flex; gap:1.5rem; counter-reset:step-counter;">
  <div class="anim-fade-in-up" style="flex:1; text-align:center;">
    <div style="width:48px; height:48px; border-radius:50%; background:var(--primary); display:flex; align-items:center; justify-content:center; margin:0 auto 0.5em; font-weight:700; font-size:1.2em;">1</div>
    <h4 style="margin:0;">Research</h4>
    <p style="font-size:0.65em; color:rgba(255,255,255,0.5);">Identify the problem space</p>
  </div>
  <div class="anim-fade-in-up" style="flex:1; text-align:center;">
    <div style="width:48px; height:48px; border-radius:50%; background:var(--primary); display:flex; align-items:center; justify-content:center; margin:0 auto 0.5em; font-weight:700; font-size:1.2em;">2</div>
    <h4 style="margin:0;">Design</h4>
    <p style="font-size:0.65em; color:rgba(255,255,255,0.5);">Prototype solutions</p>
  </div>
  <div class="anim-fade-in-up" style="flex:1; text-align:center;">
    <div style="width:48px; height:48px; border-radius:50%; background:var(--primary); display:flex; align-items:center; justify-content:center; margin:0 auto 0.5em; font-weight:700; font-size:1.2em;">3</div>
    <h4 style="margin:0;">Build</h4>
    <p style="font-size:0.65em; color:rgba(255,255,255,0.5);">Ship the first version</p>
  </div>
</div>
```

### Checklist
```html
<ul style="list-style:none; padding:0; text-align:left; max-width:500px; margin:0 auto; font-size:0.85em;">
  <li class="fragment fade-in" style="padding:0.4em 0;">✅ Requirement gathering complete</li>
  <li class="fragment fade-in" style="padding:0.4em 0;">✅ Architecture approved</li>
  <li class="fragment fade-in" style="padding:0.4em 0;">⬜ Development in progress</li>
  <li class="fragment fade-in" style="padding:0.4em 0;">⬜ QA testing</li>
  <li class="fragment fade-in" style="padding:0.4em 0;">⬜ Production deployment</li>
</ul>
```

---

## 4. Quotes & Testimonials

### Pull Quote
```html
<blockquote class="anim-fade-in-up" style="border:none; font-size:1.4em; font-style:italic; max-width:700px; margin:0 auto; position:relative; padding:0 2rem;">
  <span style="position:absolute; left:0; top:-0.2em; font-size:3em; color:var(--primary); opacity:0.4;">"</span>
  This product transformed the way we work. Our team productivity increased by 300%.
  <footer style="font-size:0.5em; font-style:normal; color:rgba(255,255,255,0.5); margin-top:0.8em;">
    — Jane Smith, CTO at TechCorp
  </footer>
</blockquote>
```

### Testimonial Card
```html
<div class="anim-fade-in-up" style="background:rgba(255,255,255,0.05); border-radius:12px; padding:2rem; max-width:550px; margin:0 auto; text-align:left;">
  <p style="font-style:italic; font-size:0.9em; line-height:1.6; margin:0 0 1em;">"We saw ROI within the first month. The onboarding was seamless."</p>
  <div style="display:flex; align-items:center; gap:0.8em;">
    <div style="width:48px; height:48px; border-radius:50%; background:linear-gradient(135deg,var(--primary),var(--accent)); display:flex; align-items:center; justify-content:center; font-weight:700;">JS</div>
    <div>
      <div style="font-weight:600; font-size:0.85em;">John Smith</div>
      <div style="font-size:0.65em; color:rgba(255,255,255,0.5);">VP Engineering, Acme Inc.</div>
    </div>
  </div>
</div>
```

### Multi-Testimonial Row
```html
<div class="anim-stagger" style="display:grid; grid-template-columns:repeat(2,1fr); gap:1.5rem;">
  <div class="anim-fade-in-up" style="background:rgba(255,255,255,0.05); border-radius:12px; padding:1.5rem; text-align:left;">
    <p style="font-style:italic; font-size:0.75em; margin:0 0 0.8em;">"Game changer for our workflow."</p>
    <div style="font-size:0.7em; font-weight:600;">— Alice M., Product Lead</div>
  </div>
  <div class="anim-fade-in-up" style="background:rgba(255,255,255,0.05); border-radius:12px; padding:1.5rem; text-align:left;">
    <p style="font-style:italic; font-size:0.75em; margin:0 0 0.8em;">"Finally, a tool that just works."</p>
    <div style="font-size:0.7em; font-weight:600;">— Bob K., Staff Engineer</div>
  </div>
</div>
```

---

## 5. Timelines

### Horizontal Timeline
```html
<div class="anim-stagger" style="display:flex; gap:0; margin-top:2rem; position:relative;">
  <!-- connector line -->
  <div style="position:absolute; top:14px; left:5%; right:5%; height:2px; background:rgba(255,255,255,0.15);"></div>
  <div class="anim-fade-in-up" style="flex:1; text-align:center; position:relative;">
    <div style="width:30px; height:30px; border-radius:50%; background:var(--primary); margin:0 auto; position:relative; z-index:1;"></div>
    <div style="margin-top:0.8em; font-weight:600; font-size:0.8em;">Q1 2025</div>
    <div style="font-size:0.65em; color:rgba(255,255,255,0.5);">Launch MVP</div>
  </div>
  <div class="anim-fade-in-up" style="flex:1; text-align:center; position:relative;">
    <div style="width:30px; height:30px; border-radius:50%; background:var(--primary); margin:0 auto; position:relative; z-index:1;"></div>
    <div style="margin-top:0.8em; font-weight:600; font-size:0.8em;">Q2 2025</div>
    <div style="font-size:0.65em; color:rgba(255,255,255,0.5);">10K Users</div>
  </div>
  <div class="anim-fade-in-up" style="flex:1; text-align:center; position:relative;">
    <div style="width:30px; height:30px; border-radius:50%; background:var(--accent); margin:0 auto; position:relative; z-index:1;"></div>
    <div style="margin-top:0.8em; font-weight:600; font-size:0.8em;">Q3 2025</div>
    <div style="font-size:0.65em; color:rgba(255,255,255,0.5);">Series A</div>
  </div>
  <div class="anim-fade-in-up" style="flex:1; text-align:center; position:relative;">
    <div style="width:30px; height:30px; border-radius:50%; border:2px solid rgba(255,255,255,0.3); margin:0 auto; position:relative; z-index:1;"></div>
    <div style="margin-top:0.8em; font-weight:600; font-size:0.8em;">Q4 2025</div>
    <div style="font-size:0.65em; color:rgba(255,255,255,0.5);">Global Launch</div>
  </div>
</div>
```

### Vertical Timeline
```html
<div style="max-width:500px; margin:0 auto; padding-left:2rem; border-left:2px solid rgba(255,255,255,0.15); text-align:left;">
  <div class="fragment slide-up" style="position:relative; padding:0 0 2rem 1.5rem;">
    <div style="position:absolute; left:-11px; top:4px; width:20px; height:20px; border-radius:50%; background:var(--primary);"></div>
    <h4 style="margin:0; font-size:0.9em;">Phase 1: Foundation</h4>
    <p style="font-size:0.7em; color:rgba(255,255,255,0.5); margin:0.3em 0 0;">Core infrastructure and team hiring</p>
  </div>
  <div class="fragment slide-up" style="position:relative; padding:0 0 2rem 1.5rem;">
    <div style="position:absolute; left:-11px; top:4px; width:20px; height:20px; border-radius:50%; background:var(--primary);"></div>
    <h4 style="margin:0; font-size:0.9em;">Phase 2: Growth</h4>
    <p style="font-size:0.7em; color:rgba(255,255,255,0.5); margin:0.3em 0 0;">User acquisition and product-market fit</p>
  </div>
  <div class="fragment slide-up" style="position:relative; padding:0 0 0 1.5rem;">
    <div style="position:absolute; left:-11px; top:4px; width:20px; height:20px; border-radius:50%; border:2px solid rgba(255,255,255,0.3);"></div>
    <h4 style="margin:0; font-size:0.9em;">Phase 3: Scale</h4>
    <p style="font-size:0.7em; color:rgba(255,255,255,0.5); margin:0.3em 0 0;">International expansion</p>
  </div>
</div>
```

---

## 6. Comparison / Versus

### Two-Column Comparison
```html
<div style="display:grid; grid-template-columns:1fr 1fr; gap:0; margin-top:1rem;">
  <div class="fragment fade-in" style="background:rgba(239,68,68,0.08); border-radius:12px 0 0 12px; padding:1.5rem; text-align:left;">
    <h3 style="color:#ef4444; margin-top:0;">Before</h3>
    <ul style="font-size:0.75em; color:rgba(255,255,255,0.6);">
      <li>Manual processes</li>
      <li>3-day turnaround</li>
      <li>Error-prone</li>
    </ul>
  </div>
  <div class="fragment fade-in" style="background:rgba(34,197,94,0.08); border-radius:0 12px 12px 0; padding:1.5rem; text-align:left;">
    <h3 style="color:#22c55e; margin-top:0;">After</h3>
    <ul style="font-size:0.75em; color:rgba(255,255,255,0.6);">
      <li>Fully automated</li>
      <li>Real-time</li>
      <li>99.9% accuracy</li>
    </ul>
  </div>
</div>
```

### Feature Comparison Table
```html
<table style="width:100%; border-collapse:collapse; font-size:0.7em; margin-top:1rem;">
  <thead>
    <tr style="border-bottom:2px solid rgba(255,255,255,0.15);">
      <th style="text-align:left; padding:0.6em;">Feature</th>
      <th style="text-align:center; padding:0.6em; color:rgba(255,255,255,0.5);">Competitor</th>
      <th style="text-align:center; padding:0.6em; color:var(--primary); font-weight:700;">Our Product</th>
    </tr>
  </thead>
  <tbody>
    <tr style="border-bottom:1px solid rgba(255,255,255,0.06);"><td style="padding:0.6em;">Real-time sync</td><td style="text-align:center;">❌</td><td style="text-align:center;">✅</td></tr>
    <tr style="border-bottom:1px solid rgba(255,255,255,0.06);"><td style="padding:0.6em;">API access</td><td style="text-align:center;">💰 Paid add-on</td><td style="text-align:center;">✅ Included</td></tr>
    <tr style="border-bottom:1px solid rgba(255,255,255,0.06);"><td style="padding:0.6em;">SSO</td><td style="text-align:center;">✅</td><td style="text-align:center;">✅</td></tr>
    <tr><td style="padding:0.6em;">24/7 Support</td><td style="text-align:center;">❌</td><td style="text-align:center;">✅</td></tr>
  </tbody>
</table>
```

---

## 7. Image Layouts

### Full-Bleed Background
```html
<section data-background-image="URL_HERE" data-background-size="cover" data-background-opacity="0.4">
  <h2 class="anim-fade-in-up" style="text-shadow:0 4px 20px rgba(0,0,0,0.8);">Title Over Image</h2>
</section>
```

### Image + Text Split
```html
<div style="display:grid; grid-template-columns:1fr 1fr; gap:2rem; align-items:center;">
  <img src="IMAGE_URL" alt="" class="anim-fade-in-left" style="width:100%; border-radius:12px;">
  <div class="anim-fade-in-right" style="text-align:left;">
    <h3>Image Description</h3>
    <p style="font-size:0.8em; color:rgba(255,255,255,0.6);">Explain what the image shows and why it matters.</p>
  </div>
</div>
```

### Image Grid (2×2)
```html
<div class="anim-stagger" style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; max-width:700px; margin:0 auto;">
  <img class="anim-zoom-in" src="IMG1" alt="" style="width:100%; border-radius:8px; aspect-ratio:16/10; object-fit:cover;">
  <img class="anim-zoom-in" src="IMG2" alt="" style="width:100%; border-radius:8px; aspect-ratio:16/10; object-fit:cover;">
  <img class="anim-zoom-in" src="IMG3" alt="" style="width:100%; border-radius:8px; aspect-ratio:16/10; object-fit:cover;">
  <img class="anim-zoom-in" src="IMG4" alt="" style="width:100%; border-radius:8px; aspect-ratio:16/10; object-fit:cover;">
</div>
```

---

## 8. Code Blocks

### Code Panel with File Header
```html
<div style="background:#1a1a2e; border-radius:10px; border:1px solid rgba(255,255,255,0.06); overflow:hidden; max-width:700px; margin:0 auto; text-align:left;">
  <div style="display:flex; align-items:center; gap:6px; padding:0.6em 1em; background:rgba(0,0,0,0.3); font-size:0.55em; color:rgba(255,255,255,0.5);">
    <span style="width:10px;height:10px;border-radius:50%;background:#ff5f57;"></span>
    <span style="width:10px;height:10px;border-radius:50%;background:#ffbd2e;"></span>
    <span style="width:10px;height:10px;border-radius:50%;background:#28ca41;"></span>
    <span style="margin-left:auto; font-family:monospace;">app.js</span>
  </div>
  <pre style="margin:0; padding:0.8em 1em;"><code class="language-javascript" data-trim data-line-numbers>
const app = express();
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});
  </code></pre>
</div>
```

### Terminal Output
```html
<div style="background:#000; border-radius:10px; border:1px solid rgba(255,255,255,0.08); overflow:hidden; max-width:600px; margin:0 auto; text-align:left;">
  <div style="padding:0.5em 1em; background:rgba(255,255,255,0.05); font-size:0.55em; color:rgba(255,255,255,0.5);">🖥️ Terminal</div>
  <pre style="margin:0; padding:0.8em 1em; font-size:0.7em; color:#34d399; background:transparent;">$ npm run build
✓ Compiled successfully in 2.3s
✓ Bundle size: 42kb (gzipped)</pre>
</div>
```

---

## 9. Navigation & Progress

### Breadcrumb / Step Indicator
```html
<div style="display:flex; align-items:center; gap:0.5em; justify-content:center; font-size:0.6em; margin-bottom:1.5rem;">
  <span style="color:var(--primary); font-weight:600;">Introduction</span>
  <span style="color:rgba(255,255,255,0.3);">→</span>
  <span style="color:rgba(255,255,255,0.5);">Architecture</span>
  <span style="color:rgba(255,255,255,0.3);">→</span>
  <span style="color:rgba(255,255,255,0.3);">Demo</span>
  <span style="color:rgba(255,255,255,0.3);">→</span>
  <span style="color:rgba(255,255,255,0.3);">Q&A</span>
</div>
```

### Progress Dots
```html
<div style="display:flex; gap:0.4em; justify-content:center;">
  <div style="width:12px;height:12px;border-radius:50%;background:var(--primary);"></div>
  <div style="width:12px;height:12px;border-radius:50%;background:var(--primary);"></div>
  <div style="width:12px;height:12px;border-radius:50%;background:var(--accent);box-shadow:0 0 8px var(--accent);"></div>
  <div style="width:12px;height:12px;border-radius:50%;background:rgba(255,255,255,0.15);"></div>
  <div style="width:12px;height:12px;border-radius:50%;background:rgba(255,255,255,0.15);"></div>
</div>
```

---

## 10. Call to Action

### CTA Slide
```html
<section>
  <h2 class="anim-fade-in-up" style="font-size:2.5em;">Ready to Get Started?</h2>
  <p class="anim-fade-in-up delay-200" style="color:rgba(255,255,255,0.6); font-size:0.9em;">Join 10,000+ teams already using our platform</p>
  <div class="anim-fade-in-up delay-400" style="margin-top:2em;">
    <a href="#" style="display:inline-block; background:var(--primary); color:#fff; padding:0.8em 2em; border-radius:8px; text-decoration:none; font-weight:600; font-size:0.9em;">Start Free Trial →</a>
  </div>
</section>
```

### Two-Button CTA
```html
<div class="anim-fade-in-up" style="display:flex; gap:1rem; justify-content:center; margin-top:2em;">
  <a href="#" style="display:inline-block; background:var(--primary); color:#fff; padding:0.7em 1.8em; border-radius:8px; text-decoration:none; font-weight:600;">Get Started</a>
  <a href="#" style="display:inline-block; background:transparent; color:var(--primary); padding:0.7em 1.8em; border-radius:8px; text-decoration:none; font-weight:600; border:1px solid var(--primary);">Learn More</a>
</div>
```

---

## 11. Tables

### Styled Data Table
```html
<table class="anim-fade-in-up" style="width:100%; border-collapse:collapse; font-size:0.7em;">
  <thead>
    <tr style="border-bottom:2px solid var(--primary);">
      <th style="text-align:left; padding:0.7em;">Name</th>
      <th style="text-align:right; padding:0.7em;">Revenue</th>
      <th style="text-align:right; padding:0.7em;">Growth</th>
      <th style="text-align:center; padding:0.7em;">Status</th>
    </tr>
  </thead>
  <tbody>
    <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
      <td style="padding:0.7em;">Product A</td>
      <td style="text-align:right; padding:0.7em;">$1.2M</td>
      <td style="text-align:right; padding:0.7em; color:#4ade80;">+24%</td>
      <td style="text-align:center; padding:0.7em;"><span style="background:rgba(34,197,94,0.2); color:#4ade80; padding:0.2em 0.6em; border-radius:100px; font-size:0.85em;">Active</span></td>
    </tr>
    <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
      <td style="padding:0.7em;">Product B</td>
      <td style="text-align:right; padding:0.7em;">$800K</td>
      <td style="text-align:right; padding:0.7em; color:#4ade80;">+12%</td>
      <td style="text-align:center; padding:0.7em;"><span style="background:rgba(34,197,94,0.2); color:#4ade80; padding:0.2em 0.6em; border-radius:100px; font-size:0.85em;">Active</span></td>
    </tr>
    <tr>
      <td style="padding:0.7em;">Product C</td>
      <td style="text-align:right; padding:0.7em;">$350K</td>
      <td style="text-align:right; padding:0.7em; color:#f87171;">-5%</td>
      <td style="text-align:center; padding:0.7em;"><span style="background:rgba(251,191,36,0.2); color:#fbbf24; padding:0.2em 0.6em; border-radius:100px; font-size:0.85em;">Review</span></td>
    </tr>
  </tbody>
</table>
```

---

## 12. Icon Grids & Feature Lists

### Icon + Label Grid (uses emoji or SVG icons)
```html
<div class="anim-stagger" style="display:grid; grid-template-columns:repeat(3,1fr); gap:2rem; margin-top:1.5rem;">
  <div class="anim-fade-in-up" style="text-align:center;">
    <div style="font-size:2.5em;">📈</div>
    <div style="font-size:0.8em; font-weight:600; margin-top:0.3em;">Analytics</div>
  </div>
  <div class="anim-fade-in-up" style="text-align:center;">
    <div style="font-size:2.5em;">🔄</div>
    <div style="font-size:0.8em; font-weight:600; margin-top:0.3em;">Automation</div>
  </div>
  <div class="anim-fade-in-up" style="text-align:center;">
    <div style="font-size:2.5em;">🛡️</div>
    <div style="font-size:0.8em; font-weight:600; margin-top:0.3em;">Security</div>
  </div>
  <div class="anim-fade-in-up" style="text-align:center;">
    <div style="font-size:2.5em;">🌐</div>
    <div style="font-size:0.8em; font-weight:600; margin-top:0.3em;">Global CDN</div>
  </div>
  <div class="anim-fade-in-up" style="text-align:center;">
    <div style="font-size:2.5em;">🔌</div>
    <div style="font-size:0.8em; font-weight:600; margin-top:0.3em;">Integrations</div>
  </div>
  <div class="anim-fade-in-up" style="text-align:center;">
    <div style="font-size:2.5em;">📱</div>
    <div style="font-size:0.8em; font-weight:600; margin-top:0.3em;">Mobile-First</div>
  </div>
</div>
```

### Feature List with SVG Icons (using inline)
```html
<!-- Use SVG from icon sets (Lucide, Heroicons, etc.) -->
<div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; text-align:left; max-width:650px; margin:0 auto;">
  <div class="fragment fade-in" style="display:flex; gap:0.8em; align-items:start; padding:0.8em;">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
    <div>
      <div style="font-weight:600; font-size:0.85em;">Feature Name</div>
      <div style="font-size:0.65em; color:rgba(255,255,255,0.5);">Brief description here</div>
    </div>
  </div>
  <!-- Repeat for each feature -->
</div>
```

---

## 13. Diagrams & Flows

### Simple Flow (Arrow Connectors)
```html
<div class="anim-stagger" style="display:flex; align-items:center; justify-content:center; gap:0;">
  <div class="anim-fade-in-up" style="background:var(--primary); color:#fff; padding:0.8em 1.2em; border-radius:8px; font-size:0.75em; font-weight:600;">Input</div>
  <div style="font-size:1.5em; color:rgba(255,255,255,0.3); padding:0 0.5em;">→</div>
  <div class="anim-fade-in-up" style="background:rgba(255,255,255,0.08); padding:0.8em 1.2em; border-radius:8px; font-size:0.75em; font-weight:600;">Process</div>
  <div style="font-size:1.5em; color:rgba(255,255,255,0.3); padding:0 0.5em;">→</div>
  <div class="anim-fade-in-up" style="background:rgba(255,255,255,0.08); padding:0.8em 1.2em; border-radius:8px; font-size:0.75em; font-weight:600;">Transform</div>
  <div style="font-size:1.5em; color:rgba(255,255,255,0.3); padding:0 0.5em;">→</div>
  <div class="anim-fade-in-up" style="background:var(--accent); color:#000; padding:0.8em 1.2em; border-radius:8px; font-size:0.75em; font-weight:600;">Output</div>
</div>
```

### Layered Architecture Diagram
```html
<div class="anim-stagger" style="display:flex; flex-direction:column; gap:0.5rem; max-width:500px; margin:0 auto;">
  <div class="anim-fade-in-up" style="background:rgba(99,102,241,0.15); border:1px solid rgba(99,102,241,0.3); border-radius:8px; padding:0.8em; text-align:center; font-size:0.8em; font-weight:600;">
    🌐 Presentation Layer
  </div>
  <div class="anim-fade-in-up" style="background:rgba(59,130,246,0.15); border:1px solid rgba(59,130,246,0.3); border-radius:8px; padding:0.8em; text-align:center; font-size:0.8em; font-weight:600;">
    ⚙️ Business Logic
  </div>
  <div class="anim-fade-in-up" style="background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.3); border-radius:8px; padding:0.8em; text-align:center; font-size:0.8em; font-weight:600;">
    🗄️ Data Access Layer
  </div>
  <div class="anim-fade-in-up" style="background:rgba(245,158,11,0.15); border:1px solid rgba(245,158,11,0.3); border-radius:8px; padding:0.8em; text-align:center; font-size:0.8em; font-weight:600;">
    💾 Database
  </div>
</div>
```

---

## 14. Pricing Tables

### Three-Tier Pricing
```html
<div class="anim-stagger" style="display:grid; grid-template-columns:repeat(3,1fr); gap:1.2rem; margin-top:1rem;">
  <!-- Free -->
  <div class="anim-fade-in-up" style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:1.5rem; text-align:center;">
    <div style="font-size:0.7em; font-weight:600; text-transform:uppercase; color:rgba(255,255,255,0.5);">Free</div>
    <div style="font-size:2.5em; font-weight:700; margin:0.2em 0;">$0</div>
    <div style="font-size:0.65em; color:rgba(255,255,255,0.4);">per month</div>
    <ul style="font-size:0.65em; text-align:left; color:rgba(255,255,255,0.6); margin:1em 0; padding-left:1.2em;">
      <li>5 projects</li><li>1 GB storage</li><li>Community support</li>
    </ul>
  </div>
  <!-- Pro (highlighted) -->
  <div class="anim-fade-in-up" style="background:rgba(99,102,241,0.1); border:2px solid var(--primary); border-radius:12px; padding:1.5rem; text-align:center; transform:scale(1.05);">
    <div style="font-size:0.7em; font-weight:600; text-transform:uppercase; color:var(--primary);">Pro ⭐</div>
    <div style="font-size:2.5em; font-weight:700; margin:0.2em 0;">$29</div>
    <div style="font-size:0.65em; color:rgba(255,255,255,0.4);">per month</div>
    <ul style="font-size:0.65em; text-align:left; color:rgba(255,255,255,0.6); margin:1em 0; padding-left:1.2em;">
      <li>Unlimited projects</li><li>50 GB storage</li><li>Priority support</li>
    </ul>
  </div>
  <!-- Enterprise -->
  <div class="anim-fade-in-up" style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:1.5rem; text-align:center;">
    <div style="font-size:0.7em; font-weight:600; text-transform:uppercase; color:rgba(255,255,255,0.5);">Enterprise</div>
    <div style="font-size:2.5em; font-weight:700; margin:0.2em 0;">Custom</div>
    <div style="font-size:0.65em; color:rgba(255,255,255,0.4);">contact sales</div>
    <ul style="font-size:0.65em; text-align:left; color:rgba(255,255,255,0.6); margin:1em 0; padding-left:1.2em;">
      <li>Everything in Pro</li><li>SSO & audit logs</li><li>Dedicated CSM</li>
    </ul>
  </div>
</div>
```

---

## 15. Team / People

### Team Member Card
```html
<div class="anim-stagger" style="display:grid; grid-template-columns:repeat(4,1fr); gap:1.5rem;">
  <div class="anim-fade-in-up" style="text-align:center;">
    <div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--accent));margin:0 auto 0.5em;display:flex;align-items:center;justify-content:center;font-size:1.5em;font-weight:700;">AB</div>
    <div style="font-weight:600;font-size:0.8em;">Alice Brown</div>
    <div style="font-size:0.6em;color:rgba(255,255,255,0.5);">CEO & Co-founder</div>
  </div>
  <!-- Repeat for each member -->
</div>
```

---

## 16. Logos / Partner Grids

### Logo Cloud
```html
<div class="anim-stagger" style="display:flex; flex-wrap:wrap; gap:2rem; justify-content:center; align-items:center; margin-top:1.5rem;">
  <img class="anim-fade-in-up" src="LOGO1" alt="Partner 1" style="height:40px; filter:brightness(0) invert(1); opacity:0.6;">
  <img class="anim-fade-in-up" src="LOGO2" alt="Partner 2" style="height:40px; filter:brightness(0) invert(1); opacity:0.6;">
  <img class="anim-fade-in-up" src="LOGO3" alt="Partner 3" style="height:40px; filter:brightness(0) invert(1); opacity:0.6;">
  <img class="anim-fade-in-up" src="LOGO4" alt="Partner 4" style="height:40px; filter:brightness(0) invert(1); opacity:0.6;">
</div>
```

---

## 17. Alert & Callout Boxes

### Callout Variants
```html
<!-- Info -->
<div style="background:rgba(96,165,250,0.1); border-left:3px solid #60a5fa; border-radius:8px; padding:1rem 1.2rem; text-align:left; font-size:0.8em; max-width:600px; margin:0 auto;">
  <strong style="color:#60a5fa;">ℹ️ Info</strong>
  <p style="margin:0.3em 0 0; color:rgba(255,255,255,0.6);">This is an informational callout.</p>
</div>

<!-- Success -->
<div style="background:rgba(34,197,94,0.1); border-left:3px solid #22c55e; border-radius:8px; padding:1rem 1.2rem; text-align:left; font-size:0.8em; max-width:600px; margin:0.5em auto;">
  <strong style="color:#22c55e;">✅ Success</strong>
  <p style="margin:0.3em 0 0; color:rgba(255,255,255,0.6);">Operation completed successfully.</p>
</div>

<!-- Warning -->
<div style="background:rgba(251,191,36,0.1); border-left:3px solid #fbbf24; border-radius:8px; padding:1rem 1.2rem; text-align:left; font-size:0.8em; max-width:600px; margin:0.5em auto;">
  <strong style="color:#fbbf24;">⚠️ Warning</strong>
  <p style="margin:0.3em 0 0; color:rgba(255,255,255,0.6);">Please review before proceeding.</p>
</div>

<!-- Danger -->
<div style="background:rgba(239,68,68,0.1); border-left:3px solid #ef4444; border-radius:8px; padding:1rem 1.2rem; text-align:left; font-size:0.8em; max-width:600px; margin:0.5em auto;">
  <strong style="color:#ef4444;">🚨 Danger</strong>
  <p style="margin:0.3em 0 0; color:rgba(255,255,255,0.6);">This action cannot be undone.</p>
</div>
```
