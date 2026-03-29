/**
 * Layout section — layout system, mode-aware card recipes.
 */
import type { TemplatePalette } from '../../templates';

export function buildLayoutSection(pal?: TemplatePalette): string {
  const mode = pal?.mode ?? 'dark';

  const cardRecipe = mode === 'dark'
    ? `background: ${pal?.surface ?? 'rgba(255,255,255,0.04)'};
border: 1px solid ${pal?.border ?? 'rgba(255,255,255,0.08)'};
border-radius: 12px;
padding: 1.5rem;
backdrop-filter: blur(12px);
-webkit-backdrop-filter: blur(12px);`
    : `background: ${pal?.surface ?? '#ffffff'};
border: 1px solid ${pal?.border ?? '#e2e8f0'};
border-radius: 12px;
padding: 1.5rem;
box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);`;

  return `## LAYOUT SYSTEM

**STAGE: 1920×1080 pixels (virtual canvas, scaled by CSS transform).** Use fixed px units for ALL sizing — NEVER vw/vh/vmin/vmax.

### Content Wrapper:
Wrap slide content in a full-size container (width:100%, height:100%, padding:px values).

**Use fixed px for all sizing** — padding, gap, margin, font-size, width, height.
Theme padding: 40–72px. Footer lane: min 16px bottom.

See example files for layout patterns (flex, grid, split, card layouts).

### Layout Patterns:
- **Grid layouts:** \`display:grid; grid-template-columns:repeat(3,1fr); gap:1.5rem;\`
- **Flex layouts:** \`display:flex; gap:2.5rem; align-items:center;\`
- **Centered hero:** \`display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; text-align:center;\` — hero titles should be absolutely dominant, taking up 40-50% of the slide height via large font-size
- **Split (text + visual):** \`display:grid; grid-template-columns:1fr 1fr; gap:3rem; align-items:center; height:100%;\` — each half fills full height
- **Max 4-5 bullet points** per slide, max 12 words per bullet

### Space Utilization Rules:
1. **Content should vertically span at least 70% of the slide height.** If your content only occupies a small cluster in the center, add more padding, increase font sizes, or spread cards/elements across the full area.
2. **Grid and card layouts should stretch wide.** Use \`width:100%\` on grids. Cards should be substantial (minimum 200px tall on content slides).
3. **Hero/title slides:** The title text itself should be the centerpiece filling at least 30% of the slide height. Add generous spacing (2-3rem) between title and subtitle.
4. **Metric slides:** Each metric card should be tall enough (min 140px) so numbers feel large and impactful without clipping.
5. **Never leave more than 40% of the slide as blank/empty space** (whitespace is good, but vast empty areas make slides look unfinished).
6. **Never clip content at top/bottom edges.** If cards or footer are cut off, reduce card heights/font sizes/gaps before increasing wrapper padding.

## CARD COMPONENT — ${mode.toUpperCase()} MODE

Every content card MUST use this exact pattern:
\`\`\`
${cardRecipe}
\`\`\`
${mode === 'dark'
    ? 'The glass effect (backdrop-filter:blur) creates layered depth on dark backgrounds.'
    : 'The shadow creates clean elevation on light backgrounds. Do NOT use backdrop-filter:blur on light mode.'}`;
}
