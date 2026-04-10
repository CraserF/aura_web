# Document Component Recipes

> Copy-paste HTML/CSS blocks for premium document sections.
> Every component uses CSS custom properties from the document theme.
> Components are optimised for reading — no animation, no JavaScript.

---

## 1. Hero Header — Gradient Title

```html
<header class="doc-header">
  <div class="doc-eyebrow">Report · Q4 2025</div>
  <h1 class="doc-title-gradient">Growth Beyond Expectations</h1>
  <p class="doc-lead">A candid look at three quarters of sustained growth, the strategic bets that paid off, and the operational challenges still ahead.</p>
</header>
```
```css
.doc-title-gradient {
  background: linear-gradient(135deg, var(--doc-primary), var(--doc-accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

## 2. Stat / Metric Row

```html
<div class="doc-stats">
  <div class="doc-stat">
    <span class="doc-stat-value">$4.2M</span>
    <span class="doc-stat-label">Revenue</span>
    <span class="doc-stat-delta positive">↑ 18%</span>
  </div>
  <div class="doc-stat">
    <span class="doc-stat-value">125K</span>
    <span class="doc-stat-label">Active Users</span>
    <span class="doc-stat-delta positive">↑ 34%</span>
  </div>
  <div class="doc-stat">
    <span class="doc-stat-value">99.9%</span>
    <span class="doc-stat-label">Uptime</span>
  </div>
  <div class="doc-stat">
    <span class="doc-stat-value">72</span>
    <span class="doc-stat-label">NPS Score</span>
    <span class="doc-stat-delta negative">↓ 3</span>
  </div>
</div>
```
```css
.doc-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px;
}
.doc-stat {
  text-align: center;
  padding: 20px 16px;
  border-radius: 16px;
  border: 1px solid var(--doc-border);
  background: linear-gradient(180deg, rgba(255,255,255,0.92) 0%, var(--doc-surface) 100%);
}
.doc-stat-value {
  display: block;
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--doc-primary);
}
.doc-stat-label {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--doc-muted);
}
.doc-stat-delta { font-size: 13px; font-weight: 600; }
.doc-stat-delta.positive { color: #16a34a; }
.doc-stat-delta.negative { color: #dc2626; }
```

## 3. Feature / Benefit Grid

```html
<div class="doc-feature-grid">
  <div class="doc-feature">
    <div class="doc-feature-icon">🚀</div>
    <h4>Performance</h4>
    <p>Sub-50ms p95 latency across all endpoints with edge-first architecture.</p>
  </div>
  <div class="doc-feature">
    <div class="doc-feature-icon">🔒</div>
    <h4>Security</h4>
    <p>SOC 2 Type II certified with end-to-end encryption at rest and in transit.</p>
  </div>
  <div class="doc-feature">
    <div class="doc-feature-icon">⚡</div>
    <h4>Developer Experience</h4>
    <p>Ship in minutes with typed SDKs, local dev server, and live previews.</p>
  </div>
</div>
```
```css
.doc-feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 18px;
}
.doc-feature {
  padding: 22px 20px;
  border-radius: 16px;
  border: 1px solid var(--doc-border);
  background: linear-gradient(180deg, rgba(255,255,255,0.94) 0%, var(--doc-surface) 100%);
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.04);
}
.doc-feature-icon {
  font-size: 1.8em;
  margin-bottom: 10px;
}
.doc-feature h4 {
  margin: 0 0 6px;
  font-size: 1rem;
  color: var(--doc-text);
}
.doc-feature p {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--doc-muted);
}
```

## 4. Callout Boxes — Info, Warning, Tip

```html
<div class="doc-callout doc-callout-info">
  <div class="doc-callout-icon">ℹ️</div>
  <div>
    <strong>Note</strong>
    <p>All API keys must be rotated every 90 days. See the security section for details.</p>
  </div>
</div>

<div class="doc-callout doc-callout-warning">
  <div class="doc-callout-icon">⚠️</div>
  <div>
    <strong>Warning</strong>
    <p>Breaking changes in v3.0 affect all webhook consumers. Review the migration guide.</p>
  </div>
</div>

<div class="doc-callout doc-callout-tip">
  <div class="doc-callout-icon">💡</div>
  <div>
    <strong>Tip</strong>
    <p>Use batch endpoints for bulk operations — they're 4× faster than sequential calls.</p>
  </div>
