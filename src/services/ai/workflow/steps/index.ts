/**
 * Workflow steps — Each step wraps an agent call with proper
 * input/output typing and progress events.
 *
 * Steps:
 *  1. plan        — Analyze prompt, detect style, build outline
 *  2. design      — Generate HTML/CSS slides
 *  3. qaValidate  — Programmatic quality checks (no LLM)
 *  3b. qaBranch   — Branch: qa-pass (identity) or qa-revise (LLM fix)
 *  4. review      — Audit quality via impeccable design rules (LLM)
 *  5. revise      — Fix issues from review AND/OR remaining QA (conditional)
 */

import { createStep } from '../engine';
import { plan } from '../agents/planner';
import { design, designBatch, designEdit } from '../agents/designer';
import { validateSlides } from '../agents/qa-validator';
import type { QAResult } from '../agents/qa-validator';
import { review, buildCombinedRevisionPrompt } from '../agents/reviewer';
import { extractHtmlFromResponse, countSlides, extractTitle } from '../../utils/extractHtml';
import { sanitizeSlideHtml } from '../../utils/sanitizeHtml';
import { injectFonts } from '../../utils/injectFonts';
import { buildRevisionSystemPrompt } from '../../prompts/composer';
import type { AIMessage } from '../../types';
import type { PlanResult } from '../agents/planner';
import type { SlideOutline } from '../agents/planner';
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
  retry: { maxAttempts: 2, backoffMs: 1000 },
  timeoutMs: 60_000,
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
  retry: { maxAttempts: 2, backoffMs: 2000 },
  timeoutMs: 120_000,
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

// ── Step 3b: QA Branch — pass through or QA-revise ─────────

/** Identity step: QA passed, just pass data through unchanged */
export const qaPassStep = createStep<QAStepOutput, QAStepOutput>({
  id: 'qa-pass',
  description: 'QA passed — continuing…',
  execute: async ({ inputData }) => inputData,
});

