export const LONG_FORM_DOCUMENT_FIXTURE = `
<style>
  .doc-shell {
    --doc-primary: #1d4ed8;
    --doc-accent: #0ea5e9;
    --doc-text: #0f172a;
    --doc-bg: #f8fafc;
    --doc-surface: rgba(15, 23, 42, 0.05);
  }
  .doc-shell .doc-story-grid {
    display: grid;
    gap: 18px;
    grid-template-columns: minmax(0, 1.5fr) minmax(220px, 0.9fr);
  }
</style>
<div class="doc-shell">
  <header class="doc-header">
    <div class="doc-eyebrow">Long-form Report</div>
    <h1>Operating Model Refresh</h1>
    <p class="doc-lead">A long-form document that keeps one strong narrative column and a supporting evidence rail.</p>
  </header>
  <section class="doc-story-grid">
    <article class="doc-story-card">
      <h2>Why now</h2>
      <p>The current operating model has accumulated handoffs, duplicate status reporting, and unclear ownership around launch readiness.</p>
      <p>Leaders want a cleaner structure that keeps the decision path obvious without flattening the narrative into a memo wall.</p>
    </article>
    <aside class="doc-story-card">
      <h3>Supporting evidence</h3>
      <p>Three review cycles, two duplicated checkpoints, and one recurring launch blocker all point to the same process gap.</p>
    </aside>
  </section>
</div>
`;

export const DENSE_DOCUMENT_FIXTURE = `
<style>
  .doc-shell {
    --doc-primary: #7c3aed;
    --doc-accent: #ec4899;
    --doc-text: #111827;
    --doc-bg: #ffffff;
    --doc-surface: rgba(17, 24, 39, 0.05);
  }
  .doc-shell .doc-feature-grid {
    display: grid;
    gap: 16px;
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
</style>
<div class="doc-shell">
  <header class="doc-header">
    <div class="doc-eyebrow">Dense Snapshot</div>
    <h1>Category Pulse</h1>
    <p class="doc-lead">A visually dense document used to test mobile-hostile layout detection.</p>
  </header>
  <section class="doc-feature-grid">
    <article class="doc-feature"><h2>North</h2><p>Steady.</p></article>
    <article class="doc-feature"><h2>South</h2><p>Improving.</p></article>
    <article class="doc-feature"><h2>East</h2><p>Constrained.</p></article>
    <article class="doc-feature"><h2>West</h2><p>Volatile.</p></article>
  </section>
</div>
`;

export const PRESENTATION_MOBILE_FIXTURE = `
<style>
  .slide-wrap {
    display: grid;
    gap: 24px;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
</style>
<section data-background-color="#0f172a">
  <div class="slide-wrap">
    <article class="metric-card"><h2>Pipeline</h2><p>92%</p></article>
    <article class="metric-card"><h2>Margin</h2><p>31%</p></article>
    <article class="metric-card"><h2>Velocity</h2><p>14d</p></article>
    <article class="metric-card"><h2>Quality</h2><p>4.8</p></article>
    <article class="browser-frame"><h2>Journey</h2><p>Screenshot panel with nested annotations and browser chrome.</p></article>
    <article class="metric-card"><h2>Risk</h2><p>Medium</p></article>
  </div>
</section>
`;
