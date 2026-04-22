/**
 * Designer Agent — Generates stunning standalone HTML slides using the
 * AI SDK ToolLoopAgent pattern. The agent can validate its own output
 * via a programmatic QA tool and iterate to fix issues before returning.
 *
 * Produces ONE slide per request with rich CSS architecture:
 * - <style> block with CSS classes and @keyframes
 * - Single <section> with class-based content and inline SVG
 *
 * Streaming: The initial generation streams to the canvas for instant preview.
 * If the draft already passes QA, it is returned immediately (fast path).
 * Otherwise the ToolLoopAgent runs a validate→fix loop before returning.
 */

import { ToolLoopAgent, tool, stepCountIs, streamText } from 'ai';
import type { LanguageModel, ModelMessage } from 'ai';
import { z } from 'zod';
import type { AIMessage } from '../../types';
import {
  buildDesignerPrompt,
  buildEditDesignerPrompt,
} from '../../prompts';
import { getExemplarPack } from '../../templates';
import { extractHtmlFromResponse, countSlides, extractTitle } from '../../utils/extractHtml';
import { sanitizeSlideHtml } from '../../utils/sanitizeHtml';
import { injectFonts } from '../../utils/injectFonts';
import { validateSlides } from './qa-validator';
import { parsePatchBlocks, applyPatches } from '../patchUtils';
import type { PlanResult } from './planner';
import type { StyleManifest } from '../../templates';
import type { EventListener } from '../types';
import { toModelMessages, CACHE_CONTROL } from '../engine';
import { aiDebugLog, logPromptMetrics } from '../../debug';
import { withRetry } from '../../fallbackModel';

export interface DesignResult {
  html: string;
  title?: string;
  slideCount: number;
  /** True when the draft passed QA without the ToolLoopAgent correction loop. */
  fastPath: boolean;
}

interface ContinuityAssessment {
  score: number;
  passes: boolean;
  issues: string[];
}

/**
 * Extract the last N <section> elements from accumulated HTML for continuity context.
 */
function extractLastNSections(html: string, n: number): string {
  const sectionRegex = /<section[\s\S]*?<\/section>/gi;
  const matches = html.match(sectionRegex);
  if (!matches || matches.length === 0) return '';
  return matches.slice(-n).join('\n');
}

function extractSections(html: string): string[] {
  return html.match(/<section[\s\S]*?<\/section>/gi) ?? [];
}

function extractStyleBlock(html: string): string {
  return html.match(/<style[^>]*>[\s\S]*?<\/style>/i)?.[0] ?? '';
}

function summarizeExistingClasses(html: string, maxClasses = 18): string[] {
  const classMatches = [...html.matchAll(/class=["']([^"']+)["']/gi)];
  const classCounts = new Map<string, number>();

  for (const match of classMatches) {
    const classList = (match[1] ?? '')
      .split(/\s+/)
      .map((name) => name.trim())
      .filter(Boolean);

    for (const className of classList) {
      classCounts.set(className, (classCounts.get(className) ?? 0) + 1);
    }
  }

  return [...classCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxClasses)
    .map(([className]) => className);
}

function extractClassNames(html: string): string[] {
  const classMatches = [...html.matchAll(/class=["']([^"']+)["']/gi)];
  const classes = new Set<string>();

  for (const match of classMatches) {
    const classList = (match[1] ?? '')
      .split(/\s+/)
      .map((name) => name.trim())
      .filter(Boolean);

    for (const className of classList) {
      classes.add(className);
    }
  }

  return [...classes];
}

function extractCssVariableNames(html: string): string[] {
  const styleBlock = extractStyleBlock(html);
  const matches = [...styleBlock.matchAll(/--([a-z0-9-]+)\s*:/gi)];
  return [...new Set(matches.map((match) => `--${match[1]}`))];
}

function extractCssVariableRefs(html: string): string[] {
  const matches = [...html.matchAll(/var\((--[a-z0-9-]+)\)/gi)];
  return [...new Set(matches.map((match) => match[1]).filter((name): name is string => !!name))];
}

function extractBackgroundColors(html: string): string[] {
  const matches = [...html.matchAll(/data-background-color=["']([^"']+)["']/gi)];
  return [...new Set(matches.map((match) => (match[1] ?? '').toLowerCase()).filter(Boolean))];
}

function isUtilityClass(className: string): boolean {
  return /^delay-\d+$/.test(className)
    || /^anim-/.test(className)
    || /^fragment$/.test(className)
    || /^fade-/.test(className)
    || /^slide-/.test(className)
    || /^scale-/.test(className)
    || /^glow$/.test(className);
}

