/**
 * Planner Agent — Analyzes the user's request and produces a structured
 * presentation outline. Runs as the first step in the workflow.
 *
 * Responsibilities:
 * - Classify intent (create / modify / restyle / add slides)
 * - Detect template style & animation level from the prompt
 * - Validate for blocked/off-topic content
 * - Build a JSON outline: slide count, titles, layout types
 */

import {
  detectTemplateStyle,
  detectAnimationLevel,
  getTemplateBlueprint,
} from '../../templates';
import type { TemplateStyle, TemplateBlueprint } from '../../templates';
import { classifyIntent } from '../../validation';
import type { RequestIntent } from '../../validation';
import { OutlineArraySchema, type SlideOutline } from '../../schemas';
import type { LLMClient } from '../types';

export type { RequestIntent, SlideOutline };

export interface PlanResult {
  intent: RequestIntent;
  blocked: boolean;
  blockReason?: string;
  style: TemplateStyle;
  animationLevel: 1 | 2 | 3 | 4;
  blueprint: TemplateBlueprint;
  enhancedPrompt: string;
  /** Structured outline produced by LLM (for create intent) */
  outline?: SlideOutline[];
  /** True if the outline came from the generic fallback (LLM parse failed) */
  outlineFallback?: boolean;
}

// ── Outline Generation (LLM + Zod structured output) ────────

const OUTLINE_SYSTEM = `You are a presentation content strategist. Given a topic, produce a slide outline as a JSON array.

Each slide object: { "index": number, "title": string (2-6 words), "layout": string, "keyPoints": string[] (2-4 items, max 10 words each) }

Layout options: "hero-title", "bento-grid", "split-text-visual", "metrics-row", "timeline", "comparison", "icon-grid", "pull-quote", "process-steps", "card-grid", "closing-cta"

Rules:
- First slide is ALWAYS "hero-title"
- Last slide is ALWAYS "closing-cta"
- NEVER repeat the same layout on consecutive slides
- NEVER use "card-grid" more than twice — it is the most overused default pattern
- Produce 8-12 slides total. 10 is the ideal target.
- Use at LEAST 5 different layout types across the deck for visual variety
- Include a "pull-quote" or strong statement slide at the 60-70% mark
- Include at least one "metrics-row" or data-focused slide
- Include at least one "split-text-visual" or "timeline" for visual breathing room
- keyPoints should be specific and content-rich, not generic placeholders like "Point 1"

Output ONLY the JSON array. No markdown, no explanation.`;

async function generateOutline(
  prompt: string,
  llm: LLMClient,
): Promise<{ outline: SlideOutline[]; fallback: boolean }> {
  // Try structured output first (Zod-validated via AI SDK generateObject)
  try {
    const outline = await llm.generateStructured(
      [
        { role: 'system', content: OUTLINE_SYSTEM },
        { role: 'user', content: prompt },
      ],
      OutlineArraySchema,
      'slide-outline',
    );
    return { outline, fallback: false };
  } catch (structuredErr) {
    console.warn('[Planner] Structured output failed, falling back to raw generation:', structuredErr);
  }

  // Fallback: raw text generation with manual JSON parsing
  try {
    const response = await llm.generate([
      { role: 'system', content: OUTLINE_SYSTEM },
      { role: 'user', content: prompt },
    ]);

    const jsonStr = response.replace(/```json?\s*\n?/g, '').replace(/```/g, '').trim();
    try {
      return { outline: JSON.parse(jsonStr), fallback: false };
    } catch {
      const arrayStart = response.indexOf('[');
      const arrayEnd = response.lastIndexOf(']');
      if (arrayStart !== -1 && arrayEnd > arrayStart) {
        try {
          return { outline: JSON.parse(response.slice(arrayStart, arrayEnd + 1)), fallback: false };
        } catch { /* fall through */ }
      }
    }
  } catch {
    // Both structured and raw generation failed
  }

  console.warn('[Planner] All outline generation attempts failed, using fallback');
  return { outline: buildFallbackOutline(prompt), fallback: true };
}

