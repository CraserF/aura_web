/**
 * Reviewer Agent — Audits generated slides for design quality
 * using impeccable design rules. Returns issues & a pass/fail verdict.
 *
 * Uses Zod structured output (via AI SDK generateObject) for reliable parsing.
 * Falls back to raw text + manual JSON parse if structured output fails.
 */

import { generateText, Output } from 'ai';
import type { LanguageModel } from 'ai';
import { buildReviewRules } from '../skills/design-rules';
import { ReviewResultSchema } from '../../schemas';
import type { QAResult } from './qa-validator';
import { getExemplarPack } from '../../templates';
import type { ExemplarPackId, StyleManifest, TemplateId } from '../../templates';

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

export interface ReviewContext {
  selectedTemplate?: TemplateId;
  exemplarPackId?: ExemplarPackId;
  styleManifest?: StyleManifest;
  mode?: 'create' | 'edit';
}

function buildReviewSystem(context?: ReviewContext): string {
  const exemplarPack = context?.exemplarPackId
    ? getExemplarPack(context.exemplarPackId)
    : undefined;

  const styleContract = context?.styleManifest
    ? `
## STYLE CONTRACT

- Template: ${context.selectedTemplate ?? 'unspecified'}
- Exemplar pack: ${exemplarPack?.name ?? 'none'}
- Composition mode: ${context.styleManifest.compositionMode}
- Background treatment: ${context.styleManifest.backgroundTreatment}
- Typography mood: ${context.styleManifest.typographyMood}
- Motion language: ${context.styleManifest.motionLanguage}
- SVG strategy: ${context.styleManifest.svgStrategy}
- Density: ${context.styleManifest.density}
- Hero pattern: ${context.styleManifest.heroPattern}
- Card grammar: ${context.styleManifest.cardGrammar}
- Accent strategy: ${context.styleManifest.accentStrategy}
- Component patterns: ${context.styleManifest.componentPatterns.join('; ')}
`
    : '';

  const exemplarChecks = exemplarPack
    ? `
## EXEMPLAR-SPECIFIC CHECKS

Visual thesis: ${exemplarPack.visualThesis}

Composition checks:
${exemplarPack.compositionRules.map((rule) => `- ${rule}`).join('\n')}

Component checks:
${exemplarPack.componentRules.map((rule) => `- ${rule}`).join('\n')}

Motion checks:
${exemplarPack.motionRules.map((rule) => `- ${rule}`).join('\n')}
`
    : '';

  const modeGuidance = context?.mode === 'edit'
    ? 'For edit reviews, preserve unaffected content and focus on whether the requested style refinements actually unified the deck.'
    : 'For create reviews, assess the whole deck as one designed system, not just independent valid slides.';

  return `You are an elite design reviewer for HTML/CSS presentation slides.
Your job: audit the slides against strict design rules and return a JSON verdict.

${buildReviewRules()}
${styleContract}
${exemplarChecks}

## YOUR TASK

Review the provided HTML slides. For each issue found, create an issue object.
Then score the deck 0-100 and decide pass/fail (≥ 75 = pass).

${modeGuidance}

### Scoring priorities (errors are -10 points each, warnings are -3 points each):
- Contrast issues (dark text on dark bg, light text on light bg) → ERROR
- Missing data-background-color → ERROR
- Invented colors not from the palette → ERROR
- Same layout on consecutive slides → WARNING
- Insufficient layout variety (< 4 types) → WARNING
- CSS custom properties duplicated across sections → WARNING
- Cards or content too small for 1920x1080 → WARNING
- Title slide does not establish the declared hero/composition system → WARNING
- Later slides abandon the chosen component family or exemplar pack grammar → WARNING
- Diagram-heavy decks rely on generic cards instead of embedded explainers → WARNING

IMPORTANT: Be practical. Minor spacing tweaks are warnings, not errors.
Single-slide outputs are valid in this product. Do not penalize low slide count unless the user explicitly asked for multiple slides.
Focus on contrast, palette compliance, and layout quality — these are the most common failures.

Output ONLY this JSON structure (no markdown, no explanation):
{
  "passed": boolean,
  "score": number,
  "issues": [
    { "slide": number, "severity": "error"|"warning", "rule": "which rule was violated", "fix": "specific fix instruction" }
  ],
  "summary": "1-2 sentence overall assessment"
}`;
}

/**
 * Review slide HTML for design quality.
 * Uses structured output (Zod) first, falls back to raw text parsing.
 */
export async function review(
  html: string,
  model: LanguageModel,
  context?: ReviewContext,
): Promise<ReviewResult> {
  const systemPrompt = buildReviewSystem(context);
  const userPrompt = `Review these slides:\n\n\`\`\`html\n${html}\n\`\`\``;

  // Try structured output first
  try {
    const result = await generateText({
      model,
      output: Output.object({ schema: ReviewResultSchema }),
      system: systemPrompt,
      prompt: userPrompt,
      maxRetries: 2,
    });
    if (result.output) return result.output;
  } catch (structuredErr) {
    console.warn('[Reviewer] Structured output failed, falling back to raw parse:', structuredErr);
  }

  // Fallback: raw text generation with manual JSON parsing
  try {
    const result = await generateText({
      model,
      system: systemPrompt,
      prompt: userPrompt,
    });
    const jsonStr = result.text.replace(/```json?\s*\n?/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(jsonStr) as ReviewResult;
    return {
      passed: typeof parsed.passed === 'boolean' ? parsed.passed : true,
      score: typeof parsed.score === 'number' ? Math.min(100, Math.max(0, parsed.score)) : 75,
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      summary: typeof parsed.summary === 'string' ? parsed.summary : 'Review complete.',
    };
  } catch {
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
Fix ALL errors while keeping the overall design intact.
Do NOT modify visual elements that are not required to fix a listed issue.
Output the complete corrected fragment with only the \`<style>\` block and all \`<section>\` elements.

${parts.join('\n\n')}`;
}