function isColorClose(a: string, b: string): boolean {
  const normalize = (value: string) => value.trim().toLowerCase();
  return normalize(a) === normalize(b);
}

function assessContinuity(existingSlidesHtml: string, newSlideHtml: string): ContinuityAssessment {
  const issues: string[] = [];

  const existingClasses = extractClassNames(existingSlidesHtml);
  const newClasses = extractClassNames(newSlideHtml);
  const reusableNewClasses = newClasses.filter((className) => !isUtilityClass(className));
  const reusedClasses = reusableNewClasses.filter((className) => existingClasses.includes(className));
  const novelClasses = reusableNewClasses.filter((className) => !existingClasses.includes(className));

  const existingVars = extractCssVariableNames(existingSlidesHtml);
  const newVarRefs = extractCssVariableRefs(newSlideHtml);
  const reusedVarRefs = newVarRefs.filter((variableName) => existingVars.includes(variableName));

  const existingBackgrounds = extractBackgroundColors(existingSlidesHtml);
  const newBackgrounds = extractBackgroundColors(newSlideHtml);
  const backgroundAligned = newBackgrounds.length === 0
    ? false
    : newBackgrounds.every((bg) => existingBackgrounds.some((existingBg) => isColorClose(bg, existingBg)));

  let score = 0;

  const classReuseRatio = reusableNewClasses.length === 0
    ? 0.6
    : reusedClasses.length / reusableNewClasses.length;
  score += classReuseRatio * 55;

  const varReuseRatio = newVarRefs.length === 0
    ? 0.5
    : reusedVarRefs.length / newVarRefs.length;
  score += varReuseRatio * 25;

  if (backgroundAligned) {
    score += 20;
  }

  if (reusedClasses.length === 0 && reusableNewClasses.length > 0) {
    issues.push('Reuse more of the deck\'s existing component classes instead of inventing a fresh class vocabulary.');
  }

  if (novelClasses.length >= 6) {
    issues.push(`Too many new class names were introduced (${novelClasses.slice(0, 6).join(', ')}). Prefer existing deck classes.`);
  }

  if (newVarRefs.length > 0 && reusedVarRefs.length === 0) {
    issues.push('Use the existing CSS variable tokens from the deck\'s style system for typography, spacing, and color references.');
  }

  if (!backgroundAligned) {
    issues.push('Align the new slide background with the existing deck palette/background treatment.');
  }

  const passes = score >= 58 && issues.length <= 1;
  return {
    score: Math.round(score),
    passes,
    issues,
  };
}

function buildStyleContinuityContext(existingSlidesHtml: string): string {
  const styleBlock = extractStyleBlock(existingSlidesHtml);
  const styleExcerpt = styleBlock ? styleBlock.slice(0, 3500) : '';
  const existingClasses = summarizeExistingClasses(existingSlidesHtml);

  const parts: string[] = [];

  if (styleExcerpt) {
    parts.push(`**Existing style system excerpt** (reuse this visual language, typography, spacing, and motion):\n\`\`\`html\n${styleExcerpt}\n\`\`\``);
  }

  if (existingClasses.length > 0) {
    parts.push(`**Existing class vocabulary** (prefer reusing these instead of inventing new classes): ${existingClasses.join(', ')}`);
  }

  return parts.join('\n\n');
}

/**
 * For add-slide intent, keep existing slides untouched and append only newly generated sections.
 */
function preserveExistingSlidesForAddIntent(existingHtml: string, candidateHtml: string): string {
  const existingSections = extractSections(existingHtml);
  if (existingSections.length === 0) return candidateHtml;

  const generatedSections = extractSections(candidateHtml);
  if (generatedSections.length === 0) return existingHtml;

  // If the LLM returned the full deck (existing + new), only keep the truly new sections.
  // Otherwise the LLM returned only the new slide(s) — append them all.
  const newSections = generatedSections.length > existingSections.length
    ? generatedSections.slice(existingSections.length)
    : generatedSections;

  return `${existingHtml}\n${newSections.join('\n')}`;
}

/**
 * Remove double-encoded attribute quote wrappers that arise from AI tool call
 * JSON serialization. Converts x="\"0\"" → x="0".
 */
