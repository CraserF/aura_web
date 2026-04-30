/**
 * Slide Layout Registry - typed layout definitions with slot contracts.
 *
 * Each layout defines the content slots the model should fill, along with
 * text budget constraints and quality rules. The designer receives a slot
 * contract before writing HTML so it knows the expected structure, rather
 * than inventing it from scratch.
 */

import { buildMotionPresetPrompt, type MotionPresetId } from './motionPresets';
import { buildSvgMotifPrompt, type SvgMotifId } from './svgMotifs';

export type SlideLayoutId =
  | 'cover'
  | 'intro'
  | 'agenda'
  | 'section-breaker'
  | 'big-statement'
  | 'timeline'
  | 'two-column'
  | 'three-column'
  | 'comparison'
  | 'metric-proof'
  | 'process'
  | 'quote'
  | 'case-study'
  | 'data-story'
  | 'roadmap'
  | 'closing';

export interface SlideSlotDefinition {
  id: string;
  label: string;
  required: boolean;
  /** Soft max character count for the slot value */
  maxChars?: number;
  /** Soft max word count for the slot value */
  maxWords?: number;
  /** Minimum rendered font size in px */
  minFontSizePx?: number;
  description: string;
}

export interface SlideLayoutDefinition {
  id: SlideLayoutId;
  label: string;
  description: string;
  /** Pattern keywords used by selectLayout() for fuzzy matching */
  matchKeywords: string[];
  slots: SlideSlotDefinition[];
  /** Minimum body font size in px for any text on this layout */
  minFontSizePx: number;
  /** Max number of bullet points or list items across all slots */
  maxBullets?: number;
  supportsMedia: boolean;
  /** Allowed motion preset IDs for this layout */
  allowedMotionPresets: MotionPresetId[];
  /** Allowed SVG motif family IDs for this layout */
  allowedSvgMotifs: SvgMotifId[];
  qualityRules: string[];
}

// Slot helpers

function eyebrow(required = false): SlideSlotDefinition {
  return {
    id: 'eyebrow',
    label: 'Eyebrow',
    required,
    maxChars: 40,
    maxWords: 5,
    minFontSizePx: 16,
    description: 'Short category or section label above the title.',
  };
}

function title(required = true): SlideSlotDefinition {
  return {
    id: 'title',
    label: 'Title',
    required,
    maxChars: 80,
    maxWords: 10,
    minFontSizePx: 44,
    description: 'Primary slide heading.',
  };
}

function bodyText(id: string, label: string, required = true, maxWords = 60): SlideSlotDefinition {
  return {
    id,
    label,
    required,
    maxWords,
    minFontSizePx: 24,
    description: `${label} body text.`,
  };
}

function labeledItem(id: string, label: string, required = true): SlideSlotDefinition {
  return {
    id,
    label,
    required,
    maxChars: 80,
    maxWords: 12,
    minFontSizePx: 20,
    description: `${label} item label and brief detail.`,
  };
}

// Layout registry

