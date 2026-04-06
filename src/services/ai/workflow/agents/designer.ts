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
 * After the agent loop finishes (validate → fix if needed), the final polished
 * HTML silently replaces the draft.
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
import type { PlanResult } from './planner';
import type { StyleManifest } from '../../templates';
import type { EventListener } from '../types';
import { toModelMessages, CACHE_CONTROL } from '../engine';

export interface DesignResult {
  html: string;
  title?: string;
  slideCount: number;
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

/**
 * For add-slide intent, keep existing slides untouched and append only newly generated sections.
 */
function preserveExistingSlidesForAddIntent(existingHtml: string, candidateHtml: string): string {
  const existingSections = extractSections(existingHtml);
  if (existingSections.length === 0) return candidateHtml;

  const generatedSections = extractSections(candidateHtml);
  if (generatedSections.length <= existingSections.length) {
    return existingHtml;
  }

  const appended = generatedSections.slice(existingSections.length).join('\n');
  return appended ? `${existingHtml}\n${appended}` : existingHtml;
}

/**
 * Post-process raw LLM output into clean, validated slide HTML.
 */
function postProcess(raw: string): { html: string; fontLinks: string[] } {
  const { html: rawHtml, fontLinks } = extractHtmlFromResponse(raw);
  const html = sanitizeSlideHtml(rawHtml);
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
        description: 'Validate slide HTML against quality rules. Call this AFTER generating your slide to check for structural errors, palette compliance, contrast issues, and other design problems. Fix any errors found, then validate again.',
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
          const errors = result.violations.filter((v) => v.severity === 'error');
          const warnings = result.violations.filter((v) => v.severity === 'warning');
          return {
            passed: result.passed,
            errorCount: errors.length,
            warningCount: warnings.length,
            errors: errors.map((v) => `[${v.rule}] slide ${v.slide}: ${v.detail}`),
            warnings: warnings.map((v) => `[${v.rule}] slide ${v.slide}: ${v.detail}`),
          };
        },
      }),
      submitFinalSlide: tool({
        description: 'Submit the final slide HTML when validation passes (0 errors). Include the complete HTML with <link>, <style>, and <section> elements.',
        inputSchema: z.object({
          html: z.string().describe('The final validated slide HTML'),
          title: z.string().describe('A short descriptive title for this slide'),
        }),
        // No execute — agent stops when it calls this tool
      }),
    },
    stopWhen: [
      stepCountIs(6), // Safety: generate + validate + fix + validate + fix + final
    ],
  });
}

/**
 * Generate a single stunning slide from a plan.
 *
 * Two-phase approach:
 * 1. Initial streaming generation for instant canvas preview
 * 2. ToolLoopAgent run for self-validation and fixes (draft + final swap)
 */
export async function design(
  planResult: PlanResult,
  existingSlidesHtml: string | undefined,
  chatHistory: AIMessage[],
  model: LanguageModel,
  onEvent: EventListener,
  signal?: AbortSignal,
): Promise<DesignResult> {
  // Build the system prompt with all sections
  const systemPrompt = buildDesignerPrompt(
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
  const artDirection = buildArtDirectionBlock(planResult.styleManifest, exemplarPack.name);

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
  const streamResult = streamText({
    model,
    messages: [
      { role: 'system', content: systemPrompt, providerOptions: CACHE_CONTROL } as ModelMessage,
      ...messages,
    ],
    abortSignal: signal,
  });

  let draftText = '';
  for await (const chunk of streamResult.textStream) {
    draftText += chunk;
    onEvent({ type: 'streaming', stepId: 'design', chunk });
  }

  // Show the draft immediately
  const { html: draftHtml, fontLinks: draftFontLinks } = postProcess(draftText);
  if (countSlides(draftHtml) > 0) {
    injectFonts(draftFontLinks);
    onEvent({ type: 'draft-complete', html: draftHtml });
  }

  // Phase 2: Run the ToolLoopAgent for self-validation and fixes
  onEvent({ type: 'progress', message: 'Validating and polishing…', pct: 65 });

  const agent = createDesignAgent(model, systemPrompt, planResult);

  // Feed the draft output back to the agent for validation
  const validationMessages: ModelMessage[] = [...messages];
  validationMessages.push({ role: 'assistant', content: draftText });
  validationMessages.push({
    role: 'user',
    content: 'Now validate the slide HTML you just generated by calling the validateSlideHtml tool. If there are any errors, fix them and validate again. Once it passes with 0 errors, call submitFinalSlide.',
  });

  const agentResult = await agent.generate({
    messages: validationMessages,
    abortSignal: signal,
  });

  // Extract the final HTML from the submitFinalSlide tool call
  let finalHtml = draftHtml;
  let finalTitle = extractTitle(draftHtml);

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
  };
}

