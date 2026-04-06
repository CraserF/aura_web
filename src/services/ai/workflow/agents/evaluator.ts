/**
 * Evaluator Agent — Independent LLM-based quality judge for generated slides.
 * Implements the Evaluator-Optimizer pattern from the AI SDK workflow docs.
 *
 * When enabled, runs after the designer finishes to provide a "second opinion"
 * on slide quality. If issues are found, a targeted revision pass fixes them.
 *
 * Max 2 evaluate→revise iterations to cap cost.
 */

import { generateText, Output } from 'ai';
import type { LanguageModel, ModelMessage } from 'ai';
import { z } from 'zod';
import { buildRevisionSystemPrompt } from '../../prompts';
import { extractHtmlFromResponse } from '../../utils/extractHtml';
import { sanitizeSlideHtml } from '../../utils/sanitizeHtml';
import { CACHE_CONTROL } from '../engine';
import type { PlanResult } from './planner';
import type { EventListener } from '../types';

const EvaluationSchema = z.object({
  score: z.number().min(1).max(10),
  passesQuality: z.boolean(),
  issues: z.array(z.object({
    category: z.enum(['layout', 'typography', 'color', 'animation', 'content', 'accessibility']),
    severity: z.enum(['critical', 'major', 'minor']),
    description: z.string(),
    suggestedFix: z.string(),
  })),
});

type Evaluation = z.infer<typeof EvaluationSchema>;

function buildEvaluatorPrompt(planResult: PlanResult): string {
  return `You are an elite visual design judge for HTML/CSS presentation slides.

## YOUR TASK
Evaluate the provided slide HTML against the design brief and return a structured quality assessment.

## DESIGN BRIEF
- Style: ${planResult.style}
- Composition mode: ${planResult.styleManifest.compositionMode}
- Background treatment: ${planResult.styleManifest.backgroundTreatment}
- Typography mood: ${planResult.styleManifest.typographyMood}
- Motion language: ${planResult.styleManifest.motionLanguage}
- SVG strategy: ${planResult.styleManifest.svgStrategy}
- Animation level: ${planResult.animationLevel}

## SCORING RUBRIC (1-10)
- 9-10: Publication quality. Stunning visual design, perfect palette compliance, rich animations.
- 7-8: Good quality. Minor issues only (spacing tweaks, small contrast improvements).
- 5-6: Acceptable but needs work. Missing animations, bland layout, or palette drift.
- 1-4: Poor quality. Structural issues, broken layout, external images, no styling.

## EVALUATION CRITERIA
1. **Layout**: Is the composition mode applied correctly? Does grid/flexbox create visual hierarchy?
2. **Typography**: Are headings distinct from body? Is there a clear type scale using clamp()?
3. **Color**: Does the palette match the design brief? Is contrast sufficient for readability?
4. **Animation**: Are @keyframes present? Do they enhance without distracting?
5. **Content**: Does the slide address the user's topic? Is copy concise and impactful?
6. **Accessibility**: Is data-background-color set? Are text colors explicit?

## RULES
- Score honestly. Do not inflate scores.
- Focus on critical and major issues. Minor spacing tweaks are low priority.
- passesQuality = true when score >= 7 AND no critical issues exist.
- Provide specific, actionable suggestedFix for each issue (CSS property to change, element to add, etc.)`;
}

function postProcess(raw: string): string {
  const { html: rawHtml } = extractHtmlFromResponse(raw);
  return sanitizeSlideHtml(rawHtml);
}

/**
 * Run the evaluate-and-revise loop on generated HTML.
 * Returns the (possibly improved) final HTML.
 */
export async function evaluateAndRevise(
  model: LanguageModel,
  html: string,
  planResult: PlanResult,
  onEvent: EventListener,
  signal?: AbortSignal,
  maxIterations = 2,
): Promise<string> {
  let currentHtml = html;

  for (let i = 0; i < maxIterations; i++) {
    onEvent({
      type: 'progress',
      message: i === 0 ? 'Evaluating slide quality…' : `Re-evaluating after revision (${i + 1}/${maxIterations})…`,
      pct: 75 + (i * 10),
    });

    // Evaluate with structured output
    const evalResult = await generateText({
      model,
      output: Output.object({ schema: EvaluationSchema }),
      messages: [
        { role: 'system', content: buildEvaluatorPrompt(planResult), providerOptions: CACHE_CONTROL } as ModelMessage,
        { role: 'user', content: `Evaluate this slide HTML against the design brief:\n\nDesign brief: ${planResult.enhancedPrompt}\n\nSlide HTML:\n\`\`\`html\n${currentHtml}\n\`\`\`` },
      ],
      maxOutputTokens: 1024,
      abortSignal: signal,
    });

    const evaluation: Evaluation | undefined = evalResult.output ?? undefined;
    if (!evaluation) break;

    onEvent({
      type: 'progress',
      message: `Quality score: ${evaluation.score}/10${evaluation.passesQuality ? ' ✓' : ''}`,
      pct: 78 + (i * 10),
    });

    if (evaluation.passesQuality && evaluation.score >= 7) {
      break;
    }

    // Only revise critical and major issues
    const actionableIssues = evaluation.issues.filter((issue) => issue.severity !== 'minor');
    if (actionableIssues.length === 0) break;

    onEvent({
      type: 'progress',
      message: `Fixing ${actionableIssues.length} issue(s)…`,
      pct: 80 + (i * 10),
    });

    // Revision pass
    const revisionSystem = buildRevisionSystemPrompt(
      planResult.blueprint.palette,
      planResult.animationLevel,
    );

    const revisionPrompt = buildRevisionUserPrompt(currentHtml, actionableIssues);

    const revisionResult = await generateText({
      model,
      messages: [
        { role: 'system', content: revisionSystem, providerOptions: CACHE_CONTROL } as ModelMessage,
        { role: 'user', content: revisionPrompt },
      ],
      maxOutputTokens: 16384,
      abortSignal: signal,
    });

    const revisedHtml = postProcess(revisionResult.text);
    if (revisedHtml && revisedHtml.includes('<section')) {
      currentHtml = revisedHtml;
    } else {
      break; // Revision produced invalid output, keep current
    }
  }

  return currentHtml;
}

function buildRevisionUserPrompt(
  html: string,
  issues: Evaluation['issues'],
): string {
  const issueList = issues
    .map((issue) => `- [${issue.severity}] ${issue.category}: ${issue.description}\n  Fix: ${issue.suggestedFix}`)
    .join('\n');

  return `Fix the following issues in this slide HTML. Make ONLY the listed changes — touch nothing else.

Issues to fix:
${issueList}

Current HTML:
\`\`\`html
${html}
\`\`\`

Output the complete corrected HTML including <link>, <style>, and all <section> elements.`;
}
