import { detectTemplateStyle, type TemplateStyle } from './palettes';
import { selectTemplate } from './selector';
import type { TemplateId } from './registry';

export interface StyleManifest {
  compositionMode:
    | 'hero-scene'
    | 'split-world'
    | 'editorial-grid'
    | 'infographic-grid'
    | 'dashboard-grid'
    | 'minimal-stage'
    | 'comparison-stage'
    | 'narrative-stage';
  backgroundTreatment:
    | 'dark-glass'
    | 'light-infographic'
    | 'split-gradient'
    | 'editorial-paper'
    | 'scene-illustration'
    | 'minimal-solid';
  typographyMood:
    | 'modern-sans'
    | 'editorial-serif'
    | 'condensed-display'
    | 'data-sans'
    | 'technical-sans';
  motionLanguage:
    | 'subtle-stagger'
    | 'diagram-micro'
    | 'hero-kinetic'
    | 'scene-continuous';
  svgStrategy:
    | 'ambient-geometry'
    | 'inline-diagrams'
    | 'hybrid-diagrams'
    | 'minimal-icons';
  density: 'airy' | 'balanced' | 'dense';
  cardGrammar: string;
  accentStrategy: string;
  heroPattern: string;
  componentPatterns: string[];
  exemplarPackId: ExemplarPackId;
}

export type ExemplarPackId =
  | 'default-template'
  | 'split-world-title'
  | 'editorial-infographic'
  | 'agenda-overview'
  | 'section-divider'
  | 'comparison'
  | 'process-timeline'
  | 'metrics-dashboard'
  | 'case-study-spotlight'
  | 'quote-statement'
  | 'closing-cta'
  | 'quiz-interstitial';

export interface TemplatePlan {
  style: TemplateStyle;
  templateId: TemplateId;
  exemplarPackId: ExemplarPackId;
  styleManifest: StyleManifest;
}

const STYLE_DEFAULT_TEMPLATE: Record<TemplateStyle, TemplateId> = {
  keynote: 'keynote',
  corporate: 'corporate',
  tech: 'tech-architecture',
  creative: 'creative-portfolio',
  minimal: 'minimal',
  pitch: 'pitch-deck',
  editorial: 'editorial-magazine',
  scifi: 'sci-fi',
  data: 'infographic-grid',
  educational: 'educational',
  ocean: 'infographic-grid',
  luxury: 'sidebar-cards',
  nature: 'landscape-illustration',
  neon: 'split-world',
  dashboard: 'multi-panel-dashboard',
};

const TEMPLATE_STYLE_COMPATIBILITY: Partial<Record<TemplateId, TemplateStyle[]>> = {
  'editorial-magazine': ['editorial', 'luxury'],
  'infographic-grid': ['data', 'ocean', 'dashboard', 'corporate'],
  'split-world': ['neon', 'scifi', 'creative', 'keynote'],
  'multi-panel-dashboard': ['dashboard', 'data', 'corporate'],
  'sidebar-cards': ['luxury', 'creative', 'corporate'],
  'landscape-illustration': ['nature', 'ocean', 'creative'],
  keynote: ['keynote', 'pitch', 'tech'],
  corporate: ['corporate', 'dashboard'],
  'tech-architecture': ['tech', 'corporate'],
  'data-dashboard': ['data', 'dashboard', 'corporate'],
  storytelling: ['editorial', 'creative'],
  cinematic: ['keynote', 'creative', 'scifi'],
  'pitch-deck': ['pitch', 'keynote'],
};

export function resolveTemplatePlan(
  prompt: string,
  context?: { audience?: string; purpose?: string },
): TemplatePlan {
  const style = detectTemplateStyle(prompt);
  const selected = selectTemplate(prompt, context);
  const compatibleStyles = TEMPLATE_STYLE_COMPATIBILITY[selected];
  const templateId = compatibleStyles && !compatibleStyles.includes(style)
    ? STYLE_DEFAULT_TEMPLATE[style]
    : selected;

  const exemplarPackId = getExemplarPackId(templateId, prompt, style);
  return {
    style,
    templateId,
    exemplarPackId,
    styleManifest: buildStyleManifest(style, templateId, exemplarPackId),
  };
}

function promptMatches(prompt: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(prompt));
}

