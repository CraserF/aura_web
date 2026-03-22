/**
 * Designer Agent — Generates the actual HTML/CSS slides.
 * Uses the modular PromptComposer for context-aware system prompts.
 * Handles both create (from outline) and modify flows.
 *
 * Prompt caching: The system prompt is identical across all batch calls.
 * Batch-specific instructions live in the user message so the cached
 * prefix stays byte-identical for 90% cost reduction on providers
 * that support it (Anthropic, OpenAI, Gemini).
 */

import type { AIMessage } from '../../types';
import { buildDesignerPrompt } from '../../prompts';
import { selectTemplate } from '../../templates';
import { extractHtmlFromResponse, countSlides, extractTitle } from '../../utils/extractHtml';
import { sanitizeSlideHtml } from '../../utils/sanitizeHtml';
import { injectFonts } from '../../utils/injectFonts';
import type { LLMClient } from '../types';
import type { PlanResult, SlideOutline } from './planner';
import type { TemplateBlueprint } from '../../templates';

/** Anthropic cache control marker — enables prompt caching on the system message */
const CACHE_CONTROL = {
  anthropic: { cacheControl: { type: 'ephemeral' } },
} as const;

export interface DesignResult {
  html: string;
  title?: string;
  slideCount: number;
}

export interface BatchDesignResult {
  html: string;
  slideCount: number;
}

/**
 * Generate slides HTML from a plan.
 * Streams chunks through onChunk for real-time display.
 */
/**
 * Extract the last N <section> elements from accumulated HTML for continuity context.
 */
function extractLastNSections(html: string, n: number): string {
  const sectionRegex = /<section[\s\S]*?<\/section>/gi;
  const matches = html.match(sectionRegex);
  if (!matches || matches.length === 0) return '';
  return matches.slice(-n).join('\n');
}

/**
 * Generate a batch of slides from a subset of the outline.
 * Uses the FULL designer prompt (~35K tokens) with prompt caching.
 * Batch-specific instructions are in the user message so the system
 * prompt stays byte-identical across calls (cache hit on batches 2+).
 */
export async function designBatch(
  batchOutline: SlideOutline[],
  topic: string,
  blueprint: TemplateBlueprint,
  animLevel: 1 | 2 | 3 | 4,
  batchIndex: number,
  totalBatches: number,
  previousHtml: string,
  llm: LLMClient,
  onChunk?: (chunk: string) => void,
): Promise<BatchDesignResult> {
  const isFirstBatch = batchIndex === 0;
  const templateId = selectTemplate(topic);

  // Full designer prompt — identical across all batch calls for cache hits
  const systemPrompt = buildDesignerPrompt(
    blueprint,
    templateId,
    animLevel,
    batchOutline.length, // slide count for this batch
  );

  // Build user message with outline + batch instructions
  const outlineStr = batchOutline
    .map((s) => `  ${s.index + 1}. [${s.layout}] "${s.title}" — ${s.keyPoints.join(', ')}`)
    .join('\n');

  const batchInstructions = isFirstBatch
    ? `## BATCH GENERATION — Batch ${batchIndex + 1} of ${totalBatches}

Generate the first batch of slides for this topic.
- Start with the Google Fonts \`<link>\` tag as the FIRST line.
- Define CSS custom properties (--primary, --accent, --heading-font, --body-font) on the FIRST \`<section>\` ONLY.
- Output ONLY the \`<section>\` elements for the slides specified below.
- Use the palette colors EXACTLY as given. Do NOT invent new hex colors.
- Output a single code block. NOTHING else — no explanation, no commentary.`
    : `## BATCH GENERATION — Batch ${batchIndex + 1} of ${totalBatches}

Generate the next batch of slides.
- Do NOT include a Google Fonts \`<link>\` tag (already included in batch 1).
- Do NOT define CSS custom properties (already defined in batch 1). Use var(--primary), var(--accent), etc.
- Match the visual style of the previous slides exactly — same fonts, colors, spacing, card styles.
- Output ONLY \`<section>\` elements. No explanation, no commentary.`;

  let userContent = `${batchInstructions}\n\nTopic: ${topic}\n\nGenerate slides for this batch:\n${outlineStr}`;

  // For non-first batches, include last 2 sections for visual continuity
  if (!isFirstBatch && previousHtml) {
    const context = extractLastNSections(previousHtml, 2);
    if (context) {
      userContent += `\n\nHere are the last 2 slides from previous batches (for visual continuity — do NOT reproduce these, just match their style):\n\n\`\`\`html\n${context}\n\`\`\``;
    }
  }

  const messages: AIMessage[] = [
    { role: 'system', content: systemPrompt, providerOptions: CACHE_CONTROL },
    { role: 'user', content: userContent },
  ];

  const fullResponse = await llm.generate(messages, onChunk);

  const { html: rawHtml, fontLinks } = extractHtmlFromResponse(fullResponse);
  const html = sanitizeSlideHtml(rawHtml);

  // Only inject fonts on the first batch
  if (isFirstBatch) {
    injectFonts(fontLinks);
  }

  return {
    html,
    slideCount: countSlides(html),
  };
}

