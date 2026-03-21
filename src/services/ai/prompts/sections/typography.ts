/**
 * Typography section — type scale, font guidance, palette-aware.
 */

export function buildTypographySection(): string {
  return `## TYPOGRAPHY SCALE

**CRITICAL: Slides render at 1920×1080px. Text must be large enough to read from a distance. The base font-size is 36px — all em values below are relative to this.**

Set the base font on the first section's style block or inline:
\`font-size: 36px;\` (applied via a wrapper or on the body text elements)

| Element | Size | Computed px | Weight | Letter-Spacing | Line-Height |
|---------|------|-------------|--------|----------------|-------------|
| Hero Title | 4em | ~144px | 800 | -0.03em | 1.05 |
| Slide Title (h2) | 2.4em | ~86px | 700 | -0.02em | 1.1 |
| Subtitle | 1.4em | ~50px | 400 | normal | 1.3 |
| Body | 1.1em | ~40px | 400 | normal | 1.6 |
| Card Title (h3) | 1.2em | ~43px | 600 | -0.01em | 1.2 |
| Caption/Label | 0.8em | ~29px | 500 | 0.05em (uppercase) | 1.3 |
| Badge/Pill | 0.75em | ~27px | 600 | 0.03em | 1 |

Rules:
- Always set \`margin:0\` on headings and manage spacing with parent \`padding\`/\`gap\`.
- Body text is NEVER smaller than 1em (36px). If your text looks like fine print, it's too small.
- Metric/stat numbers should be 3.5-5em (large and attention-grabbing).
- Ensure headings are visually dominant — the hero title should feel impactful, not timid.
- On content slides, the h2 title should command the top of the slide with clear breathing room below.`;
}
