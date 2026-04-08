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
  const recipeGuidance = buildRecipeGuidance(styleManifest.exemplarPackId, intent);

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
- Component patterns: ${styleManifest.componentPatterns.join('; ')}
- Recipe target: ${styleManifest.exemplarPackId}`;

  if (intent === 'create') {
    additions.push(`${artDirection}

${recipeGuidance}

Create ONE stunning slide with rich CSS architecture (<style> block with classes and @keyframes) and inline SVG illustrations. Make it breathtaking.

Design this slide as part of a reusable deck system:
- establish reusable semantic classes for wrappers, grids, cards, labels, dividers, stat blocks, and callouts
- define reusable CSS variables for palette, type, spacing, borders, and motion timing
- avoid one-off class names that only make sense for this single slide
- create a style system that future agenda/content/closing slides can inherit with minimal new CSS`);
  } else if (intent === 'modify') {
    additions.push(`${artDirection}

${recipeGuidance}

Modify the existing slide(s) while maintaining visual consistency and the selected recipe direction. Output ALL slides including the <style> block.`);
  } else if (intent === 'refine_style') {
    additions.push(`${artDirection}

${recipeGuidance}

Apply style changes to existing slide(s). Keep content, change visual styling while preserving the intended slide recipe. Output the complete result.`);
  } else if (intent === 'add_slides') {
    additions.push(`${artDirection}

${recipeGuidance}

Generate the NEXT slide for this deck. Typical deck order: slide 1 = title/hero, slide 2 = agenda/overview, slides 3+ = content slides (one topic each), last = summary/CTA.
Output ONLY the new <section> — do NOT repeat or include existing slides.`);
  }

  return additions.length > 0
    ? `${prompt}\n\n${additions.join('\n')}`
    : prompt;
}

function buildRecipeGuidance(
  exemplarPackId: StyleManifest['exemplarPackId'],
  intent: RequestIntent,
): string {
  const prefix = intent === 'add_slides' ? 'Preferred slide recipe:' : 'Preferred recipe:';

  switch (exemplarPackId) {
    case 'split-world-title':
      return `${prefix} split-world title hero — build a cover/opening slide with one dominant thesis, a scene-led background, and very few supporting components.`;
    case 'agenda-overview':
      return `${prefix} agenda overview — use 3-6 ordered topics, crisp sequencing, and a calm premium layout.`;
    case 'section-divider':
      return `${prefix} section divider — use oversized section language, a minimal supporting line, and lots of intentional space.`;
    case 'comparison':
      return `${prefix} comparison stage — show two clearly differentiated sides with a shared heading and a decisive midpoint or verdict.`;
    case 'process-timeline':
      return `${prefix} process timeline — map 3-6 phases in a clear sequence with direction, connectors, and concise stage labels.`;
    case 'metrics-dashboard':
      return `${prefix} metrics dashboard — lead with a few big numbers, then one supporting insight or mini-chart panel.`;
    case 'case-study-spotlight':
      return `${prefix} case-study spotlight — use one proof point, one narrative headline, and a compact evidence pane.`;
    case 'quote-statement':
      return `${prefix} quote / statement slide — let one unforgettable line dominate the canvas with minimal support copy.`;
    case 'closing-cta':
      return `${prefix} closing CTA — finish with one synthesis statement and a strong next-step prompt, not a generic thank-you slide.`;
    case 'quiz-interstitial':
      return `${prefix} quiz interstitial — use a centered focal object, oversized type, and playful but disciplined motion.`;
    case 'editorial-infographic':
      return `${prefix} editorial infographic — use an asymmetric explainer layout with strong labels, card hierarchy, and embedded diagrammatic thinking.`;
    default:
      return `${prefix} template-native premium slide — keep one strong focal area and a disciplined supporting component family.`;
  }
}
