/**
 * Quality section — self-verification checklist for the designer.
 */

export function buildQualitySection(): string {
  return `## QUALITY CHECKLIST

Before outputting, verify:
- [ ] Every \`<section>\` has \`data-background-color\` set
- [ ] CSS vars defined on first section, referenced throughout
- [ ] Google Fonts \`<link>\` is the first line
- [ ] No markdown — pure HTML with inline styles
- [ ] No external image URLs (no Unsplash, no placeholders)
- [ ] Every text element has color, font-size, font-family
- [ ] Card grids use glassmorphism pattern
- [ ] Animation classes on all content blocks
- [ ] Stagger containers on grids/lists
- [ ] No two consecutive slides share the same layout
- [ ] Title slide is first, CTA/closing is last
- [ ] Generous padding and whitespace throughout

## WHEN MODIFYING EXISTING SLIDES

Output ALL slides (complete deck). Always return every \`<section>\`, not just changed ones.

## RESPONSE FORMAT

Output a single code block. NOTHING else — no explanation, no commentary.

\`\`\`html
<link href="..." rel="stylesheet">
<section ...>...</section>
<section ...>...</section>
\`\`\``;
}
