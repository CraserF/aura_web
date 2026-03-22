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

export type ExemplarPackId = 'default-template' | 'split-world-title' | 'editorial-infographic';

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

  const exemplarPackId = getExemplarPackId(templateId);
  return {
    style,
    templateId,
    exemplarPackId,
    styleManifest: buildStyleManifest(style, templateId, exemplarPackId),
  };
}

function getExemplarPackId(templateId: TemplateId): ExemplarPackId {
  if (templateId === 'split-world' || templateId === 'keynote' || templateId === 'cinematic') {
    return 'split-world-title';
  }

  if (templateId === 'editorial-magazine' || templateId === 'infographic-grid' || templateId === 'multi-panel-dashboard') {
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