/**
 * Generate slides for an edit operation (modify/refine_style/add_slides).
 * Uses the FULL designer prompt with prompt caching for rich SVG/knowledge access.
 * Edit-specific instructions are in the user message.
 */
export async function designEdit(
  planResult: PlanResult,
  existingSlidesHtml: string,
  chatHistory: AIMessage[],
  llm: LLMClient,
  onChunk?: (chunk: string) => void,
): Promise<DesignResult> {
  const templateId = selectTemplate(planResult.enhancedPrompt);
  const existingSlideCount = countSlides(existingSlidesHtml);

  // Full designer prompt with cache control — same as batch calls
  const systemPrompt = buildDesignerPrompt(
    planResult.blueprint,
    templateId,
    planResult.animationLevel,
    existingSlideCount,
  );

  const messages: AIMessage[] = [
    { role: 'system', content: systemPrompt, providerOptions: CACHE_CONTROL },
  ];

  // Include recent chat history (limit to last 10 for edits)
  const recentHistory = chatHistory.slice(-10);
  if (recentHistory.length > 0) {
    messages.push(...recentHistory);
  }

  messages.push({
    role: 'user',
    content: `## EDIT MODE — Modify Existing Deck

Here are the current slides (${existingSlideCount} slides total):

\`\`\`html
${existingSlidesHtml}
\`\`\`

**User request:** ${planResult.enhancedPrompt}

**CRITICAL RULES FOR EDITING:**
- You MUST output ALL ${existingSlideCount} slides (or more if adding new slides). Do NOT reduce the slide count.
- Preserve slides that are NOT affected by the request — output them unchanged.
- Keep the same palette, fonts, CSS custom properties, and overall design language.
- If the user asks to "add" something (e.g., SVG animations, new slides), ADD to the existing deck — do NOT replace or remove existing content.
- If enhancing slides with SVG illustrations, integrate them into the existing slide structure.
- Output a single code block with the COMPLETE modified deck. NOTHING else.`,
  });

  const fullResponse = await llm.generate(messages, onChunk);

  const { html: rawHtml, fontLinks } = extractHtmlFromResponse(fullResponse);
  const html = sanitizeSlideHtml(rawHtml);
  injectFonts(fontLinks);

  return {
    html,
    title: extractTitle(html),
    slideCount: countSlides(html),
  };
}

/**
 * Generate slides HTML from a plan (full prompt — used as fallback).
 * Streams chunks through onChunk for real-time display.
 */
export async function design(
  planResult: PlanResult,
  existingSlidesHtml: string | undefined,
  chatHistory: AIMessage[],
  llm: LLMClient,
  onChunk?: (chunk: string) => void,
): Promise<DesignResult> {
  // Select the best matching template from the registry
  const templateId = selectTemplate(planResult.enhancedPrompt);

  // Pass the planned slide count to the prompt composer for hard enforcement
  const plannedSlideCount = planResult.outline?.length;

  // Build the system prompt with all sections — including anti-patterns and template examples
  const systemPrompt = buildDesignerPrompt(
    planResult.blueprint,
    templateId,
    planResult.animationLevel,
    plannedSlideCount,
  );

  const messages: AIMessage[] = [
    { role: 'system', content: systemPrompt, providerOptions: CACHE_CONTROL },
  ];
  const recentHistory = chatHistory.slice(-20);
  if (recentHistory.length > 0) {
    messages.push(...recentHistory);
  }

  // Build the user message based on intent
  const userContent = existingSlidesHtml
    ? `Here are the current slides:\n\n\`\`\`html\n${existingSlidesHtml}\n\`\`\`\n\nPlease modify them based on this request: ${planResult.enhancedPrompt}`
    : planResult.enhancedPrompt;

  messages.push({ role: 'user', content: userContent });

  // Make the LLM call with streaming
  const fullResponse = await llm.generate(messages, onChunk);

  // Extract HTML from the response (pure — no DOM side effects)
  const { html: rawHtml, fontLinks } = extractHtmlFromResponse(fullResponse);

  // Sanitize: strip any external URLs the LLM may have included
  const html = sanitizeSlideHtml(rawHtml);

  // Inject fonts into the document
  injectFonts(fontLinks);

  return {
    html,
    title: extractTitle(html),
    slideCount: countSlides(html),
  };
}