export const SLIDE_LAYOUT_REGISTRY: Record<SlideLayoutId, SlideLayoutDefinition> = {
  cover: {
    id: 'cover',
    label: 'Cover',
    description: 'Opening slide with a strong hero title, supporting subline, and visual field.',
    matchKeywords: ['cover', 'title', 'opening', 'hero', 'intro-cover', 'polished-split-title'],
    slots: [
      eyebrow(false),
      { id: 'title', label: 'Cover Title', required: true, maxChars: 80, maxWords: 8, minFontSizePx: 76, description: 'Large dominant title. 76-96px.' },
      { id: 'subtitle', label: 'Subtitle / Tagline', required: false, maxChars: 100, maxWords: 14, minFontSizePx: 24, description: 'Punchy supporting line.' },
      { id: 'meta', label: 'Meta (date/presenter)', required: false, maxChars: 60, maxWords: 8, minFontSizePx: 16, description: 'Optional date, presenter, or version.' },
    ],
    minFontSizePx: 24,
    supportsMedia: false,
    allowedMotionPresets: ['fade-rise', 'scene-entrance'],
    allowedSvgMotifs: ['abstract-product', 'editorial-frame', 'decorative-background'],
    qualityRules: [
      'Title must be 76px minimum.',
      'Avoid dense text blocks on the cover.',
      'Use a full-stage background system with a color field or seam.',
    ],
  },

  intro: {
    id: 'intro',
    label: 'Intro / Overview',
    description: 'Brief context slide setting up what the deck will cover.',
    matchKeywords: ['intro', 'overview', 'about', 'context', 'stage-setting', 'scene panel', 'insight stack', 'market', 'background', 'what-we-cover'],
    slots: [
      eyebrow(),
      title(),
      bodyText('summary', 'Summary', true, 40),
      labeledItem('point-1', 'Key Point 1', false),
      labeledItem('point-2', 'Key Point 2', false),
      labeledItem('point-3', 'Key Point 3', false),
    ],
    minFontSizePx: 24,
    maxBullets: 3,
    supportsMedia: false,
    allowedMotionPresets: ['fade-rise', 'stagger-reveal'],
    allowedSvgMotifs: ['abstract-product', 'icon-markers'],
    qualityRules: [
      'Max 3 bullets or supporting points.',
      'Title 44-60px; body 24-30px.',
    ],
  },

  agenda: {
    id: 'agenda',
    label: 'Agenda',
    description: 'Numbered list of sections or topics for the deck.',
    matchKeywords: ['agenda', 'table-of-contents', 'outline', 'topics', 'sections', 'today'],
    slots: [
      eyebrow(),
      title(),
      labeledItem('item-1', 'Agenda Item 1', true),
      labeledItem('item-2', 'Agenda Item 2', true),
      labeledItem('item-3', 'Agenda Item 3', false),
      labeledItem('item-4', 'Agenda Item 4', false),
      labeledItem('item-5', 'Agenda Item 5', false),
      labeledItem('item-6', 'Agenda Item 6', false),
    ],
    minFontSizePx: 20,
    maxBullets: 6,
    supportsMedia: false,
    allowedMotionPresets: ['stagger-reveal', 'fade-rise'],
    allowedSvgMotifs: ['icon-markers'],
    qualityRules: [
      'Items numbered and visually distinct.',
      'Max 6 agenda items; prefer 4-5.',
    ],
  },

  'section-breaker': {
    id: 'section-breaker',
    label: 'Section Breaker',
    description: 'Interstitial slide that marks a new section with a bold statement or visual shift.',
    matchKeywords: ['section', 'chapter', 'part', 'transition', 'breaker', 'interstitial'],
    slots: [
      eyebrow(true),
      { id: 'title', label: 'Section Title', required: true, maxChars: 60, maxWords: 6, minFontSizePx: 60, description: 'Bold large section title.' },
      { id: 'context', label: 'Context Line', required: false, maxChars: 100, maxWords: 14, minFontSizePx: 24, description: 'Optional one-line context or teaser.' },
    ],
    minFontSizePx: 24,
    supportsMedia: false,
    allowedMotionPresets: ['scene-entrance', 'accent-pulse'],
    allowedSvgMotifs: ['decorative-background', 'timeline-connector'],
    qualityRules: [
      'Section title 60px+ for strong visual impact.',
      'Keep the slide sparse - one dominant element.',
    ],
  },

  'big-statement': {
    id: 'big-statement',
    label: 'Big Statement',
    description: 'Single dominant assertion - a bold insight, belief, or challenge.',
    matchKeywords: ['big-statement', 'big statement', 'belief', 'assertion', 'manifesto', 'one-thing', 'insight', 'problem', 'tension', 'gap', 'challenge', 'evidence strip'],
    slots: [
      eyebrow(false),
      { id: 'statement', label: 'Statement', required: true, maxChars: 140, maxWords: 20, minFontSizePx: 64, description: 'The single big idea. Very large text.' },
      { id: 'attribution', label: 'Attribution / Source', required: false, maxChars: 60, maxWords: 8, minFontSizePx: 18, description: 'Optional source or speaker.' },
    ],
    minFontSizePx: 60,
    supportsMedia: false,
    allowedMotionPresets: ['fade-rise', 'accent-pulse'],
    allowedSvgMotifs: ['abstract-product', 'editorial-frame'],
    qualityRules: [
      'Statement text must be 64px minimum.',
      'Single-zone layout - resist adding extra content.',
    ],
  },

  timeline: {
    id: 'timeline',
    label: 'Timeline',
    description: 'Horizontal or vertical sequence of events, milestones, or phases.',
    matchKeywords: ['timeline', 'milestone', 'history', 'sequence', 'chronology', 'phases'],
    slots: [
      eyebrow(),
      title(),
      labeledItem('event-1', 'Event / Milestone 1', true),
      labeledItem('event-2', 'Event / Milestone 2', true),
      labeledItem('event-3', 'Event / Milestone 3', false),
      labeledItem('event-4', 'Event / Milestone 4', false),
      labeledItem('event-5', 'Event / Milestone 5', false),
    ],
    minFontSizePx: 20,
    maxBullets: 5,
    supportsMedia: false,
    allowedMotionPresets: ['stagger-reveal', 'path-draw'],
    allowedSvgMotifs: ['timeline-connector', 'process-diagram'],
    qualityRules: [
      'Timeline items should have a date or phase label.',
      'Use a visible connecting line or arrow motif.',
      'Max 5 timeline events per slide.',
    ],
  },

  'two-column': {
    id: 'two-column',
    label: 'Two-Column',
    description: 'Two parallel content columns - for comparisons, split narratives, or dual evidence.',
    matchKeywords: ['two-column', 'split', 'dual', 'left-right', 'parallel'],
    slots: [
      eyebrow(),
      title(),
      { id: 'left-heading', label: 'Left Column Heading', required: true, maxWords: 6, minFontSizePx: 28, description: 'Left column heading.' },
      bodyText('left-body', 'Left Column Body', true, 50),
      { id: 'right-heading', label: 'Right Column Heading', required: true, maxWords: 6, minFontSizePx: 28, description: 'Right column heading.' },
      bodyText('right-body', 'Right Column Body', true, 50),
    ],
    minFontSizePx: 24,
    maxBullets: 4,
    supportsMedia: false,
    allowedMotionPresets: ['fade-rise', 'stagger-reveal'],
    allowedSvgMotifs: ['abstract-product', 'data-grid'],
    qualityRules: [
      'Both columns must have equal visual weight.',
      'Use a divider or seam between columns.',
      'Max 4 bullets per column.',
    ],
  },

  'three-column': {
    id: 'three-column',
    label: 'Three-Column',
    description: 'Three-way split for features, options, or parallel items.',
    matchKeywords: ['three-column', 'triple', 'three-way', 'trifecta', 'three-up'],
    slots: [
      eyebrow(),
      title(),
      labeledItem('col-1', 'Column 1 Label + Body', true),
      labeledItem('col-2', 'Column 2 Label + Body', true),
      labeledItem('col-3', 'Column 3 Label + Body', true),
    ],
    minFontSizePx: 22,
    maxBullets: 3,
    supportsMedia: false,
    allowedMotionPresets: ['stagger-reveal'],
    allowedSvgMotifs: ['icon-markers', 'abstract-product'],
    qualityRules: [
      'Three columns with equal visual weight.',
      'Each column: one heading + max 3 short bullets.',
    ],
  },

  comparison: {
    id: 'comparison',
    label: 'Comparison',
    description: 'Side-by-side contrast of two options, concepts, or states.',
    matchKeywords: ['comparison', 'compare', 'versus', 'vs', 'before-after', 'pro-con', 'contrast', 'lane', 'lanes', 'verdict', 'bridge'],
    slots: [
      eyebrow(),
      title(),
      { id: 'left-label', label: 'Left Option Label', required: true, maxWords: 4, minFontSizePx: 28, description: 'Name or label of the left option.' },
      labeledItem('left-point-1', 'Left Point 1', true),
      labeledItem('left-point-2', 'Left Point 2', false),
      labeledItem('left-point-3', 'Left Point 3', false),
      { id: 'right-label', label: 'Right Option Label', required: true, maxWords: 4, minFontSizePx: 28, description: 'Name or label of the right option.' },
      labeledItem('right-point-1', 'Right Point 1', true),
      labeledItem('right-point-2', 'Right Point 2', false),
      labeledItem('right-point-3', 'Right Point 3', false),
      { id: 'verdict', label: 'Verdict / Bridge', required: false, maxWords: 14, minFontSizePx: 20, description: 'Optional verdict or connecting insight.' },
    ],
    minFontSizePx: 20,
    maxBullets: 3,
    supportsMedia: false,
    allowedMotionPresets: ['stagger-reveal', 'fade-rise'],
    allowedSvgMotifs: ['abstract-product', 'data-grid', 'icon-markers'],
    qualityRules: [
      'Both sides must feel visually balanced.',
      'Use a center divider or bridge element.',
      'Verdict row optional but adds resolution.',
    ],
  },

  'metric-proof': {
    id: 'metric-proof',
    label: 'Metric Proof',
    description: 'Two or three dominant KPIs with interpretation labels - not a 6-tile metric wall.',
    matchKeywords: ['metric', 'kpi', 'data', 'number', 'stats', 'scorecard', 'proof', 'results'],
    slots: [
      eyebrow(),
      title(),
      { id: 'metric-1-value', label: 'Metric 1 Value', required: true, maxChars: 20, minFontSizePx: 48, description: 'Large numeric or categorical value.' },
      { id: 'metric-1-label', label: 'Metric 1 Label', required: true, maxWords: 6, minFontSizePx: 20, description: 'What the metric measures.' },
      { id: 'metric-2-value', label: 'Metric 2 Value', required: false, maxChars: 20, minFontSizePx: 48, description: 'Second metric value.' },
      { id: 'metric-2-label', label: 'Metric 2 Label', required: false, maxWords: 6, minFontSizePx: 20, description: 'What metric 2 measures.' },
      { id: 'metric-3-value', label: 'Metric 3 Value', required: false, maxChars: 20, minFontSizePx: 48, description: 'Third metric value.' },
      { id: 'metric-3-label', label: 'Metric 3 Label', required: false, maxWords: 6, minFontSizePx: 20, description: 'What metric 3 measures.' },
      { id: 'interpretation', label: 'Interpretation', required: false, maxWords: 20, minFontSizePx: 22, description: 'Brief interpretation of what the numbers mean.' },
    ],
    minFontSizePx: 20,
    maxBullets: 0,
    supportsMedia: false,
    allowedMotionPresets: ['accent-pulse', 'fade-rise'],
    allowedSvgMotifs: ['data-grid', 'process-diagram'],
    qualityRules: [
      'Max 3 dominant metrics. No 6+ tile walls.',
      'Metric values must be 48px+ for readability.',
      'Include an interpretation label for each metric.',
    ],
  },

  process: {
    id: 'process',
    label: 'Process',
    description: 'Step-by-step workflow, methodology, or how-it-works sequence.',
    matchKeywords: ['process', 'workflow', 'methodology', 'steps', 'how-it-works', 'flow', 'mechanism', 'diagram', 'model', 'system'],
    slots: [
      eyebrow(),
      title(),
      labeledItem('step-1', 'Step 1', true),
      labeledItem('step-2', 'Step 2', true),
      labeledItem('step-3', 'Step 3', false),
      labeledItem('step-4', 'Step 4', false),
      labeledItem('step-5', 'Step 5', false),
    ],
    minFontSizePx: 20,
    maxBullets: 5,
    supportsMedia: false,
    allowedMotionPresets: ['stagger-reveal', 'path-draw'],
    allowedSvgMotifs: ['process-diagram', 'timeline-connector', 'icon-markers'],
    qualityRules: [
      'Steps numbered and visually connected (arrow, line, or dot-connector).',
      'Max 5 steps per slide.',
      'Each step: short label + one-line detail.',
    ],
  },

  quote: {
    id: 'quote',
    label: 'Quote',
    description: 'A single powerful quote or testimonial with attribution.',
    matchKeywords: ['quote', 'testimonial', 'pull-quote', 'customer-voice'],
    slots: [
      eyebrow(false),
      { id: 'quote-text', label: 'Quote Text', required: true, maxChars: 220, maxWords: 35, minFontSizePx: 32, description: 'The quote. Keep it tight - under 35 words for legibility.' },
      { id: 'attribution', label: 'Attribution', required: true, maxChars: 80, maxWords: 10, minFontSizePx: 18, description: 'Name, title, and/or company.' },
      { id: 'context', label: 'Context', required: false, maxChars: 80, maxWords: 12, minFontSizePx: 18, description: 'Optional framing sentence.' },
    ],
    minFontSizePx: 32,
    supportsMedia: false,
    allowedMotionPresets: ['fade-rise', 'accent-pulse'],
    allowedSvgMotifs: ['editorial-frame', 'abstract-product'],
    qualityRules: [
      'Quote text 32px minimum.',
      'Attribution clearly separated from quote.',
      'Use large decorative quote marks or an editorial frame.',
    ],
  },

  'case-study': {
    id: 'case-study',
    label: 'Case Study',
    description: 'Challenge-solution-outcome narrative for a real-world example.',
    matchKeywords: ['case-study', 'example', 'customer', 'success-story', 'evidence'],
    slots: [
      eyebrow(),
      title(),
      bodyText('challenge', 'Challenge', true, 30),
      bodyText('solution', 'Solution', true, 30),
      bodyText('outcome', 'Outcome', true, 30),
    ],
    minFontSizePx: 22,
    supportsMedia: false,
    allowedMotionPresets: ['stagger-reveal', 'fade-rise'],
    allowedSvgMotifs: ['icon-markers', 'process-diagram'],
    qualityRules: [
      'Three sections: Challenge, Solution, Outcome.',
      'Outcome section should include a metric or concrete result.',
    ],
  },

  'data-story': {
    id: 'data-story',
    label: 'Data Story',
    description: 'A single key finding with a visualization cue and implication.',
    matchKeywords: ['data-story', 'finding', 'insight', 'research', 'analysis', 'chart'],
    slots: [
      eyebrow(),
      title(),
      { id: 'finding', label: 'Key Finding', required: true, maxWords: 20, minFontSizePx: 32, description: 'The single most important data insight.' },
      { id: 'visualization-guidance', label: 'Visualization Guidance', required: false, maxWords: 30, minFontSizePx: 20, description: 'Describe the chart or data visual to render.' },
      { id: 'implication', label: 'Implication', required: true, maxWords: 20, minFontSizePx: 22, description: 'What this means for the audience.' },
    ],
    minFontSizePx: 22,
    supportsMedia: false,
    allowedMotionPresets: ['accent-pulse', 'fade-rise'],
    allowedSvgMotifs: ['data-grid', 'process-diagram'],
    qualityRules: [
      'One dominant finding - not a list of data points.',
      'Visualization can be SVG chart or strong data callout.',
      'Implication answers "So what?".',
    ],
  },

  roadmap: {
    id: 'roadmap',
    label: 'Roadmap',
    description: 'Past, present, and future phases of a plan or product.',
    matchKeywords: ['roadmap', 'plan', 'future', 'phased', 'quarter', 'q1', 'q2', 'q3', 'q4'],
    slots: [
      eyebrow(),
      title(),
      labeledItem('past', 'Past Phase', false),
      labeledItem('now', 'Current Phase', true),
      labeledItem('next', 'Next Phase', true),
      labeledItem('future', 'Future Phase', false),
    ],
    minFontSizePx: 20,
    maxBullets: 3,
    supportsMedia: false,
    allowedMotionPresets: ['path-draw', 'stagger-reveal'],
    allowedSvgMotifs: ['timeline-connector', 'process-diagram'],
    qualityRules: [
      'Phases in left-to-right time order.',
      'Current phase visually highlighted.',
      'Each phase: short label + 1-2 bullet points.',
    ],
  },

  closing: {
    id: 'closing',
    label: 'Closing / CTA',
    description: 'Final slide with a clear call to action or summary statement.',
    matchKeywords: ['closing', 'close', 'conclusion', 'next-step', 'next-steps', 'cta', 'action', 'recommendation', 'decision', 'proposal', 'ask', 'thank-you'],
    slots: [
      eyebrow(false),
      title(),
      { id: 'cta', label: 'Call to Action', required: true, maxWords: 12, minFontSizePx: 32, description: 'Primary next step or ask.' },
      labeledItem('supporting-1', 'Supporting Point 1', false),
      labeledItem('supporting-2', 'Supporting Point 2', false),
      labeledItem('supporting-3', 'Supporting Point 3', false),
      { id: 'meta', label: 'Contact / Meta', required: false, maxChars: 80, maxWords: 10, minFontSizePx: 16, description: 'Optional contact info or closing note.' },
    ],
    minFontSizePx: 24,
    maxBullets: 3,
    supportsMedia: false,
    allowedMotionPresets: ['fade-rise', 'accent-pulse'],
    allowedSvgMotifs: ['abstract-product', 'editorial-frame'],
    qualityRules: [
      'CTA must be prominent - 32px+ and above the fold.',
      'Avoid ending with a wall of bullets.',
      'Use visual emphasis (color band, large type, or icon) for the CTA.',
    ],
  },
};

