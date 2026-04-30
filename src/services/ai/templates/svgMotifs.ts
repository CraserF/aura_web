/**
 * SVG Motif Registry - named SVG motif families for slides.
 *
 * Rather than inventing arbitrary SVG per slide, the designer should choose
 * from these approved motif families and populate their slots. Each family
 * describes the visual intent, slot parameters, and safe usage rules.
 *
 * Motif families are referenced by layout definitions and injected into
 * the slot contract prompt when a matching motif is required.
 */

export type SvgMotifId =
  | 'abstract-product'
  | 'timeline-connector'
  | 'data-grid'
  | 'editorial-frame'
  | 'process-diagram'
  | 'icon-markers'
  | 'decorative-background';

export interface SvgMotifSlot {
  id: string;
  label: string;
  description: string;
  /** Whether this slot accepts a color variable reference */
  acceptsColor: boolean;
  /** Whether this slot accepts a label or numeric value */
  acceptsLabel: boolean;
}

export interface SvgMotifFamily {
  id: SvgMotifId;
  label: string;
  description: string;
  /** Visual intent - what kind of content this motif supports */
  intent: string;
  slots: SvgMotifSlot[];
  /** Viewport recommendation for the SVG element */
  viewBox: string;
  /** Safe z-index layer for placement */
  zIndexLayer: 0 | 1 | 2 | 10;
  /** Whether this motif sits behind slide content or alongside it */
  placement: 'background' | 'inline' | 'accent';
  /** Rules for safe use */
  usageRules: string[];
  /** Concise prompt guidance for the designer */
  promptGuidance: string;
}

