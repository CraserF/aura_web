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
- [ ] Card styles match the palette mode (glass+blur for dark, shadow for light)
- [ ] Primary color used ONLY for accents (icons, badges, metrics, buttons) — never as body text
- [ ] Body text uses the body color token, NOT the heading color
- [ ] Animation classes on all content blocks
- [ ] Stagger containers on grids/lists
- [ ] No two consecutive slides share the same layout pattern
- [ ] At least 40% of each slide is whitespace
- [ ] Heading hierarchy: h1 only on title slide, h2 on content slides, h3 inside cards
- [ ] Title slide is first, CTA/closing is last
- [ ] Generous padding: 2rem section padding, 1.5rem card padding, 1-1.5rem grid gaps

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