// Layout selection

const FALLBACK_LAYOUT_ID: SlideLayoutId = 'two-column';

/**
 * Select a layout definition from a free-text layout pattern string.
 * Uses keyword matching; falls back to two-column if nothing matches.
 */
export function selectLayout(layoutPattern: string): SlideLayoutDefinition {
  if (!layoutPattern) return SLIDE_LAYOUT_REGISTRY[FALLBACK_LAYOUT_ID];

  const lower = layoutPattern.toLowerCase();

  // Exact ID match first
  if (lower in SLIDE_LAYOUT_REGISTRY) {
    return SLIDE_LAYOUT_REGISTRY[lower as SlideLayoutId];
  }

  // Keyword scan
  let best: SlideLayoutDefinition | null = null;
  let bestScore = 0;

  for (const layout of Object.values(SLIDE_LAYOUT_REGISTRY)) {
    const score = layout.matchKeywords.reduce(
      (acc, keyword) => acc + (lower.includes(keyword) ? 1 : 0),
      0,
    );
    if (score > bestScore) {
      bestScore = score;
      best = layout;
    }
  }

  return best ?? SLIDE_LAYOUT_REGISTRY[FALLBACK_LAYOUT_ID];
}

// Prompt serialization

/**
 * Build a concise slot contract block for injection into the designer prompt.
 * The model reads this to know which slots to populate before writing HTML.
 */
