export const DOCUMENT_RUNTIME_MODULE_BASE_CLASSES = [
  'doc-section',
  'doc-runtime-module',
] as const;

export const DOCUMENT_RUNTIME_SHARED_MODULE_CLASSES = [
  'doc-kpi-row',
  'doc-kpi',
  'doc-comparison',
  'doc-compare-card',
  'doc-proof-strip',
  'doc-proof-item',
  'doc-timeline',
  'doc-timeline-item',
  'doc-sidebar-layout',
  'doc-main',
  'doc-aside',
] as const;

export const DOCUMENT_RUNTIME_MODULE_CANDIDATE_SELECTORS = [
  'section',
  'article',
  '.doc-section',
  '.doc-story-card',
  '.doc-callout',
  '.doc-kpi-grid',
  '.doc-proof-strip',
  '.doc-infographic-band',
  '.doc-comparison',
  '.doc-timeline',
  '.doc-sidebar-layout',
] as const;

export const DOCUMENT_RUNTIME_SHELL_CSS = `
:root {
  --doc-primary: #1f4b99;
  --doc-accent: #0f8b8d;
  --doc-text: #162235;
  --doc-muted: #5f6f85;
  --doc-bg: #f7f9fc;
  --doc-surface: #ffffff;
  --doc-border: rgba(22, 34, 53, 0.18);
}
body {
  margin: 0;
  background: var(--doc-bg);
  color: var(--doc-text);
  font: 16px/1.6 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
.doc-shell {
  max-width: 920px;
  margin: 0 auto;
  padding: 48px 28px;
}
.doc-header {
  margin-bottom: 28px;
  padding-bottom: 22px;
  border-bottom: 1px solid var(--doc-border);
}
.doc-header h1 {
  margin: 0;
  color: var(--doc-text);
  font-size: clamp(34px, 5vw, 48px);
  line-height: 1.05;
  letter-spacing: 0;
}
.doc-section {
  margin: 22px 0;
  padding: 22px;
  border: 1px solid var(--doc-border);
  border-radius: 14px;
  background: var(--doc-surface);
}
.doc-section h2 {
  margin: 0 0 10px;
  color: var(--doc-primary);
  font-size: clamp(24px, 3.2vw, 32px);
  line-height: 1.15;
  letter-spacing: 0;
}
.doc-section p,
.doc-section li {
  color: var(--doc-text);
  font-size: 16px;
}
.doc-runtime-outline {
  background: color-mix(in srgb, var(--doc-surface) 72%, var(--doc-accent) 10%);
}
.doc-kpi-row,
.doc-proof-strip,
.doc-comparison {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
  margin-top: 16px;
}
.doc-kpi,
.doc-proof-item,
.doc-compare-card {
  padding: 16px;
  border: 1px solid var(--doc-border);
  border-radius: 12px;
  background: color-mix(in srgb, var(--doc-surface) 82%, var(--doc-bg));
}
.doc-kpi strong {
  display: block;
  color: var(--doc-primary);
  font-size: clamp(24px, 4vw, 36px);
  line-height: 1;
}
.doc-kpi span,
.doc-proof-item span,
.doc-compare-card span {
  display: block;
  margin-top: 6px;
  color: var(--doc-muted);
  font-size: 14px;
  line-height: 1.4;
}
.doc-timeline {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}
.doc-timeline-item {
  padding-left: 16px;
  border-left: 3px solid var(--doc-accent);
}
.doc-timeline-item strong {
  display: block;
  color: var(--doc-primary);
}
.doc-sidebar-layout {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(220px, 0.85fr);
  gap: 18px;
  align-items: start;
}
.doc-aside {
  padding: 16px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--doc-surface) 72%, var(--doc-accent) 10%);
}
img,
svg,
canvas,
table {
  max-width: 100%;
}
table {
  width: 100%;
  border-collapse: collapse;
}
@media (max-width: 720px) {
  .doc-shell { padding: 32px 18px; }
  .doc-section { padding: 18px; }
  .doc-sidebar-layout { grid-template-columns: 1fr; }
}
@media print {
  body { background: #fff; }
  .doc-shell { max-width: none; padding: 0; }
  .doc-section { break-inside: avoid; box-shadow: none; }
}
`;

export function getDocumentRuntimeModuleWrapperClassName(extraClasses: Iterable<string> = []): string {
  return Array.from(new Set([
    ...DOCUMENT_RUNTIME_MODULE_BASE_CLASSES,
    ...Array.from(extraClasses).filter((className) => className !== 'doc-shell'),
  ])).join(' ');
}
