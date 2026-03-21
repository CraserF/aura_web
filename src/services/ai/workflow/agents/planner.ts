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
import type { LLMClient } from '../types';

export type { RequestIntent };

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
}

export interface SlideOutline {
  index: number;
  title: string;
  layout: string;
  keyPoints: string[];
}

// ── Outline Generation (LLM call) ──────────────────────────

const OUTLINE_SYSTEM = `You are a presentation content strategist. Given a topic, produce a slide outline as a JSON array.

Each slide object: { "index": number, "title": string (2-6 words), "layout": string, "keyPoints": string[] (2-4 items, max 10 words each) }

Layout options: "hero-title", "bento-grid", "split-text-visual", "metrics-row", "timeline", "comparison", "icon-grid", "pull-quote", "process-steps", "card-grid", "closing-cta"

Rules:
- First slide is always "hero-title"
- Last slide is always "closing-cta"
- NEVER repeat the same layout on consecutive slides
- 8-12 slides total
- Include a "pull-quote" or strong statement slide at the 60-70% mark
- Include at least one "metrics-row" or "bento-grid" with data

Output ONLY the JSON array. No markdown, no explanation.`;

async function generateOutline(
  prompt: string,
  llm: LLMClient,
): Promise<SlideOutline[]> {
  const response = await llm.generate([
    { role: 'system', content: OUTLINE_SYSTEM },
    { role: 'user', content: prompt },
  ]);

  try {
    // Extract JSON from possible code fences
    const jsonStr = response.replace(/```json?\s*\n?/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch {
    // Fallback: basic 10-slide outline
    return buildFallbackOutline(prompt);
  }
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
  let enhancedPrompt = prompt;

  if (intent === 'create') {
    // Use LLM to generate a structured outline
    outline = await generateOutline(prompt, llm);
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
    additions.push(`Follow this slide outline exactly:\n${outlineStr}`);
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
