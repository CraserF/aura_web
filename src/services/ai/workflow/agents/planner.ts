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
  detectAnimationLevel,
  getTemplateBlueprint,
  resolveTemplatePlan,
} from '../../templates';
import { aiDebugLog } from '../../debug';
import type {
  ExemplarPackId,
  StyleManifest,
  TemplateBlueprint,
  TemplateStyle,
} from '../../templates';
import { classifyIntent } from '../../validation';
import type { RequestIntent } from '../../validation';
import type { SlideOutline } from '../../schemas';

export type { RequestIntent, SlideOutline };

export interface PlanResult {
  intent: RequestIntent;
  blocked: boolean;
  blockReason?: string;
  style: TemplateStyle;
  selectedTemplate: ExemplarBackedTemplateId;
  exemplarPackId: ExemplarPackId;
  animationLevel: 1 | 2 | 3 | 4;
  blueprint: TemplateBlueprint;
  styleManifest: StyleManifest;
  enhancedPrompt: string;
  /** Structured outline produced by LLM (for create intent) */
  outline?: SlideOutline[];
  /** True if the outline came from the generic fallback (LLM parse failed) */
  outlineFallback?: boolean;
}

type ExemplarBackedTemplateId = ReturnType<typeof resolveTemplatePlan>['templateId'];

// ── Main plan function ──────────────────────────────────────

export async function plan(
  prompt: string,
  hasExistingSlides: boolean,
): Promise<PlanResult> {
  const t0 = performance.now();
  const { intent, reason } = classifyIntent(prompt, hasExistingSlides);

  if (intent === 'blocked' || intent === 'off_topic') {
    const style = 'tech' as TemplateStyle;
    const templatePlan = resolveTemplatePlan(prompt);
    return {
      intent,
      blocked: true,
      blockReason: reason,
      style,
      selectedTemplate: templatePlan.templateId,
      exemplarPackId: templatePlan.exemplarPackId,
      animationLevel: 2,
      blueprint: getTemplateBlueprint(style),
      styleManifest: templatePlan.styleManifest,
      enhancedPrompt: prompt,
    };
  }

  const templatePlan = resolveTemplatePlan(prompt);
  const style = templatePlan.style;
  const animationLevel = detectAnimationLevel(prompt);
  const blueprint = getTemplateBlueprint(style);
  aiDebugLog('planner', `classified`, { intent, style, animationLevel, template: templatePlan.templateId });

  let outline: SlideOutline[] | undefined;
  let outlineFallback: boolean | undefined;
  let enhancedPrompt = prompt;

  if (intent === 'create') {
    // For single-slide generation, skip the deck outline — just enhance the prompt
    enhancedPrompt = buildEnhancedPrompt(prompt, undefined, intent, templatePlan.styleManifest);
  } else {
    enhancedPrompt = buildEnhancedPrompt(prompt, undefined, intent, templatePlan.styleManifest);
  }

  const elapsed = (performance.now() - t0).toFixed(0);
  aiDebugLog('planner', `plan complete in ${elapsed}ms`, { promptLen: enhancedPrompt.length });

  return {
    intent,
    blocked: false,
    style,
    selectedTemplate: templatePlan.templateId,
    exemplarPackId: templatePlan.exemplarPackId,
    animationLevel,
    blueprint,
    styleManifest: templatePlan.styleManifest,
    enhancedPrompt,
    outline,
    outlineFallback,
  };
}

// ── Prompt enhancement ──────────────────────────────────────

function buildEnhancedPrompt(
  prompt: string,
  _outline: SlideOutline[] | undefined,
  intent: RequestIntent,
  styleManifest: StyleManifest,
): string {
  const additions: string[] = [];

  const artDirection = `ART DIRECTION — Visual system:
- Composition mode: ${styleManifest.compositionMode}
- Background treatment: ${styleManifest.backgroundTreatment}
- Typography mood: ${styleManifest.typographyMood}
- Motion language: ${styleManifest.motionLanguage}
- SVG strategy: ${styleManifest.svgStrategy}
- Density: ${styleManifest.density}
- Hero pattern: ${styleManifest.heroPattern}
- Card grammar: ${styleManifest.cardGrammar}
- Accent strategy: ${styleManifest.accentStrategy}
- Component patterns: ${styleManifest.componentPatterns.join('; ')}`;

  if (intent === 'create') {
    additions.push(`${artDirection}

Create ONE stunning title/hero slide with rich CSS architecture (<style> block with classes and @keyframes) and inline SVG illustrations. Make it breathtaking.

Design the first slide as the FOUNDATION for the rest of the deck:
- establish reusable semantic classes for wrappers, grids, cards, labels, dividers, stat blocks, and callouts
- define reusable CSS variables for palette, type, spacing, borders, and motion timing
- avoid one-off class names that only make sense for this single slide
- create a style system that future agenda/content/closing slides can inherit with minimal new CSS`);
  } else if (intent === 'modify') {
    additions.push(`${artDirection}

Modify the existing slide(s) while maintaining visual consistency. Output ALL slides including the <style> block.`);
  } else if (intent === 'refine_style') {
    additions.push(`${artDirection}

Apply style changes to existing slide(s). Keep content, change visual styling. Output the complete result.`);
  } else if (intent === 'add_slides') {
    additions.push(`${artDirection}

Generate the NEXT slide for this deck. Typical deck order: slide 1 = title/hero, slide 2 = agenda/overview, slides 3+ = content slides (one topic each), last = summary/CTA.
Output ONLY the new <section> — do NOT repeat or include existing slides.`);
  }

  return additions.length > 0
    ? `${prompt}\n\n${additions.join('\n')}`
    : prompt;
}