function getExemplarPackId(
  templateId: TemplateId,
  prompt: string,
  style: TemplateStyle,
): ExemplarPackId {
  if (promptMatches(prompt, [/\bquiz\b/i, /\bpoll\b/i, /\bcheckpoint\b/i, /\binterstitial\b/i])) {
    return 'quiz-interstitial';
  }

  if (promptMatches(prompt, [/\bagenda\b/i, /\boverview\b/i, /\btable of contents\b/i, /\bcontents\b/i])) {
    return 'agenda-overview';
  }

  if (promptMatches(prompt, [/\bsection divider\b/i, /\bchapter break\b/i, /\bdivider slide\b/i, /\bsection break\b/i])) {
    return 'section-divider';
  }

  if (promptMatches(prompt, [/\bcompare\b/i, /\bcomparison\b/i, /\bversus\b/i, /\bvs\.?\b/i, /\bbefore\b.*\bafter\b/i, /\btrade[- ]?off\b/i])) {
    return 'comparison';
  }

  if (promptMatches(prompt, [/\btimeline\b/i, /\broadmap\b/i, /\bprocess\b/i, /\bjourney\b/i, /\bmilestone\b/i, /\bphases\b/i, /\bsteps\b/i])) {
    return 'process-timeline';
  }

  if (promptMatches(prompt, [/\bkpi\b/i, /\bmetric\b/i, /\bdashboard\b/i, /\bscorecard\b/i, /\bfinancials\b/i, /\bstats?\b/i, /\bnumbers\b/i])) {
    return 'metrics-dashboard';
  }

  if (promptMatches(prompt, [/\bcase study\b/i, /\bspotlight\b/i, /\bcustomer story\b/i, /\bproof point\b/i, /\bexample slide\b/i])) {
    return 'case-study-spotlight';
  }

  if (promptMatches(prompt, [/\bquote\b/i, /\bpull quote\b/i, /\bstatement slide\b/i, /\bbig idea\b/i, /\bkey message\b/i])) {
    return 'quote-statement';
  }

  if (promptMatches(prompt, [/\bsummary\b/i, /\bconclusion\b/i, /\bclosing\b/i, /\bthank you\b/i, /\bcall to action\b/i, /\bcta\b/i, /\bnext steps\b/i])) {
    return 'closing-cta';
  }

  if (promptMatches(prompt, [/\btitle slide\b/i, /\bhero slide\b/i, /\bcover slide\b/i, /\bopening slide\b/i])) {
    return 'split-world-title';
  }

  if (templateId === 'split-world' || templateId === 'keynote' || templateId === 'cinematic') {
    return 'split-world-title';
  }

  if (
    templateId === 'editorial-magazine'
    || templateId === 'infographic-grid'
    || templateId === 'multi-panel-dashboard'
    || style === 'editorial'
    || style === 'data'
    || style === 'dashboard'
    || style === 'ocean'
  ) {
    return 'editorial-infographic';
  }

  return 'default-template';
}