export function buildSlotContractPrompt(layout: SlideLayoutDefinition): string {
  const requiredSlots = layout.slots.filter((s) => s.required);
  const optionalSlots = layout.slots.filter((s) => !s.required);

  const formatSlot = (s: SlideSlotDefinition): string => {
    const constraints: string[] = [];
    if (s.maxWords) constraints.push(`max ${s.maxWords} words`);
    if (s.maxChars && !s.maxWords) constraints.push(`max ${s.maxChars} chars`);
    if (s.minFontSizePx) constraints.push(`${s.minFontSizePx}px+`);
    return `  - ${s.id} / ${s.label}${constraints.length ? ` (${constraints.join(', ')})` : ''}: ${s.description}`;
  };

  const lines: string[] = [
    `## SLOT CONTRACT - ${layout.label}`,
    '',
    `Use layout id \`${layout.id}\`: add \`data-layout="${layout.id}"\` to the <section>.`,
    'Populate named slots with stable classes like `slot-title`, `slot-summary`, or `slot-metric-1-value` for targeted edits.',
    'No extra content zones unless the user asked for custom/freeform structure.',
    '',
    layout.description,
    '',
  ];

  if (requiredSlots.length > 0) {
    lines.push('Required slots:');
    requiredSlots.forEach((s) => lines.push(formatSlot(s)));
  }

  if (optionalSlots.length > 0) {
    lines.push('Optional slots:');
    optionalSlots.forEach((s) => lines.push(formatSlot(s)));
  }

  lines.push('');
  lines.push(`Min body font: ${layout.minFontSizePx}px.`);

  if (layout.maxBullets !== undefined) {
    lines.push(`Max bullets: ${layout.maxBullets}.`);
  }

  if (layout.qualityRules.length > 0) {
    lines.push('Quality rules:');
    layout.qualityRules.forEach((rule) => lines.push(`  - ${rule}`));
  }

  if (layout.allowedMotionPresets.length > 0) {
    lines.push('Allowed motion presets:');
    layout.allowedMotionPresets.forEach((presetId) => {
      lines.push(`  - ${buildMotionPresetPrompt(presetId)}`);
    });
    lines.push('No other @keyframes unless the user explicitly requests custom motion.');
    lines.push('Reduced-motion fallback required for animation.');
  }

  if (layout.allowedSvgMotifs.length > 0) {
    lines.push('Allowed SVG motif families:');
    layout.allowedSvgMotifs.forEach((motifId) => {
      lines.push(`  - ${buildSvgMotifPrompt(motifId)}`);
    });
    lines.push('Use only these SVG motif families unless the user asks for custom art.');
  }

  return lines.join('\n');
}
