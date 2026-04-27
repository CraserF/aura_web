const TEMPLATE_HTML_MODULES = import.meta.glob('./html/*.html', {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>;

export type TemplateId =
  | 'editorial-light' | 'finance-grid-light' | 'stage-setting-light'
  | 'executive-briefing-light' | 'launch-narrative-light'
  | 'keynote' | 'corporate' | 'tech-architecture' | 'data-dashboard'
  | 'sci-fi' | 'creative-portfolio' | 'storytelling' | 'educational'
  | 'cinematic' | 'workshop'
  | 'code-walkthrough' | 'product-demo' | 'timeline'
  | 'editorial-magazine' | 'infographic-grid' | 'interactive-quiz'
  | 'split-world' | 'landscape-illustration' | 'multi-panel-dashboard'
  | 'sidebar-cards';

export const PRODUCTION_PRESENTATION_TEMPLATE_IDS = [
  'executive-briefing-light',
  'launch-narrative-light',
  'editorial-light',
  'finance-grid-light',
  'stage-setting-light',
  'interactive-quiz',
  'split-world',
] as const satisfies readonly TemplateId[];

export type ProductionPresentationTemplateId = typeof PRODUCTION_PRESENTATION_TEMPLATE_IDS[number];

const PRODUCTION_PRESENTATION_TEMPLATE_SET = new Set<TemplateId>(PRODUCTION_PRESENTATION_TEMPLATE_IDS);

export const LEGACY_PRESENTATION_TEMPLATE_IDS = [
  'keynote',
  'corporate',
  'tech-architecture',
  'data-dashboard',
  'sci-fi',
  'creative-portfolio',
  'storytelling',
  'educational',
  'cinematic',
  'workshop',
  'code-walkthrough',
  'product-demo',
  'timeline',
  'editorial-magazine',
  'infographic-grid',
  'landscape-illustration',
  'multi-panel-dashboard',
  'sidebar-cards',
] as const satisfies readonly TemplateId[];

export type LegacyPresentationTemplateId = typeof LEGACY_PRESENTATION_TEMPLATE_IDS[number];

const LEGACY_PRESENTATION_TEMPLATE_SET = new Set<TemplateId>(LEGACY_PRESENTATION_TEMPLATE_IDS);

export const PRESENTATION_TEMPLATE_AUDIT = {
  production: PRODUCTION_PRESENTATION_TEMPLATE_IDS,
  legacy: LEGACY_PRESENTATION_TEMPLATE_IDS,
} as const;

export type LegacyPresentationTemplateAuditDecision = 'convert later' | 'archive later' | 'delete later';

export interface LegacyPresentationTemplateAuditEntry {
  templateId: LegacyPresentationTemplateId;
  productionReplacement: ProductionPresentationTemplateId;
  chunkSizeNote: string;
  decision: LegacyPresentationTemplateAuditDecision;
}

const LEGACY_TEMPLATE_CHUNK_SIZE_NOTES: Partial<Record<LegacyPresentationTemplateId, string>> = {
  'sidebar-cards': '47.59 kB before gzip in the latest recorded Vite snapshot.',
  corporate: '47.40 kB before gzip in the latest recorded Vite snapshot.',
  'multi-panel-dashboard': '46.43 kB before gzip in the latest recorded Vite snapshot.',
  educational: '40.96 kB before gzip in the latest recorded Vite snapshot.',
  'landscape-illustration': '37.44 kB before gzip in the latest recorded Vite snapshot.',
  keynote: '35.05 kB before gzip in the latest recorded Vite snapshot.',
  'infographic-grid': '34.69 kB before gzip in the latest recorded Vite snapshot.',
  'product-demo': '30.16 kB before gzip in the latest recorded Vite snapshot.',
};

const LEGACY_TEMPLATE_AUDIT_DECISIONS: Record<
  LegacyPresentationTemplateId,
  LegacyPresentationTemplateAuditDecision
> = {
  keynote: 'convert later',
  corporate: 'convert later',
  'tech-architecture': 'archive later',
  'data-dashboard': 'archive later',
  'sci-fi': 'archive later',
  'creative-portfolio': 'archive later',
  storytelling: 'archive later',
  educational: 'convert later',
  cinematic: 'archive later',
  workshop: 'archive later',
  'code-walkthrough': 'archive later',
  'product-demo': 'convert later',
  timeline: 'archive later',
  'editorial-magazine': 'archive later',
  'infographic-grid': 'convert later',
  'landscape-illustration': 'convert later',
  'multi-panel-dashboard': 'convert later',
  'sidebar-cards': 'convert later',
};

export function isProductionPresentationTemplate(
  templateId: TemplateId,
): templateId is ProductionPresentationTemplateId {
  return PRODUCTION_PRESENTATION_TEMPLATE_SET.has(templateId);
}

export function isLegacyPresentationTemplate(
  templateId: TemplateId,
): templateId is LegacyPresentationTemplateId {
  return LEGACY_PRESENTATION_TEMPLATE_SET.has(templateId);
}

export function toProductionPresentationTemplate(templateId: TemplateId): ProductionPresentationTemplateId {
  if (isProductionPresentationTemplate(templateId)) return templateId;

  switch (templateId) {
    case 'keynote':
    case 'product-demo':
    case 'creative-portfolio':
    case 'cinematic':
      return 'launch-narrative-light';
    case 'corporate':
    case 'sidebar-cards':
      return 'executive-briefing-light';
    case 'data-dashboard':
    case 'infographic-grid':
    case 'multi-panel-dashboard':
      return 'finance-grid-light';
    case 'sci-fi':
      return 'split-world';
    case 'timeline':
    case 'workshop':
    case 'educational':
    case 'tech-architecture':
      return 'stage-setting-light';
    case 'editorial-magazine':
    case 'storytelling':
    case 'landscape-illustration':
    default:
      return 'editorial-light';
  }
}

export function listLegacyPresentationTemplateAudit(): LegacyPresentationTemplateAuditEntry[] {
  return LEGACY_PRESENTATION_TEMPLATE_IDS.map((templateId) => ({
    templateId,
    productionReplacement: toProductionPresentationTemplate(templateId),
    chunkSizeNote: LEGACY_TEMPLATE_CHUNK_SIZE_NOTES[templateId] ?? 'Not singled out in the latest recorded Vite snapshot.',
    decision: LEGACY_TEMPLATE_AUDIT_DECISIONS[templateId],
  }));
}

export interface TemplateEntry {
  id: TemplateId;
  htmlPath: string;
  animationLevel: 1 | 2 | 3 | 4;
  description: string;
  bestFor: string[];
  slideCount: { min: number; max: number };
}

const TEMPLATE_HTML_PATHS: Record<TemplateId, string> = {
  'editorial-light': './html/editorial-light.html',
  'finance-grid-light': './html/finance-grid-light.html',
  'stage-setting-light': './html/stage-setting-light.html',
  'executive-briefing-light': './html/executive-briefing-light.html',
  'launch-narrative-light': './html/launch-narrative-light.html',
  keynote: './html/keynote.html',
  corporate: './html/corporate.html',
  'tech-architecture': './html/tech-architecture.html',
  'data-dashboard': './html/data-dashboard.html',
  'sci-fi': './html/sci-fi.html',
  'creative-portfolio': './html/creative-portfolio.html',
  storytelling: './html/storytelling.html',
  educational: './html/educational.html',
  cinematic: './html/cinematic.html',
  workshop: './html/workshop.html',
  'code-walkthrough': './html/code-walkthrough.html',
  'product-demo': './html/product-demo.html',
  timeline: './html/timeline.html',
  'editorial-magazine': './html/editorial-magazine.html',
  'infographic-grid': './html/infographic-grid.html',
  'interactive-quiz': './html/interactive-quiz.html',
  'split-world': './html/split-world.html',
  'landscape-illustration': './html/landscape-illustration.html',
  'multi-panel-dashboard': './html/multi-panel-dashboard.html',
  'sidebar-cards': './html/sidebar-cards.html',
};

export const TEMPLATE_REGISTRY: Record<TemplateId, TemplateEntry> = {
  'editorial-light': {
    id: 'editorial-light',
    htmlPath: TEMPLATE_HTML_PATHS['editorial-light'],
    animationLevel: 2,
    description: 'Light editorial presentation with refined typography, asymmetry, and premium business polish',
    bestFor: ['executive brief', 'board narrative', 'editorial explainer'],
    slideCount: { min: 6, max: 12 },
  },
  'finance-grid-light': {
    id: 'finance-grid-light',
    htmlPath: TEMPLATE_HTML_PATHS['finance-grid-light'],
    animationLevel: 3,
    description: 'Light finance and infographic grid for mechanisms, scorecards, and structured storytelling',
    bestFor: ['finance mechanism', 'scorecard', 'infographic', 'strategy model'],
    slideCount: { min: 5, max: 10 },
  },
  'stage-setting-light': {
    id: 'stage-setting-light',
    htmlPath: TEMPLATE_HTML_PATHS['stage-setting-light'],
    animationLevel: 2,
    description: 'Context-setting slide system with scene panel, KPI rail, and editorial insight stack',
    bestFor: ['setting the stage', 'context slide', 'problem framing'],
    slideCount: { min: 4, max: 8 },
  },
  'executive-briefing-light': {
    id: 'executive-briefing-light',
    htmlPath: TEMPLATE_HTML_PATHS['executive-briefing-light'],
    animationLevel: 2,
    description: 'Premium light executive briefing system with large readable type, decision modules, and subtle diagram motion',
    bestFor: ['executive briefing', 'leadership review', 'board narrative', 'starter deck'],
    slideCount: { min: 4, max: 8 },
  },
  'launch-narrative-light': {
    id: 'launch-narrative-light',
    htmlPath: TEMPLATE_HTML_PATHS['launch-narrative-light'],
    animationLevel: 3,
    description: 'Energetic launch narrative deck with split-scene title, readiness modules, and bounded motion',
    bestFor: ['launch plan', 'pitch opening', 'go-to-market', 'starter deck'],
    slideCount: { min: 4, max: 8 },
  },
  keynote: {
    id: 'keynote',
    htmlPath: TEMPLATE_HTML_PATHS.keynote,
    animationLevel: 4,
    description: 'High-impact keynote for product launches and conferences',
    bestFor: ['product launch', 'conference talk', 'announcement'],
    slideCount: { min: 8, max: 12 },
  },
  corporate: {
    id: 'corporate',
    htmlPath: TEMPLATE_HTML_PATHS.corporate,
    animationLevel: 2,
    description: 'Clean professional presentation for board meetings and business updates',
    bestFor: ['board meeting', 'quarterly review', 'business update'],
    slideCount: { min: 8, max: 15 },
  },
  'tech-architecture': {
    id: 'tech-architecture',
    htmlPath: TEMPLATE_HTML_PATHS['tech-architecture'],
    animationLevel: 3,
    description: 'Modern tech presentation for architecture reviews and engineering talks',
    bestFor: ['system design', 'architecture review', 'tech talk'],
    slideCount: { min: 8, max: 12 },
  },
  'data-dashboard': {
    id: 'data-dashboard',
    htmlPath: TEMPLATE_HTML_PATHS['data-dashboard'],
    animationLevel: 3,
    description: 'Data-driven dashboard for analytics reviews and KPI reports',
    bestFor: ['analytics review', 'KPI report', 'data presentation'],
    slideCount: { min: 8, max: 12 },
  },
  'sci-fi': {
    id: 'sci-fi',
    htmlPath: TEMPLATE_HTML_PATHS['sci-fi'],
    animationLevel: 4,
    description: 'Futuristic sci-fi theme for AI, cybersecurity, and space topics',
    bestFor: ['AI presentation', 'cybersecurity', 'futurism'],
    slideCount: { min: 6, max: 10 },
  },
  'creative-portfolio': {
    id: 'creative-portfolio',
    htmlPath: TEMPLATE_HTML_PATHS['creative-portfolio'],
    animationLevel: 3,
    description: 'Vibrant creative showcase for portfolios and design presentations',
    bestFor: ['portfolio', 'design showcase', 'creative work'],
    slideCount: { min: 8, max: 12 },
  },
  storytelling: {
    id: 'storytelling',
    htmlPath: TEMPLATE_HTML_PATHS.storytelling,
    animationLevel: 3,
    description: 'Elegant storytelling format for case studies and narratives',
    bestFor: ['case study', 'narrative', 'brand story'],
    slideCount: { min: 8, max: 12 },
  },
  educational: {
    id: 'educational',
    htmlPath: TEMPLATE_HTML_PATHS.educational,
    animationLevel: 2,
    description: 'Teaching and training format for lectures and workshops',
    bestFor: ['lecture', 'training', 'educational'],
    slideCount: { min: 8, max: 15 },
  },
  cinematic: {
    id: 'cinematic',
    htmlPath: TEMPLATE_HTML_PATHS.cinematic,
    animationLevel: 4,
    description: 'Cinematic presentation for photography, art, and high-impact storytelling',
    bestFor: ['photography', 'art', 'cinematic storytelling'],
    slideCount: { min: 6, max: 10 },
  },
  workshop: {
    id: 'workshop',
    htmlPath: TEMPLATE_HTML_PATHS.workshop,
    animationLevel: 2,
    description: 'Interactive workshop format with exercises and timing',
    bestFor: ['workshop', 'interactive training', 'hands-on session'],
    slideCount: { min: 8, max: 15 },
  },
  'code-walkthrough': {
    id: 'code-walkthrough',
    htmlPath: TEMPLATE_HTML_PATHS['code-walkthrough'],
    animationLevel: 3,
    description: 'Developer-focused code walkthrough with syntax highlighting',
    bestFor: ['code review', 'developer talk', 'API walkthrough'],
    slideCount: { min: 8, max: 12 },
  },
  'product-demo': {
    id: 'product-demo',
    htmlPath: TEMPLATE_HTML_PATHS['product-demo'],
    animationLevel: 3,
    description: 'Product demonstration with feature highlights and comparisons',
    bestFor: ['product demo', 'SaaS demo', 'feature showcase'],
    slideCount: { min: 10, max: 15 },
  },
  timeline: {
    id: 'timeline',
    htmlPath: TEMPLATE_HTML_PATHS.timeline,
    animationLevel: 3,
    description: 'Timeline-focused presentation for roadmaps and histories',
    bestFor: ['roadmap', 'project timeline', 'history'],
    slideCount: { min: 8, max: 12 },
  },
  'editorial-magazine': {
    id: 'editorial-magazine',
    htmlPath: TEMPLATE_HTML_PATHS['editorial-magazine'],
    animationLevel: 2,
    description: 'Magazine-style editorial with serif typography and asymmetric layouts',
    bestFor: ['editorial', 'magazine', 'long-form article', 'thought leadership'],
    slideCount: { min: 6, max: 10 },
  },
  'infographic-grid': {
    id: 'infographic-grid',
    htmlPath: TEMPLATE_HTML_PATHS['infographic-grid'],
    animationLevel: 3,
    description: 'Data-rich infographic with SVG visualizations in grid cells',
    bestFor: ['infographic', 'data report', 'statistics overview', 'research findings'],
    slideCount: { min: 5, max: 8 },
  },
  'interactive-quiz': {
    id: 'interactive-quiz',
    htmlPath: TEMPLATE_HTML_PATHS['interactive-quiz'],
    animationLevel: 3,
    description: 'Game-show style quiz with multiple-choice cards and score reveals',
    bestFor: ['quiz', 'trivia', 'knowledge check', 'interactive learning'],
    slideCount: { min: 6, max: 12 },
  },
  'split-world': {
    id: 'split-world',
    htmlPath: TEMPLATE_HTML_PATHS['split-world'],
    animationLevel: 3,
    description: 'Dual-world split screen comparing contrasting concepts',
    bestFor: ['comparison', 'before and after', 'problem vs solution', 'dual perspective'],
    slideCount: { min: 5, max: 8 },
  },
  'landscape-illustration': {
    id: 'landscape-illustration',
    htmlPath: TEMPLATE_HTML_PATHS['landscape-illustration'],
    animationLevel: 4,
    description: 'Illustrated SVG landscape scenes with animated backgrounds',
    bestFor: ['nature', 'environmental', 'immersive storytelling', 'visual journey'],
    slideCount: { min: 5, max: 8 },
  },
  'multi-panel-dashboard': {
    id: 'multi-panel-dashboard',
    htmlPath: TEMPLATE_HTML_PATHS['multi-panel-dashboard'],
    animationLevel: 2,
    description: 'Multi-column panel dashboard with category color coding',
    bestFor: ['dashboard overview', 'multi-category report', 'admin panel', 'status board'],
    slideCount: { min: 6, max: 10 },
  },
  'sidebar-cards': {
    id: 'sidebar-cards',
    htmlPath: TEMPLATE_HTML_PATHS['sidebar-cards'],
    animationLevel: 2,
    description: 'Luxury sidebar navigation with card content grid',
    bestFor: ['portfolio', 'agency', 'premium brand', 'service showcase'],
    slideCount: { min: 6, max: 10 },
  },
};

const templateHtmlCache = new Map<TemplateId, string>();

export async function getTemplateHtml(id: TemplateId): Promise<string> {
  const cached = templateHtmlCache.get(id);
  if (cached) return cached;

  const htmlPath = TEMPLATE_REGISTRY[id]?.htmlPath;
  const loader = htmlPath ? TEMPLATE_HTML_MODULES[htmlPath] : undefined;

  if (!loader) {
    if (id !== 'keynote') return getTemplateHtml('keynote');
    throw new Error(`Missing template HTML loader for ${id}`);
  }

  try {
    const html = (await loader()) as string;
    templateHtmlCache.set(id, html);
    return html;
  } catch (error) {
    if (id !== 'keynote') return getTemplateHtml('keynote');
    throw error instanceof Error
      ? error
      : new Error(`Failed to load template HTML for ${id}`);
  }
}

export function getTemplateEntry(id: TemplateId): TemplateEntry {
  return TEMPLATE_REGISTRY[id];
}