/**
 * Generate slides for an edit operation (modify/refine_style/add_slides).
 * Uses the compact edit prompt. Same ToolLoopAgent self-validation pattern.
 */
export async function designEdit(
  planResult: PlanResult,
  existingSlidesHtml: string,
  chatHistory: AIMessage[],
  model: LanguageModel,
  onEvent: EventListener,
  signal?: AbortSignal,
): Promise<DesignResult> {
  const existingSlideCount = countSlides(existingSlidesHtml);

  const systemPrompt = buildEditDesignerPrompt(
    planResult.blueprint.palette,
    planResult.animationLevel,
  );

  const messages: ModelMessage[] = [];
  const recentHistory = chatHistory.slice(-10);
  if (recentHistory.length > 0) {
    messages.push(...toModelMessages(recentHistory));
  }

  messages.push({
    role: 'user',
    content: `## EDIT MODE — Modify Existing Slide(s)

Here are the current slides (${existingSlideCount} slide(s) total):

\`\`\`html
${existingSlidesHtml}
\`\`\`

**User request:** ${planResult.enhancedPrompt}

**CRITICAL RULES FOR EDITING:**
- Output the COMPLETE deck including the \`<style>\` block and ALL \`<section>\` elements.
- Preserve slides that are NOT affected by the request — output them unchanged.
- Keep the same CSS architecture, palette, fonts, and animation patterns.
- If enhancing with SVG illustrations, integrate them into the existing CSS class system.
- If this is an add-slide request, keep ALL existing \`<section>\` elements and existing \`<style>\` unchanged, and append only the new slide section(s).
- For add-slide requests, do not rewrite existing slide copy, structure, animations, or background layers.
- Output a single code block. NOTHING else.

After generating the HTML, call the validateSlideHtml tool to check for issues. Fix any errors found, then call submitFinalSlide with the validated HTML.`,
  });

  // Phase 1: Stream for instant preview
  const streamResult = streamText({
    model,
    messages: [
      { role: 'system', content: systemPrompt, providerOptions: CACHE_CONTROL } as ModelMessage,
      ...messages,
    ],
    abortSignal: signal,
  });

  let draftText = '';
  for await (const chunk of streamResult.textStream) {
    draftText += chunk;
    onEvent({ type: 'streaming', stepId: 'targeted-design', chunk });
  }

  const { html: draftHtml, fontLinks: draftFontLinks } = postProcess(draftText);
  let processedDraft = draftHtml;
  if (planResult.intent === 'add_slides') {
    processedDraft = preserveExistingSlidesForAddIntent(existingSlidesHtml, draftHtml);
  }
  if (countSlides(processedDraft) > 0) {
    injectFonts(draftFontLinks);
    onEvent({ type: 'draft-complete', html: processedDraft });
  }

  // Phase 2: ToolLoopAgent self-validation
  onEvent({ type: 'progress', message: 'Validating and polishing…', pct: 65 });

  const agent = createDesignAgent(model, systemPrompt, planResult);

  const validationMessages: ModelMessage[] = [...messages];
  validationMessages.push({ role: 'assistant', content: draftText });
  validationMessages.push({
    role: 'user',
    content: 'Now validate the slide HTML you just generated by calling the validateSlideHtml tool. If there are any errors, fix them and validate again. Once it passes with 0 errors, call submitFinalSlide.',
  });

  const agentResult = await agent.generate({
    messages: validationMessages,
    abortSignal: signal,
  });

  // Extract final HTML from submitFinalSlide
  let finalHtml = processedDraft;
  let finalTitle = extractTitle(processedDraft);

  for (const step of agentResult.steps) {
    for (const call of step.toolCalls) {
      if (call.toolName === 'submitFinalSlide') {
        const { html: submittedRaw, title } = call.input as { html: string; title: string };
        let { html: submittedHtml, fontLinks } = postProcess(submittedRaw);
        if (planResult.intent === 'add_slides') {
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
    let { html: fallbackHtml, fontLinks } = postProcess(agentResult.text);
    if (planResult.intent === 'add_slides') {
      fallbackHtml = preserveExistingSlidesForAddIntent(existingSlidesHtml, fallbackHtml);
    }
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
  };
}

/**
 * Build an art direction block from the style manifest for the user message.
 */
function buildArtDirectionBlock(manifest: StyleManifest, exemplarName: string): string {
  return `Art direction:
- Exemplar: ${exemplarName}
- Composition: ${manifest.compositionMode}
- Background: ${manifest.backgroundTreatment}
- Typography mood: ${manifest.typographyMood}
- Motion: ${manifest.motionLanguage}
- SVG strategy: ${manifest.svgStrategy}
- Hero pattern: ${manifest.heroPattern}
- Component patterns: ${manifest.componentPatterns.join('; ')}`;
}
