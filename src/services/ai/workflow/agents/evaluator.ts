/**
 * Evaluator Agent — Independent LLM-based quality judge for generated slides.
 * Implements the Evaluator-Optimizer pattern from the AI SDK workflow docs.
 *
 * When enabled, runs after the designer finishes to provide a "second opinion"
 * on slide quality. If issues are found, a targeted revision pass fixes them.
 *
 * Max 1 evaluate→revise iteration to cap cost. Evaluation is skipped if the
 * designer's programmatic QA already passed (handled in presentation.ts).
 */

import { generateObject, generateText } from 'ai';
import type { LanguageModel, ModelMessage } from 'ai';
import { z } from 'zod';
import { buildRevisionSystemPrompt } from '../../prompts';
import { extractHtmlFromResponse } from '../../utils/extractHtml';
import { sanitizeSlideHtml } from '../../utils/sanitizeHtml';
import { CACHE_CONTROL } from '../engine';
import { aiDebugLog, toErrorInfo } from '../../debug';
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
  return `You are a visual design judge for HTML/CSS presentation slides. Evaluate concisely.

## DESIGN BRIEF
Style: ${planResult.style} | Composition: ${planResult.styleManifest.compositionMode} | Animation level: ${planResult.animationLevel}

## SCORING (1-10)
9-10: Stunning, palette-perfect, rich animations. 7-8: Good, minor issues only. 5-6: Needs work. 1-4: Poor quality.

## CRITERIA
1. Layout: Composition mode applied? Visual hierarchy present?
2. Typography: Clear type scale with clamp()?
3. Color: Palette match? Contrast sufficient?
4. Animation: @keyframes present and purposeful?
5. Content: Topic addressed? Copy concise?
6. Accessibility: data-background-color set? Text colors explicit?

passesQuality = true when score >= 7 AND no critical issues. List only critical/major issues.`;
}

function postProcess(raw: string): string {
  const { html: rawHtml } = extractHtmlFromResponse(raw);
  return sanitizeSlideHtml(rawHtml);
}

/**
 * Trim the HTML sent to the evaluator to reduce token cost.
 * Keeps the <section> content intact but truncates long <style> blocks.
 */
function truncateForEval(html: string, maxStyleChars = 800): string {
  return html.replace(
    /(<style[^>]*>)([\s\S]*?)(<\/style>)/gi,
    (_match, open, body: string, close) => {
      if (body.length <= maxStyleChars) return `${open}${body}${close}`;
      return `${open}${body.slice(0, maxStyleChars)}\n/* ... truncated for eval */\n${close}`;
    },
  );
}

/**
 * Run the evaluate-and-revise loop on generated HTML.
 * Returns the (possibly improved) final HTML.
 *
 * Uses generateObject for reliable structured output without provider-specific
 * JSON mode issues. Defaults to a single evaluate→revise pass (maxIterations=1)
 * because the designer's fast-path QA already filters well-formed slides.
 */
export async function evaluateAndRevise(
  model: LanguageModel,
  html: string,
  planResult: PlanResult,
  onEvent: EventListener,
  signal?: AbortSignal,
  maxIterations = 1,
): Promise<string> {
  let currentHtml = html;
  const t0 = performance.now();

  for (let i = 0; i < maxIterations; i++) {
    onEvent({
      type: 'progress',
      message: i === 0 ? 'Evaluating slide quality…' : `Re-evaluating after revision…`,
      pct: 75 + (i * 10),
    });

    // Evaluate with structured output via generateObject (more reliable than Output.object())
    let evaluation: Evaluation;
    const evalT0 = performance.now();
    try {
      const truncatedHtml = truncateForEval(currentHtml);
      aiDebugLog('evaluator', `eval pass ${i + 1}: sending ${truncatedHtml.length} chars (original ${currentHtml.length})`);
      const evalResult = await generateObject({
        model,
        schema: EvaluationSchema,
        messages: [
          { role: 'system', content: buildEvaluatorPrompt(planResult), providerOptions: CACHE_CONTROL } as ModelMessage,
          {
            role: 'user',
            content: `Brief: ${planResult.style}, ${planResult.styleManifest.compositionMode}\n\nSlide HTML:\n\`\`\`html\n${truncatedHtml}\n\`\`\``,
          },
        ],
        maxOutputTokens: 512,
        abortSignal: signal,
      });
      evaluation = evalResult.object;
      const evalMs = (performance.now() - evalT0).toFixed(0);
      aiDebugLog('evaluator', `eval pass ${i + 1} complete in ${evalMs}ms`, {
        score: evaluation.score,
        passesQuality: evaluation.passesQuality,
        issueCount: evaluation.issues.length,
        usage: evalResult.usage,
      });
    } catch (err) {
      // Structured output not supported by this provider/model — skip evaluation
      aiDebugLog('evaluator', 'generateObject failed, skipping', toErrorInfo(err));
      console.warn('[Evaluator] generateObject failed, skipping evaluation:', err);
      break;
    }

    onEvent({
      type: 'progress',
      message: `Quality score: ${evaluation.score}/10${evaluation.passesQuality ? ' ✓' : ''}`,
      pct: 78 + (i * 10),
    });

    if (evaluation.passesQuality && evaluation.score >= 7) {
      aiDebugLog('evaluator', `quality passed (score ${evaluation.score}) — no revision needed`);
      break;
    }

    // Only revise critical and major issues
    const actionableIssues = evaluation.issues.filter((issue) => issue.severity !== 'minor');
    if (actionableIssues.length === 0) { aiDebugLog('evaluator', 'no actionable issues, skipping revision'); break; }

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
    const revT0 = performance.now();

    try {
      const revisionResult = await generateText({
        model,
        messages: [
          { role: 'system', content: revisionSystem, providerOptions: CACHE_CONTROL } as ModelMessage,
          { role: 'user', content: revisionPrompt },
        ],
        maxOutputTokens: 8192,
        abortSignal: signal,
      });

      const revMs = (performance.now() - revT0).toFixed(0);
      aiDebugLog('evaluator', `revision complete in ${revMs}ms`, { usage: revisionResult.usage });

      const revisedHtml = postProcess(revisionResult.text);
      if (revisedHtml && revisedHtml.includes('<section')) {
        currentHtml = revisedHtml;
      } else {
        aiDebugLog('evaluator', 'revision produced invalid output, keeping current');
        break; // Revision produced invalid output, keep current
      }
    } catch (err) {
      aiDebugLog('evaluator', 'revision pass failed', toErrorInfo(err));
      console.warn('[Evaluator] revision pass failed:', err);
      break;
    }
  }

  const totalMs = (performance.now() - t0).toFixed(0);
  aiDebugLog('evaluator', `evaluateAndRevise complete in ${totalMs}ms`);
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
