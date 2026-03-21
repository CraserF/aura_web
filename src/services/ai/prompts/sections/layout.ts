/**
 * Layout section — layout system, glassmorphism cards.
 */
import type { TemplatePalette } from '../../templates';

export function buildLayoutSection(pal?: TemplatePalette): string {
  return `## LAYOUT SYSTEM

- Wrap all slide content in: \`<div style="max-width:90%; margin:0 auto; padding:2rem;">\`
- **Grid layouts:** \`display:grid; grid-template-columns:repeat(3,1fr); gap:1.2rem;\`
- **Flex layouts:** \`display:flex; gap:2rem; align-items:center;\`
- **Centered hero:** \`display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; text-align:center;\`
- **Split (text + visual):** \`display:grid; grid-template-columns:1fr 1fr; gap:2.5rem; align-items:center;\`
- **Max 4-5 bullet points** per slide, max 12 words per bullet

## GLASSMORPHISM CARDS — The Core Building Block

Every content card should use this pattern for a premium look:
\`\`\`
background: ${pal?.surface ?? 'rgba(255,255,255,0.04)'};
border: 1px solid ${pal?.border ?? 'rgba(255,255,255,0.08)'};
border-radius: 16px;
padding: 1.8rem;
backdrop-filter: blur(12px);
\`\`\``;
}
