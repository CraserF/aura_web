/**
 * Document Section Module Registry - typed definitions for reusable document section modules.
 *
 * Each module definition provides a semantic purpose, heading level, content slots,
 * density, visual treatment, and prompt guidance. These are injected into the document
 * module contract prompt to guide the AI toward consistent, structured output rather
 * than freeform generation.
 *
 * Module definitions extend the existing documentDesignSystem.ts CSS class vocabulary
 * rather than replacing it.
 */

export type DocumentSectionModuleId =
  | 'cover'
  | 'executive-summary'
  | 'key-findings'
  | 'recommendation'
  | 'evidence-table'
  | 'comparison-matrix'
  | 'timeline'
  | 'process'
  | 'risk-section'
  | 'decision-log'
  | 'appendix'
  | 'callout'
  | 'pull-quote';

export interface DocumentSectionSlot {
  id: string;
  label: string;
  description: string;
  required: boolean;
  /** Max word count for this slot */
  maxWords?: number;
  /** Whether this slot may contain lists, tables, or nested structure */
  allowsRichContent: boolean;
}

export interface DocumentSectionModuleDefinition {
  id: DocumentSectionModuleId;
  label: string;
  description: string;
  /** Semantic purpose: what this section does in a document */
  purpose: string;
  /** Expected heading element for the module title */
  headingLevel: 'h1' | 'h2' | 'h3' | 'none';
  /** Ordered content slots the module should populate */
  slots: DocumentSectionSlot[];
  /** Whether this module may include a table */
  allowsTables: boolean;
  /** Whether this module may include bullet or ordered lists */
  allowsLists: boolean;
  /** Content density relative to page length */
  densityLevel: 'compact' | 'standard' | 'expanded';
  /** CSS class pattern to use from documentDesignSystem */
  visualTreatment: string;
  /** Page-break behavior preference for print/PDF */
  pageBreakPreference: 'avoid' | 'allow' | 'before';
  /** Accessibility expectations */
  accessibilityExpectations: string[];
  /** Keywords used to fuzzy-match this module from a title or brief */
  matchKeywords: string[];
  /** Concise prompt guidance for the document designer */
  promptGuidance: string;
}

// Registry

export const DOCUMENT_SECTION_MODULE_REGISTRY: Record<
  DocumentSectionModuleId,
  DocumentSectionModuleDefinition
