# Quality Checklist

> Run through this checklist after generating a reveal.js presentation.
> Every item must pass before the output is delivered.

---

## 1. Structure Validation

### HTML Integrity
- [ ] Valid HTML5 document with `<!DOCTYPE html>`, `<html>`, `<head>`, `<body>`
- [ ] `<meta charset="UTF-8">` present
- [ ] `<title>` tag contains the presentation title
- [ ] All `<section>` tags properly opened and closed
- [ ] No orphan `<div>`, `<span>`, or other unclosed tags
- [ ] Nested vertical slides use `<section><section>...</section></section>` pattern
- [ ] `.reveal > .slides` wrapper structure is correct

### Reveal.js Setup
- [ ] reveal.js v5 CSS linked: `https://cdn.jsdelivr.net/npm/reveal.js@5/dist/reveal.css`
- [ ] reveal.js theme CSS linked: `https://cdn.jsdelivr.net/npm/reveal.js@5/dist/theme/black.css`
- [ ] reveal.js JS loaded: `https://cdn.jsdelivr.net/npm/reveal.js@5/dist/reveal.js`
- [ ] `Reveal.initialize({...})` called at end of body
- [ ] `hash: true` in config (enables URL slide tracking)
- [ ] Appropriate transition set (none, fade, slide, convex, concave, zoom)

### Plugin Setup (if used)
- [ ] RevealHighlight plugin loaded (if code blocks present)
- [ ] RevealNotes plugin loaded (if speaker notes desired in separate window)
- [ ] Animation engine plugin linked (if using counters, typed text, progress bars)
- [ ] Three.js CDN loaded (if using 3D backgrounds)
- [ ] Three.js backgrounds plugin linked (if using 3D backgrounds)
- [ ] Plugins array in `Reveal.initialize()` includes all loaded plugins

---

## 2. Content Validation

### Placeholders
- [ ] **ZERO** remaining `{{PLACEHOLDER}}` markers in the entire file
- [ ] Search for `{{` to confirm — there should be 0 matches
- [ ] All template-specific placeholders replaced (check `reference/template-schemas.md`)

### Speaker Notes
- [ ] Every content slide has `<aside class="notes">...</aside>`
- [ ] Notes contain useful talking points (not just "talk about this")
- [ ] Title slide may optionally omit notes
- [ ] Notes do not contain placeholder text

### Content Quality
- [ ] Maximum 6 bullet points per slide
- [ ] Maximum ~10 words per bullet point
- [ ] One core idea per slide
- [ ] No "wall of text" slides — break into multiple slides if needed
- [ ] Section dividers present between major topics
- [ ] Consistent heading hierarchy (h1 for titles, h2 for sections, h3 for sub-topics)
- [ ] No spelling errors in visible text
- [ ] Slide count matches the user's request (±2 slides)

---

## 3. Styling Validation

### CSS Custom Properties
- [ ] `:root` block defines `--primary`, `--accent`, `--bg-dark`
- [ ] Color values are valid hex codes or CSS color functions
- [ ] Font families declared: `--heading-font`, `--body-font` (or in direct CSS)
- [ ] Colors form a visually coherent palette

### Fonts
- [ ] Google Fonts `<link>` tag present in `<head>`
- [ ] Font names in CSS match exactly what the Google Fonts URL loads
- [ ] Fallback fonts specified (e.g., `'Inter', sans-serif`)
- [ ] Both heading and body fonts loaded (if different)

### Animation Consistency
- [ ] Animation level is consistent throughout the deck
- [ ] Level 1: Only `.anim-fade-in-up` and basic fragments
- [ ] Level 2: Fades + slides + `.anim-stagger` + `.fragment`
- [ ] Level 3: Scene backgrounds + border effects + diverse entrances
- [ ] Level 4: Cinematic overlays + text shimmer + all effects
- [ ] No more than 3-4 different animation types per slide
- [ ] Delay classes create logical visual ordering

### CSS Files
- [ ] `core-animations.css` linked (required for ALL decks)
- [ ] `advanced-effects.css` linked (required for levels 3-4)
- [ ] CSS file paths are correct relative to the output location

---

## 4. Animation Validation

### Scene Backgrounds
- [ ] `scene-particles` has 10-15 `.particle` child divs
- [ ] `scene-aurora` has 3-4 `.aurora-band` child divs
- [ ] `scene-nebula` has `.nebula-cloud` + `.nebula-star` children
- [ ] `scene-ocean` has 3+ `.wave` children
- [ ] `scene-matrix` has 10-15 `.matrix-column` children
- [ ] `scene-starfield` has 3 `.star-layer` children
- [ ] `scene-fireflies` has 8-10 `.firefly` children
- [ ] Scene containers use `position:absolute; inset:0; z-index:0;`
- [ ] Content above scenes uses `position:relative; z-index:1;`

### Typewriter Effect
- [ ] `--tw-chars` CSS variable matches the actual character count
- [ ] Only applied to single-line text elements

### Stagger
- [ ] `.anim-stagger` applied to the parent container
- [ ] Animation classes (e.g., `.anim-fade-in-up`) on direct children
- [ ] No more than 12 children (stagger utilities support up to 12)

### Fragments
- [ ] Fragment indices are sequential (no gaps: 1, 2, 3…)
- [ ] Or indices omitted entirely (reveal.js auto-sequences)
- [ ] Fragment classes are valid: `fade-in`, `scale-up`, `blur`, `slide-up`, etc.

### Counters & Progress Bars (if used)
- [ ] `.number-counter` has `data-target` attribute with numeric value
- [ ] `data-prefix`, `data-suffix`, `data-decimals` are correct
- [ ] `.progress-bar-animated .fill` has `--target-width` set
- [ ] Animation engine plugin is loaded

---

## 5. Accessibility Validation

- [ ] All `<img>` tags have meaningful `alt` text (not "image" or "photo")
- [ ] Color contrast: text is readable against backgrounds
- [ ] Animation CSS includes `prefers-reduced-motion` support (handled by framework CSS)
- [ ] No content conveyed only through color (add labels or icons too)
- [ ] `lang` attribute set on `<html>` tag
- [ ] Heading hierarchy is logical (no jumping from h1 to h4)

---

## 6. Browser Compatibility

- [ ] Works when opened via `file://` protocol (no CORS issues)
- [ ] No localhost or external API dependencies (except CDNs)
- [ ] CDN links use HTTPS
- [ ] No ES module imports that require a server (use classic `<script>`)
- [ ] Fonts load from Google Fonts CDN (widely available)

---

## 7. Final Sanity Checks

- [ ] Open the file in a browser — does slide 1 render correctly?
- [ ] Press right arrow — do transitions work?
- [ ] Press S — do speaker notes appear?
- [ ] Check on different screen sizes — is content readable?
- [ ] Are all images/icons visible or gracefully handled if missing?
- [ ] Does the presentation tell a coherent story from start to finish?

---

## Quick Validation Command (for AI agents)

After generating the HTML, mentally walk through this 10-second check:

```
1. Search for "{{" → must find 0 results
2. Count <section> tags → matches expected slide count
3. Count <aside class="notes"> → matches slide count
4. Verify Reveal.initialize() exists → must be present
5. Check animation CSS links → core-animations.css must be linked
```

If any check fails, fix it before delivering the output.
