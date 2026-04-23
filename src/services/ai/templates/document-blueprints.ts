export type DocumentBlueprintId =
  | 'executive-brief'
  | 'editorial-report'
  | 'infographic-onepager'
  | 'process-playbook'
  | 'research-summary'
  | 'proposal-board';

export type DocumentArtDirection = 'clean' | 'polished' | 'editorial';

export interface DocumentBlueprint {
  id: DocumentBlueprintId;
  label: string;
  description: string;
  artDirection: DocumentArtDirection;
  bestFor: string[];
  visualThesis: string;
  compositionRules: string[];
  componentRules: string[];
  recommendedModules: string[];
  exampleHtml: string;
}

const MOBILE_SAFE_COMPOSITION_RULES = [
  'Default to one strong reading column for narrative content; use side-by-side structure only for comparisons, KPI bands, or supporting rails.',
  'Any grid, metadata row, or comparison band should collapse or stack cleanly on narrow screens instead of relying on dense three-column reading layouts.',
];

const MOBILE_SAFE_COMPONENT_RULES = [
  'Keep media, charts, and figures fluid with max-width: 100%; avoid fixed pixel widths that would clip inside framed mobile viewports.',
  'Keep hero/header bands compact enough that smaller screens still expose meaningful content below the opening block.',
];

