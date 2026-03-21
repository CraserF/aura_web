/**
 * SVG Skills section — inline SVG drawing, Bootstrap Icons, animation recipes.
 *
 * Level 1: Bootstrap Icons + decision guide + rules (visual alternatives to images)
 * Level 2: + SVG drawing recipes
 * Level 3+: + SVG animation recipes
 */
import type { TemplatePalette } from '../../templates';

export function buildSvgSection(pal?: TemplatePalette, animLevel: 1 | 2 | 3 | 4 = 2): string {
  const primary = pal?.primary ?? '#3b82f6';
  const accent = pal?.accent ?? '#8b5cf6';
  const heading = pal?.heading ?? '#fff';
  const mode = pal?.mode ?? 'dark';
  const surfaceFill = mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const subtleFill = mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  const bootstrapIconsBlock = `### Bootstrap Icons (CDN — include when you need icons beyond the 10 inline SVGs):
\`\`\`html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1/font/bootstrap-icons.min.css">
\`\`\`
Usage: \`<i class="bi bi-rocket-takeoff" style="font-size:24px; color:var(--primary);"></i>\`

**Popular icons:** bi-lightning-charge, bi-shield-check, bi-graph-up-arrow, bi-gear, bi-people, bi-globe2, bi-code-slash, bi-bar-chart-line, bi-check-circle, bi-arrow-right, bi-heart, bi-star, bi-trophy, bi-cpu, bi-database, bi-clipboard-data, bi-diagram-3, bi-pie-chart, bi-chat-dots, bi-calendar-event

**When to use Bootstrap Icons vs inline SVG:**
- **Bootstrap Icons:** Quick icons in cards, lists, badges, nav elements (use the CDN font class \`<i class="bi bi-NAME">\`)
- **Inline SVG:** Custom illustrations, animated visuals, diagrams, data charts, decorative scenes`;

  const decisionGuide = `### When to Use SVGs — Decision Guide:
| Scenario | Approach |
|----------|----------|
| Quick icons in cards/lists | Bootstrap Icons CDN (\`<i class="bi bi-NAME">\`) |
| Need a visual but no images allowed | Emoji at 3-6em, or Bootstrap Icons at 2-3em |
| Custom data visualization | Inline SVG (donut, bar chart, sparkline) |
| Flowchart or diagram | Inline SVG with arrow markers |
| Decorative illustration | Inline SVG shapes + CSS animation |
| Simple accent shape | CSS-only (border-radius, gradients) — no SVG needed |
| Text-only or minimal slides | Skip SVG entirely |

**CRITICAL — What to use INSTEAD of images:**
- Do NOT use \`<img>\` tags with external URLs — they will be stripped.
- Do NOT use \`background-image: url(http...)\` — it will be removed.
- DO use emoji at large size (3-6em) for visual impact.
- DO use Bootstrap Icons for iconography.
- DO use inline SVG for diagrams and data visualization.
- DO use CSS gradients, shapes, and patterns for decoration.`;

  const rules = `**Rules:**
- Max **2 SVG-heavy slides** per deck. Alternate with text/card slides for visual rhythm.
- Always include \`xmlns="http://www.w3.org/2000/svg"\` on all SVG elements.
- Always set explicit \`width\` and \`height\` on the outer \`<svg>\` element.
- Always include a \`viewBox\` attribute — without it, SVGs will not scale correctly.
- SVG colors should use palette tokens (\`${primary}\` for strokes, \`${surfaceFill}\` for backgrounds).
- NEVER use \`<image>\` elements inside SVGs with external URLs.`;

  // Level 1: Bootstrap Icons + decision guide + rules only (no SVG drawing recipes)
  if (animLevel < 2) {
    return `## SVG & ICON SKILLS

${bootstrapIconsBlock}

${decisionGuide}

${rules}`;
  }

  const svgRecipes = `### Inline SVG Recipes

**Arrow marker for diagrams (paste inside <svg> before using):**
\`\`\`html
<defs>
  <marker id="arrow" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
    <polygon points="0 0, 10 3.5, 0 7" fill="${primary}"/>
  </marker>
</defs>
\`\`\`

**SVG Donut Chart:**
\`\`\`html
<svg width="120" height="120" viewBox="0 0 42 42" xmlns="http://www.w3.org/2000/svg">
  <circle cx="21" cy="21" r="15.9" fill="none" stroke="${subtleFill}" stroke-width="3"/>
  <circle cx="21" cy="21" r="15.9" fill="none" stroke="${primary}" stroke-width="3" stroke-dasharray="75 25" stroke-dashoffset="25" stroke-linecap="round" style="transform:rotate(-90deg); transform-origin:center;"/>
  <text x="21" y="21" text-anchor="middle" dominant-baseline="central" fill="${heading}" font-size="8" font-weight="700">75%</text>
</svg>
\`\`\`

**SVG Bar Chart (vertical):**
\`\`\`html
<svg width="200" height="120" viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg">
  <rect x="10" y="80" width="30" height="40" rx="4" fill="${primary}" opacity="0.6"/>
  <rect x="50" y="40" width="30" height="80" rx="4" fill="${primary}" opacity="0.8"/>
  <rect x="90" y="20" width="30" height="100" rx="4" fill="${primary}"/>
  <rect x="130" y="50" width="30" height="70" rx="4" fill="${accent}" opacity="0.7"/>
  <rect x="170" y="60" width="30" height="60" rx="4" fill="${accent}" opacity="0.5"/>
</svg>
\`\`\`

**SVG Horizontal Bar Chart (for comparisons):**
\`\`\`html
<svg width="300" height="100" viewBox="0 0 300 100" xmlns="http://www.w3.org/2000/svg">
  <text x="0" y="20" fill="${heading}" font-size="11" font-weight="600">Category A</text>
  <rect x="80" y="8" width="180" height="18" rx="3" fill="${primary}" opacity="0.85"/>
  <text x="0" y="50" fill="${heading}" font-size="11" font-weight="600">Category B</text>
  <rect x="80" y="38" width="130" height="18" rx="3" fill="${primary}" opacity="0.6"/>
  <text x="0" y="80" fill="${heading}" font-size="11" font-weight="600">Category C</text>
  <rect x="80" y="68" width="90" height="18" rx="3" fill="${accent}" opacity="0.7"/>
</svg>
\`\`\`

**Simple Flowchart (3 nodes):**
\`\`\`html
<svg viewBox="0 0 500 80" width="100%" xmlns="http://www.w3.org/2000/svg">
  <defs><marker id="arr" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="8" orient="auto"><polygon points="0 0,10 3.5,0 7" fill="${primary}"/></marker></defs>
  <rect x="10" y="15" width="120" height="50" rx="10" fill="${surfaceFill}" stroke="${primary}" stroke-width="1.5"/>
  <text x="70" y="45" text-anchor="middle" fill="${heading}" font-size="13" font-weight="600">Input</text>
  <line x1="130" y1="40" x2="180" y2="40" stroke="${primary}" stroke-width="1.5" marker-end="url(#arr)"/>
  <rect x="180" y="15" width="120" height="50" rx="10" fill="${surfaceFill}" stroke="${primary}" stroke-width="1.5"/>
  <text x="240" y="45" text-anchor="middle" fill="${heading}" font-size="13" font-weight="600">Process</text>
  <line x1="300" y1="40" x2="350" y2="40" stroke="${primary}" stroke-width="1.5" marker-end="url(#arr)"/>
  <rect x="350" y="15" width="120" height="50" rx="10" fill="${surfaceFill}" stroke="${primary}" stroke-width="1.5"/>
  <text x="410" y="45" text-anchor="middle" fill="${heading}" font-size="13" font-weight="600">Output</text>
</svg>
\`\`\`

**SVG Progress Ring:**
\`\`\`html
<svg width="80" height="80" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
  <circle cx="18" cy="18" r="15.5" fill="none" stroke="${subtleFill}" stroke-width="2.5"/>
  <circle cx="18" cy="18" r="15.5" fill="none" stroke="${primary}" stroke-width="2.5" stroke-dasharray="85 15" stroke-dashoffset="25" stroke-linecap="round" style="transform:rotate(-90deg);transform-origin:center;"/>
  <text x="18" y="18" text-anchor="middle" dominant-baseline="central" fill="${heading}" font-size="7" font-weight="700">85%</text>
</svg>
\`\`\`

**SVG Icon with Animated Glow Ring:**
\`\`\`html
<svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
  <circle cx="30" cy="30" r="25" fill="${surfaceFill}" stroke="${primary}" stroke-width="1"/>
  <circle cx="30" cy="30" r="28" fill="none" stroke="${primary}" stroke-width="0.5" opacity="0.3" style="animation:svgPulseRing 2s ease-in-out infinite;transform-origin:center;"/>
  <!-- Place a 24x24 icon centered at (18, 18) -->
</svg>
\`\`\``;

  const animationRecipes = animLevel >= 3 ? `

### SVG Animation Recipes (CSS keyframes — apply via inline \`<style>\` or style attribute)

**Draw-in effect (stroke animation):**
\`\`\`css
@keyframes svgDrawIn { from { stroke-dashoffset: 200; } to { stroke-dashoffset: 0; } }
\`\`\`
Usage: set \`stroke-dasharray="200"\` on the path, then \`style="animation: svgDrawIn 1.5s ease forwards;"\`

**Pulse glow (scale + opacity):**
\`\`\`css
@keyframes svgPulse { 0%,100% { opacity:0.6; transform:scale(1); } 50% { opacity:1; transform:scale(1.08); } }
\`\`\`
Apply: \`style="animation: svgPulse 2.5s ease-in-out infinite; transform-origin:center;"\`

**Float animation:**
\`\`\`css
@keyframes svgFloat { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-6px); } }
\`\`\`

**Ripple outward (for status indicators):**
\`\`\`css
@keyframes svgRipple { from { r:8; opacity:0.5; } to { r:25; opacity:0; } }
\`\`\`
Apply to \`<circle>\` with \`style="animation: svgRipple 2s ease-out infinite;"\`

**Flowing dashed line (pipeline/connection animation):**
\`\`\`css
@keyframes svgFlowDash { to { stroke-dashoffset: -20; } }
\`\`\`
Usage: \`stroke-dasharray="8 4"\` + \`style="animation: svgFlowDash 1s linear infinite;"\`

**Spinning (for gears, loading, circular elements):**
\`\`\`css
@keyframes svgSpin { to { transform:rotate(360deg); } }
\`\`\`
Apply: \`style="animation: svgSpin 6s linear infinite; transform-origin:center;"\`

**Staggered bar chart entrance:**
\`\`\`css
@keyframes svgBarGrow { from { transform:scaleY(0); } to { transform:scaleY(1); } }
\`\`\`
Apply to each bar: \`style="transform-origin:bottom; animation:svgBarGrow 0.6s ease-out forwards; animation-delay:0.1s;"\` (increment delay per bar)

**Performance rules:**
- Use \`will-change:transform\` on animated SVG elements
- Prefer animating \`transform\` and \`opacity\` only
- Limit to 3-4 animated SVGs per slide
- Place \`@keyframes\` in a \`<style>\` tag inside the \`<section>\`, NOT in HTML attributes` : '';

  return `## SVG & ICON SKILLS

${bootstrapIconsBlock}

${svgRecipes}
${animationRecipes}

${decisionGuide}

${rules}`;
}
