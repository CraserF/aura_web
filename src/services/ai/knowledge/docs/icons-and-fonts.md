# Open-Source Icon Sets & Font Themes

> CDN links, usage patterns, and curated font pairings organized by presentation theme.

---

## Part 1 — Icon Sets

### Quick-Pick Guide

| Icon Set | Style | Count | Best For | CDN Size |
|---|---|---|---|---|
| **Lucide** | Outlined stroke | 1,500+ | Modern / tech / SaaS | ~30 KB |
| **Heroicons** | Outlined + solid | 300+ | Clean / corporate | ~15 KB |
| **Phosphor** | 6 weights per icon | 1,200+ | Versatile / creative | ~40 KB |
| **Tabler Icons** | Outlined stroke | 4,600+ | Largest free set | ~45 KB |
| **Bootstrap Icons** | Outlined + filled | 2,000+ | Bootstrap-familiar | ~35 KB |
| **Material Symbols** | Rounded / sharp / outlined | 2,500+ | Google / Android | ~50 KB |
| **Font Awesome Free** | Solid + regular + brands | 2,000+ | Brand logos, classic | ~40 KB |
| **Remix Icon** | Outlined + filled | 2,800+ | Dual-tone versatility | ~30 KB |
| **Iconoir** | Outlined stroke | 1,500+ | Minimalist / elegant | ~25 KB |

---

### Lucide Icons
**Recommended for**: Tech, startup, modern presentations

```html
<!-- CDN (SVG sprite via unpkg) -->
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
<script>lucide.createIcons();</script>

<!-- Usage — just add the data-lucide attribute -->
<i data-lucide="rocket" style="width:24px; height:24px; color:var(--primary);"></i>
<i data-lucide="shield-check" style="width:24px; height:24px;"></i>
<i data-lucide="zap" style="width:24px; height:24px;"></i>
<i data-lucide="bar-chart-3" style="width:24px; height:24px;"></i>
```

**Popular icons**: `rocket`, `zap`, `shield-check`, `bar-chart-3`, `code-2`, `globe`, `layers`, `lock`, `terminal`, `trending-up`, `users`, `check-circle`, `arrow-right`, `settings`, `database`, `cloud`, `cpu`, `git-branch`, `heart`, `star`

**Initialization**: Call `lucide.createIcons()` after reveal.js is ready:
```html
<script>
  Reveal.on('ready', () => lucide.createIcons());
  Reveal.on('slidechanged', () => lucide.createIcons());
</script>
```

---

### Heroicons
**Recommended for**: Corporate, clean, professional presentations

```html
<!-- Use inline SVGs (copy from heroicons.com) -->
<!-- Outline 24px -->
<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
     stroke-width="1.5" stroke="currentColor" style="width:24px;height:24px;">
  <path stroke-linecap="round" stroke-linejoin="round" d="M4.26 10.147a60.438 ..."/>
</svg>

<!-- Or use the React/Vue library (not needed for reveal.js — use raw SVG) -->
```

**Tip**: Copy SVG from https://heroicons.com and paste directly into slides. Set `stroke="currentColor"` so colors inherit from the parent.

---

### Phosphor Icons
**Recommended for**: Creative, versatile presentations (6 weights: thin, light, regular, bold, fill, duotone)

```html
<!-- CDN -->
<script src="https://unpkg.com/@phosphor-icons/web@2"></script>

<!-- Usage -->
<i class="ph ph-rocket-launch" style="font-size:32px; color:var(--primary);"></i>
<i class="ph-bold ph-lightning" style="font-size:32px;"></i>
<i class="ph-duotone ph-chart-line-up" style="font-size:32px;"></i>
<i class="ph-fill ph-shield-check" style="font-size:32px;"></i>
```

**Weights**: `ph` (regular), `ph-thin`, `ph-light`, `ph-bold`, `ph-fill`, `ph-duotone`

---

### Tabler Icons
**Recommended for**: Any project — largest free icon set

```html
<!-- CDN (web font) -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css">

<!-- Usage -->
<i class="ti ti-rocket" style="font-size:24px; color:var(--primary);"></i>
<i class="ti ti-brand-github" style="font-size:24px;"></i>
```