const DOCUMENT_BLUEPRINTS: Record<DocumentBlueprintId, DocumentBlueprint> = {
  'executive-brief': {
    id: 'executive-brief',
    label: 'Executive Brief',
    description: 'A polished summary with a strong hero, crisp hierarchy, and compact decision-ready sections.',
    artDirection: 'polished',
    bestFor: ['brief', 'summary', 'memo', 'leadership update'],
    visualThesis: 'Make the first screen feel decisive and premium: one strong title row, one summary block, and one clear recommendation band.',
    compositionRules: [
      'Lead with a concise hero summary rather than a wall of introductory paragraphs.',
      'Use 2–3 high-signal modules such as meta grid, KPI row, and recommendation callout.',
      'Keep sections compact and scannable, with visual resets every one to two blocks.',
      ...MOBILE_SAFE_COMPOSITION_RULES,
    ],
    componentRules: [
      'Use doc-meta-grid for owner/date/status/focus information when available.',
      'Use doc-kpi-grid for headline figures, priorities, or themes.',
      'Close with a next-step block or decision summary rather than a generic conclusion.',
      ...MOBILE_SAFE_COMPONENT_RULES,
    ],
    recommendedModules: ['doc-meta-grid', 'doc-kpi-grid', 'doc-callout', 'doc-proof-strip'],
    exampleHtml: `<header class="doc-header"><div class="doc-eyebrow">Executive Brief</div><div class="doc-title-row"><h1>Market Expansion Snapshot</h1><span class="doc-status-badge status-review">REVIEW</span></div><p class="doc-lead">A concise view of the current opportunity, the key constraint, and the recommended next move.</p></header><section class="doc-proof-strip"><strong>Recommendation</strong><p>Prioritize the UK launch path first to shorten compliance time and preserve margin.</p></section>`,
  },
  'editorial-report': {
    id: 'editorial-report',
    label: 'Editorial Report',
    description: 'An editorial, magazine-like report with asymmetric rhythm, pull quotes, and visual evidence blocks.',
    artDirection: 'editorial',
    bestFor: ['report', 'analysis', 'findings', 'article'],
    visualThesis: 'Treat the document like an editorial spread: strong headline, varied section rhythm, and embedded evidence cards that keep the eye moving.',
    compositionRules: [
      'Use one premium hero header, then alternate between narrative sections and evidence modules.',
      'Mix pull quotes, comparison cards, and KPI bands instead of repeated generic sections.',
      'Preserve readability — interesting does not mean crowded.',
      ...MOBILE_SAFE_COMPOSITION_RULES,
    ],
    componentRules: [
      'Use doc-story-grid or doc-comparison to break up long prose.',
      'Use a pull quote or evidence strip only when it reinforces the main argument.',
      'Give at least one section a stronger editorial accent or side-rail treatment.',
      ...MOBILE_SAFE_COMPONENT_RULES,
    ],
    recommendedModules: ['doc-story-grid', 'doc-comparison', 'doc-pullquote', 'doc-infographic-band'],
    exampleHtml: `<header class="doc-header"><div class="doc-eyebrow">Editorial Report</div><h1 class="doc-title-gradient">Three Signals Reshaping the Category</h1><p class="doc-lead">A narrative-led report with evidence blocks, standout insight, and premium pacing.</p></header><div class="doc-story-grid"><article class="doc-story-card"><div class="doc-kpi-label">Signal 01</div><h3>Demand is consolidating</h3><p>Mid-market buyers are moving toward fewer, more integrated vendors.</p></article><aside class="doc-story-card"><div class="doc-kpi-label">Why it matters</div><p>Positioning and onboarding clarity now matter as much as raw feature count.</p></aside></div>`,
  },
  'infographic-onepager': {
    id: 'infographic-onepager',
    label: 'Infographic One‑Pager',
    description: 'A visual summary format built around data points, process rails, and snapshot modules.',
    artDirection: 'editorial',
    bestFor: ['one-pager', 'infographic', 'snapshot', 'overview'],
    visualThesis: 'Front-load visual understanding: use bold summary modules and compress the message into a few strong graphic blocks.',
    compositionRules: [
      'Keep the document intentionally short and highly visual.',
      'Use one hero band, one KPI grid, and one process or comparison module.',
      'Avoid long prose unless the user explicitly requests detail.',
      ...MOBILE_SAFE_COMPOSITION_RULES,
    ],
    componentRules: [
      'Use doc-kpi-grid for 3–4 headline facts.',
      'Use doc-timeline or doc-progress to explain sequence or maturity.',
      'Use doc-infographic-band for the core thesis in one strong horizontal strip.',
      ...MOBILE_SAFE_COMPONENT_RULES,
    ],
    recommendedModules: ['doc-infographic-band', 'doc-kpi-grid', 'doc-timeline', 'doc-progress'],
    exampleHtml: `<section class="doc-infographic-band"><div><div class="doc-kpi-label">Snapshot</div><h2>2026 Growth Outlook</h2></div><div class="doc-kpi-grid"><div class="doc-kpi"><div class="doc-kpi-value">+18%</div><div class="doc-kpi-label">Revenue</div></div><div class="doc-kpi"><div class="doc-kpi-value">6 wks</div><div class="doc-kpi-label">Payback</div></div><div class="doc-kpi"><div class="doc-kpi-value">3</div><div class="doc-kpi-label">Priority bets</div></div></div></section>`,
  },
  'process-playbook': {
    id: 'process-playbook',
    label: 'Process Playbook',
    description: 'A structured operational layout for workflows, runbooks, onboarding guides, and rollout plans.',
    artDirection: 'clean',
    bestFor: ['playbook', 'runbook', 'workflow', 'guide', 'setup'],
    visualThesis: 'Show sequence clearly: a reader should understand the flow at a glance before reading the detailed steps.',
    compositionRules: [
      'Open with a short overview and a clear progress or step rail.',
      'Use numbered sections and action-oriented callouts.',
      'Prefer process clarity over decoration, but still include one visual anchor every section or two.',
      ...MOBILE_SAFE_COMPOSITION_RULES,
    ],
    componentRules: [
      'Use doc-progress or doc-timeline for the main sequence.',
      'Use doc-rail-section or doc-aside for prerequisites, risks, or definitions.',
      'Keep checklist and step content concise and operational.',
      ...MOBILE_SAFE_COMPONENT_RULES,
    ],
    recommendedModules: ['doc-progress', 'doc-timeline', 'doc-rail-section', 'doc-callout'],
    exampleHtml: `<header class="doc-header"><div class="doc-eyebrow">Process Playbook</div><h1>Launch Readiness Flow</h1><p class="doc-lead">Four stages, clear owners, and the checkpoints that reduce execution risk.</p></header><div class="doc-progress"><div class="doc-progress-step" data-step="1">Prepare</div><div class="doc-progress-step" data-step="2">Validate</div><div class="doc-progress-step" data-step="3">Launch</div><div class="doc-progress-step" data-step="4">Measure</div></div>`,
  },
  'research-summary': {
    id: 'research-summary',
    label: 'Research Summary',
    description: 'A data-led document that blends findings, methodology, and interpretation without feeling academic and flat.',
    artDirection: 'polished',
    bestFor: ['research', 'study', 'paper', 'assessment'],
    visualThesis: 'Present evidence with discipline: the design should signal rigor, but still use visual modules to surface the findings quickly.',
    compositionRules: [
      'Separate methodology, evidence, and implication into clearly distinct blocks.',
      'Use one comparison or findings grid to summarize the important patterns.',
      'Keep tables and references tidy, not dominant.',
      ...MOBILE_SAFE_COMPOSITION_RULES,
    ],
    componentRules: [
      'Use doc-meta-grid for methodology context.',
      'Use doc-comparison or doc-kpi-grid for top findings.',
      'Use a short pull quote or implication band to translate evidence into action.',
      ...MOBILE_SAFE_COMPONENT_RULES,
    ],
    recommendedModules: ['doc-meta-grid', 'doc-comparison', 'doc-kpi-grid', 'doc-proof-strip'],
    exampleHtml: `<header class="doc-header"><div class="doc-eyebrow">Research Summary</div><h1>Adoption Study — Key Findings</h1><p class="doc-lead">A concise synthesis of the methodology, evidence, and the implication for the next release cycle.</p></header><div class="doc-meta-grid"><div><strong>Sample</strong><p>482 users</p></div><div><strong>Method</strong><p>Survey + interviews</p></div><div><strong>Window</strong><p>Q1 2026</p></div></div>`,
  },
  'proposal-board': {
    id: 'proposal-board',
    label: 'Proposal Board',
    description: 'A persuasive document layout for plans, pitches, and strategic proposals.',
    artDirection: 'polished',
    bestFor: ['proposal', 'plan', 'pitch', 'roadmap'],
    visualThesis: 'Frame the proposal like a decision board: what is changing, why it matters, and what happens next.',
    compositionRules: [
      'Lead with the value proposition and the proposed move.',
      'Use a comparison or before/after block to make the case concrete.',
      'End with outcomes and next steps, not just narrative recap.',
      ...MOBILE_SAFE_COMPOSITION_RULES,
    ],
    componentRules: [
      'Use doc-proof-strip for the value proposition or ask.',
      'Use doc-comparison for current state vs proposed state.',
      'Use doc-kpi-grid for expected outcomes or milestones.',
      ...MOBILE_SAFE_COMPONENT_RULES,
    ],
    recommendedModules: ['doc-proof-strip', 'doc-comparison', 'doc-kpi-grid', 'doc-callout'],
    exampleHtml: `<header class="doc-header"><div class="doc-eyebrow">Proposal</div><h1>Customer Education Refresh</h1><p class="doc-lead">A focused proposal to simplify onboarding, improve activation, and reduce support load.</p></header><div class="doc-comparison"><article class="doc-compare-card"><div class="doc-kpi-label">Current</div><p>Fragmented guidance and slow time-to-value.</p></article><article class="doc-compare-card"><div class="doc-kpi-label">Proposed</div><p>A modular learning path with guided checkpoints and clearer proof of progress.</p></article></div>`,
  },
};

