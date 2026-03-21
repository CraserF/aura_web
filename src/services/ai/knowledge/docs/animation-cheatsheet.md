# Animation Cheatsheet — Quick Reference

> Every CSS class from `core-animations.css` and `advanced-effects.css` in one place.
> Copy-paste ready. Ctrl+F friendly.

---

## Entrance Animations
Apply to any element. Plays when slide becomes `.present`.

| Class | Effect |
|-------|--------|
| `.anim-fade-in-up` | Fade in + slide up |
| `.anim-fade-in-down` | Fade in + slide down |
| `.anim-fade-in-left` | Fade in + slide from left |
| `.anim-fade-in-right` | Fade in + slide from right |
| `.anim-fade-in-scale` | Fade in + scale from small |
| `.anim-fade-in-scale-up` | Fade in + scale from large |
| `.anim-slide-in-up` | Slide up (no fade) |
| `.anim-slide-in-down` | Slide down (no fade) |
| `.anim-slide-in-left` | Slide from left (no fade) |
| `.anim-slide-in-right` | Slide from right (no fade) |
| `.anim-zoom-in` | Zoom from center |
| `.anim-zoom-in-rotate` | Zoom + rotate in |
| `.anim-zoom-in-bounce` | Zoom + bounce landing |
| `.anim-flip-in-x` | 3D flip on X-axis |
| `.anim-flip-in-y` | 3D flip on Y-axis |
| `.anim-bounce-in` | Bounce from center |
| `.anim-bounce-in-up` | Bounce from below |
| `.anim-reveal-center` | Clip-path expand from center |
| `.anim-reveal-circle` | Clip-path circle reveal |
| `.anim-reveal-wipe-right` | Wipe reveal left→right |
| `.anim-reveal-wipe-left` | Wipe reveal right→left |
| `.anim-reveal-wipe-down` | Wipe reveal top→bottom |
| `.anim-reveal-diamond` | Diamond-shape clip reveal |
| `.anim-reveal-hexagon` | Hexagon-shape clip reveal |
| `.anim-elastic-in` | Elastic spring entrance |

---

## Exit Animations

| Class | Effect |
|-------|--------|
| `.anim-fade-out-up` | Fade out + slide up |
| `.anim-fade-out-down` | Fade out + slide down |
| `.anim-fade-out-left` | Fade out + slide left |
| `.anim-fade-out-right` | Fade out + slide right |
| `.anim-zoom-out` | Zoom out to nothing |
| `.anim-shrink-out` | Shrink to point |
| `.anim-flip-out-x` | 3D flip away on X |
| `.anim-collapse-out` | Collapse vertically |

---

## Emphasis (Attention Seekers)
Best with `.anim-infinite` for continuous effect.

| Class | Effect |
|-------|--------|
| `.anim-pulse` | Scale pulse |
| `.anim-shake` | Horizontal shake |
| `.anim-wobble` | Side wobble |
| `.anim-heartbeat` | Heartbeat rhythm |
| `.anim-rubber-band` | Rubber band stretch |
| `.anim-jello` | Jello wiggle |
| `.anim-tada` | Tada celebration |

---

## Background Animations
Apply to slide `<section>` or wrapper `<div>`.

| Class | Effect | Customization |
|-------|--------|---------------|
| `.bg-gradient-shift` | Moving multi-color gradient | `--grad-1`, `--grad-2`, `--grad-3` |
| `.bg-gradient-rotate` | Rotating conic gradient | `--grad-1`, `--grad-2` |
| `.bg-ken-burns` | Slow zoom on bg-image | `background-image` |
| `.bg-parallax-drift` | Drifting background | `background-image` |
| `.bg-wave` | Undulating wave motion | `background-image` |
| `.bg-pulse-glow` | Breathing glow | `--glow-color` |

---

## Text Animations

| Class | Effect | Requirements |
|-------|--------|--------------|
| `.anim-typewriter` | Typing effect | Set `--tw-chars: N` |
| `.anim-text-shimmer` | Moving highlight | None |
| `.anim-letter-wave` | Letters bounce | None |
| `.anim-text-glow` | Pulsing glow | None |
| `.anim-text-blur-focus` | Blur → sharp | None |
| `.anim-text-reveal-line` | Line reveal | None |

---

## Looping Animations
Continuous motion. Good for decorative elements.

| Class | Effect |
|-------|--------|
| `.anim-float` | Gentle up/down float |
| `.anim-float-rotate` | Float + rotate |
| `.anim-spin` | 360° spin (1.5s) |
| `.anim-spin-slow` | 360° spin (8s) |
| `.anim-breathe` | Scale breathe |
| `.anim-orbit` | Circular orbit |
| `.anim-sway` | Left/right sway |
| `.anim-morph-blob` | Blob shape morph |

---

## Fragment Extensions
Use with `.fragment` class for click-to-reveal.

