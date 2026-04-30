/**
 * W9: Scaffolding guardrails unit tests.
 *
 * Validates the Level-1 guardrail requirements for the W7/W8 scaffolding system:
 * - Layout registry completeness and slot schema validity
 * - Layout selection (selectLayout) matching
 * - Slot contract prompt output
 * - Motion preset registry completeness and budget constraints
 * - SVG motif registry completeness and usage rule coverage
 *
 * These tests are intentionally static: no AI calls or browser rendering required.
 */

import { describe, expect, it } from 'vitest';

import {
  SLIDE_LAYOUT_REGISTRY,
  selectLayout,
  buildSlotContractPrompt,
  type SlideLayoutId,
} from '@/services/ai/templates/layouts';
import {
  MOTION_PRESET_REGISTRY,
  buildMotionPresetPrompt,
  type MotionPresetId,
} from '@/services/ai/templates/motionPresets';
import {
  SVG_MOTIF_REGISTRY,
  buildSvgMotifPrompt,
  type SvgMotifId,
} from '@/services/ai/templates/svgMotifs';

// Layout registry

const ALL_LAYOUT_IDS: SlideLayoutId[] = [
  'cover', 'intro', 'agenda', 'section-breaker', 'big-statement',
  'timeline', 'two-column', 'three-column', 'comparison', 'metric-proof',
  'process', 'quote', 'case-study', 'data-story', 'roadmap', 'closing',
];

describe('SLIDE_LAYOUT_REGISTRY completeness', () => {
  it('contains all expected layout IDs', () => {
    for (const id of ALL_LAYOUT_IDS) {
      expect(SLIDE_LAYOUT_REGISTRY[id], `Missing layout: ${id}`).toBeDefined();
    }
  });

  it('every layout has at least one required slot', () => {
    for (const id of ALL_LAYOUT_IDS) {
      const layout = SLIDE_LAYOUT_REGISTRY[id];
      const hasRequired = layout.slots.some((slot) => slot.required);
      expect(hasRequired, `${id}: no required slots`).toBe(true);
    }
  });

  it('every layout has quality rules', () => {
    for (const id of ALL_LAYOUT_IDS) {
      const layout = SLIDE_LAYOUT_REGISTRY[id];
      expect(layout.qualityRules.length, `${id}: no quality rules`).toBeGreaterThan(0);
    }
  });

  it('every layout has at least one allowed motion preset', () => {
    for (const id of ALL_LAYOUT_IDS) {
      const layout = SLIDE_LAYOUT_REGISTRY[id];
      expect(layout.allowedMotionPresets.length, `${id}: no motion presets`).toBeGreaterThan(0);
    }
  });

  it('every layout has at least one allowed SVG motif', () => {
    for (const id of ALL_LAYOUT_IDS) {
      const layout = SLIDE_LAYOUT_REGISTRY[id];
      expect(layout.allowedSvgMotifs.length, `${id}: no SVG motifs`).toBeGreaterThan(0);
    }
  });

  it('slot font floors are at or above 16px body minimum', () => {
    for (const id of ALL_LAYOUT_IDS) {
      const layout = SLIDE_LAYOUT_REGISTRY[id];
      expect(layout.minFontSizePx, `${id}: minFontSizePx below 16`).toBeGreaterThanOrEqual(16);
    }
  });

  it('title slots on major layout types enforce 44px minimum', () => {
    const titleSlotLayouts: SlideLayoutId[] = ['cover', 'intro', 'big-statement', 'closing'];
    for (const id of titleSlotLayouts) {
      const layout = SLIDE_LAYOUT_REGISTRY[id];
      const titleSlot = layout.slots.find((slot) => slot.id === 'title');
      if (titleSlot) {
        expect(titleSlot.minFontSizePx, `${id}: title slot below 44px`).toBeGreaterThanOrEqual(44);
      }
    }
  });

  it('all motion presets referenced by layouts exist in the registry', () => {
    for (const id of ALL_LAYOUT_IDS) {
      const layout = SLIDE_LAYOUT_REGISTRY[id];
      for (const presetId of layout.allowedMotionPresets) {
        expect(MOTION_PRESET_REGISTRY[presetId], `${id}: unknown preset ${presetId}`).toBeDefined();
      }
    }
  });

  it('all SVG motifs referenced by layouts exist in the registry', () => {
    for (const id of ALL_LAYOUT_IDS) {
      const layout = SLIDE_LAYOUT_REGISTRY[id];
      for (const motifId of layout.allowedSvgMotifs) {
        expect(SVG_MOTIF_REGISTRY[motifId], `${id}: unknown motif ${motifId}`).toBeDefined();
      }
    }
  });
});

