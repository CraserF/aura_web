# Hero SVG Scenes — Editorial-Quality Illustration Reference

Every presentation deck MUST include rich, composed SVG illustrations — not just emoji in boxes. This doc teaches you WHAT to draw and what NEVER to draw.

---

## 0. CRITICAL — What to Draw vs What NEVER to Draw

### NEVER draw these in SVG (they always look terrible):
- ❌ Animals (dogs, cats, birds, fish) — use large emoji instead (🐕 🐶 🐾 at 5-8em)
- ❌ Human faces / people / bodies — use emoji (👩 👨 🧑‍💻) or Bootstrap Icons (bi-person)
- ❌ Buildings / houses / vehicles — use emoji (🏠 🏢 🚗) or abstract geometric shapes
- ❌ Food / plants / clothing — use emoji (🍕 🌳 👕)
- ❌ Any real-world object that needs to be "recognizable"

### ALWAYS draw these in SVG (they look great with geometric primitives):
- ✅ Data flows: funnels, pipelines, flowing dashed arrows connecting boxes
- ✅ Process diagrams: circular flows with arc segments, step-by-step horizontal flows
- ✅ Capital/layer stacks: tapered rectangles stacked vertically with animated sweep
- ✅ Network nodes: circles connected by dashed lines with pulsing dots
- ✅ Shields / badges: path-drawn shield shape with checkmark inside
- ✅ Globe outlines: circle with latitude/longitude arcs + spinning outer ring
- ✅ Abstract backgrounds: wave paths, flowing lines, ripple circles, floating geometric shapes
- ✅ Metric visualizations: progress rings, bar charts, sparklines, donut charts
- ✅ Abstract concept illustrations: pyramid layers, Venn overlaps, hub-spoke diagrams

### For topics about real objects (pets, food, people, sports):
Use **large emoji as the focal visual** (5-8em) surrounded by **abstract animated SVG accents**:
```html
<!-- GOOD: Emoji focal point + SVG animated accents -->
<div style="text-align:center; position:relative; padding:3rem;">
  <!-- Large emoji as the illustration -->
  <div style="font-size:8em; line-height:1; margin-bottom:1rem;">🐕</div>
  <!-- Abstract SVG accents around it -->
  <svg style="position:absolute; inset:0; width:100%; height:100%; pointer-events:none;" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
    <!-- Floating hearts -->
    <g style="animation:bobFloat 3s ease-in-out infinite;">
      <path d="M60,40 C55,30 40,30 40,45 C40,60 60,75 60,75 C60,75 80,60 80,45 C80,30 65,30 60,40Z" fill="var(--primary)" opacity="0.3"/>
    </g>
    <g style="animation:bobFloat 3.5s ease-in-out infinite; animation-delay:0.8s;">
      <path d="M340,60 C335,50 320,50 320,65 C320,80 340,95 340,95 C340,95 360,80 360,65 C360,50 345,50 340,60Z" fill="var(--accent)" opacity="0.25"/>
    </g>
    <!-- Paw print dots -->
    <circle style="animation:pulseDot 2s ease-in-out infinite;" cx="100" cy="220" r="6" fill="var(--primary)" opacity="0.2"/>
    <circle style="animation:pulseDot 2s ease-in-out infinite; animation-delay:0.4s;" cx="300" cy="200" r="5" fill="var(--primary)" opacity="0.15"/>
    <!-- Flowing dashed sparkle lines -->
    <path style="animation:flowDash 2s linear infinite;" d="M50,150 Q200,120 350,150" fill="none" stroke="var(--primary)" stroke-width="1.5" stroke-dasharray="8 6" opacity="0.2"/>
  </svg>
</div>
```

---

## 1. Editorial Card Patterns (the most impactful upgrade)

The #1 problem with generated slides is identical emoji-in-a-box cards repeated endlessly. The fix: **each card gets a unique inline SVG mini-illustration**.