| Classes | Effect |
|---------|--------|
| `.fragment.blur` | Blur → clear |
| `.fragment.scale-up` | Small → normal |
| `.fragment.scale-down` | Large → normal |
| `.fragment.flip` | 3D flip reveal |
| `.fragment.slide-up` | Slide up |
| `.fragment.slide-down` | Slide down |
| `.fragment.bounce` | Bounce in |
| `.fragment.rotate-in` | Rotate entrance |
| `.fragment.wipe-right` | Wipe reveal |
| `.fragment.glow` | Glow highlight |
| `.fragment.zoom-focus` | Zoom + refocus |
| `.fragment.highlight-box` | Box highlight |
| `.fragment.underline-draw` | Animated underline |

---

## Stagger Containers

| Class | Delay per child | Max children |
|-------|----------------|--------------|
| `.anim-stagger` | 150ms | 12 |
| `.anim-stagger-fast` | 80ms | 10 |

---

## Timing Modifiers

### Delays
`.delay-100` · `.delay-200` · `.delay-300` · `.delay-400` · `.delay-500` · `.delay-600` · `.delay-700` · `.delay-800` · `.delay-1000` · `.delay-1500` · `.delay-2000`

### Durations
| Class | Value |
|-------|-------|
| `.duration-fast` | 0.3s |
| `.duration-normal` | 0.6s |
| `.duration-slow` | 1.2s |
| `.duration-glacial` | 3s |

### Iteration
`.anim-once` · `.anim-twice` · `.anim-thrice` · `.anim-infinite`

### Fill Modes
`.anim-fill-forwards` · `.anim-fill-backwards` · `.anim-fill-both`

---

## Scene Backgrounds (advanced-effects.css)

### Particles
```html
<div class="scene-particles">
  <div class="particle"></div> <!-- repeat 10-15x -->
</div>
```

### Aurora
```html
<div class="scene-aurora">
  <div class="aurora-band"></div> <!-- repeat 3x -->
</div>
```

### Nebula
```html
<div class="scene-nebula">
  <div class="nebula-cloud"></div> <!-- repeat 3x -->
  <div class="nebula-star"></div> <!-- repeat 2-5x -->
</div>
```

### Ocean
```html
<div class="scene-ocean">
  <div class="wave"></div> <!-- repeat 3x -->
</div>
```

### Matrix Rain
```html
<div class="scene-matrix">
  <div class="matrix-column"></div> <!-- repeat 10-15x -->
</div>
```

### Geometric Grid
```html
<div class="scene-geo-grid"></div>
```

### Starfield
```html
<div class="scene-starfield">
  <div class="star-layer"></div> <!-- repeat 3x -->
</div>
```

### Fireflies
```html
<div class="scene-fireflies">
  <div class="firefly"></div> <!-- repeat 8-10x -->
</div>
```

---

## Animated Borders

| Class | Effect | Custom Property |
|-------|--------|-----------------|
| `.border-gradient-anim` | Rotating gradient border | — |
| `.border-neon` | Neon glow + flicker | `--neon-color` |
| `.border-draw` | Self-drawing border | — |
| `.border-orbit` | Orbiting light dot | — |

---

## Morphing Shapes

| Class | Effect |
|-------|--------|
| `.morph-circle` | Animated blob |
| `.morph-triangle` | Morphing triangle |

---

## Parallax Layers
```html
<div class="parallax-container">
  <div class="parallax-layer parallax-layer--back"></div>
  <div class="parallax-layer parallax-layer--mid"></div>
  <div class="parallax-layer parallax-layer--front"></div>
</div>
```

---

## Cinematic Effects

| Class | Effect |
|-------|--------|
| `.cinematic-letterbox` | Top/bottom black bars |
| `.cinematic-vignette` | Dark edge vignette |
| `.cinematic-grain` | Film grain overlay |
| `.cinematic-spotlight` | Moving spotlight |

---

## 3D Cards
```html
<div class="card-3d">
  <div class="card-3d-inner">
    <div class="card-3d-front">Front</div>
    <div class="card-3d-back">Back</div>
  </div>
</div>
```
Also: `.tilt-effect` for auto-tilt on slide enter.

---

## Data Elements

| Class/Element | Usage |
|---------------|-------|
| `.number-counter` | `<span class="number-counter" data-target="100">0</span>` |
| `.progress-bar-animated .fill` | `<div class="fill" style="--target-width: 75%;"></div>` |

---

## Combo Recipes

**Staggered cards:**
```
div.anim-stagger > div.anim-fade-in-up.border-gradient-anim
```

**Hero with particles:**
```
section > div.scene-particles(abs) + div.content(rel,z1) > h1.anim-elastic-in + p.anim-fade-in-up.delay-300
```

**Cinematic image:**
```
section[data-background-image] > div.cinematic-letterbox + div.cinematic-vignette + h1.anim-fade-in-up.duration-slow
```

**Data dashboard:**
```
div.anim-stagger > div.anim-fade-in-up > h3 + span.number-counter + div.progress-bar-animated
```

**Code walkthrough:**
```
div[grid:1fr 1fr] > pre.anim-fade-in-left > code + div.anim-fade-in-right > ul > li.fragment.scale-up
```
