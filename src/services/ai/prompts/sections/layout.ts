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

- Wrap all slide content in: \`<div style="max-width:90%; margin:0 auto; padding:2rem;">\`
- **Grid layouts:** \`display:grid; grid-template-columns:repeat(3,1fr); gap:1.2rem;\`
- **Flex layouts:** \`display:flex; gap:2rem; align-items:center;\`
- **Centered hero:** \`display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; text-align:center;\`
- **Split (text + visual):** \`display:grid; grid-template-columns:1fr 1fr; gap:2.5rem; align-items:center;\`
- **Max 4-5 bullet points** per slide, max 12 words per bullet

## CARD COMPONENT — ${mode.toUpperCase()} MODE

Every content card MUST use this exact pattern:
\`\`\`
${cardRecipe}
\`\`\`
${mode === 'dark'
    ? 'The glass effect (backdrop-filter:blur) creates layered depth on dark backgrounds.'
    : 'The shadow creates clean elevation on light backgrounds. Do NOT use backdrop-filter:blur on light mode.'}`;
}
