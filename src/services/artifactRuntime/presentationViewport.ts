export type PresentationViewportId =
  | 'desktop'
  | 'desktop-wide'
  | 'tablet-portrait'
  | 'mobile-portrait'
  | 'mobile-landscape';

export interface PresentationViewportSpec {
  id: PresentationViewportId;
  width: number;
  height: number;
}

export interface PresentationViewportIssue {
  rule:
    | 'unsafe-wrapper'
    | 'viewport-units'
    | 'oversized-fixed-dimension'
    | 'risky-min-width'
    | 'tiny-source-type'
    | 'missing-section-background'
    | 'dense-grid-risk';
  severity: 'blocking' | 'advisory';
  detail: string;
}

export interface PresentationViewportValidationResult {
  passed: boolean;
  checkedViewports: PresentationViewportSpec[];
  blockingCount: number;
  advisoryCount: number;
  issues: PresentationViewportIssue[];
}

export const PRESENTATION_VIEWPORT_MATRIX: PresentationViewportSpec[] = [
  { id: 'desktop', width: 1440, height: 900 },
  { id: 'desktop-wide', width: 1920, height: 1080 },
  { id: 'tablet-portrait', width: 834, height: 1112 },
  { id: 'mobile-portrait', width: 390, height: 844 },
  { id: 'mobile-landscape', width: 844, height: 390 },
];

function extractStyleText(html: string): string {
  return (html.match(/<style[\s\S]*?<\/style>/gi) ?? [])
    .map((block) => block.replace(/<\/?style[^>]*>/gi, ''))
    .join('\n');
}

function extractSectionFragments(html: string): string[] {
  return html.match(/<section\b[\s\S]*?<\/section>/gi) ?? [];
}

function uniqueIssues(issues: PresentationViewportIssue[]): PresentationViewportIssue[] {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.rule}:${issue.severity}:${issue.detail}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function validatePresentationViewportContract(
  html: string,
  viewports: PresentationViewportSpec[] = PRESENTATION_VIEWPORT_MATRIX,
): PresentationViewportValidationResult {
  const issues: PresentationViewportIssue[] = [];
  const styleText = extractStyleText(html);
  const sections = extractSectionFragments(html);

  if (/<(?:html|body|script)\b/i.test(html)) {
    issues.push({
      rule: 'unsafe-wrapper',
      severity: 'blocking',
      detail: 'Presentation fragments must not include document wrappers or JavaScript.',
    });
  }

  if (/\b(?:width|height|min-width|min-height|max-width|max-height|inset|top|right|bottom|left|padding|margin|gap|font-size)\s*:[^;{}]*(?:\d|\))\s*(?:vw|vh|dvw|dvh|vmin|vmax)\b/i.test(styleText)) {
    issues.push({
      rule: 'viewport-units',
      severity: 'blocking',
      detail: 'Slide CSS uses viewport units for layout or type; Aura scales a fixed 16:9 stage, so source-space units are safer.',
    });
  }

  for (const match of styleText.matchAll(/\b(?:width|min-width|max-width)\s*:\s*(\d+(?:\.\d+)?)px/gi)) {
    const width = Number.parseFloat(match[1] ?? '0');
    if (width > 1920) {
      issues.push({
        rule: 'oversized-fixed-dimension',
        severity: 'blocking',
        detail: `Fixed width ${width}px exceeds the 1920px presentation stage.`,
      });
    } else if (match[0].toLowerCase().startsWith('min-width') && width > 640) {
      issues.push({
        rule: 'risky-min-width',
        severity: 'advisory',
        detail: `min-width ${width}px can reduce flexibility inside scaled presentation frames.`,
      });
    }
  }

  for (const match of styleText.matchAll(/\b(?:height|min-height|max-height)\s*:\s*(\d+(?:\.\d+)?)px/gi)) {
    const height = Number.parseFloat(match[1] ?? '0');
    if (height > 1080) {
      issues.push({
        rule: 'oversized-fixed-dimension',
        severity: 'blocking',
        detail: `Fixed height ${height}px exceeds the 1080px presentation stage.`,
      });
    }
  }

  const tinyFontSizes = [
    ...Array.from(styleText.matchAll(/font-size\s*:\s*(\d+(?:\.\d+)?)px/gi)),
    ...Array.from(styleText.matchAll(/font-size\s*:\s*clamp\(\s*(\d+(?:\.\d+)?)px/gi)),
  ]
    .map((match) => Number.parseFloat(match[1] ?? '0'))
    .filter((size) => size > 0 && size < 16);
  if (tinyFontSizes.length > 0) {
    issues.push({
      rule: 'tiny-source-type',
      severity: 'blocking',
      detail: 'Essential source font sizes below 16px become too small when the fixed stage is scaled.',
    });
  }

  for (const [index, section] of sections.entries()) {
    if (!/data-background-color=["']#[0-9a-f]{6}["']/i.test(section)) {
      issues.push({
        rule: 'missing-section-background',
        severity: 'blocking',
        detail: `Slide ${index + 1} is missing a concrete hex data-background-color value.`,
      });
    }

    const cardLikeCount = (section.match(/class=["'][^"']*(?:card|metric|kpi|panel|tile|stat)[^"']*["']/gi) ?? []).length;
    const denseGrid = /grid-template-columns\s*:\s*repeat\(\s*[4-9]\s*,/i.test(section);
    if (cardLikeCount >= 8 || denseGrid) {
      issues.push({
        rule: 'dense-grid-risk',
        severity: 'advisory',
        detail: `Slide ${index + 1} may be too dense for scaled tablet and mobile presentation frames.`,
      });
    }
  }

  const unique = uniqueIssues(issues);
  return {
    passed: unique.every((issue) => issue.severity !== 'blocking'),
    checkedViewports: viewports,
    blockingCount: unique.filter((issue) => issue.severity === 'blocking').length,
    advisoryCount: unique.filter((issue) => issue.severity === 'advisory').length,
    issues: unique,
  };
}
