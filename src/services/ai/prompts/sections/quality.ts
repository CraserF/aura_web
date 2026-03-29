/**
 * Quality section — single-slide self-verification checklist.
 *
 * Focused on the CSS architecture, SVG composition, animation quality,
 * and responsive sizing requirements for standalone HTML slides.
 */

export function buildQualitySection(_slideCount?: number): string {
  return `## QUALITY CHECKLIST — Verify EVERY item before outputting

### Structure:
- [ ] Google Fonts \`<link>\` is the FIRST line of output
- [ ] \`<style>\` block is present with CSS classes and @keyframes
- [ ] Exactly ONE \`<section>\` element with \`data-background-color\` and \`style="padding:0; overflow:hidden;"\`
- [ ] A \`.slide-wrap\` (or similar) container div inside the section handles all layout
- [ ] Content uses CSS classes from the \`<style>\` block — NOT inline styles on every element

### CSS Architecture:
- [ ] At least 2-3 @keyframes animations defined in the \`<style>\` block
- [ ] Animation utility classes defined (e.g., .fd, .bob, .rip, .spin, .pulse)
- [ ] All sizing uses fixed **px** values only (font-size, padding, gap, margin)
- [ ] **Never** vw, vh, vmin, vmax, or clamp() with viewport units
- [ ] CSS class names are descriptive and scoped (won't collide with parent document)

### Visual Quality:
- [ ] Inline SVG illustrations present for visual slides (not just text or emoji)
- [ ] SVG elements have \`viewBox\` attribute set correctly
- [ ] SVG elements have \`xmlns="http://www.w3.org/2000/svg"\` where needed
- [ ] All text is clearly legible — dark text on light bg, light text on dark bg
- [ ] Content fills the 1920×1080 canvas — no large empty areas
- [ ] Content fits the 1920×1080 canvas — no cards, labels, or footer text cut off at edges
- [ ] Colors come ONLY from the provided palette — no invented hex values
- [ ] Footer text is subtle (around 10-13px visual size), never as large as body/subtitle text
- [ ] Wrapper/container padding stays within safe bounds (roughly 28-72px)

### Context Integrity:
- [ ] Do NOT copy brand names, companies, taglines, or domain-specific nouns from examples/templates/knowledge docs
- [ ] All labels, footer text, and metadata are rewritten to the user's requested context
- [ ] Example text is treated as placeholder structure, not reusable content

### Animation:
- [ ] Animations are smooth (only transform and opacity — never animate width/height/top/left)
- [ ] Staggered animation-delay on repeated elements (0s, 0.3s, 0.6s, 0.9s...)
- [ ] Total animated elements under ~50 for 60fps performance
- [ ] SVG animations use \`transform-box: fill-box\` and \`transform-origin: center\` where needed

### Integrity:
- [ ] No external images, scripts, or stylesheets (except Google Fonts and optionally Bootstrap Icons CDN)
- [ ] No JavaScript
- [ ] No markdown syntax — pure HTML
- [ ] HTML is valid (no unclosed tags)
- [ ] No \`<img>\` tags anywhere

## WHEN ADDING TO AN EXISTING DECK

If there are existing slides, output ALL slides (the complete deck). Return every \`<section>\`, not just the new/changed ones. The \`<style>\` block should be merged/updated to cover all slides.

## RESPONSE FORMAT

Output a single code block. NOTHING else — no explanation, no commentary.

\`\`\`html
<link href="..." rel="stylesheet">
<style>
  /* CSS classes, @keyframes, etc. */
</style>
<section data-background-color="..." style="padding:0; overflow:hidden;">
  <div class="slide-wrap">
    ...
  </div>
</section>
\`\`\``;
}
