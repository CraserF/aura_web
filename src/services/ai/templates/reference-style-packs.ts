import type { DocumentType } from '@/types/project';

export type ReferenceStylePackId =
  | 'presentation-title-polished'
  | 'presentation-executive-starter'
  | 'presentation-launch-narrative'
  | 'presentation-stage-setting'
  | 'presentation-editorial-light'
  | 'presentation-finance-grid-light'
  | 'presentation-quiz-show'
  | 'document-professional-light'
  | 'document-executive-light'
  | 'document-editorial-light'
  | 'document-proposal-light'
  | 'document-research-light'
  | 'document-playbook-light'
  | 'document-infographic-light';

export interface ReferenceStylePack {
  id: ReferenceStylePackId;
  artifactType: DocumentType;
  label: string;
  summary: string;
  typography: string[];
  paletteRules: string[];
  layoutRules: string[];
  motionRules: string[];
  confidentialityRules: string[];
  syntheticExample: string;
}

const REFERENCE_STYLE_PACKS: Record<ReferenceStylePackId, ReferenceStylePack> = {
  'presentation-title-polished': {
    id: 'presentation-title-polished',
    artifactType: 'presentation',
    label: 'Polished Split Title',
    summary: 'A clean title slide built around two visual worlds, one connective seam, and one strong central lockup.',
    typography: [
      'Use a condensed display font for the main title and a clean sans for supporting copy.',
      'Keep the title short, high contrast, and visually dominant.',
    ],
    paletteRules: [
      'Favor light, refined background fields with one teal/blue accent seam and one secondary support accent.',
      'Keep accent color concentrated in the seam, chips, and key highlights rather than flooding the stage.',
    ],
    layoutRules: [
      'Use a split or dual-field background with a clear vertical or diagonal join.',
      'Center the hero lockup and keep the support row compact and symmetric.',
    ],
    motionRules: [
      'Allow slow ambient motion in background systems only.',
      'Keep foreground motion restrained and hierarchy-led.',
    ],
    confidentialityRules: [
      'Use only synthetic titles, subtitles, and category labels.',
      'Do not include real company names, geographies, presenter names, or case details.',
    ],
    syntheticExample: `<section data-background-color="#eef7fa"><div class="title-world title-world-left"></div><div class="title-world title-world-right"></div><div class="title-seam"></div><div class="title-lockup"><div class="eyebrow">Opening Frame</div><h1>Two Systems<br><span>Working Together</span></h1><p>Set the narrative with one bridging idea and two supporting domains.</p></div></section>`,
  },
  'presentation-executive-starter': {
    id: 'presentation-executive-starter',
    artifactType: 'presentation',
    label: 'Executive Starter Deck',
    summary: 'A premium light executive system with large type, decision modules, evidence strips, and subtle diagram motion.',
    typography: [
      'Use condensed display typography for titles and a clean sans for body copy.',
      'Keep leadership-facing labels at readable source sizes and avoid tiny metadata.',
    ],
    paletteRules: [
      'Use light blue paper fields with teal, blue, and one warm caution accent.',
      'Use accents through borders, chips, and diagram strokes rather than saturated panels.',
    ],
    layoutRules: [
      'Use a cover signal stack, scene-plus-insight layout, metric row, and numbered recommendation cards.',
      'Keep each slide to 1-3 major zones for fixed-stage canvas legibility.',
    ],
    motionRules: [
      'Use line sweeps and node pulses inside diagrams only.',
      'Keep text and cards stable after reveal.',
    ],
    confidentialityRules: [
      'Use synthetic leadership labels, priorities, and metrics only.',
      'Do not reuse real presenter names, organizations, sectors, geographies, dates, or amounts.',
    ],
    syntheticExample: `<section data-background-color="#eef7fa"><div class="exec-cover"><div class="eyebrow">Executive Briefing</div><h1>Decision Ready</h1><p>Frame the move, evidence, and action in one readable starter deck.</p></div><aside class="signal-stack"><div>Decision</div><div>Evidence</div><div>Action</div></aside></section>`,
  },
  'presentation-launch-narrative': {
    id: 'presentation-launch-narrative',
    artifactType: 'presentation',
    label: 'Launch Narrative',
    summary: 'An energetic but disciplined launch system with split-scene title motion, proof cards, readiness steps, and action cards.',
    typography: [
      'Use large condensed titles and short support copy.',
      'Keep body copy brief enough to remain readable when the stage scales down.',
    ],
    paletteRules: [
      'Use refined light cyan and green fields with a teal seam or pathway motif.',
      'Reserve violet or secondary accents for one focal cue at a time.',
    ],
    layoutRules: [
      'Use one animated opening scene followed by thesis, readiness, and action modules.',
      'Avoid dense pitch-deck slides with many small captions.',
    ],
    motionRules: [
      'Use seam glow, path sweeps, and focal pulses for atmosphere.',
      'Always include reduced-motion fallbacks and keep foreground copy steady.',
    ],
    confidentialityRules: [
      'Use synthetic launch language and generic audience labels only.',
      'Do not include real brand names, campaign names, locations, dates, or financial details.',
    ],
    syntheticExample: `<section data-background-color="#eef8fb"><div class="launch-seam"></div><div class="launch-lockup"><div class="eyebrow">Launch Narrative</div><h1>Make the Move Visible</h1><p>Connect audience, offer, readiness, and action.</p></div></section>`,
  },
  'presentation-stage-setting': {
    id: 'presentation-stage-setting',
    artifactType: 'presentation',
    label: 'Stage-Setting Editorial',
    summary: 'A stage-setting slide with one strong contextual headline, a restrained KPI strip, and a single supporting visual scene.',
    typography: [
      'Use a bold condensed title with a quiet supporting sans.',
      'Keep supporting text concise and highly scannable.',
    ],
    paletteRules: [
      'Stay in light editorial neutrals with one disciplined accent family.',
      'Use muted right-side panels or side rails instead of dark contrast slabs.',
    ],
    layoutRules: [
      'Use a two-zone structure: one context visual and one stack of structured insights.',
      'Keep bullets or insight cards parallel and restrained.',
    ],
    motionRules: [
      'Use sweep, ripple, or shimmer only inside the visual scene.',
      'Keep insight cards stable once revealed.',
    ],
    confidentialityRules: [
      'Use synthetic framing labels and generic KPIs only.',
      'Do not embed real sector claims, investment amounts, or regional references.',
    ],
    syntheticExample: `<section data-background-color="#edf6f9"><div class="context-header"><div class="eyebrow">Setting the Stage</div><h2>Why the Shift Matters</h2></div><div class="stage-grid"><div class="scene-panel"></div><div class="insight-stack"><article class="insight-card">Demand pressure is rising faster than delivery capacity.</article><article class="insight-card">Funding and operations must move in the same direction.</article></div></div></section>`,
  },
  'presentation-editorial-light': {
    id: 'presentation-editorial-light',
    artifactType: 'presentation',
    label: 'Editorial Light',
    summary: 'A light, editorial slide system with serif-sans pairing, refined cards, and asymmetric rhythm.',
    typography: [
      'Pair an editorial serif headline with a crisp sans body font.',
      'Let labels and dividers create rhythm instead of oversized captions everywhere.',
    ],
    paletteRules: [
      'Use paper-like light backgrounds with 1-2 disciplined accent colors.',
      'Express category changes through borders, chips, and SVG strokes rather than full-card fills.',
    ],
    layoutRules: [
      'Favor asymmetric two-column layouts and full-width strips over equal KPI walls.',
      'Embed diagrams inside the information cards instead of separating narrative and visual explanation.',
    ],
    motionRules: [
      'Animate the diagram logic, not the whole page.',
      'Keep page-level movement subtle and slow.',
    ],
    confidentialityRules: [
      'Use synthetic labels, values, and category names.',
      'Never carry over real entities, mechanisms, or case narratives from source examples.',
    ],
    syntheticExample: `<section data-background-color="#f4fafc"><header class="editorial-rail"><div class="eyebrow">Editorial Explainer</div><h2>How the System Connects</h2></header><div class="editorial-grid"><article class="mechanism-card"><div class="label">Mechanism</div><h3>Layered Support</h3><p>Explain the system with one embedded inline diagram and one concise narrative block.</p></article><aside class="metric-strip"><div class="metric-value">Core Metric</div><p>Use a full-width strip to punctuate the reading rhythm.</p></aside></div></section>`,
  },
  'presentation-finance-grid-light': {
    id: 'presentation-finance-grid-light',
    artifactType: 'presentation',
    label: 'Finance Grid Light',
    summary: 'A finance and infographic grid language with light backgrounds, disciplined accent edges, and bespoke inline diagrams.',
    typography: [
      'Use serif headlines or bold sans headlines with smaller uppercase metadata.',
      'Let metric numbers be large, but keep the surrounding copy compact.',
    ],
    paletteRules: [
      'Use pale blue, paper, or soft neutral backgrounds with teal and green accents.',
      'Use one accent per card or mechanism, not rainbow dashboards.',
    ],
    layoutRules: [
      'Build the page with one header rail, one asymmetric grid, and one full-width stack or strip.',
      'Prefer tapered stacks, embedded diagrams, and callout strips over repeated equal cards.',
    ],
    motionRules: [
      'Use micro sweeps, pulses, and line movement inside diagrams.',
      'Avoid motion that shifts the card geometry itself.',
    ],
    confidentialityRules: [
      'Use synthetic metrics and mechanism names.',
      'Do not include real sectors, capital structures, places, or years from source material.',
    ],
    syntheticExample: `<section data-background-color="#f0f8fc"><header class="finance-rail"><h2>Mechanism Snapshot</h2><div class="meta">Light infographic system</div></header><div class="finance-grid"><article class="finance-card accent-a"><div class="card-label">Signal</div><h3>Risk Layer</h3><p>Use a compact explanation paired with a bespoke inline diagram.</p></article><article class="finance-card accent-b"><div class="big-number">72%</div><p>Show only the strongest figure on each card.</p></article></div><div class="tier-strip">Use a tapered stack or summary strip to show hierarchy.</div></section>`,
  },
  'presentation-quiz-show': {
    id: 'presentation-quiz-show',
    artifactType: 'presentation',
    label: 'Quiz Show',
    summary: 'A playful interstitial with a bold focal device, clear prompt, and tightly-controlled game-show energy.',
    typography: [
      'Use a condensed headline and a strong sans support font.',
      'Keep the prompt sharp and short.',
    ],
    paletteRules: [
      'Use one dark focal tone with bright accent cyan or teal on a light field.',
      'Keep the palette tight so the interactive element owns the stage.',
    ],
    layoutRules: [
      'Center one dominant focal object with a compact text stack.',
      'Use floating symbols or rings as support, not clutter.',
    ],
    motionRules: [
      'Use pulse, spin, and ring animations only around the central object.',
      'Keep motion playful but bounded.',
    ],
    confidentialityRules: [
      'Use generic quiz language only.',
      'Do not reuse external brand names or proprietary game-show framing.',
    ],
    syntheticExample: `<section data-background-color="#eaf5fa"><div class="quiz-stage"><div class="signal-eyebrow">Knowledge Check</div><div class="quiz-core"></div><h2>Quick Question</h2><p>Use one centered prompt and one playful focal device.</p></div></section>`,
  },
  'document-professional-light': {
    id: 'document-professional-light',
    artifactType: 'document',
    label: 'Professional Light Document',
    summary: 'A cleaner professional document system with restrained light palettes, better typography, and stronger modular hierarchy.',
    typography: [
      'Use a premium heading font or higher-contrast sans for titles, then a quiet sans for body copy.',
      'Tighten spacing rhythm and reduce decorative noise.',
    ],
    paletteRules: [
      'Bias toward paper, slate, and muted editorial light themes.',
      'Use color as a sectioning aid, not as constant decoration.',
    ],
    layoutRules: [
      'Use one strong hero/header, one disciplined metadata or KPI module, and clean section rhythm.',
      'Reserve side rails and comparison modules for real informational value.',
    ],
    motionRules: [
      'Documents should remain mostly static and print-friendly.',
      'Use only subtle entrance or accent motion where already supported.',
    ],
    confidentialityRules: [
      'Use synthetic section names and generic labels.',
      'Do not reuse real business cases, names, locations, figures, or sector framing from the source references.',
    ],
    syntheticExample: `<article class="doc-shell theme-editorial-light"><header class="doc-header"><div class="doc-eyebrow">Executive Brief</div><h1>Program Overview</h1><p class="doc-lead">A cleaner, lighter professional document with one clear thesis and disciplined supporting modules.</p></header><section class="doc-proof-strip"><strong>Recommendation</strong><p>Lead with a concise position and support it with one structured evidence band.</p></section></article>`,
  },
  'document-executive-light': {
    id: 'document-executive-light',
    artifactType: 'document',
    label: 'Executive Light Document',
    summary: 'A decision-ready executive document with a strong hero summary, compact KPI module, and one clear recommendation band — designed for quick senior review.',
    typography: [
      'Use a high-contrast condensed or bold sans for the title and a clean readable sans for body copy.',
      'Keep metadata labels and status badges small but legible; avoid tiny annotation text.',
    ],
    paletteRules: [
      'Use a light paper or off-white base with one disciplined blue or teal accent for key signals.',
      'Use accent color on borders, status chips, and the recommendation band only — not as background fills.',
    ],
    layoutRules: [
      'Lead with a concise hero row: title, status badge, and one-sentence lead.',
      'Follow with a compact KPI or metadata grid, then one recommendation or decision callout.',
      'Keep sections short and scannable with visual resets every one to two blocks.',
    ],
    motionRules: [
      'Keep the document static and print-friendly.',
      'Do not introduce ambient animations or background motion.',
    ],
    confidentialityRules: [
      'Use synthetic priorities, ownership labels, and status badges only.',
      'Do not include real decision names, leadership titles, project codes, or organization details.',
    ],
    syntheticExample: `<article class="doc-shell"><header class="doc-header"><div class="doc-eyebrow">Executive Brief</div><div class="doc-title-row"><h1>Decision Snapshot</h1><span class="doc-status-badge">REVIEW</span></div><p class="doc-lead">A concise view of the key constraint and the recommended next move.</p></header><div class="doc-kpi-grid"><div class="doc-kpi"><div class="doc-kpi-value">01</div><div class="doc-kpi-label">Decision</div></div><div class="doc-kpi"><div class="doc-kpi-value">03</div><div class="doc-kpi-label">Priorities</div></div></div><section class="doc-proof-strip"><strong>Recommendation</strong><p>Prioritize the clearest execution path to reduce decision drag.</p></section></article>`,
  },
  'document-editorial-light': {
    id: 'document-editorial-light',
    artifactType: 'document',
    label: 'Editorial Light Document',
    summary: 'A premium editorial document with asymmetric rhythm, pull quotes, and evidence blocks — designed to feel like a polished report or magazine-style analysis.',
    typography: [
      'Pair a strong editorial heading (serif or high-contrast sans) with a quiet body sans.',
      'Use pull quotes and section eyebrows to create rhythm rather than uniform paragraph breaks.',
    ],
    paletteRules: [
      'Use a paper-white or light cream base with a single restrained accent for section dividers and pull quotes.',
      'Reserve saturated color for the evidence band or one highlight module only.',
    ],
    layoutRules: [
      'Alternate between narrative sections and structured evidence modules (comparison cards, KPI bands, pull quotes).',
      'Give at least one section an editorial side-rail or asymmetric accent treatment.',
      'Avoid repeating the same section template back-to-back.',
    ],
    motionRules: [
      'Keep the document largely static and readable.',
      'Allow subtle fade-in or section accent only where the content calls for emphasis.',
    ],
    confidentialityRules: [
      'Use synthetic category names, signal labels, and editorial framing only.',
      'Do not carry over real case narratives, sector claims, or findings from reference material.',
    ],
    syntheticExample: `<article class="doc-shell"><header class="doc-header"><div class="doc-eyebrow">Editorial Report</div><h1 class="doc-title-gradient">Three Signals Worth Watching</h1><p class="doc-lead">A narrative-led analysis with evidence blocks and premium editorial pacing.</p></header><div class="doc-story-grid"><article class="doc-story-card"><div class="doc-kpi-label">Signal 01</div><h3>Demand is consolidating</h3><p>Buyers are moving toward fewer, more integrated options.</p></article><aside class="doc-story-card"><div class="doc-kpi-label">Why it matters</div><p>Positioning clarity now matters as much as raw feature count.</p></aside></div><section class="doc-proof-strip"><strong>Editorial thesis</strong><p>A clear evidence band turns the narrative into a memorable decision point.</p></section></article>`,
  },
  'document-proposal-light': {
    id: 'document-proposal-light',
    artifactType: 'document',
    label: 'Proposal Light Document',
    summary: 'A structured proposal document with value proposition framing, current-vs-proposed comparison, proof strips, and clear next-step modules.',
    typography: [
      'Use a confident heading font with a structured sans for body and module labels.',
      'Keep section headings short and action-oriented.',
    ],
    paletteRules: [
      'Use a clean light base with one teal or blue accent for the value proposition and CTA areas.',
      'Use muted separators and proof strip borders to reinforce structure without decoration.',
    ],
    layoutRules: [
      'Frame the document as a proposal board: value proposition, evidence, comparison, and next steps.',
      'Use proof strips and comparison modules instead of plain narrative blocks.',
      'Close with a clear commitment or next-step callout.',
    ],
    motionRules: [
      'Keep the document static and presentation-safe.',
      'Do not use animations or ambient motion in proposal documents.',
    ],
    confidentialityRules: [
      'Use synthetic value propositions, program names, and comparison labels only.',
      'Do not include real client names, contract values, sector specifics, or timeline details.',
    ],
    syntheticExample: `<article class="doc-shell"><header class="doc-header"><div class="doc-eyebrow">Strategic Proposal</div><h1>From Current State to Target State</h1><p class="doc-lead">A structured proposal with value framing, evidence, and a clear path forward.</p></header><div class="doc-comparison"><div class="doc-comparison-col"><h3>Current State</h3><p>Describe the gap or friction to be resolved.</p></div><div class="doc-comparison-col"><h3>Proposed State</h3><p>Describe the target outcome and why it is achievable.</p></div></div><section class="doc-proof-strip"><strong>Next Step</strong><p>One clear commitment action with an owner and a time horizon.</p></section></article>`,
  },
  'document-research-light': {
    id: 'document-research-light',
    artifactType: 'document',
    label: 'Research Light Document',
    summary: 'A disciplined research document with clean methodology framing, structured findings blocks, and evidence-first presentation — designed for professional research summaries and assessments.',
    typography: [
      'Use a professional sans or clean serif for headings with a quiet readable sans for body copy.',
      'Keep annotation and citation text at a consistent small size; do not mix font weights arbitrarily.',
    ],
    paletteRules: [
      'Use a clean neutral or light cool base with one accent color for findings highlights and methodology markers.',
      'Avoid decorative or saturated palette choices; let content hierarchy carry the visual weight.',
    ],
    layoutRules: [
      'Lead with context and methodology framing, then structure findings into clearly labeled blocks.',
      'Use tidy evidence cards or finding modules instead of long uninterrupted prose.',
      'Keep the layout professional and structured rather than academic and flat.',
    ],
    motionRules: [
      'Keep the document fully static and print-friendly.',
      'Research documents should not use animations or transition effects.',
    ],
    confidentialityRules: [
      'Use synthetic study labels, methodology names, and finding summaries only.',
      'Do not include real study participants, proprietary research data, or identifiable sector findings.',
    ],
    syntheticExample: `<article class="doc-shell"><header class="doc-header"><div class="doc-eyebrow">Research Summary</div><h1>Findings Overview</h1><p class="doc-lead">A structured summary of methodology, key findings, and implications.</p></header><section class="doc-methodology-band"><h2>Methodology</h2><p>Describe the approach, scope, and any relevant constraints in a concise framing block.</p></section><div class="doc-findings-grid"><article class="doc-finding-card"><div class="doc-kpi-label">Finding 01</div><h3>Primary Pattern</h3><p>State the finding clearly and support it with one evidence note.</p></article><article class="doc-finding-card"><div class="doc-kpi-label">Finding 02</div><h3>Supporting Signal</h3><p>A secondary finding that reinforces or contextualizes the primary pattern.</p></article></div></article>`,
  },
  'document-playbook-light': {
    id: 'document-playbook-light',
    artifactType: 'document',
    label: 'Playbook Light Document',
    summary: 'An operational playbook document with process rails, progress modules, numbered steps, and compact callouts — designed for guides, runbooks, and onboarding documents.',
    typography: [
      'Use a structured sans for headings and step labels; keep body copy clean and instruction-oriented.',
      'Number steps visually and keep instruction text concise — one action per step.',
    ],
    paletteRules: [
      'Use a clean white or very light neutral base with one teal or green accent for progress indicators and step markers.',
      'Use muted borders to distinguish procedural blocks from supporting notes.',
    ],
    layoutRules: [
      'Make procedural flow obvious at a glance with numbered steps, phase rails, or checklist modules.',
      'Use compact operational callouts for warnings, tips, and prerequisites.',
      'Keep sections short and action-oriented rather than narrative.',
    ],
    motionRules: [
      'Keep the document fully static.',
      'Process and operational documents should not use animations.',
    ],
    confidentialityRules: [
      'Use synthetic process names, step labels, and tool references only.',
      'Do not include real system credentials, proprietary process details, or identifiable workflow specifics.',
    ],
    syntheticExample: `<article class="doc-shell"><header class="doc-header"><div class="doc-eyebrow">Process Playbook</div><h1>Setup Guide</h1><p class="doc-lead">A step-by-step operational guide with clear phases, actions, and checkpoints.</p></header><section class="doc-phase-rail"><div class="doc-phase-step"><span class="doc-step-number">01</span><div><h3>Prepare</h3><p>Verify prerequisites and confirm the target environment is ready.</p></div></div><div class="doc-phase-step"><span class="doc-step-number">02</span><div><h3>Configure</h3><p>Apply the required settings using the provided reference values.</p></div></div><div class="doc-phase-step"><span class="doc-step-number">03</span><div><h3>Validate</h3><p>Run the verification check and confirm the expected output matches the target state.</p></div></div></section></article>`,
  },
  'document-infographic-light': {
    id: 'document-infographic-light',
    artifactType: 'document',
    label: 'Infographic Light Document',
    summary: 'A compressed infographic document with dominant visual summary modules, KPI bands, comparison strips, and minimal prose — designed for one-pagers, scorecards, and snapshot briefs.',
    typography: [
      'Use large, bold metric numbers and short labels; keep prose to a minimum.',
      'Let the numbers and module labels carry the reading hierarchy.',
    ],
    paletteRules: [
      'Use a clean light base with 2–3 disciplined accents for module differentiation.',
      'Favor teal, blue, and one warm accent; use color through borders and metric fills, not background panels.',
    ],
    layoutRules: [
      'Compress the message into a few strong visual modules: KPI band, comparison strip, and one summary callout.',
      'Use infographic bands and visual summary modules instead of long narrative sections.',
      'Keep the total document height short enough to read at a glance.',
    ],
    motionRules: [
      'Keep the document fully static and shareable.',
      'Infographic documents should not include any motion effects.',
    ],
    confidentialityRules: [
      'Use synthetic metrics, category labels, and summary values only.',
      'Do not include real figures, brand names, performance data, or identifiable reference material.',
    ],
    syntheticExample: `<article class="doc-shell doc-infographic"><header class="doc-header doc-infographic-header"><div class="doc-eyebrow">Snapshot Brief</div><h1>Program at a Glance</h1></header><div class="doc-kpi-grid"><div class="doc-kpi"><div class="doc-kpi-value">94%</div><div class="doc-kpi-label">On track</div></div><div class="doc-kpi"><div class="doc-kpi-value">12</div><div class="doc-kpi-label">Milestones</div></div><div class="doc-kpi"><div class="doc-kpi-value">3</div><div class="doc-kpi-label">Open risks</div></div></div><div class="doc-comparison"><div class="doc-comparison-col"><h3>Strengths</h3><p>Delivery velocity and team alignment are consistently strong.</p></div><div class="doc-comparison-col"><h3>Watch Items</h3><p>One dependency remains unresolved and requires escalation this cycle.</p></div></div></article>`,
  },
};

export function getReferenceStylePack(id: ReferenceStylePackId): ReferenceStylePack {
  return REFERENCE_STYLE_PACKS[id];
}

export function listReferenceStylePacks(): ReferenceStylePack[] {
  return Object.values(REFERENCE_STYLE_PACKS);
}
