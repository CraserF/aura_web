/**
 * Typography section — type scale, font guidance, palette-aware.
 */

export function buildTypographySection(): string {
  return `## TYPOGRAPHY

Slides render at 1920×1080 and are scaled via CSS transform. **Use fixed px only** for all sizing — never vw/vh/clamp() as they cause double-scaling.

See the example HTML files for typography patterns:
- Hero/main titles: 80–96px
- Subtitles: 28–36px
- Body text: 20–24px
- Small/label text: 10–14px

All text should use margin:0 and rely on parent padding/gap for spacing.`;
}