---

### Bootstrap Icons
**Recommended for**: Familiar, broadly known set

```html
<!-- CDN -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1/font/bootstrap-icons.min.css">

<!-- Usage -->
<i class="bi bi-rocket-takeoff" style="font-size:24px; color:var(--primary);"></i>
<i class="bi bi-graph-up-arrow" style="font-size:24px;"></i>
```

---

### Material Symbols
**Recommended for**: Google ecosystem, Android-style presentations

```html
<!-- CDN (variable font — supports weight, fill, grade, optical size) -->
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0">

<!-- Usage -->
<span class="material-symbols-rounded" style="font-size:24px; color:var(--primary);">rocket_launch</span>
<span class="material-symbols-rounded" style="font-size:24px;">analytics</span>
```

---

### Font Awesome Free
**Recommended for**: Brand logos, social icons, classic presentations

```html
<!-- CDN -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">

<!-- Usage -->
<i class="fa-solid fa-rocket" style="font-size:24px; color:var(--primary);"></i>
<i class="fa-brands fa-github" style="font-size:24px;"></i>
<i class="fa-brands fa-linkedin" style="font-size:24px;"></i>
<i class="fa-brands fa-twitter" style="font-size:24px;"></i>
```

---

### Remix Icon
**Recommended for**: Dual-tone icon needs, large variety

```html
<!-- CDN -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/remixicon@4/fonts/remixicon.min.css">

<!-- Usage -->
<i class="ri-rocket-2-line" style="font-size:24px; color:var(--primary);"></i>
<i class="ri-rocket-2-fill" style="font-size:24px;"></i>
```

---

### Iconoir
**Recommended for**: Minimal, elegant, thin-line presentations

```html
<!-- CDN -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/iconoir-icons/iconoir@main/css/iconoir.css">

<!-- Usage -->
<i class="iconoir-rocket" style="font-size:24px; color:var(--primary);"></i>
```

---

### Using Inline SVG (Universal — No CDN Required)

When you don't want external dependencies, paste SVG directly:

```html
<!-- Checkmark circle (Lucide style) -->
<svg width="32" height="32" viewBox="0 0 24 24" fill="none"
     stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
  <polyline points="22 4 12 14.01 9 11.01"/>
</svg>

<!-- Arrow right -->
<svg width="24" height="24" viewBox="0 0 24 24" fill="none"
     stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <line x1="5" y1="12" x2="19" y2="12"/>
  <polyline points="12 5 19 12 12 19"/>
</svg>
```

**Common SVG icons for slides** (paste-ready, no CDN):

| Icon | SVG |
|---|---|
| Checkmark | `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>` |
| X / Cross | `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>` |
| Arrow Right | `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>` |
| Star | `<svg width="20" height="20" viewBox="0 0 24 24" fill="var(--primary)" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>` |
| Lightning | `<svg width="20" height="20" viewBox="0 0 24 24" fill="var(--primary)" stroke="none"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>` |

---

## Part 2 — Font Themes

### How to Load Google Fonts in Reveal.js

Add this in the `<head>` of your HTML file:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=FONT_NAME:wght@400;600;700&display=swap" rel="stylesheet">
```

Then apply via CSS custom properties:
```html
<style>
  :root {
    --heading-font: 'HEADING_FONT', sans-serif;
    --body-font: 'BODY_FONT', sans-serif;
  }
  .reveal h1, .reveal h2, .reveal h3 { font-family: var(--heading-font); }
  .reveal { font-family: var(--body-font); }
</style>
```

---

### Theme: Corporate / Business

Clean, trustworthy, professional.

| Role | Font | Import |
|---|---|---|
| Headings | **Inter** (700) | `family=Inter:wght@400;600;700` |
| Body | **Inter** (400) | (same) |
| Accent/Data | **IBM Plex Mono** (500) | `family=IBM+Plex+Mono:wght@400;500` |

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
```
```css
:root { --heading-font: 'Inter', sans-serif; --body-font: 'Inter', sans-serif; --mono-font: 'IBM Plex Mono', monospace; }
```

