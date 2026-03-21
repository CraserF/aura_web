/**
 * Workflow steps — Each step wraps an agent call with proper
 * input/output typing and progress events.
 *
 * Steps:
 *  1. plan        — Analyze prompt, detect style, build outline
 *  2. design      — Generate HTML/CSS slides
 *  3. qaValidate  — Programmatic quality checks (no LLM)
 *  4. review      — Audit quality via impeccable design rules (LLM)
 *  5. revise      — Fix issues from review (conditional)
 */

import { createStep } from '../engine';
import { plan } from '../agents/planner';
import { design } from '../agents/designer';
import { validateSlides } from '../agents/qa-validator';
import type { QAResult } from '../agents/qa-validator';
import { review, buildRevisionPrompt } from '../agents/reviewer';
import { extractHtmlFromResponse, countSlides, extractTitle } from '../../utils/extractHtml';
import { injectFonts } from '../../utils/injectFonts';
import type { AIMessage } from '../../types';
import type { PlanResult } from '../agents/planner';
import type { DesignResult } from '../agents/designer';
import type { ReviewResult } from '../agents/reviewer';
import type { PresentationInput, PresentationOutput } from '../types';

// ── Step 1: Plan ────────────────────────────────────────────

export interface PlanStepOutput {
  planResult: PlanResult;
  originalInput: PresentationInput;
}

export const planStep = createStep<PresentationInput, PlanStepOutput>({
  id: 'plan',
  description: 'Analyzing your request…',
  execute: async ({ inputData, llm, emit }) => {
    emit({ type: 'progress', message: 'Understanding your request and planning slides…', pct: 10 });

    const planResult = await plan(
      inputData.prompt,
      !!inputData.existingSlidesHtml,
      llm,
    );

    if (planResult.blocked) {
      throw new Error(planResult.blockReason ?? 'Request blocked.');
    }

    emit({
      type: 'progress',
      message: planResult.outline
        ? `Planned ${planResult.outline.length} slides with ${planResult.style} style`
        : `Detected ${planResult.style} style, animation level ${planResult.animationLevel}`,
      pct: 20,
    });

    return { planResult, originalInput: inputData };
  },
});

// ── Step 2: Design ──────────────────────────────────────────

export interface DesignStepOutput {
  designResult: DesignResult;
  planResult: PlanResult;
  originalInput: PresentationInput;
}

export const designStep = createStep<PlanStepOutput, DesignStepOutput>({
  id: 'design',
  description: 'Generating slides…',
  execute: async ({ inputData, llm, emit }) => {
    const { planResult, originalInput } = inputData;

    emit({ type: 'progress', message: 'Designing slides with premium layouts…', pct: 30 });

    const designResult = await design(
      planResult,
      originalInput.existingSlidesHtml,
      originalInput.chatHistory,
      llm,
      // Stream chunks to UI
      (chunk) => emit({ type: 'streaming', stepId: 'design', chunk }),
    );

    emit({
      type: 'progress',
      message: `Generated ${designResult.slideCount} slides`,
      pct: 70,
    });

    return { designResult, planResult, originalInput };
  },
});

// ── Step 3: QA Validate (programmatic — no LLM) ────────────

export interface QAStepOutput {
  qaResult: QAResult;
  designResult: DesignResult;
  planResult: PlanResult;
  originalInput: PresentationInput;
}

export const qaValidateStep = createStep<DesignStepOutput, QAStepOutput>({
  id: 'qa-validate',
  description: 'Running quality checks…',
  execute: async ({ inputData, emit }) => {
    const { designResult, planResult, originalInput } = inputData;

    emit({ type: 'progress', message: 'Running automated quality checks…', pct: 72 });

    const qaResult = validateSlides(designResult.html, {
      expectedSlideCount: planResult.outline?.length,
      expectedBgColor: planResult.blueprint.palette.bg,
      isCreate: planResult.intent === 'create',
    });

    if (qaResult.violations.length > 0) {
      const errorCount = qaResult.violations.filter((v) => v.severity === 'error').length;
      const warnCount = qaResult.violations.filter((v) => v.severity === 'warning').length;
      emit({
        type: 'progress',
        message: qaResult.passed
          ? `QA passed with ${warnCount} warnings`
          : `QA found ${errorCount} errors, ${warnCount} warnings`,
        pct: 74,
      });
    } else {
      emit({ type: 'progress', message: 'QA checks passed', pct: 74 });
    }

    return { qaResult, designResult, planResult, originalInput };
  },
});

// ── Step 4: Review ──────────────────────────────────────────

export interface ReviewStepOutput {
  reviewResult: ReviewResult;
  qaResult: QAResult;
  designResult: DesignResult;
  planResult: PlanResult;
}

export const reviewStep = createStep<QAStepOutput, ReviewStepOutput>({
  id: 'review',
  description: 'Reviewing design quality…',
  execute: async ({ inputData, llm, emit }) => {
    const { designResult, planResult, qaResult } = inputData;

    emit({ type: 'progress', message: 'Design reviewer checking quality…', pct: 75 });

    const reviewResult = await review(designResult.html, llm);

    const errorCount = reviewResult.issues.filter((i) => i.severity === 'error').length;
    const warnCount = reviewResult.issues.filter((i) => i.severity === 'warning').length;

    emit({
      type: 'progress',
      message: reviewResult.passed
        ? `Review passed (score: ${reviewResult.score}/100)`
        : `Found ${errorCount} errors, ${warnCount} warnings — revising…`,
      pct: 85,
    });

    return { reviewResult, qaResult, designResult, planResult };
  },
});

// ── Step 5: Revise (conditional — only if review failed) ────

export const reviseStep = createStep<ReviewStepOutput, PresentationOutput>({
  id: 'revise',
  description: 'Polishing slides…',
  execute: async ({ inputData, llm, emit }) => {
    const { reviewResult, designResult } = inputData;

    // If review passed, just pass through
    if (reviewResult.passed) {
      return {
        html: designResult.html,
        title: designResult.title,
        slideCount: designResult.slideCount,
        reviewPassed: true,
      };
    }

    // Review failed — make a revision pass
    emit({ type: 'progress', message: 'Applying design fixes…', pct: 88 });

    const revisionPrompt = buildRevisionPrompt(reviewResult);

    const messages: AIMessage[] = [
      { role: 'system', content: 'You are a slide designer fixing design issues. Output ONLY the corrected HTML code block. No explanations.' },
      { role: 'user', content: `Here are the slides with issues:\n\n\`\`\`html\n${designResult.html}\n\`\`\`\n\n${revisionPrompt}` },
    ];

    const revisedResponse = await llm.generate(
      messages,
      (chunk) => emit({ type: 'streaming', stepId: 'revise', chunk }),
    );

    const { html: revisedHtml, fontLinks } = extractHtmlFromResponse(revisedResponse);
    injectFonts(fontLinks);

    const slideCount = countSlides(revisedHtml);
    const title = extractTitle(revisedHtml) ?? designResult.title;

    emit({ type: 'progress', message: 'Revisions applied', pct: 95 });

    return {
      html: revisedHtml || designResult.html,  // Fallback to original if revision fails
      title,
      slideCount: slideCount || designResult.slideCount,
      reviewPassed: false,
    };
  },
});