/** QA revision step: fix QA errors via LLM before review */
export const qaReviseStep = createStep<QAStepOutput, QAStepOutput>({
  id: 'qa-revise',
  description: 'Fixing QA issues…',
  retry: { maxAttempts: 2, backoffMs: 2000 },
  timeoutMs: 120_000,
  execute: async ({ inputData, llm, emit }) => {
    const { qaResult, designResult, planResult, originalInput } = inputData;

    emit({ type: 'progress', message: 'Fixing QA violations before review…', pct: 76 });

    const revisionSystemPrompt = buildRevisionSystemPrompt(
      planResult.blueprint.palette,
      planResult.animationLevel,
    );

    const qaErrors = qaResult.violations
      .filter((v) => v.severity === 'error')
      .map((v) => `- Slide ${v.slide}: [${v.rule}] ${v.detail}`)
      .join('\n');
    const qaWarnings = qaResult.violations
      .filter((v) => v.severity === 'warning')
      .map((v) => `- Slide ${v.slide}: [${v.rule}] ${v.detail}`)
      .join('\n');

    const parts: string[] = [];
    if (qaErrors) parts.push(`MUST FIX (QA errors):\n${qaErrors}`);
    if (qaWarnings) parts.push(`SHOULD FIX (QA warnings):\n${qaWarnings}`);

    const messages: AIMessage[] = [
      { role: 'system', content: revisionSystemPrompt },
      { role: 'user', content: `Here are the slides with QA issues:\n\n\`\`\`html\n${designResult.html}\n\`\`\`\n\n${parts.join('\n\n')}` },
    ];

    const revisedResponse = await llm.generate(
      messages,
      (chunk) => emit({ type: 'streaming', stepId: 'qa-revise', chunk }),
    );

    const { html: rawHtml, fontLinks } = extractHtmlFromResponse(revisedResponse);
    const html = sanitizeSlideHtml(rawHtml);
    injectFonts(fontLinks);

    // Re-validate after QA revision
    const revalidated = validateSlides(html || designResult.html, {
      expectedSlideCount: planResult.outline?.length,
      expectedBgColor: planResult.blueprint.palette.bg,
      isCreate: planResult.intent === 'create',
    });

    const updatedDesign: DesignResult = {
      html: html || designResult.html,
      title: extractTitle(html) ?? designResult.title,
      slideCount: countSlides(html) || designResult.slideCount,
    };

    emit({ type: 'progress', message: 'QA fixes applied', pct: 78 });

    return {
      qaResult: revalidated,
      designResult: updatedDesign,
      planResult,
      originalInput,
    };
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
  retry: { maxAttempts: 2, backoffMs: 1000 },
  timeoutMs: 90_000,
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

// ── Step 5: Revise (conditional — only if review OR QA failed) ────

export const reviseStep = createStep<ReviewStepOutput, PresentationOutput>({
  id: 'revise',
  description: 'Polishing slides…',
  retry: { maxAttempts: 2, backoffMs: 2000 },
  timeoutMs: 120_000,
  execute: async ({ inputData, llm, emit }) => {
    const { reviewResult, qaResult, designResult, planResult } = inputData;

    // If BOTH review and QA passed, just pass through
    const needsRevision = !reviewResult.passed || !qaResult.passed;
    if (!needsRevision) {
      return {
        html: designResult.html,
        title: designResult.title,
        slideCount: designResult.slideCount,
        reviewPassed: true,
      };
    }

    // Review and/or QA failed — make a revision pass with full designer context
    emit({ type: 'progress', message: 'Applying design fixes…', pct: 88 });

    // Build a full revision system prompt (palette, layout, anti-patterns, SVG guidance)
    const revisionSystemPrompt = buildRevisionSystemPrompt(
      planResult.blueprint.palette,
      planResult.animationLevel,
    );

    // Merge issues from both QA and review into a single revision prompt
    const revisionPrompt = buildCombinedRevisionPrompt(reviewResult, qaResult);

    const messages: AIMessage[] = [
      { role: 'system', content: revisionSystemPrompt },
      { role: 'user', content: `Here are the slides with issues:\n\n\`\`\`html\n${designResult.html}\n\`\`\`\n\n${revisionPrompt}` },
    ];

    const revisedResponse = await llm.generate(
      messages,
      (chunk) => emit({ type: 'streaming', stepId: 'revise', chunk }),
    );

    const { html: rawRevisedHtml, fontLinks } = extractHtmlFromResponse(revisedResponse);
    const revisedHtml = sanitizeSlideHtml(rawRevisedHtml);
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

// ── Batch Design Step (create flow — generates in batches of 3) ──

const BATCH_SIZE = 3;

export const batchDesignStep = createStep<PlanStepOutput, DesignStepOutput>({
  id: 'batch-design',
  description: 'Generating slides in batches…',
  retry: { maxAttempts: 2, backoffMs: 2000 },
  timeoutMs: 180_000,
  execute: async ({ inputData, llm, emit }) => {
    const { planResult, originalInput } = inputData;
    const outline = planResult.outline;

    if (!outline || outline.length === 0) {
      // Fallback to single-shot design if no outline
      emit({ type: 'progress', message: 'Designing slides…', pct: 30 });
      const designResult = await design(
        planResult,
        originalInput.existingSlidesHtml,
        originalInput.chatHistory,
        llm,
        (chunk) => emit({ type: 'streaming', stepId: 'batch-design', chunk }),
      );
      return { designResult, planResult, originalInput };
    }

    // Safe to use — narrowed by the guard above
    const slides = outline;

    // Split outline into batches of BATCH_SIZE
    const batches: SlideOutline[][] = [];
    for (let i = 0; i < slides.length; i += BATCH_SIZE) {
      batches.push(slides.slice(i, i + BATCH_SIZE));
    }

    let accumulatedHtml = '';
    let totalSlideCount = 0;

    for (let i = 0; i < batches.length; i++) {
      const pct = 25 + Math.round((i / batches.length) * 45);
      emit({
        type: 'progress',
        message: `Generating slides ${i * BATCH_SIZE + 1}–${Math.min((i + 1) * BATCH_SIZE, slides.length)} of ${slides.length}…`,
        pct,
      });

      const batch = batches[i]!;
      const batchResult = await designBatch(
        batch,
        planResult.enhancedPrompt.split('\n')[0] ?? planResult.enhancedPrompt, // topic = first line
        planResult.blueprint,
        planResult.animationLevel,
        i,
        batches.length,
        accumulatedHtml,
        llm,
        (chunk) => emit({ type: 'streaming', stepId: 'batch-design', chunk }),
      );

      accumulatedHtml += (accumulatedHtml ? '\n' : '') + batchResult.html;
      totalSlideCount += batchResult.slideCount;

      // Emit progressive render event for canvas
      emit({
        type: 'batch-rendered',
        batchIndex: i,
        totalBatches: batches.length,
        accumulatedHtml,
      });
    }

    const designResult: DesignResult = {
      html: accumulatedHtml,
      title: extractTitle(accumulatedHtml),
      slideCount: totalSlideCount,
    };

    emit({
      type: 'progress',
      message: `Generated ${totalSlideCount} slides`,
      pct: 70,
    });

    return { designResult, planResult, originalInput };
  },
});

// ── Targeted Design Step (edit flow — compact prompt) ────────

export const targetedDesignStep = createStep<PlanStepOutput, DesignStepOutput>({
  id: 'targeted-design',
  description: 'Editing slides…',
  retry: { maxAttempts: 2, backoffMs: 2000 },
  timeoutMs: 120_000,
  execute: async ({ inputData, llm, emit }) => {
    const { planResult, originalInput } = inputData;

    emit({ type: 'progress', message: 'Applying changes…', pct: 30 });

    const designResult = await designEdit(
      planResult,
      originalInput.existingSlidesHtml!,
      originalInput.chatHistory,
      llm,
      (chunk) => emit({ type: 'streaming', stepId: 'targeted-design', chunk }),
    );

    emit({
      type: 'progress',
      message: `Updated ${designResult.slideCount} slides`,
      pct: 70,
    });

    return { designResult, planResult, originalInput };
  },
});

// ── Draft Complete Step (signals canvas has full draft) ──────

export const draftCompleteStep = createStep<DesignStepOutput, DesignStepOutput>({
  id: 'draft-complete',
  description: 'Draft ready',
  execute: async ({ inputData, emit }) => {
    emit({ type: 'draft-complete', html: inputData.designResult.html });
    return inputData;
  },
});

// ── Edit Finalize Step (converts QAStepOutput to PresentationOutput) ──

export const editFinalizeStep = createStep<QAStepOutput, PresentationOutput>({
  id: 'edit-finalize',
  description: 'Finalizing…',
  execute: async ({ inputData }) => {
    const { designResult, qaResult } = inputData;
    return {
      html: designResult.html,
      title: designResult.title,
      slideCount: designResult.slideCount,
      reviewPassed: qaResult.passed,
    };
  },
});