**Alternatives**: Lato, Source Sans 3, Noto Sans, Roboto

---

### Theme: Tech / Startup

Modern, geometric, confident.

| Role | Font | Import |
|---|---|---|
| Headings | **Space Grotesk** (700) | `family=Space+Grotesk:wght@400;600;700` |
| Body | **Inter** (400) | `family=Inter:wght@400;600` |
| Code | **JetBrains Mono** (400) | `family=JetBrains+Mono:wght@400` |

```html
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=Inter:wght@400;600&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
```
```css
:root { --heading-font: 'Space Grotesk', sans-serif; --body-font: 'Inter', sans-serif; --mono-font: 'JetBrains Mono', monospace; }
```

**Alternatives**: Outfit, Sora, Manrope, Urbanist

---

### Theme: Creative / Portfolio

Expressive, artistic, eye-catching.

| Role | Font | Import |
|---|---|---|
| Headings | **Clash Display** (via Fontshare) or **Sora** (700) | `family=Sora:wght@400;700` |
| Body | **DM Sans** (400) | `family=DM+Sans:wght@400;500` |
| Accent | **Caveat** (handwritten) | `family=Caveat:wght@400;700` |

```html
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;700&family=DM+Sans:wght@400;500&family=Caveat:wght@400;700&display=swap" rel="stylesheet">
```
```css
:root { --heading-font: 'Sora', sans-serif; --body-font: 'DM Sans', sans-serif; --accent-font: 'Caveat', cursive; }
```

**Alternatives**: Nunito, Comfortaa, Quicksand

---

### Theme: Editorial / Storytelling

Elegant, classic, narrative-driven.

| Role | Font | Import |
|---|---|---|
| Headings | **Playfair Display** (700) | `family=Playfair+Display:wght@400;700` |
| Body | **Source Serif 4** (400) | `family=Source+Serif+4:wght@400;600` |
| Accent | **Cormorant Garamond** | `family=Cormorant+Garamond:wght@400;600` |

```html
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Source+Serif+4:wght@400;600&display=swap" rel="stylesheet">
```
```css
:root { --heading-font: 'Playfair Display', serif; --body-font: 'Source Serif 4', serif; }
```

**Alternatives**: Lora, Merriweather, Crimson Text, Libre Baskerville

---

### Theme: Sci-Fi / Futuristic

Futuristic, techy, neon-ready.

| Role | Font | Import |
|---|---|---|
| Headings | **Orbitron** (700) | `family=Orbitron:wght@400;700;900` |
| Body | **Rajdhani** (400) | `family=Rajdhani:wght@400;500;600` |
| Code/Data | **Share Tech Mono** | `family=Share+Tech+Mono` |

```html
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@400;500;600&family=Share+Tech+Mono&display=swap" rel="stylesheet">
```
```css
:root { --heading-font: 'Orbitron', sans-serif; --body-font: 'Rajdhani', sans-serif; --mono-font: 'Share Tech Mono', monospace; }
```

**Alternatives**: Exo 2, Audiowide, Electrolize, Michroma, Chakra Petch

---

### Theme: Minimal / Clean

Restrained, whitespace-heavy, Swiss-inspired.

| Role | Font | Import |
|---|---|---|
| Headings | **Plus Jakarta Sans** (700) | `family=Plus+Jakarta+Sans:wght@400;600;700` |
| Body | **Plus Jakarta Sans** (400) | (same) |
| Code | **Fira Code** (400) | `family=Fira+Code:wght@400` |

```html
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&family=Fira+Code:wght@400&display=swap" rel="stylesheet">
```
```css
:root { --heading-font: 'Plus Jakarta Sans', sans-serif; --body-font: 'Plus Jakarta Sans', sans-serif; --mono-font: 'Fira Code', monospace; }
```

**Alternatives**: General Sans (Fontshare), Satoshi (Fontshare), Geist (Vercel)

---

### Theme: Luxury / Premium

Refined, high-end, aspirational.