// Layout selection

describe('selectLayout', () => {
  it('matches "cover" to cover', () => {
    expect(selectLayout('cover').id).toBe('cover');
  });

  it('matches "agenda" to agenda', () => {
    expect(selectLayout('agenda').id).toBe('agenda');
  });

  it('matches "timeline" to timeline', () => {
    expect(selectLayout('timeline').id).toBe('timeline');
  });

  it('matches "two-column" to two-column', () => {
    expect(selectLayout('two-column').id).toBe('two-column');
  });

  it('matches "comparison" to comparison', () => {
    expect(selectLayout('comparison').id).toBe('comparison');
  });

  it('matches "metric proof" to metric-proof', () => {
    expect(selectLayout('metric proof').id).toBe('metric-proof');
  });

  it('matches "big statement" to big-statement', () => {
    expect(selectLayout('big statement').id).toBe('big-statement');
  });

  it('matches "roadmap" to roadmap', () => {
    expect(selectLayout('roadmap').id).toBe('roadmap');
  });

  it('matches "quote" to quote', () => {
    expect(selectLayout('quote').id).toBe('quote');
  });

  it('matches "section breaker" to section-breaker', () => {
    expect(selectLayout('section breaker').id).toBe('section-breaker');
  });

  it('matches "closing" to closing', () => {
    expect(selectLayout('closing').id).toBe('closing');
  });

  it('falls back to a valid layout for unknown patterns', () => {
    const result = selectLayout('xyzzy-unknown-pattern-9999');
    expect(ALL_LAYOUT_IDS).toContain(result.id);
  });

  it('returns a layout with slots for any input', () => {
    const patterns = ['hero title slide', 'data dashboard', 'executive update', 'product walkthrough'];
    for (const pattern of patterns) {
      const result = selectLayout(pattern);
      expect(result.slots.length).toBeGreaterThan(0);
    }
  });
});

// Slot contract prompt

describe('buildSlotContractPrompt', () => {
  it('includes the layout label', () => {
    const layout = SLIDE_LAYOUT_REGISTRY['cover'];
    const prompt = buildSlotContractPrompt(layout);
    expect(prompt).toContain('Cover');
  });

  it('lists all slot IDs', () => {
    const layout = SLIDE_LAYOUT_REGISTRY['timeline'];
    const prompt = buildSlotContractPrompt(layout);
    for (const slot of layout.slots) {
      expect(prompt).toContain(slot.id);
    }
  });

  it('includes quality rules', () => {
    const layout = SLIDE_LAYOUT_REGISTRY['metric-proof'];
    const prompt = buildSlotContractPrompt(layout);
    for (const rule of layout.qualityRules) {
      expect(prompt).toContain(rule);
    }
  });

  it('includes the min font size', () => {
    const layout = SLIDE_LAYOUT_REGISTRY['cover'];
    const prompt = buildSlotContractPrompt(layout);
    expect(prompt).toContain(`${layout.minFontSizePx}`);
  });

  it('returns non-empty output for every layout', () => {
    for (const id of ALL_LAYOUT_IDS) {
      const prompt = buildSlotContractPrompt(SLIDE_LAYOUT_REGISTRY[id]);
      expect(prompt.trim().length).toBeGreaterThan(50);
    }
  });
});

// Motion preset registry

const ALL_PRESET_IDS: MotionPresetId[] = [
  'fade-rise', 'stagger-reveal', 'accent-pulse', 'path-draw', 'scene-entrance',
];

