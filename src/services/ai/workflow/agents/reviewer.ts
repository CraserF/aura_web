/**
 * Reviewer Agent — Audits generated slides for design quality
 * using impeccable design rules. Returns issues & a pass/fail verdict.
 *
 * Uses Zod structured output (via AI SDK generateObject) for reliable parsing.
 * Falls back to raw text + manual JSON parse if structured output fails.
 */

import type { AIMessage } from '../../types';
import type { LLMClient } from '../types';
import { buildReviewRules } from '../skills/design-rules';
import { ReviewResultSchema } from '../../schemas';
import type { QAResult } from './qa-validator';

export interface ReviewIssue {
  slide: number;
  severity: 'error' | 'warning';
  rule: string;
  fix: string;
}

export interface ReviewResult {
  passed: boolean;
  score: number;        // 0-100
  issues: ReviewIssue[];
  summary: string;
}

const REVIEW_SYSTEM = `You are an elite design reviewer for HTML/CSS presentation slides.
Your job: audit the slides against strict design rules and return a JSON verdict.

${buildReviewRules()}

## YOUR TASK

Review the provided HTML slides. For each issue found, create an issue object.
Then score the deck 0-100 and decide pass/fail (≥ 75 = pass).

### Scoring priorities (errors are -10 points each, warnings are -3 points each):
- Contrast issues (dark text on dark bg, light text on light bg) → ERROR
- Missing data-background-color → ERROR
- Slide count below 8 for new decks → ERROR
- Invented colors not from the palette → ERROR
- Same layout on consecutive slides → WARNING
- Insufficient layout variety (< 4 types) → WARNING
- CSS custom properties duplicated across sections → WARNING
- Cards or content too small for 1920x1080 → WARNING

IMPORTANT: Be practical. Minor spacing tweaks are warnings, not errors.
Focus on contrast, palette compliance, slide count, and layout variety — these are the most common failures.

Output ONLY this JSON structure (no markdown, no explanation):
{
  "passed": boolean,
  "score": number,
  "issues": [
    { "slide": number, "severity": "error"|"warning", "rule": "which rule was violated", "fix": "specific fix instruction" }
  ],
  "summary": "1-2 sentence overall assessment"
}`;

/**
 * Review slide HTML for design quality.
 * Uses structured output (Zod) first, falls back to raw text parsing.
 */
export async function review(
  html: string,
  llm: LLMClient,
): Promise<ReviewResult> {
  const messages: AIMessage[] = [
    { role: 'system', content: REVIEW_SYSTEM },
    { role: 'user', content: `Review these slides:\n\n\`\`\`html\n${html}\n\`\`\`` },
  ];

  // Try structured output first
  try {
    return await llm.generateStructured(messages, ReviewResultSchema, 'review-result');
  } catch (structuredErr) {
    console.warn('[Reviewer] Structured output failed, falling back to raw parse:', structuredErr);
  }

  // Fallback: raw text generation with manual JSON parsing
  try {
    const response = await llm.generate(messages);
    const jsonStr = response.replace(/```json?\s*\n?/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(jsonStr) as ReviewResult;
    return {
      passed: typeof result.passed === 'boolean' ? result.passed : true,
      score: typeof result.score === 'number' ? Math.min(100, Math.max(0, result.score)) : 75,
      issues: Array.isArray(result.issues) ? result.issues : [],
      summary: typeof result.summary === 'string' ? result.summary : 'Review complete.',
    };
  } catch {
    // Both approaches failed — FAIL to trigger revision
    return {
      passed: false,
      score: 0,
      issues: [{
        slide: 0,
        severity: 'error',
        rule: 'review-parse-failure',
        fix: 'Automated review could not parse its results. Ensure slides follow all design rules.',
      }],
      summary: 'Review could not parse LLM response — triggering revision for safety.',
    };
  }
}

/**
 * Build revision instructions from review issues.
 * Fed back to the designer agent for a fix pass.
 */
export function buildRevisionPrompt(reviewResult: ReviewResult): string {
  const errorFixes = reviewResult.issues
    .filter((i) => i.severity === 'error')
    .map((i) => `- Slide ${i.slide}: ${i.fix}`)
    .join('\n');

  const warningFixes = reviewResult.issues
    .filter((i) => i.severity === 'warning')
    .map((i) => `- Slide ${i.slide}: ${i.fix}`)
    .join('\n');

  const parts: string[] = [];
  if (errorFixes) parts.push(`MUST FIX (errors):\n${errorFixes}`);
  if (warningFixes) parts.push(`SHOULD FIX (warnings):\n${warningFixes}`);

  return `A design reviewer found issues with the slides.
Fix ALL errors and as many warnings as possible while keeping the overall design intact.
Output the complete corrected deck.

${parts.join('\n\n')}`;
}

/**
 * Build revision instructions from BOTH review and QA results.
 * This merges all detected issues into a single revision prompt.
 */
export function buildCombinedRevisionPrompt(
  reviewResult: ReviewResult,
  qaResult: QAResult,
): string {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Collect review issues
  for (const issue of reviewResult.issues) {
    const line = `- Slide ${issue.slide}: [${issue.rule}] ${issue.fix}`;
    if (issue.severity === 'error') errors.push(line);
    else warnings.push(line);
  }

  // Collect QA violations
  for (const violation of qaResult.violations) {
    const line = `- Slide ${violation.slide}: [${violation.rule}] ${violation.detail}`;
    if (violation.severity === 'error') errors.push(line);
    else warnings.push(line);
  }

  const parts: string[] = [];
  if (errors.length > 0) parts.push(`MUST FIX (errors):\n${errors.join('\n')}`);
  if (warnings.length > 0) parts.push(`SHOULD FIX (warnings):\n${warnings.join('\n')}`);

  return `A design reviewer and automated QA found issues with the slides.
Fix ALL errors and as many warnings as possible while keeping the overall design intact.
Output the complete corrected deck as HTML <section> elements.

${parts.join('\n\n')}`;
}
