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
  'title-opening': {
    id: 'title-opening',
    name: 'Title Opening',
    visualThesis: 'Open with a refined split-world or seam-led title scene that feels premium, light, and sharply composed.',
    compositionRules: [
      'Use one central hero lockup with a split background or connective seam.',
      'Keep support content to a small eyebrow and one compact signal row.',
      'Avoid opening with KPI walls or dense explanation.',
    ],
    componentRules: [
      'Use one seam, bridge, or connector motif as the core visual anchor.',
      'Keep typography bold and highly legible with a clean accent strategy.',
    ],
    motionRules: [
      'Use slow background motion only.',
      'Keep the title lockup stable and authoritative.',
    ],
    htmlExcerpt: `<section data-background-color="#eef7fa"><div class="world world-left"></div><div class="world world-right"></div><div class="world-seam"></div><div class="hero-lockup"><div class="eyebrow">Opening Frame</div><h1>One Clear<br>Starting Point</h1><p>Anchor the narrative with a refined title scene and compact support row.</p></div></section>`,
  },
  'stage-setting-context': {
    id: 'stage-setting-context',
    name: 'Stage Setting',
    visualThesis: 'Frame the problem or context with a clean scene panel, compact KPI strip, and editorial insight stack.',
    compositionRules: [
      'Use one visual panel and one structured insight stack.',
      'Keep contextual metrics concise and supportive.',
      'Favor polished editorial framing over dashboard clutter.',
    ],
    componentRules: [
      'Use a top title rail, a slim KPI strip, and 3-5 parallel insight cards.',
      'The supporting visual should feel atmospheric and purposeful, not decorative filler.',
    ],
    motionRules: [
      'Limit movement to subtle scene animation or shimmer.',
      'Keep insight cards steady after reveal.',
    ],
    htmlExcerpt: `<section data-background-color="#edf6f9"><header class="stage-header"><div class="eyebrow">Context</div><h2>Why This Shift Matters</h2></header><div class="stage-layout"><div class="scene-panel"></div><div class="stage-notes"><article>Constraint pressure is rising.</article><article>Execution needs tighter alignment.</article><article>Timing now matters more than scope growth.</article></div></div></section>`,
  },
  'finance-grid-light': {
    id: 'finance-grid-light',
    name: 'Finance Grid Light',
    visualThesis: 'Use a light infographic system with embedded diagrams, big-number callouts, and refined editorial rhythm.',
    compositionRules: [
      'Lead with a header rail, then an asymmetric grid, then one summary strip or tapered stack.',
      'Use embedded diagrams inside cards instead of generic icon + text blocks.',
      'Keep the page light and structured, not crowded.',
    ],
    componentRules: [
      'Cards should have small labels, one focused headline, and one visual explainer.',
      'Use big numbers sparingly and only when the metric genuinely matters.',
    ],
    motionRules: [
      'Use micro sweeps, pulses, and diagram-line movement.',
      'Do not animate all cards equally.',
    ],
    htmlExcerpt: `<section data-background-color="#f0f8fc"><header class="report-rail"><h2>System Snapshot</h2><div class="meta">Light infographic rhythm</div></header><div class="mechanism-grid"><article class="mechanism-card accent-teal"><div class="card-label">Signal</div><h3>Support Layer</h3><p>Explain a mechanism with one compact narrative and one embedded visual.</p></article><article class="metric-card accent-green"><div class="big-number">Core</div><p>Use one large emphasis metric instead of a wall of KPIs.</p></article></div></section>`,
  },
  'split-world-title': {
    id: 'split-world-title',
    name: 'Split-World Title Slide',
    visualThesis: 'Build the opening as a full-canvas scene where two domains occupy distinct visual worlds and are joined by a central seam, bridge, or nexus.',
    compositionRules: [
      'Use a split background or two atmospheric regions with a clear dividing seam.',
      'Keep the main title block centered and dominant, with the title acting as the bridge between the two worlds.',
      'Make the background active with subtle SVG fields, grid lines, waves, particles, or system motifs rather than flat gradients.',
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
  <div style="position:absolute; left:50%; top:0; bottom:0; width:4px; transform:translateX(-50%); background:linear-gradient(to bottom,#00c8a0,#0098b8,#00c8a0); opacity:0.65;"></div>
  <div style="position:relative; z-index:1; width:100%; height:100%; padding:3rem 4rem; box-sizing:border-box; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:1rem; text-align:center;">
    <div style="font-size:0.78em; letter-spacing:0.34em; text-transform:uppercase; color:#008870; font-weight:700;">Opening Scene</div>
    <h1 style="font-family:var(--heading-font); font-size:5em; line-height:0.9; letter-spacing:-0.04em; text-transform:uppercase; color:#041828; margin:0;">Two Worlds <span style="color:var(--primary);">Connected</span></h1>
    <p style="font-family:var(--body-font); font-size:1.12em; color:#2a6878; letter-spacing:0.16em; text-transform:uppercase; margin:0;">One narrative, one visual bridge</p>
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
      <h2 style="font-family:var(--heading-font); font-size:2.2em; line-height:1; color:#005a78; margin:0;">Mechanism Overview</h2>
      <div style="font-family:var(--body-font); font-size:0.72em; letter-spacing:0.28em; text-transform:uppercase; color:#4a9ab8;">Editorial Explainer</div>
    </div>
    <div style="display:grid; grid-template-columns:1.15fr 0.85fr; gap:1rem;">
      <div style="background:#fff; border-left:5px solid var(--primary); border-radius:4px; padding:1.4rem 1.6rem;">
        <div style="font-size:0.68em; letter-spacing:0.24em; text-transform:uppercase; color:#4a9ab8; font-weight:700; margin-bottom:0.5rem;">Key Driver</div>
        <h3 style="font-family:var(--heading-font); font-size:1.35em; color:#003a58; margin:0 0 0.5rem;">Layered Narrative</h3>
        <p style="font-family:var(--body-font); font-size:0.95em; line-height:1.65; color:#3a6878; margin:0;">Pair concise narrative copy with a bespoke inline diagram so the mechanism is understood at a glance, not described abstractly.</p>
      </div>
      <div style="background:#e8faf4; border-left:5px solid var(--accent); border-radius:4px; padding:1.4rem 1.6rem;">
        <div style="font-size:2.6em; line-height:1; color:#007a58; font-family:var(--heading-font);">Core Metric</div>
        <p style="font-family:var(--body-font); font-size:0.84em; line-height:1.55; color:#2a7860; margin:0.35rem 0 0;">Use full-width callout strips or metric blocks to punctuate the page and reset the reading rhythm.</p>
      </div>
    </div>
  </div>
</section>`,
  },
  'agenda-overview': {
    id: 'agenda-overview',
    name: 'Agenda Overview',
    visualThesis: 'Orient the audience quickly with a premium roadmap slide: one strong heading, a tight topic list, and crisp sequencing cues.',
    compositionRules: [
      'Lead with a strong title and one-sentence framing line.',
      'Present 3-6 agenda items in a clearly ordered grid, strip, or step row.',
      'Keep the slide airy and calm; this is a navigation moment, not a data dump.',
    ],
    componentRules: [
      'Use numbered chips, short topic cards, or slim rails to show progression.',
      'Each agenda item should be a short phrase, not a paragraph.',
    ],
    motionRules: [
      'Use staggered entry for agenda items in reading order.',
      'Keep motion light and directional rather than decorative.',
    ],
    htmlExcerpt: `<section data-background-color="#eef8fc" style="--primary:#0d8db8; --accent:#34b37b; --heading-font:'Space Grotesk',sans-serif; --body-font:'Inter',sans-serif;">
  <div style="width:100%; height:100%; padding:3rem 4rem; box-sizing:border-box; display:grid; grid-template-rows:auto auto 1fr; gap:1rem;">
    <div style="font-size:0.75em; letter-spacing:0.28em; text-transform:uppercase; color:#4e90a7; font-weight:700;">Overview</div>
    <h2 style="font-family:var(--heading-font); font-size:3em; line-height:0.96; margin:0; color:#0f2432;">Today’s Flow</h2>
    <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:0.9rem; align-self:start;">
      <div style="background:#fff; border:1px solid #d7e7ef; border-radius:14px; padding:1rem;"><strong>01</strong><div>Context</div></div>
      <div style="background:#fff; border:1px solid #d7e7ef; border-radius:14px; padding:1rem;"><strong>02</strong><div>Opportunity</div></div>
      <div style="background:#fff; border:1px solid #d7e7ef; border-radius:14px; padding:1rem;"><strong>03</strong><div>Proof</div></div>
      <div style="background:#fff; border:1px solid #d7e7ef; border-radius:14px; padding:1rem;"><strong>04</strong><div>Next Step</div></div>
    </div>
  </div>
</section>`,
  },
  'section-divider': {
    id: 'section-divider',
    name: 'Section Divider',
    visualThesis: 'Use a sparse but dramatic chapter-break slide to reset the narrative and signal a new section of the deck.',
    compositionRules: [
      'Keep one dominant heading and one short orientation line only.',
      'Use oversized type, a seam, or a single visual accent rather than cards.',
      'Let negative space do the work.',
    ],
    componentRules: [
      'A section number, eyebrow, and one divider line are usually enough.',
      'Any supporting SVG should stay atmospheric and secondary.',
    ],
    motionRules: [
      'Use slow pulse, drift, or glow effects only.',
      'Do not overload a divider slide with multiple moving elements.',
    ],
    htmlExcerpt: `<section data-background-color="#081926" style="--primary:#2fd0ff; --accent:#8cf0c3; --heading-font:'Barlow Condensed',sans-serif; --body-font:'Source Sans 3',sans-serif;">
  <div style="width:100%; height:100%; padding:4rem 5rem; box-sizing:border-box; display:flex; flex-direction:column; justify-content:center; gap:0.8rem;">
    <div style="font-size:0.78em; letter-spacing:0.32em; text-transform:uppercase; color:rgba(255,255,255,0.58);">Section 02</div>
    <h2 style="font-family:var(--heading-font); font-size:4.5em; line-height:0.9; margin:0; text-transform:uppercase; color:#ffffff;">Operating Model</h2>
    <div style="width:84px; height:4px; border-radius:999px; background:linear-gradient(90deg,var(--primary),var(--accent));"></div>
    <p style="font-family:var(--body-font); font-size:1.05em; line-height:1.5; color:rgba(255,255,255,0.72); max-width:720px;">A clean chapter break that reorients the audience before the next run of detailed slides.</p>
  </div>
</section>`,
  },
  comparison: {
    id: 'comparison',
    name: 'Comparison Stage',
    visualThesis: 'Make trade-offs legible with two clearly differentiated sides, a strong midpoint, and minimal ambiguity about what is being contrasted.',
    compositionRules: [
      'Use a balanced two-side layout with a clear left-vs-right relationship.',
      'Anchor the comparison with one shared headline and one decisive takeaway.',
      'Color and spacing should reinforce the contrast without turning the slide into a boxing match.',
    ],
    componentRules: [
      'Each side should use parallel structure so the eye can compare quickly.',
      'A central arrow, divider, or verdict chip helps resolve the contrast.',
    ],
    motionRules: [
      'Animate the comparison in reading order: left, right, then takeaway.',
      'Keep both sides visually stable once revealed.',
    ],
    htmlExcerpt: `<section data-background-color="#eff7fb" style="--primary:#1188b8; --accent:#16a36f; --heading-font:'Space Grotesk',sans-serif; --body-font:'Inter',sans-serif;">
  <div style="width:100%; height:100%; padding:3rem 4rem; box-sizing:border-box; display:grid; grid-template-rows:auto 1fr; gap:1rem;">
    <h2 style="font-family:var(--heading-font); font-size:2.6em; margin:0; color:#102432;">Two Paths, One Decision</h2>
    <div style="display:grid; grid-template-columns:1fr auto 1fr; gap:1rem; align-items:stretch;">
      <div style="background:#fff; border:1px solid #dbe8ef; border-radius:14px; padding:1.2rem; border-left:4px solid #1188b8;"><strong>Current</strong><p>Describe the legacy state and its limitations.</p></div>
      <div style="display:flex; align-items:center; justify-content:center; color:#5c7382; font-size:1.6em;">→</div>
      <div style="background:#fff; border:1px solid #dbe8ef; border-radius:14px; padding:1.2rem; border-left:4px solid #16a36f;"><strong>Future</strong><p>Show the improved model with a clearer payoff.</p></div>
    </div>
  </div>
</section>`,
  },
  'process-timeline': {
    id: 'process-timeline',
    name: 'Process Timeline',
    visualThesis: 'Translate sequencing into a clean flow: ordered phases, directional movement, and enough annotation to make the process memorable.',
    compositionRules: [
      'Lay out 3-6 phases in a horizontal or stepped vertical progression.',
      'Show direction and momentum through lines, connectors, or numbered anchors.',
      'Keep each stage concise and structurally parallel.',
    ],
    componentRules: [
      'Use numbered nodes, milestone cards, or rails that suggest progression.',
      'Support the process with one short takeaway line, not lots of explanation.',
    ],
    motionRules: [
      'Use sweep, draw-in, or staggered node reveals to communicate progression.',
      'Avoid playful motion that disrupts the sense of order.',
    ],
    htmlExcerpt: `<section data-background-color="#f4fafc" style="--primary:#0c8eb8; --accent:#1cb386; --heading-font:'Space Grotesk',sans-serif; --body-font:'Inter',sans-serif;">
  <div style="width:100%; height:100%; padding:3rem 4rem; box-sizing:border-box; display:grid; grid-template-rows:auto auto 1fr; gap:1rem;">
    <div style="font-size:0.74em; letter-spacing:0.26em; text-transform:uppercase; color:#4d899f; font-weight:700;">Process</div>
    <h2 style="font-family:var(--heading-font); font-size:2.8em; margin:0; color:#102432;">How the Flow Works</h2>
    <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:0.9rem; align-items:start;">
      <div style="background:#fff; border-radius:14px; padding:1rem; border-top:4px solid var(--primary);"><strong>01</strong><div>Prepare</div></div>
      <div style="background:#fff; border-radius:14px; padding:1rem; border-top:4px solid var(--primary);"><strong>02</strong><div>Validate</div></div>
      <div style="background:#fff; border-radius:14px; padding:1rem; border-top:4px solid var(--accent);"><strong>03</strong><div>Deploy</div></div>
      <div style="background:#fff; border-radius:14px; padding:1rem; border-top:4px solid var(--accent);"><strong>04</strong><div>Measure</div></div>
    </div>
  </div>
</section>`,
  },
  'metrics-dashboard': {
    id: 'metrics-dashboard',
    name: 'Metrics Dashboard',
    visualThesis: 'Turn data into a premium control-room slide with a few large numbers, strong grouping, and one clear interpretive message.',
    compositionRules: [
      'Lead with 3-5 big metrics before any secondary commentary.',
      'Use a dashboard rhythm: headline, metric row, then supporting insight or mini-chart.',
      'Avoid crowding; only the strongest numbers should survive.',
    ],
    componentRules: [
      'Use metric cards, slim bars, mini trend panels, or confidence strips.',
      'Every metric needs a short label and optional directional cue.',
    ],
    motionRules: [
      'Use number fade-ins, chart draw-ins, or subtle pulse on key metrics.',
      'Avoid excessive animation on all cards at once.',
    ],
    htmlExcerpt: `<section data-background-color="#0d1824" style="--primary:#3cc4ff; --accent:#52d49b; --heading-font:'Space Grotesk',sans-serif; --body-font:'Inter',sans-serif;">
  <div style="width:100%; height:100%; padding:3rem 4rem; box-sizing:border-box; display:grid; grid-template-rows:auto auto 1fr; gap:1rem; color:#fff;">
    <div style="font-size:0.75em; letter-spacing:0.28em; text-transform:uppercase; color:rgba(255,255,255,0.58);">Key Metrics</div>
    <h2 style="font-family:var(--heading-font); font-size:2.8em; margin:0;">Performance at a Glance</h2>
    <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:1rem;">
      <div style="background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:1.2rem;"><div style="font-size:2.4em; color:var(--primary);">72%</div><div>Conversion</div></div>
      <div style="background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:1.2rem;"><div style="font-size:2.4em; color:var(--accent);">4.6x</div><div>Efficiency</div></div>
      <div style="background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:1.2rem;"><div style="font-size:2.4em; color:var(--primary);">18d</div><div>Cycle Time</div></div>
    </div>
  </div>
</section>`,
  },
  'case-study-spotlight': {
    id: 'case-study-spotlight',
    name: 'Case Study Spotlight',
    visualThesis: 'Use one real-world proof point as a focused narrative scene: one takeaway headline, a compact evidence panel, and a short story arc.',
    compositionRules: [
      'Use a split layout with insight on one side and proof details on the other.',
      'Keep the headline decisive and the evidence tightly curated.',
      'Show one spotlight, not an entire case library.',
    ],
    componentRules: [
      'Combine a short summary, 2-3 proof facts, and one supporting visual/diagram.',
      'Use labels like Outcome, Signal, Lesson, or Result to keep the narrative crisp.',
    ],
    motionRules: [
      'Use subtle reveal of evidence items and one calm accent animation in the visual pane.',
      'Do not over-animate the storytelling copy.',
    ],
    htmlExcerpt: `<section data-background-color="#f6fafc" style="--primary:#0e91bb; --accent:#17a97c; --heading-font:'Playfair Display',serif; --body-font:'Source Sans 3',sans-serif;">
  <div style="width:100%; height:100%; padding:3rem 4rem; box-sizing:border-box; display:grid; grid-template-columns:1.1fr 0.9fr; gap:1rem; align-items:stretch;">
    <div style="background:#fff; border-radius:14px; border-left:4px solid var(--primary); padding:1.4rem;">
      <div style="font-size:0.72em; letter-spacing:0.24em; text-transform:uppercase; color:#4d8fa7; font-weight:700;">Spotlight</div>
      <h2 style="font-family:var(--heading-font); font-size:2.2em; margin:0.25rem 0 0.5rem; color:#0f2532;">One Proof Point That Changed the Story</h2>
      <p style="margin:0; color:#395f70; line-height:1.6;">Summarize the moment, what changed, and why it matters now.</p>
    </div>
    <div style="background:#eef7fb; border-radius:14px; padding:1.4rem; border:1px solid #d9e9f0;">
      <strong>Result</strong>
      <ul style="margin-top:0.6rem;"><li>Evidence item one</li><li>Evidence item two</li><li>Evidence item three</li></ul>
    </div>
  </div>
</section>`,
  },
  'quote-statement': {
    id: 'quote-statement',
    name: 'Quote Statement',
    visualThesis: 'Let one unforgettable line carry the slide, with only a small amount of supporting context and a deliberate use of empty space.',
    compositionRules: [
      'Center the statement or anchor it dramatically in one half of the canvas.',
      'Keep the rest of the slide almost silent.',
      'Use one accent treatment to emphasize the key phrase.',
    ],
    componentRules: [
      'A short quote, attribution or source, and one accent divider are enough.',
      'Do not surround a statement slide with many small cards.',
    ],
    motionRules: [
      'Use a restrained text fade or line sweep.',
      'The statement should feel calm and authoritative.',
    ],
    htmlExcerpt: `<section data-background-color="#fbfaf6" style="--primary:#0c8eb8; --accent:#d09d3c; --heading-font:'Playfair Display',serif; --body-font:'Source Sans 3',sans-serif;">
  <div style="width:100%; height:100%; padding:4rem 5rem; box-sizing:border-box; display:flex; flex-direction:column; justify-content:center; gap:1rem; text-align:center;">
    <div style="font-size:0.72em; letter-spacing:0.28em; text-transform:uppercase; color:#73828b;">Key Message</div>
    <blockquote style="font-family:var(--heading-font); font-size:3.2em; line-height:1.15; margin:0; color:#112532;">“A decisive line deserves a decisive amount of space.”</blockquote>
    <div style="width:72px; height:4px; border-radius:999px; margin:0 auto; background:linear-gradient(90deg,var(--primary),var(--accent));"></div>
    <p style="margin:0; color:#5a6f7b;">Optional supporting attribution or one-sentence implication.</p>
  </div>
</section>`,
  },
  'closing-cta': {
    id: 'closing-cta',
    name: 'Closing CTA',
    visualThesis: 'End with confidence: one synthesis statement, one next-step prompt, and a finish that feels intentional rather than generic.',
    compositionRules: [
      'Use a confident headline and a short list of next actions or takeaways.',
      'Keep the ending slide clean and high-contrast so it lands strongly.',
      'A closing slide should feel like a designed finish, not a thank-you placeholder.',
    ],
    componentRules: [
      'Use one CTA button, contact rail, or three takeaway chips max.',
      'Support with a final line or small trust signal strip.',
    ],
    motionRules: [
      'Use slightly richer hero motion than a standard content slide, but keep it controlled.',
      'The CTA should appear last in the reveal order.',
    ],
    htmlExcerpt: `<section data-background-color="#091a28" style="--primary:#36c3ff; --accent:#5fd7a2; --heading-font:'Barlow Condensed',sans-serif; --body-font:'Source Sans 3',sans-serif; color:#fff;">
  <div style="width:100%; height:100%; padding:3.5rem 4.5rem; box-sizing:border-box; display:flex; flex-direction:column; justify-content:center; align-items:flex-start; gap:1rem;">
    <div style="font-size:0.76em; letter-spacing:0.3em; text-transform:uppercase; color:rgba(255,255,255,0.58);">Next Step</div>
    <h2 style="font-family:var(--heading-font); font-size:4.2em; line-height:0.92; margin:0; text-transform:uppercase;">Move From Insight to Action</h2>
    <p style="font-size:1.05em; line-height:1.6; color:rgba(255,255,255,0.76); max-width:760px; margin:0;">Close with the decision, the next milestone, or the invitation to continue the conversation.</p>
    <div style="display:inline-flex; padding:0.8rem 1.4rem; border-radius:999px; background:linear-gradient(90deg,var(--primary),var(--accent)); color:#04121b; font-weight:700;">Recommended next move</div>
  </div>
</section>`,
  },
  'quiz-interstitial': {
    id: 'quiz-interstitial',
    name: 'Quiz Interstitial',
    visualThesis: 'Create a playful reset moment with one bold focal object, centered type, and energetic but disciplined motion.',
    compositionRules: [
      'Center the composition around one strong icon or badge-like focal point.',
      'Use oversized typography and minimal copy.',
      'Keep the slide punchy and instantly readable from a distance.',
    ],
    componentRules: [
      'One focal object, one headline, one short subline, and a few peripheral motion accents are enough.',
      'Do not turn the interstitial into a content-heavy slide.',
    ],
    motionRules: [
      'Use pulse, glow, spin, and floating question marks or accents with restraint.',
      'The motion should feel playful, not chaotic.',
    ],
    htmlExcerpt: `<section data-background-color="#e8f5fa" style="--primary:#0090b8; --accent:#00a890; --heading-font:'Barlow Condensed',sans-serif; --body-font:'Source Sans 3',sans-serif;">
  <div style="width:100%; height:100%; padding:3rem; box-sizing:border-box; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:1rem; text-align:center; position:relative; overflow:hidden;">
    <div style="width:160px; height:160px; border-radius:28px; background:#46178f; display:flex; align-items:center; justify-content:center; color:#fff; font-size:4em; box-shadow:0 0 0 12px rgba(0,144,184,0.08);">?</div>
    <div style="font-size:0.78em; letter-spacing:0.3em; text-transform:uppercase; color:#0090b8; font-weight:700;">Interactive Moment</div>
    <h2 style="font-family:var(--heading-font); font-size:4em; line-height:0.9; margin:0; text-transform:uppercase; color:#041828;">Quick Check-In</h2>
    <p style="font-size:1.04em; line-height:1.5; color:#2a6070; max-width:720px; margin:0;">Use interstitial slides to reset attention, introduce a quiz, or create an intentional pause in the narrative.</p>
  </div>
</section>`,
  },
};

export function getExemplarPack(id: ExemplarPackId): ExemplarPack {
  return EXEMPLAR_PACKS[id];
}
