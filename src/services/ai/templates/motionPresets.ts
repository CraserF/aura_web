/**
 * Motion Preset Registry - approved CSS animation presets for slides.
 *
 * Every generated slide should use one of these presets rather than
 * inventing arbitrary animations. Each preset specifies allowed keyframes,
 * a motion budget, and reduced-motion behavior.
 *
 * Themes reference preset IDs in their layout definitions. The designer
 * receives the matching preset description via the slot contract prompt.
 */

export type MotionPresetId =
  | 'fade-rise'
  | 'stagger-reveal'
  | 'accent-pulse'
  | 'path-draw'
  | 'scene-entrance';

export interface MotionPreset {
  id: MotionPresetId;
  label: string;
  description: string;
  /** Typical CSS @keyframes name(s) to use */
  keyframeNames: string[];
  /** Max number of simultaneously animated elements */
  maxAnimatedElements: number;
  /** Max animation duration in ms */
  maxDurationMs: number;
  /** Whether this preset can be used on text-heavy slides */
  allowedOnContentHeavy: boolean;
  /** Required reduced-motion CSS behavior */
  reducedMotionBehavior: 'disable-all' | 'fade-only' | 'static';
  /** Concise prompt guidance for the designer */
  promptGuidance: string;
}

export const MOTION_PRESET_REGISTRY: Record<MotionPresetId, MotionPreset> = {
  'fade-rise': {
    id: 'fade-rise',
    label: 'Fade and Rise',
    description: 'Subtle entrance: elements fade in while rising a small distance. Works on any slide type.',
    keyframeNames: ['fade-rise', 'fadeRise'],
    maxAnimatedElements: 6,
    maxDurationMs: 600,
    allowedOnContentHeavy: true,
    reducedMotionBehavior: 'disable-all',
    promptGuidance:
      'Use @keyframes fadeRise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }. ' +
      'Apply with animation-delay stagger (0.1s increments). Max 6 elements. ' +
      'Always add @media (prefers-reduced-motion: reduce) { .fade-rise { animation: none; } }.',
  },

  'stagger-reveal': {
    id: 'stagger-reveal',
    label: 'Staggered Reveal',
    description: 'List items or cards appear in sequence with brief delay between each. Best for timelines, agendas, and process flows.',
    keyframeNames: ['stagger-reveal', 'itemReveal'],
    maxAnimatedElements: 8,
    maxDurationMs: 500,
    allowedOnContentHeavy: true,
    reducedMotionBehavior: 'disable-all',
    promptGuidance:
      'Use @keyframes itemReveal { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: none; } }. ' +
      'Apply nth-child delays: nth-child(1) { animation-delay: 0s; } ... nth-child(n) { animation-delay: calc((n - 1) * 0.12s); }. ' +
      'Use for list items, process steps, or agenda items. ' +
      'Always disable with @media (prefers-reduced-motion: reduce).',
  },

  'accent-pulse': {
    id: 'accent-pulse',
    label: 'Accent Pulse',
    description: 'A gentle breathing or scale pulse on a single accent element - a metric callout, icon, or highlight. Never animate multiple text elements simultaneously.',
    keyframeNames: ['accent-pulse', 'accentPulse', 'breathe'],
    maxAnimatedElements: 2,
    maxDurationMs: 2400,
    allowedOnContentHeavy: false,
    reducedMotionBehavior: 'static',
    promptGuidance:
      'Use @keyframes accentPulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.04); opacity: 0.92; } }. ' +
      'Apply only to one accent element (metric value, icon, or badge). ' +
      'animation: accentPulse 2.4s ease-in-out infinite. ' +
      '@media (prefers-reduced-motion: reduce) { .accent-pulse { animation: none; } }.',
  },

  'path-draw': {
    id: 'path-draw',
    label: 'Path Draw',
    description: 'SVG stroke-dashoffset animation that draws a connecting line, arrow, or diagram path. Best for process flows, timelines, and roadmaps.',
    keyframeNames: ['path-draw', 'drawPath', 'lineReveal'],
    maxAnimatedElements: 3,
    maxDurationMs: 1200,
    allowedOnContentHeavy: false,
    reducedMotionBehavior: 'static',
    promptGuidance:
      'Use stroke-dasharray and stroke-dashoffset on SVG <path> or <line> elements. ' +
      '@keyframes drawPath { from { stroke-dashoffset: var(--path-length); } to { stroke-dashoffset: 0; } }. ' +
      'Set stroke-dasharray equal to the path length. animation: drawPath 1.2s ease-out forwards. ' +
      'Limit to 3 paths. @media (prefers-reduced-motion: reduce) { stroke-dashoffset: 0; animation: none; }.',
  },

  'scene-entrance': {
    id: 'scene-entrance',
    label: 'Scene Entrance',
    description: 'A background panel or decorative layer slides or fades in as the opening scene. Used on cover and section-breaker slides to create a cinematic feel.',
    keyframeNames: ['scene-entrance', 'sceneSlideIn', 'bgReveal'],
    maxAnimatedElements: 3,
    maxDurationMs: 900,
    allowedOnContentHeavy: false,
    reducedMotionBehavior: 'disable-all',
    promptGuidance:
      'Animate only background panels, decorative SVG layers, or the visual field - never the primary title or content. ' +
      '@keyframes bgReveal { from { opacity: 0; transform: scale(1.03); } to { opacity: 1; transform: scale(1); } }. ' +
      'animation: bgReveal 0.9s ease-out forwards. ' +
      '@media (prefers-reduced-motion: reduce) { .scene-bg { animation: none; opacity: 1; } }.',
  },
};

/**
 * Build a concise prompt description for a motion preset.
 * Injected into the slot contract when the layout allows the preset.
 */
export function buildMotionPresetPrompt(presetId: MotionPresetId): string {
  const preset = MOTION_PRESET_REGISTRY[presetId];
  return (
    `${preset.label} (${preset.id}): keyframes ${preset.keyframeNames.join('/')}; ` +
    `max ${preset.maxAnimatedElements} elems, ${preset.maxDurationMs}ms; ` +
    `content-heavy ${preset.allowedOnContentHeavy ? 'ok' : 'avoid'}; reduced motion ${preset.reducedMotionBehavior}.`
  );
}
