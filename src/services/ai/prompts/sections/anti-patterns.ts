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
