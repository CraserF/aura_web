/**
 * Designer Agent — Generates the actual HTML/CSS slides.
 * Uses the modular PromptComposer for context-aware system prompts.
 * Handles both create (from outline) and modify flows.
 */

import type { AIMessage } from '../../types';
import { buildDesignerPrompt } from '../../prompts';
import { selectTemplate } from '../../templates';
import { extractHtmlFromResponse, countSlides, extractTitle } from '../../utils/extractHtml';
import { injectFonts } from '../../utils/injectFonts';
import type { LLMClient } from '../types';
import type { PlanResult } from './planner';

export interface DesignResult {
  html: string;
  title?: string;
  slideCount: number;
}

/**
 * Generate slides HTML from a plan.
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
    { role: 'system', content: systemPrompt },
  ];

  // Include recent chat history for context (limit to last 20 messages)
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
  const { html, fontLinks } = extractHtmlFromResponse(fullResponse);

  // Inject fonts into the document
  injectFonts(fontLinks);

  return {
    html,
    title: extractTitle(html),
    slideCount: countSlides(html),
  };
}
