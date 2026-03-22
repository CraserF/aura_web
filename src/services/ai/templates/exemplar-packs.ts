import type { ExemplarPackId } from './resolver';

export interface ExemplarPack {
  id: ExemplarPackId;
  name: string;
  visualThesis: string;
  compositionRules: string[];
  componentRules: string[];
  motionRules: string[];
  htmlExcerpt: string;
}

const EXEMPLAR_PACKS: Record<ExemplarPackId, ExemplarPack> = {
  'default-template': {
    id: 'default-template',
    name: 'Template Native',
    visualThesis: 'Use the selected template as the primary design anchor and preserve one consistent component family across the deck.',
    compositionRules: [
      'Let one dominant visual pattern lead each slide rather than mixing unrelated layout ideas.',
      'Reuse the same spacing rhythm, border radii, and label system across slides.',
      'Treat the title slide as the deck thesis: one hero lockup, one supporting visual system, and one clear accent treatment.',
    ],
    componentRules: [
      'Prefer a small set of repeatable cards, strips, callouts, and metric chips.',
      'If a slide uses a diagram, integrate it into the same component grammar rather than making it feel pasted in.',
    ],
    motionRules: [
      'Use motion to reinforce hierarchy and reading order only.',
      'Reserve continuous animation for background or decorative layers, not paragraphs of text.',
    ],
    htmlExcerpt: `<section data-background-color="#0f172a" style="--primary:#38bdf8; --accent:#8b5cf6; --heading-font:'Space Grotesk',sans-serif; --body-font:'Inter',sans-serif;">
  <div style="width:100%; height:100%; padding:4rem 5rem; box-sizing:border-box; display:flex; flex-direction:column; justify-content:center; gap:1.25rem;">
    <div style="font-size:0.78em; letter-spacing:0.24em; text-transform:uppercase; color:rgba(255,255,255,0.55);">Strategic Narrative</div>
    <h1 style="font-family:var(--heading-font); font-size:4.4em; line-height:0.94; letter-spacing:-0.04em; color:#fff; margin:0;">One Strong Visual Thesis</h1>
    <p style="font-family:var(--body-font); font-size:1.18em; line-height:1.6; color:rgba(255,255,255,0.78); max-width:820px;">A premium slide behaves like a designed landing page: one strong scene, one hierarchy, and a disciplined set of supporting components.</p>
  </div>
</section>`,
  },
  'split-world-title': {
    id: 'split-world-title',
    name: 'Split-World Title Slide',
    visualThesis: 'Build the opening as a full-canvas scene where two domains occupy distinct visual worlds and are joined by a central seam, bridge, or nexus.',
    compositionRules: [
      'Use a split background or two atmospheric regions with a clear dividing seam.',
      'Keep the main title block centered and dominant, with the title acting as the bridge between the two worlds.',
      'Make the background active with subtle SVG fields, grid lines, waves, particles, or server/water motifs rather than flat gradients.',
      'Use pills and small labels for supporting categories instead of heavy multi-card layouts on the title slide.',
    ],
    componentRules: [
      'Include an eyebrow label, central hero lockup, slim divider row, and a two-pillar or two-signal supporting row.',
      'Treat the seam, connector, or pipeline as a reusable motif that can reappear in later slides.',
      'If using SVG, make it read like a designed system diagram, not clip-art.',
    ],
    motionRules: [
      'Use continuous background motion sparingly: wave drift, scan lines, pulsing nodes, floating particles.',
      'Keep foreground text entrances crisp and restrained so the background remains atmospheric, not distracting.',
    ],
    htmlExcerpt: `<section data-background-color="#eaf6fa" style="--primary:#0098b8; --accent:#00a868; --heading-font:'Barlow Condensed',sans-serif; --body-font:'Source Sans 3',sans-serif; position:relative; overflow:hidden;">
  <div style="position:absolute; inset:0; background:linear-gradient(90deg,#d8eef8 0 49.6%, #d4f0e8 50.4% 100%);"></div>
  <div style="position:absolute; inset:0; background:linear-gradient(180deg, transparent, rgba(0,152,184,0.08));"></div>
  <div style="position:absolute; left:50%; top:0; bottom:0; width:4px; transform:translateX(-50%); background:linear-gradient(to bottom,#00c8a0,#0098b8,#00c8a0); opacity:0.65;"></div>
  <div style="position:relative; z-index:1; width:100%; height:100%; padding:3rem 4rem; box-sizing:border-box; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:1rem; text-align:center;">
    <div style="font-size:0.78em; letter-spacing:0.34em; text-transform:uppercase; color:#008870; font-weight:700;">Strategic Advisory</div>
    <h1 style="font-family:var(--heading-font); font-size:5em; line-height:0.9; letter-spacing:-0.04em; text-transform:uppercase; color:#041828; margin:0;">Water <span style="color:var(--primary);">&amp;</span> Data Centre</h1>
    <p style="font-family:var(--body-font); font-size:1.12em; color:#2a6878; letter-spacing:0.16em; text-transform:uppercase; margin:0;">Two systems, one investment narrative</p>
  </div>
</section>`,
  },
  'editorial-infographic': {
    id: 'editorial-infographic',
    name: 'Editorial Infographic',
    visualThesis: 'Compose slides like an editorial spread: strong title rail, asymmetric card hierarchy, and embedded micro-diagrams that explain the mechanism directly inside the layout.',
    compositionRules: [
      'Use top header bars, narrow eyebrow labels, and strong horizontal dividers to frame the page.',
      'Mix asymmetric columns, full-width callout strips, and stacked layers instead of repeating equal-width cards.',
      'Integrate diagrams into the cards themselves so the visual explanation and the text read as one unit.',
      'Favor light backgrounds with tightly controlled accent colors that categorize mechanisms or sections.',
    ],
    componentRules: [
      'Cards should have a label, title, body copy, and one embedded visual motif such as a funnel, shield, pool, stack, or loop diagram.',
      'Use pills, strips, and big-number callouts to vary density while keeping the same editorial system.',
      'For stack or tier slides, taper widths or change borders to show hierarchy instead of relying on bullet lists.',
    ],
    motionRules: [
      'Use micro-animation inside SVGs or layered bands: sweep lines, pulsing dots, ripples, slow scans.',
      'Keep the overall layout stable; motion should animate the diagram logic, not move the whole page around.',
    ],
    htmlExcerpt: `<section data-background-color="#f0f8fc" style="--primary:#0090b8; --accent:#009878; --heading-font:'Playfair Display',serif; --body-font:'Source Sans 3',sans-serif;">
  <div style="width:100%; height:100%; padding:2.5rem 3rem; box-sizing:border-box; display:grid; grid-template-rows:auto 1fr auto; gap:1rem;">
    <div style="display:flex; align-items:baseline; gap:1rem; border-bottom:2px solid var(--primary); padding-bottom:0.75rem;">
      <h2 style="font-family:var(--heading-font); font-size:2.2em; line-height:1; color:#005a78; margin:0;">Blended Finance</h2>
      <div style="font-family:var(--body-font); font-size:0.72em; letter-spacing:0.28em; text-transform:uppercase; color:#4a9ab8;">Water Infrastructure</div>
    </div>
    <div style="display:grid; grid-template-columns:1.15fr 0.85fr; gap:1rem;">
      <div style="background:#fff; border-left:5px solid var(--primary); border-radius:4px; padding:1.4rem 1.6rem;">
        <div style="font-size:0.68em; letter-spacing:0.24em; text-transform:uppercase; color:#4a9ab8; font-weight:700; margin-bottom:0.5rem;">Mechanism 01</div>
        <h3 style="font-family:var(--heading-font); font-size:1.35em; color:#003a58; margin:0 0 0.5rem;">Capital Layering</h3>
        <p style="font-family:var(--body-font); font-size:0.95em; line-height:1.65; color:#3a6878; margin:0;">Pair narrative copy with a bespoke inline diagram so the mechanism is understood at a glance, not described abstractly.</p>
      </div>
      <div style="background:#e8faf4; border-left:5px solid var(--accent); border-radius:4px; padding:1.4rem 1.6rem;">
        <div style="font-size:2.6em; line-height:1; color:#007a58; font-family:var(--heading-font);">US$235M</div>
        <p style="font-family:var(--body-font); font-size:0.84em; line-height:1.55; color:#2a7860; margin:0.35rem 0 0;">Use full-width callout strips or metric blocks to punctuate the page and reset the reading rhythm.</p>
      </div>
    </div>
  </div>
</section>`,
  },
};

export function getExemplarPack(id: ExemplarPackId): ExemplarPack {
  return EXEMPLAR_PACKS[id];
}