/**
 * Quality section — single-slide self-verification checklist.
 *
 * Focused on the CSS architecture, SVG composition, animation quality,
 * and responsive sizing requirements for standalone HTML slides.
 */

export function buildQualitySection(_slideCount?: number): string {
  return `## FINAL SELF-CHECK

Before you answer, verify all of the following:
- Google Fonts \`<link>\` is the FIRST line of output
- Output contains one \`<style>\` block and one valid \`<section data-background-color=... style="padding:0; overflow:hidden;">\`
- All sizing uses fixed \`px\` only — never \`vw\`, \`vh\`, or viewport-based \`clamp()\`
- The slide has one dominant focal area, clear contrast, and enough breathing room without looking sparse
- Copy is concise and visual-first: short headings, short labels, minimal paragraph text
- Colors come only from the provided palette; no invented hex values
- No example/template names or brand references leak into the output
- No external images, scripts, or \`<img>\` tags are used
- Motion relies on transform/opacity/stroke effects with sensible staggering
- Return a single HTML code block and nothing else`;
}