function buildFallbackOutline(prompt: string): SlideOutline[] {
  const topic = prompt.slice(0, 60);
  return [
    { index: 0, title: topic, layout: 'hero-title', keyPoints: ['Opening statement'] },
    { index: 1, title: 'The Challenge', layout: 'split-text-visual', keyPoints: ['Problem context', 'Scale of impact'] },
    { index: 2, title: 'Our Approach', layout: 'icon-grid', keyPoints: ['Key pillar 1', 'Key pillar 2', 'Key pillar 3'] },
    { index: 3, title: 'Key Features', layout: 'bento-grid', keyPoints: ['Feature A', 'Feature B', 'Feature C', 'Feature D'] },
    { index: 4, title: 'By the Numbers', layout: 'metrics-row', keyPoints: ['Metric 1', 'Metric 2', 'Metric 3'] },
    { index: 5, title: 'How It Works', layout: 'process-steps', keyPoints: ['Step 1', 'Step 2', 'Step 3'] },
    { index: 6, title: 'Results', layout: 'comparison', keyPoints: ['Before', 'After'] },
    { index: 7, title: 'Key Insight', layout: 'pull-quote', keyPoints: ['A compelling statement'] },
    { index: 8, title: 'Timeline', layout: 'timeline', keyPoints: ['Phase 1', 'Phase 2', 'Phase 3'] },
    { index: 9, title: 'Get Started', layout: 'closing-cta', keyPoints: ['Next steps', 'Call to action'] },
  ];
}

// ── Main plan function ──────────────────────────────────────

export async function plan(
  prompt: string,
  hasExistingSlides: boolean,
  llm: LLMClient,
): Promise<PlanResult> {
  const { intent, reason } = classifyIntent(prompt, hasExistingSlides);

  if (intent === 'blocked' || intent === 'off_topic') {
    const style = 'tech' as TemplateStyle;
    return {
      intent,
      blocked: true,
      blockReason: reason,
      style,
      animationLevel: 2,
      blueprint: getTemplateBlueprint(style),
      enhancedPrompt: prompt,
    };
  }

  const style = detectTemplateStyle(prompt);
  const animationLevel = detectAnimationLevel(prompt);
  const blueprint = getTemplateBlueprint(style);

  let outline: SlideOutline[] | undefined;
  let outlineFallback: boolean | undefined;
  let enhancedPrompt = prompt;

  if (intent === 'create') {
    // Use LLM to generate a structured outline (Zod-validated, with fallback)
    const result = await generateOutline(prompt, llm);
    outline = result.outline;
    outlineFallback = result.fallback;
    enhancedPrompt = buildEnhancedPrompt(prompt, outline, intent);
  } else {
    enhancedPrompt = buildEnhancedPrompt(prompt, undefined, intent);
  }

  return {
    intent,
    blocked: false,
    style,
    animationLevel,
    blueprint,
    enhancedPrompt,
    outline,
    outlineFallback,
  };
}

// ── Prompt enhancement ──────────────────────────────────────

function buildEnhancedPrompt(
  prompt: string,
  outline: SlideOutline[] | undefined,
  intent: RequestIntent,
): string {
  const additions: string[] = [];

  if (intent === 'create' && outline) {
    const outlineStr = outline
      .map((s) => `  ${s.index + 1}. [${s.layout}] "${s.title}" — ${s.keyPoints.join(', ')}`)
      .join('\n');
    additions.push(`SLIDE OUTLINE CONTRACT — You MUST produce exactly ${outline.length} slides matching this outline:
${outlineStr}

CRITICAL: Produce exactly ${outline.length} slides. Each slide must match its specified layout type and cover the listed key points. Do not skip, merge, or add slides.`);
  }

  if (intent === 'modify') {
    additions.push('Maintain visual consistency with the existing deck. Output ALL slides, not just changed ones.');
  }
  if (intent === 'refine_style') {
    additions.push('Apply style changes consistently across ALL slides. Keep content and slide count, only change visual styling.');
  }
  if (intent === 'add_slides') {
    additions.push('Add new slides in a logical position. Match existing style. Output the complete deck with new slides integrated.');
  }

  return additions.length > 0
    ? `${prompt}\n\n${additions.join('\n')}`
    : prompt;
}