function normalizeAttributeQuotes(html: string): string {
  return html.replace(/="\\"([^"]*?)\\""/g, '="$1"');
}

/**
 * Post-process raw LLM output into clean, validated slide HTML.
 */
function postProcess(raw: string): { html: string; fontLinks: string[] } {
  const { html: rawHtml, fontLinks } = extractHtmlFromResponse(raw);
  const html = sanitizeSlideHtml(normalizeAttributeQuotes(rawHtml));
  return { html, fontLinks };
}

/**
 * Build the ToolLoopAgent with validate/submit tools for self-correcting design.
 */
function createDesignAgent(
  model: LanguageModel,
  systemPrompt: string,
  planResult: PlanResult,
) {
  return new ToolLoopAgent({
    model,
    instructions: {
      role: 'system',
      content: systemPrompt,
      providerOptions: CACHE_CONTROL,
    },
    tools: {
      validateSlideHtml: tool({
        description: 'Validate slide HTML against quality rules. Call this AFTER generating your slide to check for blocking issues and advisory quality guidance. Fix blocking issues first; advisory items are optional improvements.',
        inputSchema: z.object({
          html: z.string().describe('The complete slide HTML including <link>, <style>, and <section> elements'),
        }),
        execute: async ({ html }) => {
          // Post-process before validation (same pipeline as final output)
          const { html: processed } = postProcess(html);
          const result = validateSlides(processed, {
            expectedBgColor: planResult.blueprint.palette.bg,
            isCreate: planResult.intent === 'create',
            styleManifest: planResult.styleManifest,
            exemplarPackId: planResult.exemplarPackId,
          });
          const blockingIssues = result.violations.filter((v) => v.tier === 'blocking');
          const advisories = result.violations.filter((v) => v.tier === 'advisory');
          const maxListedIssues = 8;
          const mapBlockingIssue = (v: { rule: string; slide: number; detail: string }) => {
            if (v.rule === 'palette-compliance' && v.detail.includes('CSS variable')) {
              return `[${v.rule}] slide ${v.slide}: Use a concrete hex color (e.g., "#${planResult.blueprint.palette.bg.replace('#', '')}") instead of var(--...).`;
            }
            if (v.rule === 'no-external-images') {
              return `[${v.rule}] slide ${v.slide}: Replace external URLs with inline SVG, data URIs, or remove the image entirely.`;
            }
            if (v.rule === 'template-content-leak') {
              return `[${v.rule}] slide ${v.slide}: Replace template placeholder text with content matching the requested topic.`;
            }
            return `[${v.rule}] slide ${v.slide}: ${v.detail}`;
          };

          const formattedBlockingIssues = blockingIssues.slice(0, maxListedIssues).map(mapBlockingIssue);

          return {
            passed: result.passed,
            blockingCount: result.blockingCount,
            advisoryCount: result.advisoryCount,
            errorCount: result.blockingCount,
            warningCount: result.advisoryCount,
            blockingIssues: formattedBlockingIssues,
            advisories: advisories.slice(0, maxListedIssues).map((v) => `[${v.rule}] slide ${v.slide}: ${v.detail}`),
            errors: formattedBlockingIssues,
            warnings: advisories.slice(0, maxListedIssues).map((v) => `[${v.rule}] slide ${v.slide}: ${v.detail}`),
            omittedBlocking: Math.max(0, blockingIssues.length - maxListedIssues),
            omittedAdvisories: Math.max(0, advisories.length - maxListedIssues),
            omittedErrors: Math.max(0, blockingIssues.length - maxListedIssues),
            omittedWarnings: Math.max(0, advisories.length - maxListedIssues),
          };
        },
      }),
      submitFinalSlide: tool({
        description: 'Submit the final slide HTML when validation passes (0 errors). Include the complete HTML with <link>, <style>, and <section> elements.',
        inputSchema: z.object({
          html: z.string().describe('The final validated slide HTML'),
          title: z.string().describe('A short descriptive title for this slide'),
        }),
        execute: async ({ html }) => {
          // Pre-flight QA gate: reject submissions with blocking violations so the
          // model self-corrects before the result is accepted by the caller.
          const { html: processed } = postProcess(html);
          const result = validateSlides(processed, {
            expectedBgColor: planResult.blueprint.palette.bg,
            isCreate: planResult.intent === 'create',
            styleManifest: planResult.styleManifest,
            exemplarPackId: planResult.exemplarPackId,
          });

          const blockingViolations = result.violations.filter((v) => v.tier === 'blocking');
          if (blockingViolations.length > 0) {
            return {
              accepted: false,
              errors: blockingViolations.map((v) => `[${v.rule}] slide ${v.slide}: ${v.detail}`),
              guidance: `Fix these ${blockingViolations.length} blocking issues:
${blockingViolations.map((v) => {
  if (v.rule === 'palette-compliance' && v.detail.includes('CSS variable')) {
    return `• [${v.rule}] Use a concrete hex color (e.g., "#${planResult.blueprint.palette.bg.replace('#', '')}") instead of var(--...).`;
  }
  if (v.rule === 'no-external-images') {
    return `• [${v.rule}] Replace external URLs with inline SVG, data URIs, or remove the image entirely.`;
  }
  if (v.rule === 'template-content-leak') {
    return `• [${v.rule}] Replace template placeholder text with content matching the requested topic.`;
  }
  return `• [${v.rule}] ${v.detail}`;
}).join('\n')}
Then call submitFinalSlide again with the corrected HTML.`,
            };
          }

          const advisories = result.violations.filter((v) => v.tier === 'advisory');
          return {
            accepted: true,
            warnings: advisories.map((v) => `[${v.rule}] slide ${v.slide}: ${v.detail}`),
          };
        },
      }),
    },
    stopWhen: [
      stepCountIs(5), // 1 stream + 1 validate + 1-2 fix iterations + 1 final submit
    ],
  });
}

/**
 * Generate a single stunning slide from a plan.
 *
 * Two-phase approach:
 * 1. Initial streaming generation for instant canvas preview
 * 2. Fast-path QA check — if draft passes with 0 errors, return immediately
 *    Otherwise run the ToolLoopAgent validate→fix loop for self-correction
 */
export async function design(
  planResult: PlanResult,
  existingSlidesHtml: string | undefined,
  chatHistory: AIMessage[],
  model: LanguageModel,
  onEvent: EventListener,
  signal?: AbortSignal,
): Promise<DesignResult> {
  const t0 = performance.now();
  // Build the system prompt with all sections
  const systemPrompt = await buildDesignerPrompt(
    planResult.blueprint,
    planResult.selectedTemplate,
    planResult.exemplarPackId,
    planResult.animationLevel,
  );

  // Build conversation messages
  const messages: ModelMessage[] = [];
  const recentHistory = chatHistory.slice(-10);
  if (recentHistory.length > 0) {
    messages.push(...toModelMessages(recentHistory));
  }

  // Build the user message with art direction context
  const exemplarPack = getExemplarPack(planResult.exemplarPackId);
  const artDirection = buildArtDirectionBlock(
    planResult.styleManifest,
    exemplarPack.name,
    exemplarPack.visualThesis,
  );

  let userContent: string;
  if (existingSlidesHtml) {
    const lastSlides = extractLastNSections(existingSlidesHtml, 2);
    userContent = `Create a new slide for this topic: ${planResult.enhancedPrompt}

${artDirection}

Here are the most recent existing slides (for visual continuity — match their style):
\`\`\`html
${lastSlides}
\`\`\`

Output the NEW slide only (with its own <style> block if needed). The slide should complement the existing deck's visual language.

After generating the slide HTML, call the validateSlideHtml tool to check for issues. Fix any errors found, then call submitFinalSlide with the validated HTML.`;
  } else {
    userContent = `Create a stunning slide for this topic: ${planResult.enhancedPrompt}

${artDirection}

Remember: Output a <link> tag, then a <style> block with CSS classes and @keyframes, then a single <section> with rich class-based HTML content and inline SVG illustrations. Make it breathtaking.

After generating the slide HTML, call the validateSlideHtml tool to check for issues. Fix any errors found, then call submitFinalSlide with the validated HTML.`;
  }
  messages.push({ role: 'user', content: userContent });

  // Phase 1: Stream the initial generation for instant canvas preview
  const requestMessages = [
    { role: 'system', content: systemPrompt, providerOptions: CACHE_CONTROL } as ModelMessage,
    ...messages,
  ];
  logPromptMetrics('designer', requestMessages, {
    intent: planResult.intent,
    template: planResult.selectedTemplate,
    recipe: planResult.exemplarPackId,
  });

  let draftText = '';
  await withRetry(async () => {
    draftText = '';
    const streamResult = streamText({
      model,
      messages: requestMessages,
      abortSignal: signal,
    });
    for await (const chunk of streamResult.textStream) {
      draftText += chunk;
      onEvent({ type: 'streaming', stepId: 'design', chunk });
    }
  });

  // Show the draft immediately
  const { html: draftHtml, fontLinks: draftFontLinks } = postProcess(draftText);
  const streamMs = (performance.now() - t0).toFixed(0);
  aiDebugLog('designer', `streaming complete in ${streamMs}ms`, { draftChars: draftText.length, slideCount: countSlides(draftHtml) });
  if (countSlides(draftHtml) > 0) {
    injectFonts(draftFontLinks);
    onEvent({ type: 'draft-complete', html: draftHtml });
  }

  // Fast-path QA check: if the draft passes all rules, skip the agent loop entirely
  const qaOptions = {
    expectedBgColor: planResult.blueprint.palette.bg,
    isCreate: planResult.intent === 'create',
    styleManifest: planResult.styleManifest,
    exemplarPackId: planResult.exemplarPackId,
  };
  const draftQa = validateSlides(draftHtml, qaOptions);
  if (draftQa.passed && countSlides(draftHtml) > 0) {
    const elapsed = (performance.now() - t0).toFixed(0);
    aiDebugLog('designer', `fast-path QA passed in ${elapsed}ms`);
    onEvent({ type: 'progress', message: 'QA passed — slide ready', pct: 90 });
    return {
      html: draftHtml,
      title: extractTitle(draftHtml),
      slideCount: countSlides(draftHtml),
      fastPath: true,
    };
  }

  // Phase 2: ToolLoopAgent validate→fix loop (only when QA found errors)
  onEvent({ type: 'progress', message: 'Fixing QA issues…', pct: 65 });

  const agent = createDesignAgent(model, systemPrompt, planResult);

  // Feed the draft output back to the agent for validation
  const validationMessages: ModelMessage[] = [...messages];
  validationMessages.push({ role: 'assistant', content: draftText });
  validationMessages.push({
    role: 'user',
    content: 'Now validate the slide HTML you just generated by calling the validateSlideHtml tool. If there are any errors, fix them and validate again. Once it passes with 0 errors, call submitFinalSlide.',
  });

  const agentResult = await withRetry(() =>
    agent.generate({
      messages: validationMessages,
      abortSignal: signal,
    }),
  );

  // Extract the final HTML from the submitFinalSlide tool call
  let finalHtml = draftHtml;
  let finalTitle = extractTitle(draftHtml);
  const agentMs = (performance.now() - t0).toFixed(0);
  const totalSteps = agentResult.steps.length;
  aiDebugLog('designer', `agent loop complete in ${agentMs}ms`, { steps: totalSteps });

  for (const step of agentResult.steps) {
    for (const call of step.toolCalls) {
      if (call.toolName === 'submitFinalSlide') {
        const { html: submittedRaw, title } = call.input as { html: string; title: string };
        const { html: submittedHtml, fontLinks } = postProcess(submittedRaw);
        if (countSlides(submittedHtml) > 0) {
          finalHtml = submittedHtml;
          finalTitle = title || finalTitle;
          injectFonts(fontLinks);
        }
      }
    }
  }

  // Fallback: if agent didn't call submitFinalSlide, try to extract from last text
  if (finalHtml === draftHtml && agentResult.text) {
    const { html: fallbackHtml, fontLinks } = postProcess(agentResult.text);
    if (countSlides(fallbackHtml) > 0) {
      finalHtml = fallbackHtml;
      finalTitle = extractTitle(fallbackHtml) || finalTitle;
      injectFonts(fontLinks);
    }
  }

  if (countSlides(finalHtml) === 0) {
    throw new Error('Generated HTML contains no slide sections — the response may have been truncated.');
  }

  return {
    html: finalHtml,
    title: finalTitle,
    slideCount: countSlides(finalHtml),
    fastPath: false,
  };
}

/**
 * Generate slides for an edit operation (modify/refine_style/add_slides).
 * Uses the compact edit prompt. Same fast-path QA + ToolLoopAgent pattern.
 *
 * For add_slides: asks the agent to generate ONLY the new slide(s), then
 * appends them to the existing deck. This prevents accidental overwrites.
 */
export async function designEdit(
  planResult: PlanResult,
  existingSlidesHtml: string,
  chatHistory: AIMessage[],
  model: LanguageModel,
  onEvent: EventListener,
  signal?: AbortSignal,
): Promise<DesignResult> {
  const t0 = performance.now();
  const existingSlideCount = countSlides(existingSlidesHtml);
  const isAddSlides = planResult.intent === 'add_slides';

  const systemPrompt = buildEditDesignerPrompt(
    planResult.blueprint.palette,
    planResult.animationLevel,
  );

  const messages: ModelMessage[] = [];
  const recentHistory = chatHistory.slice(-10);
  if (recentHistory.length > 0) {
    messages.push(...toModelMessages(recentHistory));
  }

  // Build the user prompt — add_slides gets a focused "new slide only" prompt
  const userContent = isAddSlides
    ? buildAddSlidesPrompt(planResult, existingSlidesHtml, existingSlideCount)
    : buildEditPrompt(planResult, existingSlidesHtml, existingSlideCount);

  messages.push({ role: 'user', content: userContent });

  // Phase 1: Stream for instant preview
  const requestMessages = [
    { role: 'system', content: systemPrompt, providerOptions: CACHE_CONTROL } as ModelMessage,
    ...messages,
  ];
  logPromptMetrics('designer:edit', requestMessages, {
    intent: planResult.intent,
    template: planResult.selectedTemplate,
    recipe: planResult.exemplarPackId,
    existingSlideCount,
  });

  let draftText = '';
  await withRetry(async () => {
    draftText = '';
    const streamResult = streamText({
      model,
      messages: requestMessages,
      abortSignal: signal,
    });
    for await (const chunk of streamResult.textStream) {
      draftText += chunk;
      onEvent({ type: 'streaming', stepId: 'targeted-design', chunk });
    }
  });

  const { html: draftHtml, fontLinks: draftFontLinks } = postProcess(draftText);
  const streamMs = (performance.now() - t0).toFixed(0);
  aiDebugLog('designer:edit', `streaming complete in ${streamMs}ms`, { draftChars: draftText.length, slideCount: countSlides(draftHtml), isAddSlides });
  let processedDraft = draftHtml;
  let patchApplied = false;
  if (isAddSlides) {
    processedDraft = preserveExistingSlidesForAddIntent(existingSlidesHtml, draftHtml);
  } else if (draftText.includes('<<<<<<< FIND')) {
    // Patch mode: try to apply SEARCH/REPLACE blocks to the existing HTML
    const patches = parsePatchBlocks(draftText);
    if (patches.length > 0) {
      const patchResult = applyPatches(existingSlidesHtml, patches);
      if (patchResult.success) {
        processedDraft = patchResult.html;
        patchApplied = true;
        aiDebugLog('designer:edit', `patch mode: applied ${patches.length} patch(es) successfully`);
      } else {
        aiDebugLog('designer:edit', `patch pre-flight failed (${patchResult.failedPatches.length} unmatched), falling back to full HTML`);
        console.warn('[designer:edit] patch pre-flight failed:', patchResult.failedPatches.map(p => p.find.slice(0, 80)));
      }
    } else {
      aiDebugLog('designer:edit', 'patch markers found but parsed 0 patches — treating as full HTML');
    }
  }
  if (countSlides(processedDraft) > 0) {
    injectFonts(draftFontLinks);
    onEvent({ type: 'draft-complete', html: processedDraft });
  }

  // Fast-path QA check.
  // For add_slides: validate ONLY the newly generated slide (draftHtml), not the
  // merged deck (processedDraft). Existing slides may have different palettes and
  // are not the agent's responsibility — validating them creates unfixable violations.
  const qaOptions = {
    expectedBgColor: planResult.blueprint.palette.bg,
    isCreate: false,
    styleManifest: planResult.styleManifest,
    exemplarPackId: planResult.exemplarPackId,
  };
  const htmlToQA = isAddSlides ? draftHtml : processedDraft;
  const draftQa = validateSlides(htmlToQA, qaOptions);
  const continuity = isAddSlides ? assessContinuity(existingSlidesHtml, draftHtml) : null;
  if (continuity) {
    aiDebugLog('designer:edit', 'continuity assessment', continuity);
    onEvent({
      type: 'progress',
      message: `Continuity score: ${continuity.score}/100${continuity.passes ? ' (aligned)' : ' (needs refinement)'}`,
      pct: continuity.passes ? 88 : 60,
    });
    if (!continuity.passes && continuity.issues.length > 0) {
      onEvent({
        type: 'progress',
        message: `Continuity issues: ${continuity.issues.join(' | ')}`,
        pct: 61,
      });
    }
  }

  const continuityPassed = continuity?.passes ?? true;

  if (draftQa.passed && continuityPassed && countSlides(processedDraft) > 0) {
    const elapsed = (performance.now() - t0).toFixed(0);
    aiDebugLog('designer:edit', `fast-path QA passed in ${elapsed}ms`);
    onEvent({ type: 'progress', message: 'QA passed — slides ready', pct: 90 });
    return {
      html: processedDraft,
      title: extractTitle(processedDraft),
      slideCount: countSlides(processedDraft),
      fastPath: true,
    };
  }

  // Phase 2: ToolLoopAgent validate→fix loop (only when QA found errors in the new slide)
  const qaViolations = draftQa.violations.filter((v) => v.tier === 'blocking');
  aiDebugLog('designer:edit', `QA failed, entering agent loop`, {
    blockingCount: qaViolations.length,
    blockingIssues: qaViolations.map((v) => `[${v.rule}] ${v.detail}`),
    continuityScore: continuity?.score,
    continuityIssues: continuity?.issues,
  });
  onEvent({
    type: 'progress',
    message: continuity && !continuity.passes ? 'Fixing continuity and QA issues…' : 'Fixing QA issues…',
    pct: 65,
  });

  const agent = createDesignAgent(model, systemPrompt, planResult);

  // For the agent loop, pass the raw draft (not the merged version) so it sees what it generated.
  // Exception: when patches were applied, pass the patched full HTML so the agent can validate it
  // directly rather than trying to work with raw patch markers.
  const agentAssistantContent = patchApplied ? processedDraft : draftText;
  const validationMessages: ModelMessage[] = [...messages];
  validationMessages.push({ role: 'assistant', content: agentAssistantContent });
  if (continuity && !continuity.passes) {
    validationMessages.push({
      role: 'user',
      content: `Before validation, improve continuity with the existing deck. Current continuity score: ${continuity.score}/100. Fix these continuity issues first:\n- ${continuity.issues.join('\n- ')}\n\nKeep the content topic the same, but make the slide feel like it belongs to the same design system as the existing deck. Reuse existing classes, CSS variables, typography rhythm, card language, and motion cadence.`,
    });
  }
  validationMessages.push({
    role: 'user',
    content: 'Now validate the slide HTML you just generated by calling the validateSlideHtml tool. If there are any errors, fix them and validate again. Once it passes with 0 errors, call submitFinalSlide.',
  });

  const agentResult = await withRetry(() =>
    agent.generate({
      messages: validationMessages,
      abortSignal: signal,
    }),
  );

  // Extract final HTML from submitFinalSlide
  let finalHtml = processedDraft;
  let finalTitle = extractTitle(processedDraft);
  const agentMs = (performance.now() - t0).toFixed(0);
  const totalSteps = agentResult.steps.length;
  aiDebugLog('designer:edit', `agent loop complete in ${agentMs}ms`, { steps: totalSteps });

  for (const step of agentResult.steps) {
    for (const call of step.toolCalls) {
      if (call.toolName === 'submitFinalSlide') {
        const { html: submittedRaw, title } = call.input as { html: string; title: string };
        let { html: submittedHtml, fontLinks } = postProcess(submittedRaw);
        if (isAddSlides) {
          submittedHtml = preserveExistingSlidesForAddIntent(existingSlidesHtml, submittedHtml);
        }
        if (countSlides(submittedHtml) > 0) {
          finalHtml = submittedHtml;
          finalTitle = title || finalTitle;
          injectFonts(fontLinks);
        }
      }
    }
  }

  // Fallback
  if (finalHtml === processedDraft && agentResult.text) {
    // Check for patch blocks in agent text output before attempting full-HTML extraction
    if (!isAddSlides && agentResult.text.includes('<<<<<<< FIND')) {
      const agentPatches = parsePatchBlocks(agentResult.text);
      if (agentPatches.length > 0) {
        const agentPatchResult = applyPatches(existingSlidesHtml, agentPatches);
        if (agentPatchResult.success) {
          const { fontLinks } = postProcess(agentResult.text);
          finalHtml = agentPatchResult.html;
          finalTitle = extractTitle(finalHtml) || finalTitle;
          injectFonts(fontLinks);
          aiDebugLog('designer:edit', `fallback patch mode: applied ${agentPatches.length} patch(es) from agent text`);
        } else {
          aiDebugLog('designer:edit', `fallback patch pre-flight failed (${agentPatchResult.failedPatches.length} unmatched), trying full-HTML extraction`);
        }
      }
    }
    // If patches didn't apply, try extracting full HTML from the agent text
    if (finalHtml === processedDraft) {
      let { html: fallbackHtml, fontLinks } = postProcess(agentResult.text);
      if (isAddSlides) {
        fallbackHtml = preserveExistingSlidesForAddIntent(existingSlidesHtml, fallbackHtml);
      }
      if (countSlides(fallbackHtml) > 0) {
        finalHtml = fallbackHtml;
        finalTitle = extractTitle(fallbackHtml) || finalTitle;
        injectFonts(fontLinks);
      }
    }
  }

  if (countSlides(finalHtml) === 0) {
    throw new Error('Generated HTML contains no slide sections — the response may have been truncated.');
  }

  return {
    html: finalHtml,
    title: finalTitle,
    slideCount: countSlides(finalHtml),
    fastPath: false,
  };
}

/**
 * Build an art direction block from the style manifest for the user message.
 */
function buildArtDirectionBlock(
  manifest: StyleManifest,
  exemplarName: string,
  visualThesis?: string,
): string {
  return `Art direction:
- Exemplar: ${exemplarName}
${visualThesis ? `- Visual thesis: ${visualThesis}
` : ''}- Composition: ${manifest.compositionMode}
- Background: ${manifest.backgroundTreatment}
- Typography mood: ${manifest.typographyMood}
- Motion: ${manifest.motionLanguage}
- SVG strategy: ${manifest.svgStrategy}
- Hero pattern: ${manifest.heroPattern}
- Component patterns: ${manifest.componentPatterns.join('; ')}`;
}

/**
 * Build the user prompt for a standard edit operation (modify/refine_style).
 */
function buildEditPrompt(
  planResult: PlanResult,
  existingSlidesHtml: string,
  existingSlideCount: number,
): string {
  return `## EDIT MODE — Modify Existing Slide(s)

Here are the current slides (${existingSlideCount} slide(s) total):

\`\`\`html
${existingSlidesHtml}
\`\`\`

**User request:** ${planResult.enhancedPrompt}

**CRITICAL RULES:**
- Output the COMPLETE deck: \`<style>\` block and ALL \`<section>\` elements.
- Preserve slides not affected by the request — output them unchanged.
- Keep the same CSS architecture, palette, fonts, and animation patterns.
- Output a single code block. NOTHING else.

After generating the HTML, call validateSlideHtml, fix any errors, then call submitFinalSlide.`;
}

/**
 * Build the user prompt for an add-slides operation.
 * Asks the agent to generate ONLY the new section(s) — they will be appended
 * to the existing deck automatically. This prevents overwrite bugs.
 *
 * Deck structure guidance:
 *   Slide 1 — Title/hero
 *   Slide 2 — Agenda/overview
 *   Slide 3+ — Content slides (one topic per slide)
 *   Last — Summary/CTA/closing
 */
function buildAddSlidesPrompt(
  planResult: PlanResult,
  existingSlidesHtml: string,
  existingSlideCount: number,
): string {
  const lastSlides = extractLastNSections(existingSlidesHtml, 2);
  const styleContinuity = buildStyleContinuityContext(existingSlidesHtml);

  // Suggest what slide type comes next based on deck position
  const nextSlideHint = existingSlideCount === 1
    ? 'This is slide 2 — make it an Agenda/Overview slide listing the topics to be covered.'
    : existingSlideCount === 2
    ? 'This is slide 3 — start the first content slide diving into the main topic.'
    : `This is slide ${existingSlideCount + 1} — continue with the next content point or transition toward a closing slide.`;

  const preferredRecipe = existingSlideCount === 1
    ? 'agenda-overview'
    : existingSlideCount === 2
    ? 'editorial-infographic / metrics-dashboard / process-timeline (choose the best fit for the content)'
    : 'match the current deck’s established recipe and visual system';

  return `## ADD NEW SLIDE — Append to existing ${existingSlideCount}-slide deck

${styleContinuity}

**Existing deck context** (last ${Math.min(existingSlideCount, 2)} slide(s) — match this visual style):
\`\`\`html
${lastSlides}
\`\`\`

**User request:** ${planResult.enhancedPrompt}

**Slide position hint:** ${nextSlideHint}
**Preferred recipe:** ${preferredRecipe}

**OUTPUT RULES — CRITICAL:**
- Output ONLY the NEW \`<section>\` element(s) to append. Do NOT repeat existing slides.
- Do NOT output a \`<style>\` block — the new section uses the existing deck's CSS classes.
- Reuse the existing class vocabulary and visual system. Prefer using the deck's existing classes, spacing rhythm, typography scale, and animation cadence.
- Match the background color, CSS class naming patterns, and animation style of the existing slides.
- The new section MUST have a \`data-background-color\` attribute.
- Make it visually consistent and breathtaking.

After generating the new section(s), call validateSlideHtml, fix any errors, then call submitFinalSlide.`;
}