### 1.1 Card with Inline SVG Funnel Diagram
```html
<div style="background:var(--surface); border-left:5px solid var(--primary); border-radius:3px; padding:1.5rem; display:flex; gap:1.5rem; align-items:flex-start;">
  <div style="flex:1;">
    <div style="font-size:0.6em; letter-spacing:2px; text-transform:uppercase; color:var(--muted); font-weight:600; margin-bottom:0.4em;">Process 01</div>
    <h3 style="font-family:var(--heading-font); font-size:1.2em; font-weight:700; color:var(--heading); margin:0 0 0.5em;">Blended Finance</h3>
    <p style="font-family:var(--body-font); font-size:0.9em; color:var(--body); line-height:1.6; margin:0;">Concessional capital layered with commercial debt to reduce cost.</p>
    <div style="margin-top:0.8em; display:flex; gap:0.5em; flex-wrap:wrap;">
      <span style="font-size:0.65em; background:var(--primary); opacity:0.15; padding:3px 10px; border-radius:20px; font-weight:600;">Tag One</span>
      <span style="font-size:0.65em; background:var(--accent); opacity:0.15; padding:3px 10px; border-radius:20px; font-weight:600;">Tag Two</span>
    </div>
  </div>
  <!-- Mini SVG funnel -->
  <svg width="130" height="130" viewBox="0 0 130 130" style="flex-shrink:0;" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="8" width="52" height="26" rx="5" fill="var(--primary)" opacity="0.2" stroke="var(--primary)" stroke-width="1"/>
    <text x="26" y="24" text-anchor="middle" font-size="7.5" font-weight="700" fill="var(--heading)">Source A</text>
    <rect x="78" y="8" width="52" height="26" rx="5" fill="var(--accent)" opacity="0.2" stroke="var(--accent)" stroke-width="1"/>
    <text x="104" y="24" text-anchor="middle" font-size="7.5" font-weight="700" fill="var(--heading)">Source B</text>
    <path style="animation:flowDash 2s linear infinite;" d="M26,34 Q44,50 55,62" fill="none" stroke="var(--primary)" stroke-width="1.5" stroke-dasharray="5 3"/>
    <path style="animation:flowDash 2s linear infinite; animation-delay:.4s;" d="M104,34 Q86,50 75,62" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="5 3"/>
    <path d="M42,62 L88,62 L76,86 L54,86 Z" fill="var(--primary)" opacity="0.15" stroke="var(--primary)" stroke-width="1"/>
    <text x="65" y="76" text-anchor="middle" font-size="7" font-weight="700" fill="var(--heading)">BLEND</text>
    <rect x="30" y="100" width="70" height="20" rx="5" fill="var(--surface)" stroke="var(--primary)" stroke-width="1.2"/>
    <text x="65" y="113" text-anchor="middle" font-size="7.5" font-weight="700" fill="var(--heading)">Output</text>
    <circle style="animation:drip 2s ease-in infinite;" cx="65" cy="92" r="3.5" fill="var(--primary)"/>
  </svg>
</div>
```

### 1.2 Card with Shield / Badge SVG
```html
<div style="background:var(--surface); border-left:5px solid var(--accent); border-radius:3px; padding:1.5rem; display:flex; gap:1.5rem;">
  <div style="flex:1;">
    <div style="font-size:0.6em; letter-spacing:2px; text-transform:uppercase; color:var(--muted); font-weight:600; margin-bottom:0.4em;">Protection</div>
    <h3 style="font-family:var(--heading-font); font-size:1.2em; font-weight:700; color:var(--heading); margin:0 0 0.5em;">Credit Guarantee</h3>
    <p style="font-family:var(--body-font); font-size:0.9em; color:var(--body); line-height:1.6; margin:0;">Provides partial guarantees absorbing first-loss risk.</p>
  </div>
  <svg width="72" height="90" viewBox="0 0 72 90" style="flex-shrink:0;" xmlns="http://www.w3.org/2000/svg">
    <path d="M36,4 Q58,14 60,36 Q60,58 36,76 Q12,58 12,36 Q12,14 36,4 Z" fill="var(--accent)" opacity="0.2" stroke="var(--accent)" stroke-width="1.5"/>
    <path d="M36,14 Q52,22 54,38 Q54,54 36,66 Q18,54 18,38 Q18,22 36,14 Z" fill="var(--surface)" stroke="var(--accent)" stroke-width="1"/>
    <path d="M26,38 L33,46 L48,28" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    <circle style="animation:ripOut 2.2s ease-out infinite;" cx="36" cy="40" r="12" fill="none" stroke="var(--accent)" stroke-width="1.2" opacity="0.4"/>
  </svg>
</div>
```