> = {
  cover: {
    id: 'cover',
    label: 'Cover',
    description: 'Opening section with document title, subtitle, and optional author/date meta.',
    purpose: 'Establish the document identity, audience, and date at a glance.',
    headingLevel: 'h1',
    slots: [
      { id: 'title', label: 'Document Title', description: 'Primary document title', required: true, maxWords: 12, allowsRichContent: false },
      { id: 'subtitle', label: 'Subtitle / Tagline', description: 'Short supporting line', required: false, maxWords: 20, allowsRichContent: false },
      { id: 'meta', label: 'Meta (author, date, version)', description: 'Optional meta line', required: false, maxWords: 12, allowsRichContent: false },
    ],
    allowsTables: false,
    allowsLists: false,
    densityLevel: 'compact',
    visualTreatment: 'doc-header treatment inside the runtime section wrapper; title as h1, subtitle/meta as paragraphs',
    pageBreakPreference: 'before',
    accessibilityExpectations: ['h1 must be the document title', 'one h1 per document'],
    matchKeywords: ['cover', 'title', 'opening', 'header', 'front-page', 'front page'],
    promptGuidance:
      'Apply doc-header styling inside the required runtime section wrapper. Title is a large <h1>. ' +
      'Subtitle and meta are short paragraphs. No images, no KPI rows. Keep it clean and minimal.',
  },

  'executive-summary': {
    id: 'executive-summary',
    label: 'Executive Summary',
    description: 'Short prose overview for decision-maker audiences, optionally followed by a KPI row.',
    purpose: 'Summarize the essential facts for decision-makers in under 200 words.',
    headingLevel: 'h2',
    slots: [
      { id: 'headline', label: 'Headline Statement', description: 'One bold takeaway sentence', required: true, maxWords: 20, allowsRichContent: false },
      { id: 'summary', label: 'Summary Prose', description: 'Context and situation in 2-4 sentences', required: true, maxWords: 120, allowsRichContent: false },
      { id: 'kpi-row', label: 'KPI Row (optional)', description: 'Up to 3 key metrics as doc-kpi items', required: false, allowsRichContent: true },
    ],
    allowsTables: false,
    allowsLists: false,
    densityLevel: 'compact',
    visualTreatment: 'doc-section; optional doc-kpi-row with doc-kpi items for metrics',
    pageBreakPreference: 'avoid',
    accessibilityExpectations: ['metrics need visible text labels'],
    matchKeywords: ['executive summary', 'exec summary', 'summary', 'overview', 'tldr', 'tl;dr', 'introduction'],
    promptGuidance:
      'Open with a bold headline, then 2-4 summary sentences. Optional doc-kpi-row with 2-3 labeled doc-kpi metrics. Keep under 150 words; no bullets or table.',
  },

  'key-findings': {
    id: 'key-findings',
    label: 'Key Findings',
    description: 'Structured list of findings, each with a label and supporting evidence.',
    purpose: 'Surface critical discoveries or insights with enough evidence to be credible.',
    headingLevel: 'h2',
    slots: [
      { id: 'intro', label: 'Intro Sentence', description: 'Optional one-line framing', required: false, maxWords: 25, allowsRichContent: false },
      { id: 'finding-1', label: 'Finding 1', description: 'Label + supporting evidence sentence', required: true, maxWords: 50, allowsRichContent: false },
      { id: 'finding-2', label: 'Finding 2', description: 'Label + supporting evidence sentence', required: true, maxWords: 50, allowsRichContent: false },
      { id: 'finding-3', label: 'Finding 3 (optional)', description: 'Additional finding', required: false, maxWords: 50, allowsRichContent: false },
    ],
    allowsTables: false,
    allowsLists: true,
    densityLevel: 'standard',
    visualTreatment: 'doc-section; doc-proof-strip with doc-proof-item or doc-kpi-row with doc-kpi items for metric findings',
    pageBreakPreference: 'avoid',
    accessibilityExpectations: ['each proof item must have a visible label', 'avoid pure-number findings with no context'],
    matchKeywords: ['key findings', 'findings', 'insights', 'discoveries', 'observations', 'results', 'proof', 'proof strip', 'kpi', 'metric', 'signal'],
    promptGuidance:
      'Use a <div class="doc-proof-strip"> containing 2-4 <div class="doc-proof-item"> elements, or doc-kpi-row when metrics are provided. ' +
      'Each item: <strong>Finding label</strong> then a <span> with one evidence sentence. ' +
      'Keep each item under 40 words.',
  },

  recommendation: {
    id: 'recommendation',
    label: 'Recommendation',
    description: 'A clear, prioritized recommendation with rationale and next steps.',
    purpose: 'Drive decision-making by stating what should be done and why.',
    headingLevel: 'h2',
    slots: [
      { id: 'recommendation', label: 'Recommendation Statement', description: 'Bold action statement', required: true, maxWords: 30, allowsRichContent: false },
      { id: 'rationale', label: 'Rationale', description: 'Why this is the right course', required: true, maxWords: 80, allowsRichContent: false },
      { id: 'next-steps', label: 'Next Steps (optional)', description: 'Short list of actions', required: false, maxWords: 60, allowsRichContent: true },
    ],
    allowsTables: false,
    allowsLists: true,
    densityLevel: 'standard',
    visualTreatment: 'doc-section doc-recommendation with accent left-border treatment',
    pageBreakPreference: 'avoid',
    accessibilityExpectations: ['recommendation text must be clearly labelled, not implied by visual style alone'],
    matchKeywords: ['recommendation', 'suggest', 'proposed', 'action', 'decision', 'next steps', 'what to do'],
    promptGuidance:
      'Apply doc-recommendation to the required runtime section wrapper. ' +
      'Open with a <strong> recommendation statement. Follow with rationale prose. ' +
      'Optional: <ul> of 2-3 next steps. Keep total under 150 words.',
  },

  'evidence-table': {
    id: 'evidence-table',
    label: 'Evidence Table',
    description: 'A structured table presenting supporting data, sources, or detailed evidence.',
    purpose: 'Provide credibility through organized, comparable evidence.',
    headingLevel: 'h2',
    slots: [
      { id: 'intro', label: 'Intro', description: 'One sentence framing the table', required: false, maxWords: 20, allowsRichContent: false },
      { id: 'table', label: 'Evidence Table', description: 'Table with header row and data rows', required: true, allowsRichContent: true },
    ],
    allowsTables: true,
    allowsLists: false,
    densityLevel: 'expanded',
    visualTreatment: 'doc-section; table with class doc-evidence-table, or compact table-like metadata when content is reference data',
    pageBreakPreference: 'allow',
    accessibilityExpectations: ['table must have a <thead> with <th> headers', 'th must have scope="col" or scope="row"'],
    matchKeywords: ['evidence', 'table', 'data', 'sources', 'references', 'citations', 'supporting data', 'meta', 'metadata', 'methodology'],
    promptGuidance:
      'Use <table class="doc-evidence-table"> inside the doc-section. ' +
      'Include a <thead> with descriptive <th scope="col"> headers. ' +
      'Keep to 4 columns maximum for readability. ' +
      'Add a one-sentence intro above the table.',
  },

  'comparison-matrix': {
    id: 'comparison-matrix',
    label: 'Comparison Matrix',
    description: 'Side-by-side comparison of two or more options, alternatives, or approaches.',
    purpose: 'Help readers evaluate options by presenting them in parallel structure.',
    headingLevel: 'h2',
    slots: [
      { id: 'intro', label: 'Comparison Framing', description: 'One sentence stating what is being compared', required: true, maxWords: 20, allowsRichContent: false },
      { id: 'option-1', label: 'Option A', description: 'Label and key attributes', required: true, maxWords: 60, allowsRichContent: true },
      { id: 'option-2', label: 'Option B', description: 'Label and key attributes', required: true, maxWords: 60, allowsRichContent: true },
      { id: 'option-3', label: 'Option C (optional)', description: 'Third option if relevant', required: false, maxWords: 60, allowsRichContent: true },
    ],
    allowsTables: true,
    allowsLists: true,
    densityLevel: 'standard',
    visualTreatment: 'doc-section; doc-comparison grid with doc-compare-card for each option',
    pageBreakPreference: 'avoid',
    accessibilityExpectations: ['each compare card must have a visible heading', 'ensure color is not the only differentiator'],
    matchKeywords: ['comparison', 'compare', 'versus', 'vs', 'alternatives', 'options', 'trade-offs', 'matrix', 'compare card'],
    promptGuidance:
      'Use <div class="doc-comparison"> containing <div class="doc-compare-card"> for each option. ' +
      'Each card: bold option name, then <span> description. ' +
      'Keep each card under 50 words. Max 3 options for readability.',
  },

  timeline: {
    id: 'timeline',
    label: 'Timeline',
    description: 'Chronological or phased sequence of events, milestones, or deliverables.',
    purpose: 'Show progress, roadmap, or history in temporal sequence.',
    headingLevel: 'h2',
    slots: [
      { id: 'event-1', label: 'Event / Phase 1', description: 'Date or phase + description', required: true, maxWords: 30, allowsRichContent: false },
      { id: 'event-2', label: 'Event / Phase 2', description: 'Date or phase + description', required: true, maxWords: 30, allowsRichContent: false },
      { id: 'event-3', label: 'Event / Phase 3', description: 'Date or phase + description', required: false, maxWords: 30, allowsRichContent: false },
      { id: 'event-4', label: 'Event / Phase 4 (optional)', description: 'Date or phase + description', required: false, maxWords: 30, allowsRichContent: false },
    ],
    allowsTables: false,
    allowsLists: false,
    densityLevel: 'standard',
    visualTreatment: 'doc-section; doc-timeline with doc-timeline-item for each event',
    pageBreakPreference: 'allow',
    accessibilityExpectations: ['each timeline item must have a visible date or phase label'],
    matchKeywords: ['timeline', 'roadmap', 'milestones', 'phases', 'schedule', 'history', 'chronology', 'dates', 'sequence'],
    promptGuidance:
      'Use <div class="doc-timeline"> containing <div class="doc-timeline-item"> for each event. ' +
      'Each item: <strong>Date or phase label</strong> then a brief description sentence. ' +
      'Max 6 items for readability.',
  },

  process: {
    id: 'process',
    label: 'Process',
    description: 'Step-by-step procedure, workflow, or methodology with clear numbered steps.',
    purpose: 'Guide the reader through a repeatable process or workflow.',
    headingLevel: 'h2',
    slots: [
      { id: 'intro', label: 'Process Overview', description: 'One sentence describing the process', required: true, maxWords: 25, allowsRichContent: false },
      { id: 'step-1', label: 'Step 1', description: 'Action + brief explanation', required: true, maxWords: 40, allowsRichContent: false },
      { id: 'step-2', label: 'Step 2', description: 'Action + brief explanation', required: true, maxWords: 40, allowsRichContent: false },
      { id: 'step-3', label: 'Step 3', description: 'Action + brief explanation', required: false, maxWords: 40, allowsRichContent: false },
    ],
    allowsTables: false,
    allowsLists: true,
    densityLevel: 'standard',
    visualTreatment: 'doc-section; ordered list <ol> with <li> for each step, or doc-timeline for visual flow',
    pageBreakPreference: 'avoid',
    accessibilityExpectations: ['use ordered list <ol> so steps are enumerable by screen readers'],
    matchKeywords: ['process', 'steps', 'workflow', 'procedure', 'methodology', 'how to', 'how-to', 'instructions', 'progress'],
    promptGuidance:
      'Use an <ol> inside the doc-section for steps. ' +
      'Each <li>: bold step name followed by a brief explanation sentence. ' +
      'Alternatively use <div class="doc-timeline"> if visual flow suits the content. ' +
      'Max 7 steps.',
  },

  'risk-section': {
    id: 'risk-section',
    label: 'Risk Section',
    description: 'Risk register with likelihood/impact assessment and mitigation notes.',
    purpose: 'Surface known risks with enough detail to inform risk management decisions.',
    headingLevel: 'h2',
    slots: [
      { id: 'intro', label: 'Risk Context', description: 'One sentence framing the risk scope', required: false, maxWords: 25, allowsRichContent: false },
      { id: 'risk-1', label: 'Risk 1', description: 'Risk name, likelihood, impact, mitigation', required: true, maxWords: 60, allowsRichContent: false },
      { id: 'risk-2', label: 'Risk 2', description: 'Risk name, likelihood, impact, mitigation', required: true, maxWords: 60, allowsRichContent: false },
      { id: 'risk-3', label: 'Risk 3 (optional)', description: 'Additional risk', required: false, maxWords: 60, allowsRichContent: false },
    ],
    allowsTables: true,
    allowsLists: true,
    densityLevel: 'standard',
    visualTreatment: 'doc-section; doc-evidence-table for tabular risk register, or doc-proof-strip for card-style risks',
    pageBreakPreference: 'allow',
    accessibilityExpectations: ['risk table must have accessible column headers', 'risk level labels must not rely on color alone'],
    matchKeywords: ['risk', 'risks', 'risk register', 'mitigation', 'threats', 'issues', 'concerns'],
    promptGuidance:
      'For tabular format: use <table class="doc-evidence-table"> with columns: Risk, Likelihood, Impact, Mitigation. ' +
      'For card format: use <div class="doc-proof-strip"> with <div class="doc-proof-item"> per risk. ' +
      'Include a mitigation note for each risk. Max 5 risks.',
  },

  'decision-log': {
    id: 'decision-log',
    label: 'Decision Log',
    description: 'Record of key decisions made, with rationale and decision owner.',
    purpose: 'Preserve decision history for accountability and future reference.',
    headingLevel: 'h2',
    slots: [
      { id: 'decision-1', label: 'Decision 1', description: 'Decision statement, date, owner, rationale', required: true, maxWords: 60, allowsRichContent: false },
      { id: 'decision-2', label: 'Decision 2 (optional)', description: 'Additional decision', required: false, maxWords: 60, allowsRichContent: false },
    ],
    allowsTables: true,
    allowsLists: false,
    densityLevel: 'standard',
    visualTreatment: 'doc-section; doc-evidence-table with Decision, Date, Owner, Rationale columns',
    pageBreakPreference: 'allow',
    accessibilityExpectations: ['table headers must identify each column clearly'],
    matchKeywords: ['decision log', 'decisions', 'decision record', 'choices made', 'agreed', 'log'],
    promptGuidance:
      'Use <table class="doc-evidence-table"> with columns: Decision, Date, Owner, Rationale. ' +
      'Keep rationale column to one sentence per row. ' +
      'List decisions in reverse chronological order (most recent first).',
  },

  appendix: {
    id: 'appendix',
    label: 'Appendix',
    description: 'Supporting reference material, methodology notes, or raw data.',
    purpose: 'Provide additional context without cluttering the main document body.',
    headingLevel: 'h2',
    slots: [
      { id: 'intro', label: 'Appendix Purpose', description: 'One sentence describing what is in the appendix', required: true, maxWords: 25, allowsRichContent: false },
      { id: 'content', label: 'Appendix Content', description: 'Supporting reference material', required: true, maxWords: 300, allowsRichContent: true },
    ],
    allowsTables: true,
    allowsLists: true,
    densityLevel: 'expanded',
    visualTreatment: 'doc-section; standard prose or doc-evidence-table for reference data',
    pageBreakPreference: 'before',
    accessibilityExpectations: ['appendix heading must be clearly labelled as supplementary', 'do not reference appendix items by color or position alone'],
    matchKeywords: ['appendix', 'annex', 'supplementary', 'reference', 'additional', 'supporting material'],
    promptGuidance:
      'Open with a brief description of what the appendix contains. ' +
      'Use standard prose, lists, or a doc-evidence-table as appropriate. ' +
      'Label the section clearly as "Appendix" in the heading.',
  },

  callout: {
    id: 'callout',
    label: 'Callout',
    description: 'A visually highlighted box for important notes, warnings, or tips.',
    purpose: 'Draw attention to critical information that the reader must not miss.',
    headingLevel: 'h3',
    slots: [
      { id: 'callout-label', label: 'Callout Label', description: 'Short type label: Note, Warning, Tip, Important', required: true, maxWords: 4, allowsRichContent: false },
      { id: 'callout-text', label: 'Callout Text', description: 'The callout message', required: true, maxWords: 60, allowsRichContent: false },
    ],
    allowsTables: false,
    allowsLists: false,
    densityLevel: 'compact',
    visualTreatment: 'doc-section doc-executive-callout with accent left-border',
    pageBreakPreference: 'avoid',
    accessibilityExpectations: ['callout role must be visually and textually labelled (not just color)', 'use role="note" or role="alert" as appropriate'],
    matchKeywords: ['callout', 'note', 'warning', 'tip', 'important', 'alert', 'highlight', 'notice', 'sidebar', 'aside', 'rail section'],
    promptGuidance:
      'Apply doc-executive-callout to the required runtime section wrapper. ' +
      'Open with <strong>Label:</strong> (e.g., "Note:", "Warning:"). ' +
      'Follow with one to three concise sentences. Keep total under 50 words.',
  },

  'pull-quote': {
    id: 'pull-quote',
    label: 'Pull Quote',
    description: 'A large, typographically prominent quotation attributed to a source.',
    purpose: 'Create a visual pause and add authority through a direct quotation.',
    headingLevel: 'none',
    slots: [
      { id: 'quote', label: 'Quote Text', description: 'The quoted statement', required: true, maxWords: 40, allowsRichContent: false },
      { id: 'attribution', label: 'Attribution', description: 'Author name and optional role or source', required: false, maxWords: 15, allowsRichContent: false },
    ],
    allowsTables: false,
    allowsLists: false,
    densityLevel: 'compact',
    visualTreatment: 'doc-section with inner <blockquote> and optional <cite>',
    pageBreakPreference: 'avoid',
    accessibilityExpectations: ['use <blockquote> element for the quote', 'attribution in <cite> element'],
    matchKeywords: ['quote', 'pull quote', 'pullquote', 'quotation', 'testimonial', 'said', 'stated', 'blockquote'],
    promptGuidance:
      'Place a <blockquote> inside the required runtime section wrapper, with optional <cite> below. ' +
      'No heading element. Keep the quote under 40 words.',
  },
};

