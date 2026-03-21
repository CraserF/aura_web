/**
 * Quality section — self-verification checklist for the designer.
 *
 * Key improvements:
 * - Palette compliance check added
 * - Slide count verification against plan
 * - Layout variety verification
 * - Gotchas section with highest-value corrections
 */
import { GOTCHAS } from '../../workflow/skills/design-rules';

export function buildQualitySection(slideCount?: number): string {
  const slideCountCheck = slideCount
    ? `- [ ] **Slide count is exactly ${slideCount}.** Count your <section> elements. This is non-negotiable.`
    : '- [ ] **Slide count is at least 8.** A deck with fewer than 8 slides cannot cover the narrative arc.';

  const gotchasList = GOTCHAS.map((g) => `- ${g}`).join('\n');

  return `## QUALITY CHECKLIST — Verify EVERY item before outputting

### Structure:
- [ ] Google Fonts \`<link>\` is the FIRST line of output
${slideCountCheck}
- [ ] First slide is hero-title, last slide is closing-cta
- [ ] No two consecutive slides share the same layout pattern
- [ ] At least 4 different layout types used across the deck

### Palette Compliance:
- [ ] CSS vars (--primary, --accent, --heading-font, --body-font) defined on FIRST section ONLY — not duplicated on subsequent sections
- [ ] Every \`data-background-color\` uses the palette background or bgSubtle value — no invented colors
- [ ] Primary color used ONLY for accents (icons, badges, metrics, buttons) — never as body text
- [ ] Body text uses the body color token, NOT the heading color
- [ ] All text colors come from the palette table (heading, body, muted tokens)

### Styling:
- [ ] Every \`<section>\` has \`data-background-color\` set
- [ ] No markdown — pure HTML with inline styles
- [ ] No external image URLs (no Unsplash, no placeholders)
- [ ] Every text element has color, font-size, font-family
- [ ] Card styles match the palette mode (glass+blur for dark, shadow for light)
- [ ] Animation classes on all content blocks
- [ ] Stagger containers on grids/lists
- [ ] Heading hierarchy: h1 only on title slide, h2 on content slides, h3 inside cards
- [ ] Generous padding: 4rem 5rem section padding, 2rem card padding, 1.5-2rem grid gaps

### SIZE & LEGIBILITY (slides render at 1920×1080):
- [ ] **Body text is at LEAST 1.1em.** If text looks like fine print, it's too small.
- [ ] **Hero titles are at LEAST 4em.** They should feel impactful and dominant.
- [ ] **H2 slide titles are at LEAST 2.4em.** They must command attention.
- [ ] **No text element is smaller than 0.75em.** Even labels/badges must be readable.
- [ ] **Content fills the slide.** Does content cover at least 60-70% of the 1920×1080 area? If not, increase sizes and spacing.
- [ ] **Cards are substantial.** Card/panel components should be at least 150-200px tall.
- [ ] **Metric numbers are large and bold.** Stats should be 3.5-5em with font-weight 800.

## GOTCHAS — Common LLM generation failures to avoid

${gotchasList}

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