describe('MOTION_PRESET_REGISTRY completeness', () => {
  it('contains all expected preset IDs', () => {
    for (const id of ALL_PRESET_IDS) {
      expect(MOTION_PRESET_REGISTRY[id], `Missing preset: ${id}`).toBeDefined();
    }
  });

  it('every preset has at least one keyframe name', () => {
    for (const id of ALL_PRESET_IDS) {
      const preset = MOTION_PRESET_REGISTRY[id];
      expect(preset.keyframeNames.length, `${id}: no keyframe names`).toBeGreaterThan(0);
    }
  });

  it('every preset specifies reduced-motion behavior', () => {
    const validBehaviors = ['disable-all', 'fade-only', 'static'];
    for (const id of ALL_PRESET_IDS) {
      const preset = MOTION_PRESET_REGISTRY[id];
      expect(validBehaviors, `${id}: invalid reducedMotionBehavior`).toContain(preset.reducedMotionBehavior);
    }
  });

  it('every preset has a non-empty promptGuidance', () => {
    for (const id of ALL_PRESET_IDS) {
      const preset = MOTION_PRESET_REGISTRY[id];
      expect(preset.promptGuidance.trim().length, `${id}: empty promptGuidance`).toBeGreaterThan(0);
    }
  });

  it('motion budgets: maxAnimatedElements is bounded (<= 8)', () => {
    for (const id of ALL_PRESET_IDS) {
      const preset = MOTION_PRESET_REGISTRY[id];
      expect(preset.maxAnimatedElements, `${id}: maxAnimatedElements > 8`).toBeLessThanOrEqual(8);
    }
  });

  it('motion budgets: maxDurationMs is bounded (<= 2400ms)', () => {
    for (const id of ALL_PRESET_IDS) {
      const preset = MOTION_PRESET_REGISTRY[id];
      expect(preset.maxDurationMs, `${id}: maxDurationMs > 2400`).toBeLessThanOrEqual(2400);
    }
  });

  it('accent-pulse and path-draw are not allowed on content-heavy slides', () => {
    expect(MOTION_PRESET_REGISTRY['accent-pulse'].allowedOnContentHeavy).toBe(false);
    expect(MOTION_PRESET_REGISTRY['path-draw'].allowedOnContentHeavy).toBe(false);
  });

  it('fade-rise and stagger-reveal are allowed on content-heavy slides', () => {
    expect(MOTION_PRESET_REGISTRY['fade-rise'].allowedOnContentHeavy).toBe(true);
    expect(MOTION_PRESET_REGISTRY['stagger-reveal'].allowedOnContentHeavy).toBe(true);
  });

  it('every preset promptGuidance references prefers-reduced-motion', () => {
    for (const id of ALL_PRESET_IDS) {
      const preset = MOTION_PRESET_REGISTRY[id];
      expect(
        preset.promptGuidance,
        `${id}: missing reduced-motion CSS rule`,
      ).toMatch(/prefers-reduced-motion/);
    }
  });
});

describe('buildMotionPresetPrompt', () => {
  it('includes the preset label', () => {
    const prompt = buildMotionPresetPrompt('fade-rise');
    expect(prompt).toContain('Fade and Rise');
  });

  it('includes max element count', () => {
    const preset = MOTION_PRESET_REGISTRY['stagger-reveal'];
    const prompt = buildMotionPresetPrompt('stagger-reveal');
    expect(prompt).toContain(`${preset.maxAnimatedElements}`);
  });

  it('includes max duration', () => {
    const preset = MOTION_PRESET_REGISTRY['accent-pulse'];
    const prompt = buildMotionPresetPrompt('accent-pulse');
    expect(prompt).toContain(`${preset.maxDurationMs}`);
  });

  it('returns non-empty output for every preset', () => {
    for (const id of ALL_PRESET_IDS) {
      const prompt = buildMotionPresetPrompt(id);
      expect(prompt.trim().length).toBeGreaterThan(50);
    }
  });
});

// SVG motif registry

const ALL_MOTIF_IDS: SvgMotifId[] = [
  'abstract-product', 'timeline-connector', 'data-grid', 'editorial-frame',
  'process-diagram', 'icon-markers', 'decorative-background',
];

