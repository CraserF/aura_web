/**
 * Anti-patterns section — design rules injected into the designer's prompt.
 *
 * Key improvements:
 * - Gotchas section added (highest-value content per Skills methodology)
 * - Anti-patterns now include WHY reasoning
 * - Principles are positive guidance that complements the anti-patterns
 */
import { ANTI_PATTERNS, DESIGN_PRINCIPLES, GOTCHAS } from '../../workflow/skills/design-rules';

export function buildAntiPatternsSection(): string {
  const antiPatternList = ANTI_PATTERNS
    .map((r, i) => `  ${i + 1}. ${r}`)
    .join('\n');

  const principlesSections = Object.entries(DESIGN_PRINCIPLES)
    .map(([domain, rules]) => `### ${domain}\n${(rules as readonly string[]).map((r) => `- ${r}`).join('\n')}`)
    .join('\n\n');

  const gotchasList = GOTCHAS
    .map((g, i) => `  ${i + 1}. ${g}`)
    .join('\n');

  return `## DESIGN ANTI-PATTERNS — AVOID ALL OF THESE

Your output will be audited against these rules. Each rule includes WHY it matters — understanding the reasoning helps you avoid the pattern naturally.

${antiPatternList}

## GOTCHAS — Common LLM Generation Failures

These are corrections from real generation runs. They represent the highest-value fixes:

${gotchasList}

## DESIGN PRINCIPLES — Follow These

${principlesSections}`;
}

/**
 * Condensed anti-patterns — top 10 highest-impact rules for batch/edit prompts.
 * Covers contrast, palette compliance, text sizing, no external images, content fill.
 */
export function buildCondensedAntiPatterns(): string {
  // Hand-picked indices for the most critical rules
  const critical = [
    ANTI_PATTERNS[16], // dark-on-dark / light-on-light contrast (#1 LLM error)
    ANTI_PATTERNS[17], // text opacity below 0.55
    ANTI_PATTERNS[18], // light/dark color mapping
    ANTI_PATTERNS[6],  // gray text on colored bg
    ANTI_PATTERNS[15], // primary color as body text
    ANTI_PATTERNS[1],  // body text min 1.1em
    ANTI_PATTERNS[2],  // hero title min 4em
    ANTI_PATTERNS[23], // content fill 60-70%
    ANTI_PATTERNS[46], // palette compliance — exact hex values
    ANTI_PATTERNS[47], // CSS custom properties on first section only
  ];

  return `## CRITICAL DESIGN RULES (condensed)

${critical.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Also: NO external image URLs (no Unsplash, no placeholders). Use Bootstrap Icons, emoji (3-6em), or CSS gradients instead.`;
}
