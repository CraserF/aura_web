/**
 * Anti-patterns section — design rules injected into the designer's prompt.
 * KEY FIX: Previously anti-patterns were only used in review (post-generation).
 * Now they're in the designer's prompt too, preventing predictable generate-fail-revise cycles.
 */
import { ANTI_PATTERNS, DESIGN_PRINCIPLES } from '../../workflow/skills/design-rules';

export function buildAntiPatternsSection(): string {
  const antiPatternList = ANTI_PATTERNS
    .map((r, i) => `  ${i + 1}. ${r}`)
    .join('\n');

  const principlesSections = Object.entries(DESIGN_PRINCIPLES)
    .map(([domain, rules]) => `### ${domain}\n${(rules as readonly string[]).map((r) => `- ${r}`).join('\n')}`)
    .join('\n\n');

  return `## DESIGN ANTI-PATTERNS — AVOID ALL OF THESE

Your output will be audited against these rules. Avoid them during generation to produce better slides on the first pass:

${antiPatternList}

## DESIGN PRINCIPLES — Follow These

${principlesSections}`;
}
