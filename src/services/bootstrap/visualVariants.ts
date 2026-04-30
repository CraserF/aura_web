import type { ColorTheme } from '@/types/project';
import type { ArtifactDesignDirectionId } from '@/services/artifactPacks/types';

export type VisualVariantId =
  | 'executive'
  | 'launch'
  | 'editorial'
  | 'research'
  | 'teaching';

export interface VisualVariant {
  id: VisualVariantId;
  label: string;
  artifactDesignDirectionId: ArtifactDesignDirectionId;
  shortDescription: string;
  palette: ColorTheme;
  promptTraits: string[];
  avoidTraits: string[];
  layoutFamilies: string[];
}

export const DEFAULT_VISUAL_VARIANT_ID: VisualVariantId = 'executive';

const VISUAL_VARIANTS: VisualVariant[] = [
  {
    id: 'executive',
    label: 'Executive',
    artifactDesignDirectionId: 'modern-minimal',
    shortDescription: 'Board updates, leadership briefings, strategy memos.',
    palette: { background: '#ffffff', primary: '#1a1a2e', accent: '#2563eb' },
    promptTraits: [
      'clear hierarchy',
      'confident typography',
      'sparse decoration',
      'large statement slides',
      'strong summary sections',
      'excellent tables and comparisons',
    ],
    avoidTraits: ['heavy decoration', 'complex animations', 'playful typography', 'busy backgrounds'],
    layoutFamilies: ['title-summary', 'key-metrics', 'comparison', 'recommendation', 'next-steps'],
  },
  {
    id: 'launch',
    label: 'Launch',
    artifactDesignDirectionId: 'bold-editorial',
    shortDescription: 'Product launches, go-to-market plans, pitch narratives.',
    palette: { background: '#0f0f1a', primary: '#ffffff', accent: '#f59e0b' },
    promptTraits: [
      'energetic composition',
      'bold section breaks',
      'strong contrast',
      'product and audience framing',
      'roadmap and milestone layouts',
    ],
    avoidTraits: ['muted palette', 'dense prose', 'static layouts', 'corporate grey'],
    layoutFamilies: ['hero', 'timeline', 'campaign-grid', 'audience-problem-solution', 'roadmap'],
  },
  {
    id: 'editorial',
    label: 'Editorial',
    artifactDesignDirectionId: 'editorial-magazine',
    shortDescription: 'Essays, brand narratives, thought leadership, visual storytelling.',
    palette: { background: '#faf9f6', primary: '#1c1c1c', accent: '#c0392b' },
    promptTraits: [
      'magazine-like rhythm',
      'big headlines',
      'pull quotes',
      'alternating dense and quiet sections',
      'strong image and illustration slots',
    ],
    avoidTraits: ['corporate clip art', 'uniform layouts', 'heavy data tables', 'small typography'],
    layoutFamilies: ['cover', 'chapter-opener', 'pull-quote', 'feature-story', 'closing'],
  },
  {
    id: 'research',
    label: 'Research',
    artifactDesignDirectionId: 'data-utility',
    shortDescription: 'Analysis, insights, evidence reviews, technical summaries.',
    palette: { background: '#f8fafc', primary: '#1e3a5f', accent: '#0891b2' },
    promptTraits: [
      'dense but clean',
      'strong evidence hierarchy',
      'tables and matrices',
      'clear methodology sections',
      'careful source and caveat treatment',
    ],
    avoidTraits: ['decorative elements', 'emotional language', 'vague claims', 'heavy animation'],
    layoutFamilies: ['findings-summary', 'comparison', 'evidence-grid', 'insight-card', 'methodology'],
  },
  {
    id: 'teaching',
    label: 'Teaching',
    artifactDesignDirectionId: 'warm-narrative',
    shortDescription: 'Training, workshops, explainers, lessons, onboarding.',
    palette: { background: '#ffffff', primary: '#1e293b', accent: '#7c3aed' },
    promptTraits: [
      'step-by-step explanations',
      'examples and exercises',
      'concept cards',
      'recaps and checks for understanding',
      'friendly but polished',
    ],
    avoidTraits: ['dense prose blocks', 'jargon without explanation', 'no visual hierarchy', 'monotone layouts'],
    layoutFamilies: ['concept-intro', 'step-by-step', 'diagram', 'activity', 'recap-quiz'],
  },
];

export function listVisualVariants(): VisualVariant[] {
  return VISUAL_VARIANTS.map((variant) => ({
    ...variant,
    palette: { ...variant.palette },
    promptTraits: [...variant.promptTraits],
    avoidTraits: [...variant.avoidTraits],
    layoutFamilies: [...variant.layoutFamilies],
  }));
}

export function getVisualVariant(id: string): VisualVariant | undefined {
  return VISUAL_VARIANTS.find((v) => v.id === id);
}

export function buildVariantRulesBlock(variant: VisualVariant, colorTheme: ColorTheme): string {
  return [
    `## Visual Direction: ${variant.label}`,
    '',
    `Design direction: ${variant.artifactDesignDirectionId}`,
    '',
    `${variant.shortDescription}`,
    '',
    `Design traits: ${variant.promptTraits.join(', ')}.`,
    `Avoid: ${variant.avoidTraits.join(', ')}.`,
    `Preferred layouts: ${variant.layoutFamilies.join(', ')}.`,
    '',
    `Color palette - background: ${colorTheme.background}; primary: ${colorTheme.primary}; accent: ${colorTheme.accent}.`,
  ].join('\n');
}