function buildStyleManifest(
  style: TemplateStyle,
  templateId: TemplateId,
  exemplarPackId: ExemplarPackId,
): StyleManifest {
  switch (exemplarPackId) {
    case 'split-world-title':
      return {
        compositionMode: templateId === 'split-world' ? 'split-world' : 'hero-scene',
        backgroundTreatment: templateId === 'split-world' ? 'split-gradient' : 'dark-glass',
        typographyMood: templateId === 'keynote' ? 'condensed-display' : 'modern-sans',
        motionLanguage: 'scene-continuous',
        svgStrategy: 'hybrid-diagrams',
        density: 'balanced',
        cardGrammar: 'Use large scene-led sections with a small number of high-contrast supporting cards. Prefer one visual thesis per slide over many equal cards.',
        accentStrategy: 'Reserve bright accent colors for seam lines, signal dots, animated pipelines, and small metric chips. Keep background worlds broad and atmospheric.',
        heroPattern: 'Build the opening slide as a full-canvas split-world or hero-scene composition with an animated seam, one central nexus visual, and a strong eyebrow/title/subtitle stack.',
        componentPatterns: [
          'split background worlds with a central seam or connector',
          'visual strip that bridges two ideas',
          'small labeled pills instead of large dense cards on the title slide',
          'background SVG fields that reinforce the narrative instead of generic decoration',
        ],
        exemplarPackId,
      };

    case 'editorial-infographic':
      return {
        compositionMode: style === 'editorial' ? 'editorial-grid' : style === 'dashboard' ? 'dashboard-grid' : 'infographic-grid',
        backgroundTreatment: style === 'editorial' ? 'editorial-paper' : 'light-infographic',
        typographyMood: style === 'editorial' ? 'editorial-serif' : 'data-sans',
        motionLanguage: 'diagram-micro',
        svgStrategy: 'inline-diagrams',
        density: 'dense',
        cardGrammar: 'Use asymmetric information hierarchy: headline rail, secondary callout strip, and richly structured cards with labels, titles, body copy, and embedded micro-diagrams.',
        accentStrategy: 'Color-code mechanisms or categories by card edge, badge, metric, or SVG stroke. Keep the page light and let color act as editorial signposting.',
        heroPattern: 'Open with a disciplined editorial title lockup or report-style cover, then shift quickly into structured explainer slides with bespoke inline diagrams.',
        componentPatterns: [
          'header bars with eyebrow metadata and strong divider lines',
          'callout strips for funding amounts, key metrics, or strategic statements',
          'inline SVG explainers embedded inside cards rather than separate illustration slides',
          'tiered stacks, strips, and asymmetric grids instead of repeated equal-width cards',
        ],
        exemplarPackId,
      };

    case 'agenda-overview':
      return {
        compositionMode: 'narrative-stage',
        backgroundTreatment: style === 'minimal' ? 'minimal-solid' : 'light-infographic',
        typographyMood: style === 'editorial' ? 'editorial-serif' : 'modern-sans',
        motionLanguage: 'subtle-stagger',
        svgStrategy: 'minimal-icons',
        density: 'balanced',
        cardGrammar: 'Use a calm overview rhythm: one title rail followed by 3-6 small, orderly agenda components.',
        accentStrategy: 'Use accent color for numbering, sequencing chips, and one or two dividers only.',
        heroPattern: 'Present the deck map as a premium overview screen that quickly tells the audience what comes next.',
        componentPatterns: [
          'numbered topic cards or a slim agenda rail',
          'short section labels rather than full paragraphs',
          'clean progress indicators and sequencing chips',
        ],
        exemplarPackId,
      };

    case 'section-divider':
      return {
        compositionMode: 'minimal-stage',
        backgroundTreatment: style === 'neon' || style === 'scifi' ? 'split-gradient' : 'minimal-solid',
        typographyMood: style === 'keynote' ? 'condensed-display' : 'modern-sans',
        motionLanguage: 'hero-kinetic',
        svgStrategy: 'ambient-geometry',
        density: 'airy',
        cardGrammar: 'Keep divider slides sparse and typographic. One dominant lockup should do most of the work.',
        accentStrategy: 'Use a single seam, underline, orb, or glow as the only bright signal on the slide.',
        heroPattern: 'Create a chapter break with oversized section language and one short orientation line.',
        componentPatterns: [
          'oversized section number or chapter name',
          'single divider line or seam motif',
          'very small supporting orientation text',
        ],
        exemplarPackId,
      };

    case 'comparison':
      return {
        compositionMode: 'comparison-stage',
        backgroundTreatment: style === 'minimal' ? 'minimal-solid' : 'light-infographic',
        typographyMood: style === 'editorial' ? 'editorial-serif' : 'data-sans',
        motionLanguage: 'subtle-stagger',
        svgStrategy: 'hybrid-diagrams',
        density: 'balanced',
        cardGrammar: 'Use parallel left/right structures so the audience can compare quickly without decoding a new layout.',
        accentStrategy: 'Use two accent treatments sparingly to distinguish the two sides while keeping the rest of the slide neutral.',
        heroPattern: 'Anchor the slide with a shared headline and a clear comparative verdict or midpoint.',
        componentPatterns: [
          'balanced side-by-side comparison cards',
          'center arrow, divider, or verdict chip',
          'parallel headings and evidence rows on each side',
        ],
        exemplarPackId,
      };

    case 'process-timeline':
      return {
        compositionMode: 'narrative-stage',
        backgroundTreatment: style === 'minimal' ? 'minimal-solid' : 'light-infographic',
        typographyMood: style === 'tech' ? 'technical-sans' : 'modern-sans',
        motionLanguage: 'diagram-micro',
        svgStrategy: 'inline-diagrams',
        density: 'balanced',
        cardGrammar: 'Treat process slides as ordered systems: nodes, rails, and milestone cards with strong directional flow.',
        accentStrategy: 'Use accent color to trace the progression path rather than filling every card.',
        heroPattern: 'Show the sequence clearly with one line of direction and a set of phased steps that read at a glance.',
        componentPatterns: [
          'numbered nodes and step cards',
          'horizontal or stepped timeline rails',
          'draw-in connectors or direction arrows',
        ],
        exemplarPackId,
      };

    case 'metrics-dashboard':
      return {
        compositionMode: 'dashboard-grid',
        backgroundTreatment: style === 'dashboard' || style === 'tech' ? 'dark-glass' : 'light-infographic',
        typographyMood: style === 'tech' ? 'technical-sans' : 'data-sans',
        motionLanguage: 'diagram-micro',
        svgStrategy: 'inline-diagrams',
        density: 'dense',
        cardGrammar: 'Lead with a few big numbers, then use slim support panels for interpretation or trend context.',
        accentStrategy: 'Reserve accents for the most important metrics and directional cues, not every card.',
        heroPattern: 'Build a premium control-room moment with 3-5 metrics and one decisive supporting insight.',
        componentPatterns: [
          'metric tiles with strong number hierarchy',
          'mini trend bars or slim dashboard strips',
          'one supporting insight panel below the metric row',
        ],
        exemplarPackId,
      };

    case 'case-study-spotlight':
      return {
        compositionMode: 'narrative-stage',
        backgroundTreatment: style === 'editorial' ? 'editorial-paper' : 'scene-illustration',
        typographyMood: style === 'editorial' ? 'editorial-serif' : 'modern-sans',
        motionLanguage: 'subtle-stagger',
        svgStrategy: 'hybrid-diagrams',
        density: 'balanced',
        cardGrammar: 'Use a story-led split layout with one insight pane and one proof pane. Keep the evidence tight and memorable.',
        accentStrategy: 'Use accents to highlight outcome facts, spotlight labels, and one supporting illustration only.',
        heroPattern: 'Present one real-world proof point as the narrative anchor with a calm but premium supporting evidence panel.',
        componentPatterns: [
          'insight-plus-evidence split layout',
          'spotlight label, result chips, and mini proof list',
          'supporting diagram or icon cluster in the secondary pane',
        ],
        exemplarPackId,
      };

    case 'quote-statement':
      return {
        compositionMode: 'minimal-stage',
        backgroundTreatment: style === 'minimal' ? 'minimal-solid' : 'editorial-paper',
        typographyMood: style === 'keynote' ? 'condensed-display' : 'editorial-serif',
        motionLanguage: 'subtle-stagger',
        svgStrategy: 'minimal-icons',
        density: 'airy',
        cardGrammar: 'Statement slides should be nearly typographic posters: one line, one accent, one optional attribution.',
        accentStrategy: 'Use accent only to emphasize the key phrase or the divider mark beneath it.',
        heroPattern: 'Let one bold statement carry the slide with generous negative space and minimal support text.',
        componentPatterns: [
          'oversized quote or statement lockup',
          'single divider or underline treatment',
          'minimal attribution or implication line',
        ],
        exemplarPackId,
      };

    case 'closing-cta':
      return {
        compositionMode: 'hero-scene',
        backgroundTreatment: style === 'minimal' ? 'minimal-solid' : 'scene-illustration',
        typographyMood: style === 'keynote' ? 'condensed-display' : 'modern-sans',
        motionLanguage: 'hero-kinetic',
        svgStrategy: 'hybrid-diagrams',
        density: 'balanced',
        cardGrammar: 'Finish with one strong synthesis statement, one action prompt, and a small set of supporting signals.',
        accentStrategy: 'Use the accent on the CTA, closing seam, or final chips rather than across the whole background.',
        heroPattern: 'Make the final slide feel like a designed finish: bold, confident, and directional.',
        componentPatterns: [
          'headline plus one CTA element',
          'small next-step chips or signal strip',
          'hero background motif that echoes the opener',
        ],
        exemplarPackId,
      };

    case 'quiz-interstitial':
      return {
        compositionMode: 'hero-scene',
        backgroundTreatment: 'light-infographic',
        typographyMood: 'condensed-display',
        motionLanguage: 'hero-kinetic',
        svgStrategy: 'ambient-geometry',
        density: 'airy',
        cardGrammar: 'Use one central focal object and oversized typography. This slide should reset attention instantly.',
        accentStrategy: 'Use bright accent pulses, rings, and small floating symbols around a centered focal badge or icon.',
        heroPattern: 'Create an energetic interstitial with one focal mark, one short headline, and one line of setup text.',
        componentPatterns: [
          'centered badge-like focal object',
          'oversized headline lockup',
          'small floating accents or pulse rings around the focal element',
        ],
        exemplarPackId,
      };

    default:
      return {
        compositionMode: style === 'minimal' ? 'minimal-stage' : style === 'editorial' ? 'narrative-stage' : 'hero-scene',
        backgroundTreatment: style === 'minimal' ? 'minimal-solid' : 'dark-glass',
        typographyMood: style === 'tech' ? 'technical-sans' : 'modern-sans',
        motionLanguage: 'subtle-stagger',
        svgStrategy: style === 'minimal' ? 'minimal-icons' : 'ambient-geometry',
        density: 'balanced',
        cardGrammar: 'Use a small family of reusable cards and panels with clear hierarchy instead of inventing a new component on every slide.',
        accentStrategy: 'Use accents to direct the eye to one or two priority elements per slide, not as an all-over fill color.',
        heroPattern: 'Create a dominant title lockup supported by one major visual motif and a restrained set of supporting badges or metrics.',
        componentPatterns: [
          'one dominant hero block',
          'reusable content cards with shared spacing and border language',
          'one diagram or metric-led visual per major content slide',
        ],
        exemplarPackId,
      };
  }
}