import keynoteHtml from './html/keynote.html?raw';
import corporateHtml from './html/corporate.html?raw';
import techArchitectureHtml from './html/tech-architecture.html?raw';
import dataDashboardHtml from './html/data-dashboard.html?raw';
import sciFiHtml from './html/sci-fi.html?raw';
import creativePortfolioHtml from './html/creative-portfolio.html?raw';
import storytellingHtml from './html/storytelling.html?raw';
import educationalHtml from './html/educational.html?raw';
import minimalHtml from './html/minimal.html?raw';
import cinematicHtml from './html/cinematic.html?raw';
import pitchDeckHtml from './html/pitch-deck.html?raw';
import workshopHtml from './html/workshop.html?raw';
import codeWalkthroughHtml from './html/code-walkthrough.html?raw';
import productDemoHtml from './html/product-demo.html?raw';
import comparisonHtml from './html/comparison.html?raw';
import timelineHtml from './html/timeline.html?raw';

export type TemplateId =
  | 'keynote' | 'corporate' | 'tech-architecture' | 'data-dashboard'
  | 'sci-fi' | 'creative-portfolio' | 'storytelling' | 'educational'
  | 'minimal' | 'cinematic' | 'pitch-deck' | 'workshop'
  | 'code-walkthrough' | 'product-demo' | 'comparison' | 'timeline';

export interface TemplateEntry {
  id: TemplateId;
  html: string;
  animationLevel: 1 | 2 | 3 | 4;
  description: string;
  bestFor: string[];
  slideCount: { min: number; max: number };
}

export const TEMPLATE_REGISTRY: Record<TemplateId, TemplateEntry> = {
  keynote: {
    id: 'keynote',
    html: keynoteHtml,
    animationLevel: 4,
    description: 'High-impact keynote for product launches and conferences',
    bestFor: ['product launch', 'conference talk', 'announcement'],
    slideCount: { min: 8, max: 12 },
  },
  corporate: {
    id: 'corporate',
    html: corporateHtml,
    animationLevel: 2,
    description: 'Clean professional presentation for board meetings and business updates',
    bestFor: ['board meeting', 'quarterly review', 'business update'],
    slideCount: { min: 8, max: 15 },
  },
  'tech-architecture': {
    id: 'tech-architecture',
    html: techArchitectureHtml,
    animationLevel: 3,
    description: 'Modern tech presentation for architecture reviews and engineering talks',
    bestFor: ['system design', 'architecture review', 'tech talk'],
    slideCount: { min: 8, max: 12 },
  },
  'data-dashboard': {
    id: 'data-dashboard',
    html: dataDashboardHtml,
    animationLevel: 3,
    description: 'Data-driven dashboard for analytics reviews and KPI reports',
    bestFor: ['analytics review', 'KPI report', 'data presentation'],
    slideCount: { min: 8, max: 12 },
  },
  'sci-fi': {
    id: 'sci-fi',
    html: sciFiHtml,
    animationLevel: 4,
    description: 'Futuristic sci-fi theme for AI, cybersecurity, and space topics',
    bestFor: ['AI presentation', 'cybersecurity', 'futurism'],
    slideCount: { min: 6, max: 10 },
  },
  'creative-portfolio': {
    id: 'creative-portfolio',
    html: creativePortfolioHtml,
    animationLevel: 3,
    description: 'Vibrant creative showcase for portfolios and design presentations',
    bestFor: ['portfolio', 'design showcase', 'creative work'],
    slideCount: { min: 8, max: 12 },
  },
  storytelling: {
    id: 'storytelling',
    html: storytellingHtml,
    animationLevel: 3,
    description: 'Elegant storytelling format for case studies and narratives',
    bestFor: ['case study', 'narrative', 'brand story'],
    slideCount: { min: 8, max: 12 },
  },
  educational: {
    id: 'educational',
    html: educationalHtml,
    animationLevel: 2,
    description: 'Teaching and training format for lectures and workshops',
    bestFor: ['lecture', 'training', 'educational'],
    slideCount: { min: 8, max: 15 },
  },
  minimal: {
    id: 'minimal',
    html: minimalHtml,
    animationLevel: 1,
    description: 'Ultra-clean minimal design for quick updates and simple briefs',
    bestFor: ['quick update', 'brief', 'summary'],
    slideCount: { min: 5, max: 8 },
  },
  cinematic: {
    id: 'cinematic',
    html: cinematicHtml,
    animationLevel: 4,
    description: 'Cinematic presentation for photography, art, and high-impact storytelling',
    bestFor: ['photography', 'art', 'cinematic storytelling'],
    slideCount: { min: 6, max: 10 },
  },
  'pitch-deck': {
    id: 'pitch-deck',
    html: pitchDeckHtml,
    animationLevel: 3,
    description: 'Investor pitch deck with compelling metrics and clear narrative',
    bestFor: ['investor pitch', 'startup', 'fundraising'],
    slideCount: { min: 10, max: 15 },
  },
  workshop: {
    id: 'workshop',
    html: workshopHtml,
    animationLevel: 2,
    description: 'Interactive workshop format with exercises and timing',
    bestFor: ['workshop', 'interactive training', 'hands-on session'],
    slideCount: { min: 8, max: 15 },
  },
  'code-walkthrough': {
    id: 'code-walkthrough',
    html: codeWalkthroughHtml,
    animationLevel: 3,
    description: 'Developer-focused code walkthrough with syntax highlighting',
    bestFor: ['code review', 'developer talk', 'API walkthrough'],
    slideCount: { min: 8, max: 12 },
  },
  'product-demo': {
    id: 'product-demo',
    html: productDemoHtml,
    animationLevel: 3,
    description: 'Product demonstration with feature highlights and comparisons',
    bestFor: ['product demo', 'SaaS demo', 'feature showcase'],
    slideCount: { min: 10, max: 15 },
  },
  comparison: {
    id: 'comparison',
    html: comparisonHtml,
    animationLevel: 2,
    description: 'Side-by-side comparison format for evaluating options',
    bestFor: ['comparison', 'evaluation', 'A vs B analysis'],
    slideCount: { min: 8, max: 12 },
  },
  timeline: {
    id: 'timeline',
    html: timelineHtml,
    animationLevel: 3,
    description: 'Timeline-focused presentation for roadmaps and histories',
    bestFor: ['roadmap', 'project timeline', 'history'],
    slideCount: { min: 8, max: 12 },
  },
};

export function getTemplateHtml(id: TemplateId): string {
  return TEMPLATE_REGISTRY[id].html;
}

export function getTemplateEntry(id: TemplateId): TemplateEntry {
  return TEMPLATE_REGISTRY[id];
}