| Role | Font | Import |
|---|---|---|
| Headings | **Cormorant Garamond** (600) | `family=Cormorant+Garamond:wght@400;600;700` |
| Body | **Montserrat** (400) | `family=Montserrat:wght@300;400;600` |

```html
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Montserrat:wght@300;400;600&display=swap" rel="stylesheet">
```
```css
:root { --heading-font: 'Cormorant Garamond', serif; --body-font: 'Montserrat', sans-serif; }
```

**Alternatives**: Italiana, Bodoni Moda, Cinzel

---

### Theme: Educational / Academic

Clear, readable, accessible.

| Role | Font | Import |
|---|---|---|
| Headings | **Nunito** (700) | `family=Nunito:wght@400;600;700` |
| Body | **Open Sans** (400) | `family=Open+Sans:wght@400;600` |
| Code | **Source Code Pro** | `family=Source+Code+Pro:wght@400` |

```html
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&family=Open+Sans:wght@400;600&family=Source+Code+Pro:wght@400&display=swap" rel="stylesheet">
```
```css
:root { --heading-font: 'Nunito', sans-serif; --body-font: 'Open Sans', sans-serif; --mono-font: 'Source Code Pro', monospace; }
```

**Alternatives**: Rubik, Work Sans, Poppins

---

### Theme: Playful / Casual

Friendly, approachable, fun.

| Role | Font | Import |
|---|---|---|
| Headings | **Fredoka** (600) | `family=Fredoka:wght@400;600;700` |
| Body | **Quicksand** (400) | `family=Quicksand:wght@400;500;600` |
| Accent | **Permanent Marker** | `family=Permanent+Marker` |

```html
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600;700&family=Quicksand:wght@400;500;600&family=Permanent+Marker&display=swap" rel="stylesheet">
```
```css
:root { --heading-font: 'Fredoka', sans-serif; --body-font: 'Quicksand', sans-serif; --accent-font: 'Permanent Marker', cursive; }
```

**Alternatives**: Baloo 2, Patrick Hand, Bubblegum Sans

---

### Theme: Data / Dashboard

Numbers-focused, dense, scannable.

| Role | Font | Import |
|---|---|---|
| Headings | **DM Sans** (700) | `family=DM+Sans:wght@400;500;700` |
| Body | **DM Sans** (400) | (same) |
| Data/Code | **DM Mono** (400) | `family=DM+Mono:wght@400` |

```html
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=DM+Mono:wght@400&display=swap" rel="stylesheet">
```
```css
:root { --heading-font: 'DM Sans', sans-serif; --body-font: 'DM Sans', sans-serif; --mono-font: 'DM Mono', monospace; }
```

**Alternatives**: Barlow, IBM Plex Sans, Inconsolata for data

---

### Free Font Providers (Non-Google)

| Provider | URL | Best For |
|---|---|---|
| **Fontshare** | https://www.fontshare.com | Premium-quality free fonts (Clash Display, Satoshi, General Sans, Cabinet Grotesk) |
| **Fontsource** | https://fontsource.org | npm-installable, self-hosted Google Fonts |
| **The League of Moveable Type** | https://www.theleagueofmoveabletype.com | Curated open-source typefaces |
| **Font Squirrel** | https://www.fontsquirrel.com | 100% free for commercial use |
| **Bunny Fonts** | https://fonts.bunny.net | GDPR-compliant Google Fonts mirror |

---

### Quick Font Reference Table

| Theme | Heading | Body | Mono/Accent |
|---|---|---|---|
| Corporate | Inter | Inter | IBM Plex Mono |
| Tech | Space Grotesk | Inter | JetBrains Mono |
| Creative | Sora | DM Sans | Caveat |
| Editorial | Playfair Display | Source Serif 4 | — |
| Sci-Fi | Orbitron | Rajdhani | Share Tech Mono |
| Minimal | Plus Jakarta Sans | Plus Jakarta Sans | Fira Code |
| Luxury | Cormorant Garamond | Montserrat | — |
| Educational | Nunito | Open Sans | Source Code Pro |
| Playful | Fredoka | Quicksand | Permanent Marker |
| Dashboard | DM Sans | DM Sans | DM Mono |