describe('SVG_MOTIF_REGISTRY completeness', () => {
  it('contains all expected motif IDs', () => {
    for (const id of ALL_MOTIF_IDS) {
      expect(SVG_MOTIF_REGISTRY[id], `Missing motif: ${id}`).toBeDefined();
    }
  });

  it('every motif has at least one slot', () => {
    for (const id of ALL_MOTIF_IDS) {
      const motif = SVG_MOTIF_REGISTRY[id];
      expect(motif.slots.length, `${id}: no slots`).toBeGreaterThan(0);
    }
  });

  it('every motif has usage rules', () => {
    for (const id of ALL_MOTIF_IDS) {
      const motif = SVG_MOTIF_REGISTRY[id];
      expect(motif.usageRules.length, `${id}: no usage rules`).toBeGreaterThan(0);
    }
  });

  it('every motif has a non-empty promptGuidance', () => {
    for (const id of ALL_MOTIF_IDS) {
      const motif = SVG_MOTIF_REGISTRY[id];
      expect(motif.promptGuidance.trim().length, `${id}: empty promptGuidance`).toBeGreaterThan(0);
    }
  });

  it('every motif specifies a valid viewBox', () => {
    for (const id of ALL_MOTIF_IDS) {
      const motif = SVG_MOTIF_REGISTRY[id];
      expect(motif.viewBox).toMatch(/^\d+ \d+ \d+ \d+$/);
    }
  });

  it('every motif has a valid z-index layer', () => {
    const validLayers = [0, 1, 2, 10];
    for (const id of ALL_MOTIF_IDS) {
      const motif = SVG_MOTIF_REGISTRY[id];
      expect(validLayers, `${id}: invalid zIndexLayer`).toContain(motif.zIndexLayer);
    }
  });

  it('every motif has a valid placement', () => {
    const validPlacements = ['background', 'inline', 'accent'];
    for (const id of ALL_MOTIF_IDS) {
      const motif = SVG_MOTIF_REGISTRY[id];
      expect(validPlacements, `${id}: invalid placement`).toContain(motif.placement);
    }
  });

  it('background-placement motifs sit at z-index 0 or 1', () => {
    for (const id of ALL_MOTIF_IDS) {
      const motif = SVG_MOTIF_REGISTRY[id];
      if (motif.placement === 'background') {
        expect(motif.zIndexLayer, `${id}: background motif at z-index > 1`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('every motif usage rule prohibits hardcoded hex colors or external assets', () => {
    for (const id of ALL_MOTIF_IDS) {
      const motif = SVG_MOTIF_REGISTRY[id];
      const rulesText = motif.usageRules.join(' ').toLowerCase();
      const prohibitsHardcoding = rulesText.includes('css variable') || rulesText.includes('var(--') || rulesText.includes('no external') || rulesText.includes('hardcoded');
      expect(prohibitsHardcoding, `${id}: usage rules must prohibit hardcoded colors or external assets`).toBe(true);
    }
  });
});

describe('buildSvgMotifPrompt', () => {
  it('includes the motif label', () => {
    const prompt = buildSvgMotifPrompt('abstract-product');
    expect(prompt).toContain('Abstract Product Shapes');
  });

  it('includes the placement and z-index', () => {
    const prompt = buildSvgMotifPrompt('decorative-background');
    expect(prompt).toContain('background');
    expect(prompt).toContain('0');
  });

  it('includes the compact safety guidance used by runtime prompts', () => {
    const motif = SVG_MOTIF_REGISTRY['data-grid'];
    const prompt = buildSvgMotifPrompt('data-grid');
    expect(prompt).toContain(motif.viewBox);
    for (const rule of motif.usageRules.slice(0, 2)) {
      expect(prompt).toContain(rule);
    }
  });

  it('returns non-empty output for every motif', () => {
    for (const id of ALL_MOTIF_IDS) {
      const prompt = buildSvgMotifPrompt(id);
      expect(prompt.trim().length).toBeGreaterThan(50);
    }
  });
});

// Cross-registry guardrails

describe('cross-registry guardrails', () => {
  it('cover layout allows scene-entrance and fade-rise but not path-draw or accent-pulse', () => {
    const layout = SLIDE_LAYOUT_REGISTRY['cover'];
    expect(layout.allowedMotionPresets).toContain('scene-entrance');
    expect(layout.allowedMotionPresets).toContain('fade-rise');
    expect(layout.allowedMotionPresets).not.toContain('path-draw');
    expect(layout.allowedMotionPresets).not.toContain('accent-pulse');
  });

  it('process layout allows path-draw for connector animation', () => {
    const layout = SLIDE_LAYOUT_REGISTRY['process'];
    expect(layout.allowedMotionPresets).toContain('path-draw');
  });

  it('timeline layout allows path-draw for line animation', () => {
    const layout = SLIDE_LAYOUT_REGISTRY['timeline'];
    expect(layout.allowedMotionPresets).toContain('path-draw');
  });

  it('quote layout allows minimal motion only', () => {
    const layout = SLIDE_LAYOUT_REGISTRY['quote'];
    expect(layout.allowedMotionPresets).not.toContain('path-draw');
    expect(layout.allowedMotionPresets).not.toContain('stagger-reveal');
  });

  it('decorative-background motif is allowed on cover slides', () => {
    const layout = SLIDE_LAYOUT_REGISTRY['cover'];
    expect(layout.allowedSvgMotifs).toContain('decorative-background');
  });

  it('icon-markers motif is allowed on process and comparison layouts', () => {
    const processLayout = SLIDE_LAYOUT_REGISTRY['process'];
    const comparisonLayout = SLIDE_LAYOUT_REGISTRY['comparison'];
    expect(processLayout.allowedSvgMotifs).toContain('icon-markers');
    expect(comparisonLayout.allowedSvgMotifs).toContain('icon-markers');
  });

  it('big-statement layout enforces large min font size (>= 60px)', () => {
    const layout = SLIDE_LAYOUT_REGISTRY['big-statement'];
    expect(layout.minFontSizePx).toBeGreaterThanOrEqual(60);
  });
});
