/**
 * SVG section — inline SVG illustration guide for standalone HTML slides.
 *
 * Level 1: Bootstrap Icons + decision guide + rules
 * Level 2+: + SVG element recipes, composition guide, common icon paths
 * Level 3+: + animation recipes for SVG
 *
 * All SVG illustrations should be composed from atomic elements and
 * animated with CSS @keyframes defined in the slide's <style> block.
 */
import type { TemplatePalette } from '../../templates';

export function buildSvgSection(pal?: TemplatePalette, animLevel: 1 | 2 | 3 | 4 = 2): string {
  const primary = pal?.primary ?? '#0090B8';
  const accent = pal?.accent ?? '#008858';

  const bootstrapIconsBlock = `### Bootstrap Icons (CDN — include when you need icons):
\`\`\`html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1/font/bootstrap-icons.min.css">
\`\`\`
Usage: \`<i class="bi bi-rocket-takeoff" style="font-size:24px; color:${primary};"></i>\`

**When to use Bootstrap Icons vs inline SVG:**
- **Bootstrap Icons:** Quick icons in cards, lists, badges
- **Inline SVG:** Custom illustrations, animated visuals, diagrams, data charts, decorative scenes`;

  const decisionGuide = `### SVG Decision Guide:
| Scenario | Approach |
|----------|----------|
| Quick icons in cards | Bootstrap Icons CDN |
| Custom data visualization | Inline SVG (donut, bar chart, sparkline) |
| Flowchart or diagram | Inline SVG with animated paths |
| Decorative background scene | Full-slide SVG overlay at z-index 2 |
| Real-world subject (person, animal) | Large emoji (4-8em) + abstract SVG accents |

**CRITICAL:** No \`<img>\` tags, no external URLs, no \`background-image: url()\`. Use inline SVG, emoji, Bootstrap Icons, or CSS shapes.`;

  // Level 1: basics only
  if (animLevel < 2) {
    return `## SVG & ICON SKILLS

${bootstrapIconsBlock}

${decisionGuide}

**Rules:**
- Always include \`xmlns="http://www.w3.org/2000/svg"\` on SVG elements
- Always set \`viewBox\` on SVGs — without it, they won't scale correctly
- SVG colors should use palette tokens
- Place @keyframes in the \`<style>\` block, not in HTML attributes`;
  }

  const svgCanvasSetup = `### SVG Canvas Setup

**Full-slide background overlay** (position absolute, covers entire slide):
\`\`\`html
<svg style="position:absolute; inset:0; width:100%; height:100%;
            z-index:2; pointer-events:none;"
     viewBox="0 0 1280 720"
     preserveAspectRatio="xMidYMid slice"
     xmlns="http://www.w3.org/2000/svg">
  <!-- All background illustrations go here -->
</svg>
\`\`\`

**Content-level SVG strip** (inside the content div):
\`\`\`html
<div style="width:100%; height:clamp(100px,18vh,165px);">
  <svg width="100%" height="100%"
       viewBox="0 0 900 140"
       preserveAspectRatio="xMidYMid meet"
       xmlns="http://www.w3.org/2000/svg">
    <!-- Strip illustrations -->
  </svg>
</div>
\`\`\`

| Context | viewBox | preserveAspectRatio |
|---------|---------|---------------------|
| Full-slide background | 0 0 1280 720 | xMidYMid slice |
| Content strip | 0 0 900 140 | xMidYMid meet |
| Square icon | 0 0 100 100 | xMidYMid meet |`;

  const elementRecipes = `### SVG Element Recipes

**Wave Bands (background):**
\`\`\`xml
<g style="animation:waveFlow 8s linear infinite;">
  <path d="M0,560 Q80,540 160,560 Q240,580 320,560 Q400,540 480,560
           Q560,580 640,560 Q720,540 800,560 Q880,580 960,560
           L960,720 L0,720 Z"
        fill="${primary}" opacity="0.12"/>
</g>
\`\`\`

**Flowing Pipeline / Connections:**
\`\`\`xml
<path style="animation:streamFlow 2s linear infinite;"
      d="M180,70 Q250,55 330,70 Q410,85 450,70 Q490,55 570,70"
      fill="none" stroke="${primary}" stroke-width="2.5"
      stroke-dasharray="16 8" opacity="0.6"/>
\`\`\`

**Nexus / Hub Node with Ripple:**
\`\`\`xml
<circle cx="450" cy="70" r="22" fill="none" stroke="${primary}" stroke-width="2.5" opacity="0.9"/>
<circle cx="450" cy="70" r="6" fill="${primary}" opacity="0.7"/>
<circle style="animation:rippleOut 2.5s ease-out infinite;"
        cx="450" cy="70" r="22" fill="none" stroke="${primary}" stroke-width="1.5"/>
\`\`\`

**Network Nodes + Dashed Connection:**
\`\`\`xml
<circle cx="100" cy="280" r="8" fill="none" stroke="${accent}" stroke-width="1.5" opacity="0.5"/>
<circle cx="100" cy="280" r="4" fill="${accent}" opacity="0.4"/>
<line x1="100" y1="280" x2="160" y2="350"
      stroke="${accent}" stroke-width="1" stroke-dasharray="4 3" opacity="0.3"/>
\`\`\`

**Data Stream (floating particles + grid):**
\`\`\`xml
<line x1="720" y1="0" x2="720" y2="720" stroke="${accent}" stroke-width="1" opacity="0.08"/>
<text style="animation:particleUp 3s ease-out infinite;"
      x="700" y="600" font-family="monospace" font-size="9"
      fill="${accent}" opacity="0.4">01</text>
\`\`\`

**Glowing Seam / Divider (vertical gradient that fades at edges):**
\`\`\`xml
<defs>
  <linearGradient id="seamGrad" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="${primary}" stop-opacity="0"/>
    <stop offset="50%" stop-color="${primary}" stop-opacity="1"/>
    <stop offset="100%" stop-color="${primary}" stop-opacity="0"/>
  </linearGradient>
</defs>
<rect x="635" y="0" width="10" height="720" fill="url(#seamGrad)" opacity="0.6"/>
\`\`\``;

  const iconPaths = `### Common SVG Icon Paths (fit ~100×100 coordinate space)

**Water Drop:** \`M50,10 Q72,35 78,55 Q85,80 50,92 Q15,80 22,55 Q28,35 50,10 Z\`
**Shield:** \`M50,10 L80,25 L80,55 Q80,80 50,95 Q20,80 20,55 L20,25 Z\`
**Gear:** \`M50,15 L55,25 L65,22 L62,32 L72,35 L65,42 L70,52 L60,50 L55,60 L50,50 L45,60 L40,50 L30,52 L35,42 L28,35 L38,32 L35,22 L45,25 Z\`
**Globe:** \`<circle cx="50" cy="50" r="38"/> <ellipse cx="50" cy="50" rx="20" ry="38"/> <line x1="12" y1="50" x2="88" y2="50"/>\`
**Bar Chart:** \`<rect x="15" y="50" w="15" h="40"/> <rect x="35" y="30" w="15" h="60"/> <rect x="55" y="15" w="15" h="75"/> <rect x="75" y="40" w="15" h="50"/>\`
**Lightning:** \`M55,10 L30,50 L48,50 L42,90 L70,45 L52,45 Z\`
**Leaf:** \`M50,90 Q30,70 20,50 Q10,25 40,15 Q55,10 65,20 Q80,35 75,55 Q70,75 50,90 Z\`
**Cloud:** \`M25,65 Q10,65 10,52 Q10,40 22,38 Q20,22 38,20 Q52,18 58,30 Q62,20 75,25 Q88,30 88,45 Q88,58 78,62 Q80,65 75,65 Z\``;

  const compositionGuide = `### Composing Custom SVG Illustrations

1. **Identify the concepts** — What are the 2-3 key themes? (e.g., water + data)
2. **Pick a representative icon for each** — Drop, gear, server, globe, chart, shield
3. **Connect them** — Use flowing pipeline paths (Q-curve Béziers) or dashed connection lines
4. **Add atmosphere** — Background grid lines (opacity 0.06-0.08), wave bands, floating particles
5. **Add a nexus point** — Where concepts meet, place a hub node with ripple animation
6. **Layer with clipPath** — For split layouts, clip elements to each panel's half`;

  const svgRules = `### SVG Style Rules:
| Property | Value Range | Notes |
|----------|-------------|-------|
| Stroke width (detail) | 0.5-1.2px | Grid lines, connections |
| Stroke width (primary) | 1.5-2.5px | Icons, outlines, pipelines |
| Fill opacity (shapes) | 0.08-0.25 | Low enough to be atmospheric |
| Fill opacity (dots) | 0.4-0.7 | Visible but not dominant |
| stroke-linecap | round | Always, for cleaner endings |
| rx (rounded rects) | 3px | Server racks, badges |

- Always include \`xmlns="http://www.w3.org/2000/svg"\`
- Always set \`viewBox\` — without it, SVGs won't scale
- SVG colors from palette tokens only
- Place @keyframes in the \`<style>\` block
- Use \`pointer-events:none\` on background SVG overlays`;

  return `## SVG & ICON SKILLS

${bootstrapIconsBlock}

${svgCanvasSetup}

${elementRecipes}

${iconPaths}

${compositionGuide}

${decisionGuide}

${svgRules}`;
}
