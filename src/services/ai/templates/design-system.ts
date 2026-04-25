import type { TemplateId } from './registry';

export interface PresentationTypeScale {
  coverTitlePx: { min: number; max: number };
  slideTitlePx: { min: number; max: number };
  bodyPx: { min: number; max: number };
  labelPx: { min: number; max: number };
}

export interface PresentationMotionBudget {
  level: 1 | 2 | 3 | 4;
  maxContinuousAnimations: number;
  guidance: string;
}

export interface PresentationLayoutRecipe {
  id: string;
  label: string;
  templateIds: TemplateId[];
  intent: string;
  compositionRules: string[];
  motionRules: string[];
}

export const PRESENTATION_TYPE_SCALE: PresentationTypeScale = {
  coverTitlePx: { min: 76, max: 96 },
  slideTitlePx: { min: 44, max: 60 },
  bodyPx: { min: 24, max: 30 },
  labelPx: { min: 16, max: 20 },
};

export const PRESENTATION_MOTION_BUDGETS: Record<1 | 2 | 3 | 4, PresentationMotionBudget> = {
  1: {
    level: 1,
    maxContinuousAnimations: 1,
    guidance: 'Static or near-static; use one subtle reveal or accent pulse only.',
  },
  2: {
    level: 2,
    maxContinuousAnimations: 3,
    guidance: 'Use restrained stagger, one ambient layer, and diagram micro-motion.',
  },
  3: {
    level: 3,
    maxContinuousAnimations: 5,
    guidance: 'Allow richer ambient motion, but keep text and layout stable.',
  },
  4: {
    level: 4,
    maxContinuousAnimations: 7,
    guidance: 'Use cinematic or continuous motion only when it reinforces the core scene.',
  },
};

export const PRESENTATION_LAYOUT_RECIPES: PresentationLayoutRecipe[] = [
  {
    id: 'polished-split-title',
    label: 'Polished Split Title',
    templateIds: ['launch-narrative-light', 'split-world'],
    intent: 'Open with two visual fields, a connective seam, and one dominant centered title lockup.',
    compositionRules: [
      'Use one full-stage background system with a seam or bridge motif.',
      'Keep support content compact: eyebrow, subtitle, and 2-3 short chips.',
      'Avoid KPI walls, long paragraphs, or small captions on cover slides.',
    ],
    motionRules: [
      'Animate background systems slowly; keep the title stable and readable.',
      'Use reduced-motion fallbacks for every continuous animation.',
    ],
  },
  {
    id: 'editorial-finance-grid',
    label: 'Editorial Finance Grid',
    templateIds: ['finance-grid-light', 'editorial-light', 'executive-briefing-light'],
    intent: 'Explain mechanisms with a light editorial grid, embedded diagrams, and concise evidence modules.',
    compositionRules: [
      'Use header rails, asymmetric cards, embedded micro-diagrams, and one summary strip.',
      'Use accent color as category signposting through borders, chips, and SVG strokes.',
      'Keep text compact enough for the fixed 16:9 stage to scale down cleanly.',
    ],
    motionRules: [
      'Animate diagram logic with sweeps, pulses, and shimmer, not the card geometry itself.',
      'Keep card entrances ordered and brief.',
    ],
  },
  {
    id: 'stage-setting-scene',
    label: 'Stage-Setting Scene',
    templateIds: ['stage-setting-light', 'executive-briefing-light'],
    intent: 'Frame context with a scene panel, a small metric strip, and a parallel insight stack.',
    compositionRules: [
      'Use a strong title rail and one purposeful visual panel.',
      'Keep metrics to three or fewer highly legible signals.',
      'Use parallel insight cards instead of dense bullet lists.',
    ],
    motionRules: [
      'Limit continuous motion to the scene panel or one accent sweep.',
      'Keep all explanatory text static after reveal.',
    ],
  },
  {
    id: 'quiz-focal-object',
    label: 'Quiz Focal Object',
    templateIds: ['interactive-quiz'],
    intent: 'Use one central object and tightly bounded motion for interstitial or knowledge-check slides.',
    compositionRules: [
      'Center one focal device with a short headline and one support line.',
      'Use small floating symbols as atmosphere only.',
    ],
    motionRules: [
      'Concentrate pulse, spin, or ring motion around the central object.',
      'Never animate a large volume of text.',
    ],
  },
];

export function buildPresentationDesignSystemPrompt(): string {
  return `## DESIGN SYSTEM FOUNDATION

Use Aura's reusable presentation design system instead of inventing isolated one-off slides.

Readable source type scale for the fixed 16:9 canvas:
- cover H1: ${PRESENTATION_TYPE_SCALE.coverTitlePx.min}-${PRESENTATION_TYPE_SCALE.coverTitlePx.max}px equivalent
- slide H2: ${PRESENTATION_TYPE_SCALE.slideTitlePx.min}-${PRESENTATION_TYPE_SCALE.slideTitlePx.max}px equivalent
- body text: ${PRESENTATION_TYPE_SCALE.bodyPx.min}-${PRESENTATION_TYPE_SCALE.bodyPx.max}px equivalent
- essential labels: ${PRESENTATION_TYPE_SCALE.labelPx.min}px minimum

Composition rules:
- use class-based CSS in the <style> block; avoid inline style attributes
- use concrete hex values for data-background-color
- design for a fixed stage that is scaled by the Aura canvas; do not use viewport-unit layout sizing inside slides
- prefer 1-3 major zones, asymmetric rhythm, and one reusable component grammar
- include @media (prefers-reduced-motion: reduce) for animated templates

Motion budget:
- level 1: ${PRESENTATION_MOTION_BUDGETS[1].guidance}
- level 2: ${PRESENTATION_MOTION_BUDGETS[2].guidance}
- level 3: ${PRESENTATION_MOTION_BUDGETS[3].guidance}
- level 4: ${PRESENTATION_MOTION_BUDGETS[4].guidance}`;
}