// Helpers

export interface DocumentSectionModuleSelectionHints {
  brief?: string;
  role?: string;
  componentPattern?: string;
  visualRhythm?: string;
}

const DOCUMENT_SECTION_MODULE_ALIASES: Array<{
  id: DocumentSectionModuleId;
  terms: string[];
}> = [
  {
    id: 'executive-summary',
    terms: ['hero summary', 'lead summary', 'doc infographic band', 'infographic band', 'snapshot band'],
  },
  {
    id: 'key-findings',
    terms: ['kpi proof', 'kpi row', 'kpi grid', 'doc kpi', 'metric proof', 'proof row', 'doc proof strip', 'proof strip', 'story grid', 'doc story grid'],
  },
  {
    id: 'evidence-table',
    terms: ['doc meta grid', 'meta grid', 'evidence table', 'reference table', 'data table', 'methodology context'],
  },
  {
    id: 'comparison-matrix',
    terms: ['doc comparison', 'compare card', 'comparison card', 'before after'],
  },
  {
    id: 'timeline',
    terms: ['next step timeline', 'next steps timeline', 'doc timeline'],
  },
  {
    id: 'process',
    terms: ['doc progress', 'progress rail', 'progress step', 'process rail'],
  },
  {
    id: 'recommendation',
    terms: ['decision summary', 'recommended direction', 'proposal ask'],
  },
  {
    id: 'risk-section',
    terms: ['risk register', 'watchout', 'watch out', 'constraint rail'],
  },
  {
    id: 'callout',
    terms: ['doc callout', 'doc rail section', 'rail section', 'sidebar module', 'aside module'],
  },
  {
    id: 'pull-quote',
    terms: ['doc pullquote', 'doc pull quote', 'pull quote', 'blockquote'],
  },
];

