import type { DocumentType } from '@/types/project';
import type { ReferenceStylePackId } from './reference-style-packs';

export type ReferenceQualitySourceKind =
  | 'starter-kit'
  | 'production-presentation-template'
  | 'document-blueprint'
  | 'synthetic-example'
  | 'example-document';

export interface ReferenceQualityProfile {
  id: ReferenceStylePackId;
  artifactType: DocumentType;
  label: string;
  sourceKinds: ReferenceQualitySourceKind[];
  sourceNotes: string[];
  rhythm: string[];
  density: string[];
  moduleGrammar: string[];
  layoutVariety: string[];
  typographyScale: string[];
  componentFamilies: string[];
  antiPatterns: string[];
  comparisonSignals: string[];
  confidentialityRules: string[];
}

const PRESENTATION_SOURCE_NOTES = [
  'Normalized from curated starter decks, production presentation template metadata, and sanitized synthetic examples.',
  'Stores rhythm, density, layout, and component traits only.',
];

const DOCUMENT_SOURCE_NOTES = [
  'Normalized from document starter kits, document blueprints, and sanitized example-document traits.',
  'Stores module grammar, reading rhythm, density, and component families only.',
];

const REFERENCE_QUALITY_PROFILES: Record<ReferenceStylePackId, ReferenceQualityProfile> = {
  'presentation-title-polished': {
    id: 'presentation-title-polished',
    artifactType: 'presentation',
    label: 'Polished Split Title',
    sourceKinds: ['production-presentation-template', 'synthetic-example'],
    sourceNotes: PRESENTATION_SOURCE_NOTES,
    rhythm: [
      'one full-canvas opening scene',
      'compact support row after the title lockup',
      'visual anchor established before any dense content',
    ],
    density: [
      'very low prose density',
      'one primary headline and one short support statement',
      'no more than two secondary signal groups',
    ],
    moduleGrammar: [
      'hero lockup',
      'dual-field backdrop',
      'small signal pills or labels',
    ],
    layoutVariety: [
      'split field or two-domain background',
      'centered title lockup',
      'symmetrical support rhythm',
    ],
    typographyScale: [
      'cover title dominates the slide',
      'eyebrow and support labels remain readable after stage scaling',
      'short line lengths for title and subtitle',
    ],
    componentFamilies: [
      'title scene',
      'support pills',
      'background system',
      'connector motif',
    ],
    antiPatterns: [
      'dashboard grids on the opening slide',
      'long subtitle paragraphs',
      'unrelated decorative systems competing with the title',
    ],
    comparisonSignals: [
      'strong first-frame thesis',
      'clear motif that can carry into later slides',
      'support content stays subordinate to the title',
    ],
    confidentialityRules: [
      'Use generic labels and synthetic framing only.',
      'Do not copy names, dates, metrics, or source markup from references.',
    ],
  },
  'presentation-executive-starter': {
    id: 'presentation-executive-starter',
    artifactType: 'presentation',
    label: 'Executive Starter Deck',
    sourceKinds: ['starter-kit', 'production-presentation-template', 'synthetic-example'],
    sourceNotes: PRESENTATION_SOURCE_NOTES,
    rhythm: [
      'opening thesis to evidence to decision/action flow',
      'signal strip or metric row every one to two slides',
      'clear closing action rather than a generic recap',
    ],
    density: [
      'leadership-readable density with one to three major zones per slide',
      'large metrics or recommendations supported by compact interpretation',
      'short paragraphs and strong visual grouping',
    ],
    moduleGrammar: [
      'decision summary',
      'evidence strip',
      'metric row',
      'recommendation cards',
      'next-step module',
    ],
    layoutVariety: [
      'cover signal stack',
      'scene plus insight layout',
      'asymmetric evidence grid',
      'numbered action layout',
    ],
    typographyScale: [
      'large cover titles',
      'readable leadership labels',
      'metrics sized as focal objects, not captions',
    ],
    componentFamilies: [
      'signal stack',
      'insight cards',
      'metric row',
      'recommendation block',
      'action steps',
    ],
    antiPatterns: [
      'generic office-deck card walls',
      'many equal-weight metrics without interpretation',
      'tiny leadership metadata',
    ],
    comparisonSignals: [
      'decision, evidence, and action are visible in the slide sequence',
      'component grammar repeats without becoming identical',
      'executive summary density stays high signal',
    ],
    confidentialityRules: [
      'Use synthetic priorities, roles, and metrics only.',
      'Do not copy organizations, presenter details, dates, or amounts.',
    ],
  },
  'presentation-launch-narrative': {
    id: 'presentation-launch-narrative',
    artifactType: 'presentation',
    label: 'Launch Narrative',
    sourceKinds: ['starter-kit', 'production-presentation-template', 'synthetic-example'],
    sourceNotes: PRESENTATION_SOURCE_NOTES,
    rhythm: [
      'energetic opening to proof to readiness to action',
      'path or progress motif returns across the deck',
      'each slide moves the launch story forward',
    ],
    density: [
      'moderate density with concise launch copy',
      'proof points and readiness steps stay short',
      'visual energy comes from structure rather than extra text',
    ],
    moduleGrammar: [
      'split-scene title',
      'launch thesis',
      'proof cards',
      'readiness path',
      'action cards',
    ],
    layoutVariety: [
      'opening scene',
      'thesis plus proof layout',
      'pathway or step layout',
      'final action layout',
    ],
    typographyScale: [
      'high-impact opening title',
      'short support copy',
      'large numbered readiness labels',
    ],
    componentFamilies: [
      'launch chips',
      'proof cards',
      'readiness steps',
      'pathway motif',
      'action cards',
    ],
    antiPatterns: [
      'dense pitch-deck bullet slides',
      'unbounded celebratory decoration',
      'copy-heavy readiness plans',
    ],
    comparisonSignals: [
      'audience, offer, proof, readiness, and action are all legible',
      'path motif creates continuity',
      'opening scene feels premium without clutter',
    ],
    confidentialityRules: [
      'Use generic audience and launch language only.',
      'Do not copy brands, campaign names, locations, dates, or financial details.',
    ],
  },
  'presentation-stage-setting': {
    id: 'presentation-stage-setting',
    artifactType: 'presentation',
    label: 'Stage-Setting Editorial',
    sourceKinds: ['production-presentation-template', 'synthetic-example'],
    sourceNotes: PRESENTATION_SOURCE_NOTES,
    rhythm: [
      'context first, then supporting signals',
      'one contextual visual anchors the slide',
      'insight stack provides the reading order',
    ],
    density: [
      'moderate editorial density',
      'few signals with clear interpretation',
      'compact support copy around one visual scene',
    ],
    moduleGrammar: [
      'context title rail',
      'scene panel',
      'KPI strip',
      'parallel insight stack',
    ],
    layoutVariety: [
      'two-zone context layout',
      'visual plus notes layout',
      'top rail with supporting stack',
    ],
    typographyScale: [
      'strong contextual headline',
      'small labels remain readable',
      'support copy is concise and parallel',
    ],
    componentFamilies: [
      'scene panel',
      'insight cards',
      'KPI rail',
      'context header',
    ],
    antiPatterns: [
      'dashboard clutter on context slides',
      'too many unranked bullets',
      'dark dense panels when a light editorial frame is enough',
    ],
    comparisonSignals: [
      'slide establishes why the topic matters before details',
      'scene and insight stack work together',
      'contextual metrics stay supportive',
    ],
    confidentialityRules: [
      'Use synthetic framing labels and generic indicators only.',
      'Do not copy sector claims, amounts, or regional references.',
    ],
  },
  'presentation-editorial-light': {
    id: 'presentation-editorial-light',
    artifactType: 'presentation',
    label: 'Editorial Light',
    sourceKinds: ['production-presentation-template', 'synthetic-example'],
    sourceNotes: PRESENTATION_SOURCE_NOTES,
    rhythm: [
      'editorial headline to mechanism to implication flow',
      'asymmetric spreads alternate with full-width emphasis strips',
      'visual explanation is embedded inside the reading path',
    ],
    density: [
      'medium editorial density',
      'short narrative blocks with one focal mechanism',
      'labels and dividers create scan rhythm',
    ],
    moduleGrammar: [
      'editorial rail',
      'mechanism card',
      'metric strip',
      'inline diagram',
      'implication callout',
    ],
    layoutVariety: [
      'asymmetric two-column layout',
      'full-width strip',
      'mechanism card stack',
      'editorial spread',
    ],
    typographyScale: [
      'headline has editorial contrast',
      'body copy remains presentation-readable',
      'labels use restraint rather than decorative size',
    ],
    componentFamilies: [
      'editorial rail',
      'mechanism cards',
      'inline diagrams',
      'metric strips',
      'callouts',
    ],
    antiPatterns: [
      'equal KPI walls',
      'generic icon and text blocks',
      'detached diagrams that do not explain the copy',
    ],
    comparisonSignals: [
      'slide reads like a designed editorial spread',
      'diagram logic is integrated with text',
      'layout varies while preserving the same editorial system',
    ],
    confidentialityRules: [
      'Use synthetic labels, values, and category names.',
      'Do not copy case narratives, entity names, or mechanisms from references.',
    ],
  },
  'presentation-finance-grid-light': {
    id: 'presentation-finance-grid-light',
    artifactType: 'presentation',
    label: 'Finance Grid Light',
    sourceKinds: ['production-presentation-template', 'synthetic-example'],
    sourceNotes: PRESENTATION_SOURCE_NOTES,
    rhythm: [
      'header rail to asymmetric grid to summary strip',
      'mechanism explanation alternates with metric emphasis',
      'hierarchy builds from cards to stack or strip',
    ],
    density: [
      'high information density with disciplined grouping',
      'one focal metric or mechanism per card',
      'summary strip carries interpretation',
    ],
    moduleGrammar: [
      'finance rail',
      'mechanism card',
      'big-number card',
      'tapered stack',
      'summary strip',
    ],
    layoutVariety: [
      'asymmetric infographic grid',
      'embedded mechanism diagram',
      'tiered stack',
      'full-width interpretation band',
    ],
    typographyScale: [
      'metric numbers can be dominant',
      'metadata stays small but readable',
      'card headings are compact and clear',
    ],
    componentFamilies: [
      'mechanism cards',
      'metric cards',
      'accent edges',
      'diagram strokes',
      'summary strips',
    ],
    antiPatterns: [
      'rainbow dashboards',
      'financial walls of tiny figures',
      'cards without explanation or visual mechanism',
    ],
    comparisonSignals: [
      'finance or data story remains readable and crafted',
      'visual hierarchy explains what matters first',
      'cards vary by role rather than repeating one tile pattern',
    ],
    confidentialityRules: [
      'Use synthetic metrics and mechanism labels.',
      'Do not copy capital structures, locations, years, or real amounts.',
    ],
  },
  'presentation-quiz-show': {
    id: 'presentation-quiz-show',
    artifactType: 'presentation',
    label: 'Quiz Show',
    sourceKinds: ['synthetic-example'],
    sourceNotes: PRESENTATION_SOURCE_NOTES,
    rhythm: [
      'prompt setup to reveal-ready focal moment',
      'single interactive beat rather than dense explanation',
      'playful interstitial pacing',
    ],
    density: [
      'very low copy density',
      'one prompt and one short support line',
      'visual energy concentrated around the focal device',
    ],
    moduleGrammar: [
      'central prompt',
      'focal object',
      'support symbols',
      'answer or reveal zone',
    ],
    layoutVariety: [
      'centered stage layout',
      'radial support accents',
      'single-object emphasis',
    ],
    typographyScale: [
      'large question headline',
      'short answer labels',
      'support copy remains secondary',
    ],
    componentFamilies: [
      'prompt lockup',
      'focal device',
      'support rings',
      'answer chips',
    ],
    antiPatterns: [
      'busy game-show collage',
      'many tiny answer cards',
      'brand-specific entertainment references',
    ],
    comparisonSignals: [
      'slide feels playful but bounded',
      'prompt is immediately readable',
      'one focal object owns the stage',
    ],
    confidentialityRules: [
      'Use generic quiz language only.',
      'Do not copy external brand or proprietary game framing.',
    ],
  },
  'document-professional-light': {
    id: 'document-professional-light',
    artifactType: 'document',
    label: 'Professional Light Document',
    sourceKinds: ['starter-kit', 'document-blueprint', 'synthetic-example', 'example-document'],
    sourceNotes: DOCUMENT_SOURCE_NOTES,
    rhythm: [
      'hero summary first, then structured evidence and recommendation modules',
      'visual reset every one to two sections',
      'ending resolves into action, recommendation, or next-step clarity',
    ],
    density: [
      'substantive prose with scannable modules',
      'enough body text to be useful without becoming a memo wall',
      'KPI or proof modules punctuate the reading path',
    ],
    moduleGrammar: [
      'hero header',
      'executive summary',
      'KPI or proof strip',
      'comparison or timeline block',
      'recommendation callout',
      'evidence table when useful',
    ],
    layoutVariety: [
      'single-column narrative sections',
      'proof strips',
      'side rail or sidebar layouts',
      'comparison bands',
      'timeline or progress modules',
    ],
    typographyScale: [
      'clear document title hierarchy',
      '16px or larger body text',
      'section headings sized for scanning and print',
    ],
    componentFamilies: [
      'doc-header',
      'doc-kpi-row',
      'doc-proof-strip',
      'doc-comparison',
      'doc-timeline',
      'doc-sidebar-layout',
      'doc-recommendation',
      'doc-evidence-table',
    ],
    antiPatterns: [
      'short generic memo output',
      'long uninterrupted prose',
      'dense fixed-width columns that break framed mobile views',
      'decorative modules without informational purpose',
    ],
    comparisonSignals: [
      'document has enough substance to stand alone',
      'component variety creates a premium reading rhythm',
      'structure resembles starter quality without copying content',
    ],
    confidentialityRules: [
      'Use task-specific content and synthetic labels only.',
      'Do not copy reference names, figures, dates, sectors, source prose, or example markup.',
    ],
  },
};

