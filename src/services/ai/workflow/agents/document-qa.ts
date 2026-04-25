/**
 * Document QA Validator — Lightweight programmatic post-generation checks.
 *
 * Catches mechanical issues without requiring an LLM call:
 * missing styles, flat structure, no headings, walls of text, etc.
 */

export interface DocumentQAViolation {
  rule: string;
  severity: 'error' | 'warning';
  detail: string;
}

export interface DocumentQAResult {
  passed: boolean;
  score: number; // 0–100, heuristic quality score
  violations: DocumentQAViolation[];
}

/**
 * Run programmatic QA checks on generated document HTML.
 */
export function validateDocument(html: string): DocumentQAResult {
  const violations: DocumentQAViolation[] = [];

  if (!html.trim()) {
    return { passed: false, score: 0, violations: [{ rule: 'empty', severity: 'error', detail: 'Document is empty' }] };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const body = doc.body;

  // 1. Must have a <style> block
  const hasStyle = /<style[\s>]/i.test(html);
  if (!hasStyle) {
    violations.push({ rule: 'has-style', severity: 'error', detail: 'Missing <style> block — document will look unstyled' });
  }

  // 2. Must have CSS custom properties
  const hasCustomProps = /--doc-(?:primary|accent|text|bg|surface)/i.test(html);
  if (hasStyle && !hasCustomProps) {
    violations.push({ rule: 'custom-props', severity: 'warning', detail: 'No CSS custom properties (--doc-*) found — colours may be inconsistent' });
  }

  const styleText = Array.from(doc.querySelectorAll('style')).map((node) => node.textContent ?? '').join('\n');
  const weakSurfaceAlpha = Array.from(styleText.matchAll(/--doc-(surface-alt|border)\s*:\s*rgba\([^)]*,\s*([0-9]*\.?[0-9]+)\)/gi))
    .some(([, token, alpha]) => {
      const value = Number.parseFloat(alpha ?? '0');
      return token === 'border' ? value < 0.14 : value < 0.09;
    });
  if (weakSurfaceAlpha) {
    violations.push({
      rule: 'low-contrast-theme',
      severity: 'warning',
      detail: 'Theme uses very low-opacity surfaces or borders — contrast may feel washed out on screen or in PDF.',
    });
  }

  const readableTextRules = Array.from(styleText.matchAll(/(?:^|})\s*(body|\.doc-shell|\.doc-body|\.doc-content|p|li|td|th)\b[^{]*\{[^}]*font-size\s*:\s*(\d+(?:\.\d+)?)px/gi))
    .map(([, selector, size]) => ({
      selector: selector ?? 'text',
      size: Number.parseFloat(size ?? '0'),
    }))
    .filter((entry) => entry.size > 0 && entry.size < 16);
  if (readableTextRules.length > 0) {
    violations.push({
      rule: 'weak-typography-scale',
      severity: 'warning',
      detail: `Document body text uses source sizes below 16px (${readableTextRules[0]?.selector}: ${readableTextRules[0]?.size}px).`,
    });
  }

  const rawText = body.textContent ?? '';
  if (/\*\*[^*\n]+\*\*|\[[^\]]+\]\([^)]+\)|(^|\s)\*[^*\n]+\*(?=\s|[.,;:!?]|$)/m.test(rawText)) {
    violations.push({
      rule: 'literal-markdown',
      severity: 'warning',
      detail: 'Visible raw markdown markers detected in the rendered document text.',
    });
  }

  // 3. Must have h1
  const h1Count = body.querySelectorAll('h1').length;
  if (h1Count === 0) {
    violations.push({ rule: 'has-h1', severity: 'error', detail: 'No <h1> element — document lacks a title' });
  }

  // 4. Should have h2 for structure
  const h2Count = body.querySelectorAll('h2').length;
  if (h2Count === 0) {
    violations.push({ rule: 'has-h2', severity: 'warning', detail: 'No <h2> sections — document may lack structure' });
  }

  // 5. Wall-of-text check: no more than 4 consecutive <p> tags without a break
  const children = Array.from(body.querySelectorAll('p'));
  let consecutive = 0;
  let maxConsecutive = 0;
  for (const el of children) {
    const prev = el.previousElementSibling;
    if (prev && prev.tagName === 'P') {
      consecutive++;
    } else {
      consecutive = 1;
    }
    maxConsecutive = Math.max(maxConsecutive, consecutive);
  }
  if (maxConsecutive > 5) {
    violations.push({ rule: 'wall-of-text', severity: 'warning', detail: `${maxConsecutive} consecutive paragraphs without a visual break` });
  }

  // 6. Component variety check
  const componentTypes = new Set<string>();
  if (body.querySelector('.doc-stats, .doc-stat')) componentTypes.add('stats');
  if (body.querySelector('.doc-feature-grid, .doc-feature')) componentTypes.add('feature-grid');
  if (body.querySelector('.doc-callout')) componentTypes.add('callout');
  if (body.querySelector('.doc-pullquote, blockquote, figure')) componentTypes.add('quote');
  if (body.querySelector('.doc-timeline, .doc-timeline-item')) componentTypes.add('timeline');
  if (body.querySelector('.doc-comparison, table, .doc-compare-card')) componentTypes.add('table');
  if (body.querySelector('.doc-two-col, .doc-sidebar-layout')) componentTypes.add('two-col');
  if (body.querySelector('.doc-divider, hr')) componentTypes.add('divider');
  if (body.querySelector('.doc-header, header')) componentTypes.add('header');
  if (body.querySelector('ul, ol')) componentTypes.add('list');
  if (body.querySelector('.doc-kpi-grid, .doc-kpi, .doc-infographic-band, .doc-proof-strip')) componentTypes.add('infographic');
  if (body.querySelector('.doc-meta-grid, .doc-progress, .doc-rail-section, .doc-aside')) componentTypes.add('structured-info');
  if (body.querySelector('.doc-story-grid, .doc-story-card, .doc-visual')) componentTypes.add('editorial');

  const bodyText = body.textContent || '';
  const wordCount = bodyText.split(/\s+/).filter(Boolean).length;
  const minComponents = wordCount > 800 ? 4 : wordCount > 400 ? 3 : 2;
  const hasStructuredHeader = !!body.querySelector('.doc-header, header');
  const hasInfographicAnchor = !!body.querySelector('.doc-kpi-grid, .doc-comparison, .doc-timeline, .doc-progress, .doc-meta-grid, .doc-story-grid, .doc-infographic-band, .doc-proof-strip, table');

  if (componentTypes.size < minComponents) {
    violations.push({
      rule: 'component-variety',
      severity: 'warning',
      detail: `Only ${componentTypes.size} component type(s) used (${Array.from(componentTypes).join(', ')}). For ${wordCount} words, aim for ${minComponents}+.` ,
    });
  }

  if (wordCount > 180 && !hasStructuredHeader) {
    violations.push({
      rule: 'missing-hero-header',
      severity: 'warning',
      detail: 'Longer documents should open with a clear header or hero summary block, not plain text alone.',
    });
  }

  if (wordCount > 450 && !hasInfographicAnchor) {
    violations.push({
      rule: 'missing-infographic-anchor',
      severity: 'warning',
      detail: 'Longer documents should include at least one infographic-style module such as a KPI grid, comparison, timeline, progress row, or evidence band.',
    });
  }

  const paragraphCount = body.querySelectorAll('p').length;
  const sectionLikeCount = Math.max(1, body.querySelectorAll('section, article, .doc-section, .section-card, .module-card').length);
  if (wordCount > 350 && paragraphCount > sectionLikeCount * 4 && componentTypes.size < minComponents + 1) {
    violations.push({
      rule: 'text-density',
      severity: 'warning',
      detail: 'The document is still text-heavy for its length — add more visual breaks or structured summary modules.',
    });
  }

  const hasSingleColumnFallback = /@media[\s\S]{0,320}grid-template-columns\s*:\s*1fr/i.test(styleText);
  const hasRiskyFixedGrid = /grid-template-columns\s*:\s*(?:repeat\(\s*[3-9]\s*,|minmax\([^)]*\)\s+minmax\([^)]*\)\s+minmax\()/i.test(styleText);
  if (hasRiskyFixedGrid && !hasSingleColumnFallback) {
    violations.push({
      rule: 'mobile-grid-density',
      severity: 'warning',
      detail: 'Multi-column grid rules do not show a narrow-screen single-column fallback.',
    });
  }

  const hasFixedGridTrack = /grid-template-columns\s*:[^;{}]*(?:\b(?:4[0-9]{2}|[5-9][0-9]{2,}|[1-9][0-9]{3,})px\b|minmax\(\s*(?:3[6-9][0-9]|[4-9][0-9]{2,})px)/i.test(styleText);
  if (hasFixedGridTrack && !hasSingleColumnFallback) {
    violations.push({
      rule: 'fixed-grid-clipping',
      severity: 'warning',
      detail: 'Fixed-width grid tracks may clip inside the document iframe unless a narrow-screen fallback collapses the layout.',
    });
  }

  const fixedWidthMediaNodes = Array.from(body.querySelectorAll('img, video, iframe, svg, canvas')).filter((node) => {
    const widthAttr = Number.parseInt(node.getAttribute('width') ?? '', 10);
    const styleAttr = node.getAttribute('style') ?? '';
    return widthAttr >= 420 || /\b(?:width|min-width)\s*:\s*(?:4[2-9]\d|[5-9]\d\d)px/i.test(styleAttr);
  });
  const fixedWidthMediaInCss = /(?:img|video|iframe|svg|canvas|\.doc-visual|\.doc-media)[^{]*\{[^}]*\b(?:width|min-width)\s*:\s*(?:4[2-9]\d|[5-9]\d\d)px/si.test(styleText);
  if (fixedWidthMediaNodes.length > 0 || fixedWidthMediaInCss) {
    violations.push({
      rule: 'mobile-media-clipping',
      severity: 'warning',
      detail: 'Fixed-width media may clip inside the framed mobile document viewport; prefer fluid media sizing.',
    });
  }

  const header = body.querySelector('.doc-header, header');
  const headerWordCount = (header?.textContent ?? '').split(/\s+/).filter(Boolean).length;
  const headerModuleCount = header?.querySelectorAll('.doc-kpi, .doc-compare-card, .doc-story-card, .doc-meta-grid > *, .doc-kpi-grid > *').length ?? 0;
  if (header && (headerWordCount > 90 || headerModuleCount > 6)) {
    violations.push({
      rule: 'mobile-hero-density',
      severity: 'warning',
      detail: 'The opening hero/header is dense enough that it may dominate smaller framed viewports.',
    });
  }

  // 7. No empty sections
  const sections = body.querySelectorAll('section');
  for (const section of sections) {
    const text = section.textContent?.trim() || '';
    if (text.length < 10) {
      violations.push({ rule: 'empty-section', severity: 'warning', detail: 'Found a section with very little content' });
      break;
    }
  }

  // 8. Generic heading check
  const genericHeadings = ['introduction', 'conclusion', 'overview', 'summary', 'body'];
  const headings = body.querySelectorAll('h1, h2, h3');
  for (const h of headings) {
    const text = h.textContent?.trim().toLowerCase() || '';
    if (genericHeadings.includes(text)) {
      violations.push({
        rule: 'generic-heading',
        severity: 'warning',
        detail: `Generic heading "${h.textContent?.trim()}" — use a more specific, descriptive heading`,
      });
      break; // Only flag once
    }
  }

  // --- Compute quality score ---
  let score = 100;

  // Deduct for violations
  for (const v of violations) {
    score -= v.severity === 'error' ? 20 : 8;
  }

  // Bonus/penalty for structure depth
  const h3Count = body.querySelectorAll('h3').length;
  const headingDepth = Math.min(3, (h1Count > 0 ? 1 : 0) + (h2Count > 0 ? 1 : 0) + (h3Count > 0 ? 1 : 0));
  if (headingDepth < 2) score -= 10;

  // Bonus for component variety
  if (componentTypes.size >= 4) score += 5;
  if (componentTypes.size >= 5) score += 5;
  if (hasStructuredHeader) score += 3;
  if (hasInfographicAnchor) score += 4;

  // Penalty for very short documents that are just text
  if (wordCount > 200 && componentTypes.size < 2) score -= 15;

  score = Math.max(0, Math.min(100, score));

  const errorCount = violations.filter(v => v.severity === 'error').length;
  return {
    passed: errorCount === 0,
    score,
    violations,
  };
}