### 1.3 Card with Circular Flow / Reinvestment Cycle SVG
```html
<svg viewBox="0 0 280 130" width="100%" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="140" cy="65" rx="125" ry="55" fill="var(--surface)" stroke="var(--primary)" stroke-width="1.2" stroke-dasharray="6 3" opacity="0.5"/>
  <!-- Animated flow arcs -->
  <path style="animation:flowDash 2.5s linear infinite;" d="M72,65 A68,40 0 0,1 140,25" fill="none" stroke="var(--primary)" stroke-width="2.2" stroke-dasharray="7 4" stroke-linecap="round"/>
  <path style="animation:flowDash 2.5s linear infinite; animation-delay:.5s;" d="M140,25 A68,40 0 0,1 208,65" fill="none" stroke="var(--accent)" stroke-width="2.2" stroke-dasharray="7 4" stroke-linecap="round"/>
  <path style="animation:flowDash 2.5s linear infinite; animation-delay:1s;" d="M208,65 A68,40 0 0,1 140,105" fill="none" stroke="var(--primary)" stroke-width="2.2" stroke-dasharray="7 4" stroke-linecap="round"/>
  <path style="animation:flowDash 2.5s linear infinite; animation-delay:1.5s;" d="M140,105 A68,40 0 0,1 72,65" fill="none" stroke="var(--accent)" stroke-width="2.2" stroke-dasharray="7 4" stroke-linecap="round"/>
  <!-- Stage labels at compass points -->
  <text x="140" y="22" text-anchor="middle" font-size="8" font-weight="700" fill="var(--heading)">Collect</text>
  <text x="216" y="68" text-anchor="start" font-size="8" font-weight="700" fill="var(--heading)">Invest</text>
  <text x="140" y="118" text-anchor="middle" font-size="8" font-weight="700" fill="var(--heading)">Build</text>
  <text x="8" y="68" text-anchor="start" font-size="8" font-weight="700" fill="var(--heading)">Maintain</text>
  <!-- Centre hub -->
  <circle cx="140" cy="65" r="24" fill="var(--surface)" stroke="var(--primary)" stroke-width="1.5"/>
  <text x="140" y="68" text-anchor="middle" font-size="9" font-weight="700" fill="var(--heading)">CORE</text>
  <!-- Pulsing dots at compass points -->
  <circle style="animation:pulseDot 2.5s ease-in-out infinite;" cx="72" cy="65" r="5" fill="var(--accent)"/>
  <circle style="animation:pulseDot 2.5s ease-in-out infinite; animation-delay:.6s;" cx="208" cy="65" r="5" fill="var(--primary)"/>
  <circle style="animation:pulseDot 2.5s ease-in-out infinite; animation-delay:1.2s;" cx="140" cy="25" r="5" fill="var(--accent)"/>
  <circle style="animation:pulseDot 2.5s ease-in-out infinite; animation-delay:1.8s;" cx="140" cy="105" r="5" fill="var(--primary)"/>
</svg>
```

### 1.4 Card with Pooling / Convergence SVG
```html
<svg width="145" height="120" viewBox="0 0 145 120" xmlns="http://www.w3.org/2000/svg">
  <!-- Source nodes -->
  <circle cx="22" cy="30" r="16" fill="var(--primary)" opacity="0.15" stroke="var(--primary)" stroke-width="1"/>
  <text x="22" y="34" text-anchor="middle" font-size="7" font-weight="700" fill="var(--heading)">A</text>
  <circle cx="123" cy="30" r="16" fill="var(--accent)" opacity="0.15" stroke="var(--accent)" stroke-width="1"/>
  <text x="123" y="34" text-anchor="middle" font-size="7" font-weight="700" fill="var(--heading)">B</text>
  <circle cx="22" cy="82" r="16" fill="var(--primary)" opacity="0.15" stroke="var(--primary)" stroke-width="1"/>
  <text x="22" y="86" text-anchor="middle" font-size="7" font-weight="700" fill="var(--heading)">C</text>
  <circle cx="123" cy="82" r="16" fill="var(--accent)" opacity="0.15" stroke="var(--accent)" stroke-width="1"/>
  <text x="123" y="86" text-anchor="middle" font-size="7" font-weight="700" fill="var(--heading)">D</text>
  <!-- Animated dashed arrows converging -->
  <path style="animation:flowDash 2s linear infinite;" d="M38,33 Q60,45 68,52" fill="none" stroke="var(--primary)" stroke-width="1.5" stroke-dasharray="5 3"/>
  <path style="animation:flowDash 2s linear infinite; animation-delay:.3s;" d="M38,79 Q60,70 68,65" fill="none" stroke="var(--primary)" stroke-width="1.5" stroke-dasharray="5 3"/>
  <path style="animation:flowDash 2s linear infinite; animation-delay:.5s;" d="M107,33 Q90,45 80,52" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="5 3"/>
  <path style="animation:flowDash 2s linear infinite; animation-delay:.8s;" d="M107,79 Q90,70 80,65" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="5 3"/>
  <!-- Central target -->
  <rect x="58" y="44" width="32" height="28" rx="5" fill="var(--surface)" stroke="var(--primary)" stroke-width="1.5"/>
  <text x="74" y="62" text-anchor="middle" font-size="8" font-weight="700" fill="var(--heading)">POOL</text>
  <!-- Water waves below -->
  <path style="animation:waveShift 3.5s ease-in-out infinite;" d="M0,102 Q36,96 72,102 Q108,108 145,102" fill="none" stroke="var(--primary)" stroke-width="1.5" opacity="0.35"/>
</svg>
```