export type DocumentStylePreference = 'auto' | 'executive' | 'editorial' | 'infographic' | 'playbook' | 'research' | 'proposal';

const STYLE_BLUEPRINT_MAP: Partial<Record<DocumentStylePreference, DocumentBlueprintId>> = {
  executive: 'executive-brief',
  editorial: 'editorial-report',
  infographic: 'infographic-onepager',
  playbook: 'process-playbook',
  research: 'research-summary',
  proposal: 'proposal-board',
};

export function selectDocumentBlueprint(prompt: string, documentType: string, preferredStyle: DocumentStylePreference | string = 'auto'): DocumentBlueprint {
  const normalized = `${prompt} ${documentType}`.toLowerCase();
  const preferred = String(preferredStyle || 'auto').toLowerCase() as DocumentStylePreference;

  if (preferred !== 'auto' && STYLE_BLUEPRINT_MAP[preferred]) {
    return DOCUMENT_BLUEPRINTS[STYLE_BLUEPRINT_MAP[preferred]!];
  }

  if (/\b(step|process|workflow|playbook|runbook|checklist|setup|deploy|onboard|rollout|implementation)\b/.test(normalized)) {
    return DOCUMENT_BLUEPRINTS['process-playbook'];
  }

  if (/\b(infographic|one-pager|one pager|snapshot|scorecard|visual summary|dashboard)\b/.test(normalized)) {
    return DOCUMENT_BLUEPRINTS['infographic-onepager'];
  }

  if (/\b(research|study|paper|methodology|experiment|survey|hypothesis)\b/.test(normalized)) {
    return DOCUMENT_BLUEPRINTS['research-summary'];
  }

  if (/\b(proposal|pitch|roadmap|plan|business case|strategy|recommendation)\b/.test(normalized)) {
    return DOCUMENT_BLUEPRINTS['proposal-board'];
  }

  if (/\b(report|analysis|findings|assessment|review|article|editorial|insight)\b/.test(normalized)) {
    return DOCUMENT_BLUEPRINTS['editorial-report'];
  }

  switch (documentType) {
    case 'brief':
      return DOCUMENT_BLUEPRINTS['executive-brief'];
    case 'report':
    case 'article':
      return DOCUMENT_BLUEPRINTS['editorial-report'];
    case 'proposal':
      return DOCUMENT_BLUEPRINTS['proposal-board'];
    case 'notes':
    case 'wiki':
    case 'readme':
      return DOCUMENT_BLUEPRINTS['process-playbook'];
    default:
      return DOCUMENT_BLUEPRINTS['executive-brief'];
  }
}

export function listDocumentBlueprints(): DocumentBlueprint[] {
  return Object.values(DOCUMENT_BLUEPRINTS);
}
