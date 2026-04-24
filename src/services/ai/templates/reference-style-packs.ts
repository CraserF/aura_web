import type { DocumentType } from '@/types/project';

export type ReferenceStylePackId =
  | 'presentation-title-polished'
  | 'presentation-stage-setting'
  | 'presentation-editorial-light'
  | 'presentation-finance-grid-light'
  | 'presentation-quiz-show'
  | 'document-professional-light';

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
};

export function getReferenceStylePack(id: ReferenceStylePackId): ReferenceStylePack {
  return REFERENCE_STYLE_PACKS[id];
}

export function listReferenceStylePacks(): ReferenceStylePack[] {
  return Object.values(REFERENCE_STYLE_PACKS);
}