</div>
```
```css
.doc-callout {
  display: flex;
  gap: 14px;
  padding: 16px 20px;
  border-radius: 14px;
  border-left: 4px solid var(--doc-primary);
  background: linear-gradient(135deg, var(--doc-surface-alt) 0%, rgba(255,255,255,0.96) 100%);
}
.doc-callout-icon { font-size: 1.3em; flex: none; }
.doc-callout strong { display: block; margin-bottom: 4px; color: var(--doc-primary); }
.doc-callout p { margin: 0; font-size: 14px; line-height: 1.6; color: var(--doc-muted); }
.doc-callout-warning { border-left-color: #f59e0b; }
.doc-callout-warning strong { color: #b45309; }
.doc-callout-tip { border-left-color: #10b981; }
.doc-callout-tip strong { color: #047857; }
```

## 5. Pull Quote / Testimonial

```html
<figure class="doc-pullquote">
  <blockquote>"The best way to predict the future is to invent it."</blockquote>
  <figcaption>— Alan Kay, Computer Scientist</figcaption>
</figure>
```
```css
.doc-pullquote {
  margin: 0;
  padding: 28px 32px;
  border-radius: 18px;
  border-left: 4px solid var(--doc-accent);
  background: linear-gradient(135deg, var(--doc-surface) 0%, var(--doc-surface-alt) 100%);
  text-align: center;
}
.doc-pullquote blockquote {
  margin: 0;
  padding: 0;
  border: none;
  background: none;
  font-size: 1.25rem;
  font-style: italic;
  line-height: 1.6;
  color: var(--doc-text);
}
.doc-pullquote figcaption {
  margin-top: 12px;
  font-size: 13px;
  color: var(--doc-muted);
}
```

## 6. Timeline / Roadmap

```html
<div class="doc-timeline">
  <div class="doc-timeline-item">
    <div class="doc-timeline-marker">1</div>
    <div class="doc-timeline-body">
      <h4>Discovery & Research</h4>
      <p>User interviews, competitive analysis, and technical feasibility assessment.</p>
      <span class="doc-timeline-date">Q1 2025</span>
    </div>
  </div>
  <div class="doc-timeline-item">
    <div class="doc-timeline-marker">2</div>
    <div class="doc-timeline-body">
      <h4>MVP Development</h4>
      <p>Core feature implementation with closed beta testing.</p>
      <span class="doc-timeline-date">Q2 2025</span>
    </div>
  </div>
  <div class="doc-timeline-item">
    <div class="doc-timeline-marker">3</div>
    <div class="doc-timeline-body">
      <h4>Public Launch</h4>
      <p>Full launch with marketing push and enterprise onboarding pipeline.</p>
      <span class="doc-timeline-date">Q3 2025</span>
    </div>
  </div>
</div>
```
```css
.doc-timeline {
  display: grid;
  gap: 0;
  padding-left: 28px;
  border-left: 3px solid var(--doc-border);
}
.doc-timeline-item {
  display: flex;
  gap: 16px;
  padding: 16px 0;
  position: relative;
}
.doc-timeline-marker {
  position: absolute;
  left: -40px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--doc-primary);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.doc-timeline-body h4 { margin: 0 0 4px; color: var(--doc-text); }
.doc-timeline-body p { margin: 0; font-size: 14px; color: var(--doc-muted); }
.doc-timeline-date {
  display: inline-block;
  margin-top: 8px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--doc-accent);
}
```

## 7. Comparison Table

```html
<table class="doc-comparison">
  <thead>
    <tr><th>Feature</th><th>Free Plan</th><th class="doc-comparison-highlight">Pro Plan</th><th>Enterprise</th></tr>
  </thead>
  <tbody>
    <tr><td>Users</td><td>5</td><td class="doc-comparison-highlight">Unlimited</td><td>Unlimited</td></tr>
    <tr><td>Storage</td><td>1 GB</td><td class="doc-comparison-highlight">100 GB</td><td>Unlimited</td></tr>
    <tr><td>Support</td><td>Community</td><td class="doc-comparison-highlight">Priority</td><td>Dedicated</td></tr>
    <tr><td>SSO</td><td>—</td><td class="doc-comparison-highlight">✓</td><td>✓</td></tr>
  </tbody>
</table>
```
```css
.doc-comparison {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid var(--doc-border);
}
.doc-comparison th, .doc-comparison td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--doc-border);
}
.doc-comparison th {
  background: var(--doc-surface);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--doc-muted);
}
.doc-comparison-highlight {
  background: linear-gradient(180deg, rgba(255,255,255,0.94) 0%, var(--doc-surface-alt) 100%);
  font-weight: 600;
}
```

## 8. Accent Divider

```html
<div class="doc-divider">
  <span class="doc-divider-dot"></span>
  <span class="doc-divider-dot"></span>
  <span class="doc-divider-dot"></span>
</div>
```
```css
.doc-divider {
  display: flex;
  gap: 8px;
  justify-content: center;
  padding: 12px 0;
}
.doc-divider-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--doc-accent);
  opacity: 0.5;
}
```

## 9. Two-Column Layout

```html
<div class="doc-two-col">
  <div>
    <h3>What We Do</h3>
    <p>We build tools that help teams ship faster with less overhead.</p>
  </div>
  <div>
    <h3>Why It Matters</h3>
    <p>Engineering velocity is the strongest predictor of startup success.</p>
  </div>
</div>
```
```css
.doc-two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
.doc-two-col > div {
  padding: 20px;
  border-radius: 14px;
  border: 1px solid var(--doc-border);
  background: linear-gradient(180deg, rgba(255,255,255,0.94) 0%, var(--doc-surface) 100%);
}
```

## 10. Footer / Source Citation

```html
<footer class="doc-footer">
  <p>Sources: McKinsey Digital Report 2024 · Gartner Market Analysis · Internal Data</p>
  <p>Prepared by the Strategy & Operations team · Confidential</p>
</footer>
```
```css
.doc-footer {
  margin-top: 8px;
  padding: 16px 20px;
  border-radius: 14px;
  border-top: 1px solid var(--doc-border);
  text-align: center;
}
.doc-footer p {
  margin: 0;
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--doc-muted);
  opacity: 0.7;
}
```