### 1.5 Globe with Spinning Outer Ring
```html
<svg width="90" height="90" viewBox="0 0 90 90" xmlns="http://www.w3.org/2000/svg">
  <circle cx="45" cy="45" r="40" fill="var(--primary)" opacity="0.12" stroke="var(--primary)" stroke-width="1.5"/>
  <!-- Latitude/longitude lines -->
  <path d="M10,45 Q28,35 45,45 Q62,35 80,45" fill="none" stroke="var(--primary)" stroke-width="0.8" opacity="0.4"/>
  <path d="M12,32 Q28,24 45,32 Q62,24 78,32" fill="none" stroke="var(--primary)" stroke-width="0.7" opacity="0.3"/>
  <path d="M45,5 Q52,25 50,45 Q48,65 45,85" fill="none" stroke="var(--primary)" stroke-width="0.7" opacity="0.3"/>
  <!-- Marker dot -->
  <circle cx="40" cy="50" r="4" fill="var(--accent)" stroke="var(--accent)" stroke-width="0.8"/>
  <circle style="animation:ripOut 2.2s ease-out infinite;" cx="40" cy="50" r="4" fill="none" stroke="var(--accent)" stroke-width="1"/>
  <!-- Spinning outer ring -->
  <circle style="animation:spinSlow 8s linear infinite; transform-origin:center;" cx="45" cy="45" r="44" fill="none" stroke="var(--primary)" stroke-width="0.6" stroke-dasharray="4 8" opacity="0.4"/>
</svg>
```

---

## 2. Title Slide Background Pattern

Title slides MUST have a full-canvas animated SVG background. Use abstract shapes, not literal depictions.

```html
<section data-background-color="..." data-transition="fade" style="...">
  <style>
    @keyframes flowDash { to{stroke-dashoffset:-40} }
    @keyframes bobFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
    @keyframes pulseDot { 0%,100%{opacity:1} 50%{opacity:0.2} }
    @keyframes ripOut { 0%{transform:scale(0.2);opacity:0.7} 100%{transform:scale(1.6);opacity:0} }
  </style>
  <svg style="position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <!-- Wave layers at bottom -->
    <path d="M0,800 Q400,760 800,800 Q1200,840 1920,800 L1920,1080 L0,1080 Z" fill="var(--primary)" opacity="0.06"/>
    <path d="M0,850 Q400,870 800,850 Q1200,830 1920,850 L1920,1080 L0,1080 Z" fill="var(--primary)" opacity="0.04"/>
    <!-- Flowing dashed lines -->
    <path style="animation:flowDash 8s linear infinite;" d="M0,500 Q480,470 960,500 Q1440,530 1920,500" fill="none" stroke="var(--primary)" stroke-width="1.5" stroke-dasharray="16 10" opacity="0.15"/>
    <!-- Floating accent shapes -->
    <circle style="animation:bobFloat 4s ease-in-out infinite;" cx="1600" cy="200" r="30" fill="var(--primary)" opacity="0.06"/>
    <circle style="animation:bobFloat 3.5s ease-in-out infinite; animation-delay:1s;" cx="300" cy="150" r="20" fill="var(--accent)" opacity="0.05"/>
    <!-- Pulsing ring accent -->
    <circle style="animation:ripOut 3s ease-out infinite;" cx="1700" cy="400" r="15" fill="none" stroke="var(--primary)" stroke-width="1" opacity="0.2"/>
    <!-- Dot pattern -->
    <circle style="animation:pulseDot 2.5s ease-in-out infinite;" cx="200" cy="800" r="4" fill="var(--primary)" opacity="0.15"/>
    <circle style="animation:pulseDot 2.5s ease-in-out infinite; animation-delay:0.5s;" cx="400" cy="780" r="3" fill="var(--primary)" opacity="0.1"/>
  </svg>
  <!-- Content overlaid -->
  <div style="position:relative; z-index:1; ...">
    <!-- Title, subtitle, etc. -->
  </div>
</section>
```