export const SVG_MOTIF_REGISTRY: Record<SvgMotifId, SvgMotifFamily> = {
  'abstract-product': {
    id: 'abstract-product',
    label: 'Abstract Product Shapes',
    description: 'Geometric or organic shapes that suggest a product, platform, or concept without being literal.',
    intent: 'Evoke product identity or conceptual depth through clean geometry.',
    slots: [
      { id: 'primary-shape', label: 'Primary Shape', description: 'The dominant geometric form (circle, hex, arc, ring)', acceptsColor: true, acceptsLabel: false },
      { id: 'secondary-shape', label: 'Secondary Shape', description: 'Smaller complementary form for depth', acceptsColor: true, acceptsLabel: false },
      { id: 'accent-dot', label: 'Accent Dot', description: 'Small highlight or particle element', acceptsColor: true, acceptsLabel: false },
    ],
    viewBox: '0 0 1280 720',
    zIndexLayer: 1,
    placement: 'background',
    usageRules: [
      'Shapes must use CSS variable fill/stroke - no hardcoded hex values in SVG attributes.',
      'Keep shapes subtle - decorative, not competing with slide content.',
      'SVG must fit within viewBox 0 0 1280 720.',
      'No external image references or base64 inline images.',
    ],
    promptGuidance:
      'Build with <circle>, <ellipse>, <path>, or <polygon> elements. Use fill="var(--accent)" or stroke="var(--accent)". ' +
      'Place at z-index 1 behind content. Keep opacity 0.08-0.25 for background shapes. ' +
      'Two or three shapes maximum.',
  },

  'timeline-connector': {
    id: 'timeline-connector',
    label: 'Timeline Connector',
    description: 'Horizontal or vertical connector line with dots, arrows, or tick marks for timeline and roadmap slides.',
    intent: 'Visualize sequence, progress, or phases.',
    slots: [
      { id: 'connector-line', label: 'Connector Line', description: 'Main horizontal or vertical spine', acceptsColor: true, acceptsLabel: false },
      { id: 'point-1', label: 'Point 1', description: 'First milestone dot or tick', acceptsColor: true, acceptsLabel: true },
      { id: 'point-2', label: 'Point 2', description: 'Second milestone dot or tick', acceptsColor: true, acceptsLabel: true },
      { id: 'point-3', label: 'Point 3', description: 'Third milestone dot or tick', acceptsColor: true, acceptsLabel: false },
      { id: 'arrow', label: 'Arrow', description: 'Optional directional arrowhead', acceptsColor: true, acceptsLabel: false },
    ],
    viewBox: '0 0 1280 200',
    zIndexLayer: 2,
    placement: 'inline',
    usageRules: [
      'Line runs left-to-right (horizontal) or top-to-bottom (vertical).',
      'Dots or ticks mark each event position.',
      'Current position (if applicable) can use a filled dot with accent color.',
      'Use CSS variable stroke/fill values only - no hardcoded colors or external assets.',
      'Max 5 milestone points on one timeline.',
      'Can be animated with path-draw motion preset.',
    ],
    promptGuidance:
      'Build with <line> or <path> for the spine. Use <circle r="8"> for milestone dots. ' +
      'Apply stroke="var(--accent)" on the spine. Active milestone: fill="var(--accent)", others fill="var(--bg)". ' +
      'Pair with stagger-reveal or path-draw motion preset.',
  },

  'data-grid': {
    id: 'data-grid',
    label: 'Data Grid',
    description: 'Minimal SVG bar chart, sparkline, or grid accent for metric and data-story slides.',
    intent: 'Suggest data density and quantitative authority without requiring real chart libraries.',
    slots: [
      { id: 'bar-1', label: 'Bar / Data Column 1', description: 'First bar or column element', acceptsColor: true, acceptsLabel: true },
      { id: 'bar-2', label: 'Bar / Data Column 2', description: 'Second bar or column element', acceptsColor: true, acceptsLabel: true },
      { id: 'bar-3', label: 'Bar / Data Column 3', description: 'Third bar or column element', acceptsColor: true, acceptsLabel: true },
      { id: 'baseline', label: 'Baseline', description: 'Horizontal baseline or grid line', acceptsColor: true, acceptsLabel: false },
    ],
    viewBox: '0 0 400 240',
    zIndexLayer: 2,
    placement: 'inline',
    usageRules: [
      'Use only CSS variable colors - no hardcoded values.',
      'Keep charts abstract and illustrative - not precise data visualizations.',
      'Max 6 bars or data points for readability.',
      'Include a visible baseline or grid line.',
    ],
    promptGuidance:
      'Build with <rect> for bars or <polyline> for sparklines. ' +
      'Use fill="var(--accent)" for highlighted bars, fill="var(--text)" with low opacity for others. ' +
      'Keep bar widths and spacing consistent. Add a <line> baseline in a neutral color. ' +
      'Pair with accent-pulse or fade-rise motion.',
  },

  'editorial-frame': {
    id: 'editorial-frame',
    label: 'Editorial Frame',
    description: 'Thin border lines, corner marks, or rule strips that give an editorial magazine feel.',
    intent: 'Add premium structure and visual sophistication to editorial-style slides.',
    slots: [
      { id: 'top-rule', label: 'Top Rule', description: 'Thin horizontal rule at top', acceptsColor: true, acceptsLabel: false },
      { id: 'corner-mark', label: 'Corner Mark', description: 'Optional L-shaped corner accent', acceptsColor: true, acceptsLabel: false },
      { id: 'bottom-rule', label: 'Bottom Rule', description: 'Thin rule at bottom or footer area', acceptsColor: true, acceptsLabel: false },
    ],
    viewBox: '0 0 1280 720',
    zIndexLayer: 1,
    placement: 'background',
    usageRules: [
      'Rules must be thin (1-2px stroke) and restrained.',
      'Use accent or text color at 20-40% opacity.',
      'Use CSS variable stroke/fill values only - no hardcoded colors or external assets.',
      'Do not frame the entire slide with a heavy border.',
      'Complements quote, editorial, and executive slides.',
    ],
    promptGuidance:
      'Build with <line> or <rect> elements. Rule example: <line x1="60" y1="80" x2="1220" y2="80" stroke="var(--accent)" stroke-width="1.5" opacity="0.3"/>. ' +
      'Corner mark: two perpendicular lines, 40px long, meeting at a corner. ' +
      'Keep all elements at z-index 1, behind content (z-index 10).',
  },

  'process-diagram': {
    id: 'process-diagram',
    label: 'Process Diagram',
    description: 'Circular flow, funnel, or step-connected shapes that illustrate a method or workflow.',
    intent: 'Make abstract processes tangible through simple geometric logic.',
    slots: [
      { id: 'node-1', label: 'Node 1', description: 'First step shape (rect, circle, diamond)', acceptsColor: true, acceptsLabel: true },
      { id: 'node-2', label: 'Node 2', description: 'Second step shape', acceptsColor: true, acceptsLabel: true },
      { id: 'node-3', label: 'Node 3', description: 'Third step shape', acceptsColor: true, acceptsLabel: true },
      { id: 'connector-12', label: 'Connector 1 to 2', description: 'Arrow connecting node 1 to node 2', acceptsColor: true, acceptsLabel: false },
      { id: 'connector-23', label: 'Connector 2 to 3', description: 'Arrow connecting node 2 to node 3', acceptsColor: true, acceptsLabel: false },
    ],
    viewBox: '0 0 900 300',
    zIndexLayer: 2,
    placement: 'inline',
    usageRules: [
      'Max 5 nodes in a linear or circular flow.',
      'Arrows must clearly indicate direction.',
      'Node shapes should be simple: rect, circle, or rounded-rect.',
      'Use CSS variable stroke/fill values only - no hardcoded colors or external assets.',
      'Can be animated with path-draw preset on connectors.',
    ],
    promptGuidance:
      'Build nodes with <rect rx="8"> or <circle>. Use fill="var(--accent)" for the active/highlighted node. ' +
      'Connect with <line> or <path marker-end="url(#arrow)">. ' +
      'Define a small arrowhead with <marker>. ' +
      'Pair with path-draw or stagger-reveal motion.',
  },

  'icon-markers': {
    id: 'icon-markers',
    label: 'Icon Markers',
    description: 'Simple symbolic SVG icons used as bullets, step markers, or category signals.',
    intent: 'Replace text bullets with recognizable symbolic anchors.',
    slots: [
      { id: 'icon-1', label: 'Icon 1', description: 'First icon symbol', acceptsColor: true, acceptsLabel: true },
      { id: 'icon-2', label: 'Icon 2', description: 'Second icon symbol', acceptsColor: true, acceptsLabel: true },
      { id: 'icon-3', label: 'Icon 3', description: 'Third icon symbol', acceptsColor: true, acceptsLabel: true },
    ],
    viewBox: '0 0 48 48',
    zIndexLayer: 10,
    placement: 'inline',
    usageRules: [
      'Icons must be built from simple SVG shapes - no external icon fonts or sprite sheets.',
      'Each icon max 48x48px viewBox.',
      'Use fill="var(--accent)" or fill="var(--text)".',
      'Icons are inline beside text, not floating overlays.',
    ],
    promptGuidance:
      'Build each icon inline with <svg viewBox="0 0 24 24" width="32" height="32">. ' +
      'Use simple geometric constructions: circles, paths, lines. ' +
      'Examples: checkmark (path), arrow (polygon + line), star (path), diamond (polygon). ' +
      'Place icons as flex siblings to their label text.',
  },

  'decorative-background': {
    id: 'decorative-background',
    label: 'Decorative Background',
    description: 'Full-stage SVG layer with gradients, noise texture simulation, or abstract geometric fill.',
    intent: 'Add atmospheric depth to the slide background without visual clutter.',
    slots: [
      { id: 'primary-field', label: 'Primary Background Field', description: 'Main large background element (gradient rect or radial fill)', acceptsColor: true, acceptsLabel: false },
      { id: 'secondary-field', label: 'Secondary Layer', description: 'Optional subtle secondary depth layer', acceptsColor: true, acceptsLabel: false },
      { id: 'accent-detail', label: 'Accent Detail', description: 'Small decorative accent (line cluster, dot pattern)', acceptsColor: true, acceptsLabel: false },
    ],
    viewBox: '0 0 1280 720',
    zIndexLayer: 0,
    placement: 'background',
    usageRules: [
      'Sits at z-index 0, strictly behind all content.',
      'Must not obscure text - keep opacity of any shapes over text zones below 0.15.',
      'Use CSS gradients or SVG linearGradient/radialGradient with variable stops.',
      'No external bitmap images, remote assets, or base64 content.',
      'Complement the scene-entrance or fade-rise motion presets.',
    ],
    promptGuidance:
      'Define a <defs> block with <linearGradient> or <radialGradient> using variable stop colors. ' +
      'Background rect: <rect width="1280" height="720" fill="url(#bg-gradient)"/>. ' +
      'Optional: add dot-grid or line pattern with repeated small shapes at very low opacity (0.05-0.12). ' +
      'z-index: 0. Pair with scene-entrance motion on cover and section-breaker slides.',
  },
};

/**
 * Build a concise prompt description for a SVG motif family.
 */
export function buildSvgMotifPrompt(motifId: SvgMotifId): string {
  const motif = SVG_MOTIF_REGISTRY[motifId];
  const slotSummary = motif.slots
    .map((slot) => `${slot.id}${slot.acceptsLabel ? ':label' : ''}${slot.acceptsColor ? ':color' : ''}`)
    .join(', ');
  return (
    `${motif.label} (${motif.id}, ${motif.placement}, z${motif.zIndexLayer}, viewBox ${motif.viewBox}): ` +
    `slots ${slotSummary}. ${motif.usageRules.slice(0, 2).join(' ')}`
  );
}