const DOCUMENT_ROLE_MODULE_MAP: Record<string, DocumentSectionModuleId> = {
  'hero-summary': 'executive-summary',
  'executive-summary': 'executive-summary',
  'kpi-proof': 'key-findings',
  comparison: 'comparison-matrix',
  timeline: 'timeline',
  recommendation: 'recommendation',
  sidebar: 'callout',
  evidence: 'key-findings',
};

function normalizeModuleText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Select the best matching document section module for a given module title or brief.
 * Falls back to a generic 'executive-summary' style module when no match is found.
 */
export function selectDocumentModule(
  title: string,
  hints: DocumentSectionModuleSelectionHints = {},
): DocumentSectionModuleDefinition {
  const normalizedTitle = normalizeModuleText(title);
  const normalized = normalizeModuleText([
    title,
    hints.brief,
    hints.role,
    hints.componentPattern,
    hints.visualRhythm,
  ].filter(Boolean).join(' '));
  const tokens = new Set(normalized.split(' ').filter((t) => t.length >= 3));

  let bestId: DocumentSectionModuleId = 'executive-summary';
  let bestScore = 0;

  const roleModuleId = hints.role ? DOCUMENT_ROLE_MODULE_MAP[normalizeModuleText(hints.role)] : undefined;
  if (roleModuleId) {
    bestId = roleModuleId;
    bestScore = 6;
  }

  for (const definition of Object.values(DOCUMENT_SECTION_MODULE_REGISTRY)) {
    let score = 0;
    for (const alias of DOCUMENT_SECTION_MODULE_ALIASES) {
      if (alias.id !== definition.id) continue;
      for (const term of alias.terms) {
        const normalizedTerm = normalizeModuleText(term);
        if (normalizedTerm && normalizedTitle.includes(normalizedTerm)) {
          score += normalizedTerm.split(' ').length * 8;
        } else if (normalizedTerm && normalized.includes(normalizedTerm)) {
          score += normalizedTerm.split(' ').length * 4;
        }
      }
    }
    for (const keyword of definition.matchKeywords) {
      const normalizedKeyword = normalizeModuleText(keyword);
      if (normalized.includes(normalizedKeyword)) {
        score += normalizedKeyword.split(' ').length * 2; // multi-word keyword = stronger match
      } else {
        const keywordTokens = normalizedKeyword.split(' ');
        for (const token of keywordTokens) {
          if (tokens.has(token)) score += 1;
        }
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestId = definition.id;
    }
  }

  return DOCUMENT_SECTION_MODULE_REGISTRY[bestId];
}

/**
 * Build a concise prompt description for a document section module.
 * Injected into the module contract prompt to guide slot-aware generation.
 */
export function buildDocumentSectionModulePrompt(module: DocumentSectionModuleDefinition): string {
  const slotsBlock = module.slots
    .map((slot) => {
      const budget = slot.maxWords ? `, max ${slot.maxWords}w` : '';
      const richContent = slot.allowsRichContent ? ', rich' : '';
      const req = slot.required ? 'required' : 'optional';
      return `- ${slot.id} (${slot.label}): ${req}${budget}${richContent}`;
    })
    .join('\n');

  const headingRule = module.headingLevel === 'none'
    ? 'heading=none, no h1-h4'
    : `heading=<${module.headingLevel}>`;

  return `## SECTION MODULE: ${module.label.toUpperCase()}

Purpose: ${module.purpose}

Slots:
${slotsBlock}

Rules: ${headingRule}; visual=${module.visualTreatment}; density=${module.densityLevel}; tables=${module.allowsTables ? 'yes' : 'no'}; lists=${module.allowsLists ? 'yes' : 'no'}; break=${module.pageBreakPreference}.
Accessibility: ${module.accessibilityExpectations.join('; ')}

Guidance: ${module.promptGuidance}`;
}
