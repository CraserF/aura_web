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
- [ ] Heading hierarchy: h1 only on title slide, h2 on content slides, h3 inside cards
- [ ] Title slide is first, CTA/closing is last
- [ ] Generous padding: 4rem 5rem section padding, 2rem card padding, 1.5-2rem grid gaps

### SIZE & LEGIBILITY CHECKS (slides render at 1920×1080):
- [ ] **Body text is at LEAST 1.1em (≈40px).** If text looks like fine print, it's too small.
- [ ] **Hero titles are at LEAST 4em (≈144px).** They should feel impactful and dominant.
- [ ] **H2 slide titles are at LEAST 2.4em (≈86px).** They must command attention.
- [ ] **No text element is smaller than 0.75em (≈27px).** Even labels/badges must be readable.
- [ ] **Content fills the slide.** Does content cover at least 60-70% of the 1920×1080 area? If not, increase sizes and spacing.
- [ ] **Cards are substantial.** Card/panel components should be at least 150-200px tall, not tiny chips.
- [ ] **Metric numbers are large and bold.** Stats should be 3.5-5em with font-weight 800.

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
