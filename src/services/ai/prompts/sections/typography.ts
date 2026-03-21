/**
 * Typography section — type scale, font guidance, palette-aware.
 */

export function buildTypographySection(): string {
  return `## TYPOGRAPHY SCALE

| Element | Size | Weight | Letter-Spacing |
|---------|------|--------|----------------|
| Hero Title | 3.5em | 700-800 | -0.03em |
| Slide Title | 2.2em | 700 | -0.02em |
| Subtitle | 1.2-1.3em | 400 | normal |
| Body | 0.9-1em | 400 | normal |
| Caption/Label | 0.7-0.75em | 500 | 0.05em (uppercase) |

Use \`line-height:1.1\` on headings, \`line-height:1.6\` on body. Always set \`margin:0\` on headings and manage spacing explicitly.`;
}
