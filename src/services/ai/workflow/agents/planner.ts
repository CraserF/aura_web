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
  const contentPattern = detectContentPattern(prompt, styleManifest.exemplarPackId);
  const recipeGuidance = buildRecipeGuidance(styleManifest.exemplarPackId, intent);
  const compactDesignDoctrine = buildCompactDesignDoctrine(
    contentPattern,
    styleManifest.motionLanguage,
    intent,
  );

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
- Recipe target: ${styleManifest.exemplarPackId}
- Content pattern: ${contentPattern}`;

  if (intent === 'create') {
    additions.push(`${artDirection}

${compactDesignDoctrine}

${recipeGuidance}

Create ONE stunning slide with rich CSS architecture (<style> block with classes and @keyframes) and inline SVG illustrations. Make it breathtaking.

Design this slide as part of a reusable deck system:
- establish reusable semantic classes for wrappers, grids, cards, labels, dividers, stat blocks, and callouts
- define reusable CSS variables for palette, type, spacing, borders, and motion timing
- avoid one-off class names that only make sense for this single slide
- create a style system that future agenda/content/closing slides can inherit with minimal new CSS`);
  } else if (intent === 'modify') {
    additions.push(`${artDirection}

${compactDesignDoctrine}

${recipeGuidance}

Modify the existing slide(s) while maintaining visual consistency and the selected recipe direction. Output ALL slides including the <style> block.`);
  } else if (intent === 'refine_style') {
    additions.push(`${artDirection}

${compactDesignDoctrine}

${recipeGuidance}

Apply style changes to existing slide(s). Keep content, change visual styling while preserving the intended slide recipe. Output the complete result.`);
  } else if (intent === 'add_slides') {
    additions.push(`${artDirection}

${compactDesignDoctrine}

${recipeGuidance}

Generate the NEXT slide for this deck. Typical deck order: slide 1 = title/hero, slide 2 = agenda/overview, slides 3+ = content slides (one topic each), last = summary/CTA.
Output ONLY the new <section> — do NOT repeat or include existing slides.`);
  }

  return additions.length > 0
    ? `${prompt}\n\n${additions.join('\n')}`
    : prompt;
}

type ContentPattern =
  | 'title-hero'
  | 'agenda'
  | 'process-flow'
  | 'comparison'
  | 'metrics'
  | 'statement'
  | 'case-study'
  | 'editorial-explainer'
  | 'mixed';

function detectContentPattern(
  prompt: string,
  exemplarPackId: StyleManifest['exemplarPackId'],
): ContentPattern {
  const normalized = prompt.toLowerCase();

  switch (exemplarPackId) {
    case 'split-world-title':
      return 'title-hero';
    case 'agenda-overview':
      return 'agenda';
    case 'process-timeline':
      return 'process-flow';
    case 'comparison':
      return 'comparison';
    case 'metrics-dashboard':
      return 'metrics';
    case 'quote-statement':
    case 'closing-cta':
      return 'statement';
    case 'case-study-spotlight':
      return 'case-study';
    case 'editorial-infographic':
      return 'editorial-explainer';
    default:
      break;
  }

  if (/\b(process|timeline|roadmap|journey|steps?|phases?)\b/.test(normalized)) {
    return 'process-flow';
  }
  if (/\b(compare|comparison|versus|vs\.?|before.*after|trade[- ]?off)\b/.test(normalized)) {
    return 'comparison';
  }
  if (/\b(kpi|metric|dashboard|stats?|scorecard|numbers?)\b/.test(normalized)) {
    return 'metrics';
  }
  if (/\b(quote|statement|big idea|key message|closing|summary|cta)\b/.test(normalized)) {
    return 'statement';
  }
  if (/\b(case study|customer story|spotlight|proof point)\b/.test(normalized)) {
    return 'case-study';
  }
  if (/\b(agenda|overview|contents?)\b/.test(normalized)) {
    return 'agenda';
  }

  return 'mixed';
}

function buildCompactDesignDoctrine(
  contentPattern: ContentPattern,
  motionLanguage: StyleManifest['motionLanguage'],
  intent: RequestIntent,
): string {
  const structureRule: Record<ContentPattern, string> = {
    'title-hero': 'lead with one bold thesis lockup and a single scene-level visual anchor',
    agenda: 'show 3-6 short topics in a calm ordered rhythm, not a wall of explanation',
    'process-flow': 'make direction unmistakable with staged steps, connectors, and short labels',
    comparison: 'build two clearly contrasted sides with one shared verdict or midpoint',
    metrics: 'prioritize a few large numbers first, then one supporting strip or insight panel',
    statement: 'let one statement dominate the slide and keep supporting elements minimal',
    'case-study': 'use one proof point with a focused evidence pane rather than many examples',
    'editorial-explainer': 'pair one strong headline area with one structured explainer zone',
    mixed: 'pick one dominant focal area and one supporting information zone; avoid equal-weight clutter',
  };

  const copyRule = contentPattern === 'editorial-explainer' || contentPattern === 'case-study'
    ? 'keep explanations tight and scannable; use short paragraphs only where they earn their space'
    : 'compress copy aggressively: 2-8 word headings, short labels, and no filler sentences';

  const motionRule = motionLanguage === 'hero-kinetic'
    ? 'use 1-2 bold but disciplined structural motions only; never loop body text'
    : motionLanguage === 'scene-continuous'
      ? 'let background seams, particles, or scene layers move gently while text stays stable'
      : 'animate with small transform/opacity/stroke changes and stagger siblings instead of moving everything at once';

  const editBias = intent === 'add_slides' || intent === 'modify' || intent === 'refine_style'
    ? ' Preserve the deck’s established visual language instead of inventing a new one.'
    : '';

  return `COMPACT DESIGN DOCTRINE:
- Structure: ${structureRule[contentPattern]}.
- Hierarchy: one dominant focal zone + one supporting zone; do not let all cards carry equal weight.
- Palette: work only with background, surface, primary accent, readable text, and muted labels.
- Copy: ${copyRule}.
- Motion: ${motionRule}.${editBias}`;
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