---

## 3. Tapered Capital Stack (full-width chart)

A powerful visual for hierarchical/layered concepts. Each layer gets narrower, creating a pyramid/funnel effect.

```html
<div style="display:flex; flex-direction:column; gap:4px; align-items:center; position:relative;">
  <style>
    @keyframes layerSweep { 0%{left:-60%} 100%{left:110%} }
  </style>
  <!-- Layer 1: widest -->
  <div style="width:100%; height:42px; border-radius:3px; background:var(--primary); opacity:0.2; position:relative; overflow:hidden; display:flex; align-items:center; padding:0 1.2rem;">
    <div style="position:absolute; top:0; left:-100%; width:60%; height:100%; background:var(--primary); opacity:0.18; animation:layerSweep 3s ease-in-out infinite;"></div>
    <span style="font-family:var(--heading-font); font-size:0.85em; font-weight:700; color:var(--heading); z-index:1;">Layer One</span>
    <span style="margin-left:auto; font-size:0.7em; color:var(--muted); z-index:1;">Description</span>
  </div>
  <!-- Layer 2: narrower -->
  <div style="width:85%; height:42px; border-radius:3px; background:var(--primary); opacity:0.35; position:relative; overflow:hidden; display:flex; align-items:center; padding:0 1.2rem;">
    <div style="position:absolute; top:0; left:-100%; width:60%; height:100%; background:var(--primary); opacity:0.18; animation:layerSweep 3s ease-in-out infinite; animation-delay:0.4s;"></div>
    <span style="font-family:var(--heading-font); font-size:0.85em; font-weight:700; color:var(--heading); z-index:1;">Layer Two</span>
  </div>
  <!-- Layer 3: narrowest -->
  <div style="width:70%; height:42px; border-radius:3px; background:var(--primary); opacity:0.5; position:relative; overflow:hidden; display:flex; align-items:center; padding:0 1.2rem;">
    <div style="position:absolute; top:0; left:-100%; width:60%; height:100%; background:var(--primary); opacity:0.18; animation:layerSweep 3s ease-in-out infinite; animation-delay:0.8s;"></div>
    <span style="font-family:var(--heading-font); font-size:0.85em; font-weight:700; color:var(--heading); z-index:1;">Layer Three</span>
  </div>
</div>
```

---

## 4. Animation Keyframes Reference

Place these in a `<style>` tag INSIDE each `<section>`:

```css
@keyframes flowDash { to{stroke-dashoffset:-24} }
@keyframes bobFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
@keyframes ripOut { 0%{transform:scale(0.2);opacity:0.7} 100%{transform:scale(1.6);opacity:0} }
@keyframes pulseDot { 0%,100%{opacity:1} 50%{opacity:0.2} }
@keyframes spinSlow { from{transform:rotate(0)} to{transform:rotate(360deg)} }
@keyframes drip { 0%{transform:translateY(-6px);opacity:0} 40%{opacity:1} 100%{transform:translateY(14px);opacity:0} }
@keyframes waveShift { 0%,100%{transform:translateX(0)} 50%{transform:translateX(-12px)} }
@keyframes shimmerSweep { 0%{left:-60%} 100%{left:130%} }
@keyframes layerSweep { 0%{left:-60%} 100%{left:110%} }
@keyframes blinkLED { 0%,100%{opacity:0.4} 50%{opacity:1} }
```

### Stagger pattern (apply to multiple elements):
```
animation-delay: 0s, 0.25s, 0.5s, 0.75s, 1s ...
```

---

## 5. Rules

1. **NEVER draw animals, people, faces, buildings, vehicles, food in SVG** — use emoji (5-8em) instead
2. SVG illustrations should be abstract: flows, diagrams, shapes, patterns, data visualizations
3. Each card in a grid should have a DIFFERENT visual treatment — one funnel, one shield, one cycle, one chart
4. Title slides MUST have a composed SVG background (waves, dots, flowing lines)
5. All colors use palette tokens: `var(--primary)`, `var(--heading)`, `var(--accent)`, `var(--surface)`
6. Background layers at 0.04-0.12 opacity; focal elements at 0.15-0.5 opacity
7. Place `@keyframes` in `<style>` inside `<section>`, not in attributes
8. Use `pointer-events:none` on background SVG layers
9. Limit 5-8 animations per slide with staggered delays
10. Use `viewBox` + percentage width for responsive sizing