const PRESENTATION_OUTPUT_MODE_PROFILE: Record<string, ReferenceStylePackId> = {
  Executive: 'presentation-executive-starter',
  Editorial: 'presentation-editorial-light',
  Proposal: 'presentation-executive-starter',
  Research: 'presentation-finance-grid-light',
  Launch: 'presentation-launch-narrative',
  Teaching: 'presentation-stage-setting',
  'Data Story': 'presentation-finance-grid-light',
};

function isProfileCompatible(id: ReferenceStylePackId | undefined, artifactType: DocumentType): id is ReferenceStylePackId {
  return Boolean(id && REFERENCE_QUALITY_PROFILES[id]?.artifactType === artifactType);
}

export function getReferenceQualityProfile(id: ReferenceStylePackId): ReferenceQualityProfile {
  return REFERENCE_QUALITY_PROFILES[id];
}

export function listReferenceQualityProfiles(): ReferenceQualityProfile[] {
  return Object.values(REFERENCE_QUALITY_PROFILES);
}

export function resolveReferenceQualityProfileId(input: {
  artifactType: DocumentType;
  outputMode?: string;
  requestedReferenceStylePackId?: ReferenceStylePackId;
}): ReferenceStylePackId | undefined {
  if (isProfileCompatible(input.requestedReferenceStylePackId, input.artifactType)) {
    return input.requestedReferenceStylePackId;
  }

  if (input.artifactType === 'document') {
    return 'document-professional-light';
  }

  if (input.artifactType === 'presentation') {
    return PRESENTATION_OUTPUT_MODE_PROFILE[input.outputMode ?? ''] ?? 'presentation-executive-starter';
  }

  return undefined;
}

function joinTraits(items: string[], limit = 2): string {
  return items.slice(0, limit).join('; ');
}

export function formatReferenceQualityProfileForPrompt(id?: ReferenceStylePackId): string {
  if (!id) return '';

  const profile = getReferenceQualityProfile(id);
  if (!profile) return '';

  return `## REFERENCE QUALITY TARGET

Profile: ${profile.label}. Rhythm/density: ${joinTraits(profile.rhythm, 1)}; ${joinTraits(profile.density, 1)}.
Grammar: ${joinTraits(profile.moduleGrammar, 1)}; ${joinTraits(profile.layoutVariety, 1)}. Components: ${joinTraits(profile.componentFamilies, 3)}.
Style metadata only: do not copy source text, names, metrics, dates, or example markup.`;
}

export function summarizeReferenceQualityProfileForScoring(id?: ReferenceStylePackId): string {
  if (!id) return 'runtime style traits';

  const profile = getReferenceQualityProfile(id);
  if (!profile) return 'runtime style traits';

  return `${profile.label} rhythm and density traits: ${joinTraits(profile.rhythm, 1)}; ${joinTraits(profile.density, 1)}`;
}
