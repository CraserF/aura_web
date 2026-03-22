/**
 * QA Validator — Programmatic (no LLM) post-generation validation.
 *
 * Catches mechanical errors that don't need AI to detect:
 * missing styles, broken structure, external images, etc.
 *
 * Key improvements:
 * - Slide count validation against planned count
 * - Palette color compliance checking
 * - Layout variety detection (consecutive duplicates, insufficient variety)
 * - CSS custom property duplication warning
 */

import type { ExemplarPackId, StyleManifest } from '../../templates';

export interface QAViolation {
  slide: number;
  rule: string;
  severity: 'error' | 'warning';
  detail: string;
}

export interface QAResult {
  passed: boolean;
  violations: QAViolation[];
}

export interface QAOptions {
  /** Expected slide count from the planner (for create intent) */
  expectedSlideCount?: number;
  /** Expected background color from the palette */
  expectedBgColor?: string;
  /** Whether this is a new presentation (stricter checks) */
  isCreate?: boolean;
  /** Visual system chosen by the planner */
  styleManifest?: StyleManifest;
  /** Exemplar family chosen by the planner */
  exemplarPackId?: ExemplarPackId;
}

/**
 * Run programmatic QA checks on generated HTML.
 * Returns structured violations without requiring an LLM call.
 */
export function validateSlides(html: string, options: QAOptions = {}): QAResult {
  const violations: QAViolation[] = [];

  // Parse sections
  const sectionRegex = /<section[\s\S]*?<\/section>/gi;
  const sections: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = sectionRegex.exec(html)) !== null) {
    sections.push(match[0]);
  }

  if (sections.length === 0) {
    violations.push({
      slide: 0,
      rule: 'structure',
      severity: 'error',
      detail: 'No <section> elements found in output.',
    });
    return { passed: false, violations };
  }

  // ── Slide count validation ──────────────────────────────────
  if (options.expectedSlideCount && options.isCreate) {
    if (sections.length !== options.expectedSlideCount) {
      violations.push({
        slide: 0,
        rule: 'slide-count',
        severity: 'error',
        detail: `Expected exactly ${options.expectedSlideCount} slides but found ${sections.length}. The planner outline specified ${options.expectedSlideCount} slides. Match it exactly.`,
      });
    }
  } else if (options.isCreate && sections.length < 8) {
    violations.push({
      slide: 0,
      rule: 'slide-count',
      severity: 'error',
      detail: `Only ${sections.length} slides found. New presentations must have at least 8 slides to cover the narrative arc.`,
    });
  }

  // ── Layout variety detection ────────────────────────────────
  const layoutPatterns = detectLayoutPatterns(sections);

  // Check consecutive duplicates
  for (let i = 1; i < layoutPatterns.length; i++) {
    if (layoutPatterns[i] === layoutPatterns[i - 1] && layoutPatterns[i] !== 'hero' && layoutPatterns[i] !== 'unknown') {
      violations.push({
        slide: i + 1,
        rule: 'layout-variety',
        severity: 'warning',
        detail: `Consecutive slides ${i} and ${i + 1} both use "${layoutPatterns[i]}" layout. Vary the layout.`,
      });
    }
  }

  // Check overall variety (for decks with 6+ slides)
  if (sections.length >= 6) {
    const uniqueLayouts = new Set(layoutPatterns.filter(l => l !== 'unknown'));
    if (uniqueLayouts.size < 4) {
      violations.push({
        slide: 0,
        rule: 'layout-variety',
        severity: 'warning',
        detail: `Only ${uniqueLayouts.size} distinct layout types detected (${[...uniqueLayouts].join(', ')}). Use at least 4 different layout types for variety.`,
      });
    }
  }

  // Check card-grid overuse
  const cardGridCount = layoutPatterns.filter(l => l === 'card-grid').length;
  if (cardGridCount > 2) {
    violations.push({
      slide: 0,
      rule: 'layout-variety',
      severity: 'warning',
      detail: `Card-grid layout used ${cardGridCount} times. Maximum 2 times per deck to avoid monotony.`,
    });
  }

  // ── CSS custom property duplication ─────────────────────────
  let cssVarDuplicates = 0;
  for (let i = 1; i < sections.length; i++) {
    if (sections[i]!.includes('--primary:') && sections[i]!.includes('--heading-font:')) {
      cssVarDuplicates++;
    }
  }
  if (cssVarDuplicates > 0) {
    violations.push({
      slide: 0,
      rule: 'css-var-duplication',
      severity: 'warning',
      detail: `CSS custom properties duplicated on ${cssVarDuplicates} sections after the first. They should only be on the first <section>.`,
    });
  }

  // ── Per-section checks ──────────────────────────────────────
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i]!;
    const slideNum = i + 1;

    // Rule: every section must have data-background-color
    if (!section.includes('data-background-color')) {
      violations.push({
        slide: slideNum,
        rule: 'background-color',
        severity: 'error',
        detail: 'Missing data-background-color attribute.',
      });
    }

    // Rule: first section must define CSS custom properties
    if (i === 0) {
      if (!section.includes('--primary')) {
        violations.push({
          slide: slideNum,
          rule: 'css-vars',
          severity: 'error',
          detail: 'First section missing --primary CSS custom property.',
        });
      }
    }

    // Rule: palette compliance — check that data-background-color matches expected
    if (options.expectedBgColor) {
      const bgColorMatch = section.match(/data-background-color=["']([^"']+)["']/);
      if (bgColorMatch) {
        const actualBg = bgColorMatch[1]?.toLowerCase() ?? '';
        const expectedBg = options.expectedBgColor.toLowerCase();
        // Allow bg and bgSubtle (close variants)
        if (actualBg !== expectedBg && !isCloseColor(actualBg, expectedBg)) {
          violations.push({
            slide: slideNum,
            rule: 'palette-compliance',
            severity: 'warning',
            detail: `Background color "${bgColorMatch[1]}" doesn't match palette "${options.expectedBgColor}". Use palette colors only.`,
          });
        }
      }
    }

    // Rule: no external image URLs (src attributes)
    const imgRegex = /src=["'](https?:\/\/(?!fonts\.googleapis|fonts\.gstatic|cdn\.jsdelivr)[^"']+)["']/gi;
    let imgMatch: RegExpExecArray | null;
    while ((imgMatch = imgRegex.exec(section)) !== null) {
      violations.push({
        slide: slideNum,
        rule: 'no-external-images',
        severity: 'error',
        detail: `External image URL found: ${imgMatch[1]?.slice(0, 60)}...`,
      });
    }

    // Rule: no external background-image URLs
    const bgImgRegex = /background(?:-image)?\s*:\s*[^;]*url\(\s*["']?(https?:\/\/(?!fonts\.googleapis|fonts\.gstatic|cdn\.jsdelivr)[^"')]+?)["']?\s*\)/gi;
    let bgImgMatch: RegExpExecArray | null;
    while ((bgImgMatch = bgImgRegex.exec(section)) !== null) {
      violations.push({
        slide: slideNum,
        rule: 'no-external-images',
        severity: 'error',
        detail: `External background-image URL found: ${bgImgMatch[1]?.slice(0, 60)}...`,
      });
    }

    // Rule: no SVG <image> elements with external URLs
    const svgImageRegex = /<image[^>]*(?:xlink:)?href=["'](https?:\/\/[^"']+?)["']/gi;
    let svgImgMatch: RegExpExecArray | null;
    while ((svgImgMatch = svgImageRegex.exec(section)) !== null) {
      violations.push({
        slide: slideNum,
        rule: 'no-external-images',
        severity: 'error',
        detail: `External SVG image URL found: ${svgImgMatch[1]?.slice(0, 60)}...`,
      });
    }

    // Rule: no raw markdown syntax
    if (/(?:^|\n)#{1,3}\s/m.test(section) && !section.includes('<pre')) {
      violations.push({
        slide: slideNum,
        rule: 'no-markdown',
        severity: 'error',
        detail: 'Raw markdown heading syntax detected (# or ## or ###).',
      });
    }
    if (/\*\*[^*]+\*\*/m.test(section) && !section.includes('<code')) {
      violations.push({
        slide: slideNum,
        rule: 'no-markdown',
        severity: 'warning',
        detail: 'Possible markdown bold syntax (**text**) detected.',
      });
    }

    // Rule: no empty placeholder text
    const placeholderPatterns = [
      /\{\{[A-Z_]+\}\}/,
      /\[INSERT[^\]]*\]/i,
      /\[YOUR[^\]]*\]/i,
      /Lorem ipsum/i,
    ];
    for (const pattern of placeholderPatterns) {
      if (pattern.test(section)) {
        violations.push({
          slide: slideNum,
          rule: 'no-placeholders',
          severity: 'warning',
          detail: `Placeholder text found matching: ${pattern.source}`,
        });
      }
    }

    // Rule: text elements should have inline color
    const textTags = section.match(/<(h[1-6]|p|span|li|td|th)\s[^>]*>/gi) ?? [];
    let textWithoutColor = 0;
    for (const tag of textTags) {
      if (!tag.includes('color:') && !tag.includes('color :')) {
        textWithoutColor++;
      }
    }
    if (textWithoutColor > 3) {
      violations.push({
        slide: slideNum,
        rule: 'inline-styles',
        severity: 'warning',
        detail: `${textWithoutColor} text elements missing inline color style.`,
      });
    }

    // Rule: detect potential contrast issues — light text on light backgrounds
    const bgColorMatch = section.match(/data-background-color=["']([^"']+)["']/);
    if (bgColorMatch) {
      const bgColor = bgColorMatch[1] ?? '';
      const isLightBg = isLightColor(bgColor);

      // Check for light-colored text on light backgrounds
      const colorMatches = section.matchAll(/color:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|white|#fff(?:fff)?)\s*[;"]/gi);
      for (const cm of colorMatches) {
        const textColor = cm[1] ?? '';
        if (isLightBg && isLightColor(textColor)) {
          violations.push({
            slide: slideNum,
            rule: 'contrast',
            severity: 'warning',
            detail: `Possible low contrast: light text (${textColor}) on light background (${bgColor}).`,
          });
          break; // One warning per slide is enough
        }
        if (!isLightBg && isDarkColor(textColor)) {
          violations.push({
            slide: slideNum,
            rule: 'contrast',
            severity: 'warning',
            detail: `Possible low contrast: dark text (${textColor}) on dark background (${bgColor}).`,
          });
          break;
        }
      }
    }
  }

  // Rule: Google Fonts link should be present
  if (!html.includes('fonts.googleapis.com')) {
    violations.push({
      slide: 0,
      rule: 'google-fonts',
      severity: 'error',
      detail: 'Missing Google Fonts <link> element.',
    });
  }

  if (options.styleManifest) {
    applyStyleManifestChecks(sections, html, options, violations);
  }

  const errorCount = violations.filter((v) => v.severity === 'error').length;

  return {
    passed: errorCount === 0,
    violations,
  };
}

// ── Layout pattern detection ──────────────────────────────────

/**
 * Detect the layout pattern of each slide by scanning for structural CSS.
 * Returns an array of layout type strings, one per section.
 */
function detectLayoutPatterns(sections: string[]): string[] {
  return sections.map((section, i) => {
    // Title slide (first or has large hero title)
    if (i === 0 || /font-size:\s*4em/i.test(section)) return 'hero';

    // Metrics row: 3-4 column grid with large numbers (3.5em+)
    if (/font-size:\s*3\.?[0-9]*em/i.test(section) && /repeat\([34],/i.test(section)) return 'metrics-row';

    // Split layout: 2-column with text on one side
    if (/grid-template-columns:\s*1fr\s+1\.?[0-9]*fr/i.test(section) || /grid-template-columns:\s*1\.?[0-9]*fr\s+1fr/i.test(section)) return 'split';

    // Card grid: 3-column grid with cards
    if (/repeat\(3,\s*1fr\)/i.test(section)) return 'card-grid';

    // 4-column grid
    if (/repeat\(4,\s*1fr\)/i.test(section)) return 'card-grid';

    // 2-column comparison
    if (/repeat\(2,\s*1fr\)/i.test(section)) return 'comparison';

    // List-based (ul/li heavy)
    if ((section.match(/<li/gi) ?? []).length >= 3) return 'list';

    // Pull quote (centered, large text, minimal elements)
    if (/font-size:\s*[23]\.?[0-9]*em/i.test(section) && (section.match(/<(?:h2|p|div)/gi) ?? []).length <= 5) return 'pull-quote';

    // Closing CTA (has a link/button styled element)
    if (/<a\s/i.test(section) && i >= sections.length - 2) return 'closing-cta';

    return 'unknown';
  });
}

// ── Color utility functions ───────────────────────────────────

/**
 * Check if two hex colors are close (same palette family).
 * Used to allow bgSubtle as an acceptable variant of bg.
 */
function isCloseColor(a: string, b: string): boolean {
  const aRgb = hexToRgb(a);
  const bRgb = hexToRgb(b);
  if (!aRgb || !bRgb) return false;
  const distance = Math.sqrt(
    (aRgb.r - bRgb.r) ** 2 + (aRgb.g - bRgb.g) ** 2 + (aRgb.b - bRgb.b) ** 2,
  );
  return distance < 40; // Allow small variations within the palette
}

function hexToRgb(color: string): { r: number; g: number; b: number } | null {
  const c = color.trim().replace('#', '');
  if (!/^[0-9a-f]{3,8}$/i.test(c)) return null;
  let hex = c;
  if (hex.length === 3) hex = hex[0]! + hex[0]! + hex[1]! + hex[1]! + hex[2]! + hex[2]!;
  if (hex.length < 6) return null;
  return {
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16),
  };
}

/**
 * Rough lightness check: returns true if a color is likely "light" (high luminance).
 */
function isLightColor(color: string): boolean {
  const c = color.trim().toLowerCase();
  if (c === 'white' || c === '#fff' || c === '#ffffff') return true;

  const hexMatch = c.match(/^#([0-9a-f]{3,8})$/);
  if (hexMatch) {
    let hex = hexMatch[1]!;
    if (hex.length === 3) hex = hex[0]! + hex[0]! + hex[1]! + hex[1]! + hex[2]! + hex[2]!;
    if (hex.length >= 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance > 0.65;
    }
  }

  const rgbaMatch = c.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1]!, 10);
    const g = parseInt(rgbaMatch[2]!, 10);
    const b = parseInt(rgbaMatch[3]!, 10);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.65;
  }

  return false;
}

function applyStyleManifestChecks(
  sections: string[],
  html: string,
  options: QAOptions,
  violations: QAViolation[],
): void {
  const styleManifest = options.styleManifest;
  if (!styleManifest) return;

  const firstSection = sections[0] ?? '';
  const svgSlides = sections.filter((section) => /<svg[\s>]/i.test(section)).length;
  const sceneSlides = sections.filter((section) => /position\s*:\s*absolute|scene-|radial-gradient|linear-gradient/i.test(section)).length;
  const asymSlides = sections.filter((section) => /grid-template-columns:\s*(?:3fr\s+2fr|2fr\s+3fr|1\.15fr\s+0\.85fr|0\.85fr\s+1\.15fr)/i.test(section) || /grid-column:\s*1\s*\/\s*-1/i.test(section)).length;

  if (styleManifest.compositionMode === 'split-world' || styleManifest.compositionMode === 'hero-scene') {
    if (!/<svg[\s>]|position\s*:\s*absolute|scene-|linear-gradient/i.test(firstSection)) {
      violations.push({
        slide: 1,
        rule: 'hero-scene',
        severity: 'warning',
        detail: 'Title slide does not establish a strong scene background or integrated visual system. Use a full-canvas hero composition.',
      });
    }

    if (options.exemplarPackId === 'split-world-title' && /repeat\((?:3|4),\s*1fr\)/i.test(firstSection)) {
      violations.push({
        slide: 1,
        rule: 'title-slide-composition',
        severity: 'warning',
        detail: 'Split-world title slides should not default to a generic equal-card grid. Use a central hero lockup with a seam, bridge, or dual-world scene.',
      });
    }
  }

  if (
    styleManifest.compositionMode === 'editorial-grid'
    || styleManifest.compositionMode === 'infographic-grid'
    || styleManifest.compositionMode === 'dashboard-grid'
  ) {
    if (svgSlides === 0) {
      violations.push({
        slide: 0,
        rule: 'integrated-diagrams',
        severity: 'warning',
        detail: 'This deck family should include at least one inline SVG or embedded diagram, not text-only cards.',
      });
    }

    if (asymSlides === 0) {
      violations.push({
        slide: 0,
        rule: 'editorial-composition',
        severity: 'warning',
        detail: 'Editorial and infographic decks need at least one asymmetric grid, full-width strip, or tiered stack to avoid uniform card repetition.',
      });
    }
  }

  if (options.isCreate && sections.length >= 8 && svgSlides < 2) {
    violations.push({
      slide: 0,
      rule: 'integrated-visual-density',
      severity: 'warning',
      detail: 'Longer decks should include at least two integrated visual or SVG-led slides so the narrative is not carried only by card layouts.',
    });
  }

  if (options.exemplarPackId === 'editorial-infographic' && !/border-left\s*:\s*[34]px|class="(?:gcf-strip|stack-wrap|header)"|layer-flow|big-num/i.test(html)) {
    violations.push({
      slide: 0,
      rule: 'editorial-signposting',
      severity: 'warning',
      detail: 'Editorial-infographic decks should use stronger signposting such as header bars, callout strips, accent rails, or tiered layers.',
    });
  }

  if (options.exemplarPackId === 'split-world-title' && sceneSlides < 2) {
    violations.push({
      slide: 0,
      rule: 'scene-continuity',
      severity: 'warning',
      detail: 'Split-world decks should reuse their scene language beyond a single slide through seams, connectors, atmospheric backgrounds, or node/pipeline motifs.',
    });
  }
}

/**
 * Rough darkness check: returns true if a color is likely "dark" (low luminance).
 */
function isDarkColor(color: string): boolean {
  const c = color.trim().toLowerCase();
  if (c === 'black' || c === '#000' || c === '#000000') return true;

  const hexMatch = c.match(/^#([0-9a-f]{3,8})$/);
  if (hexMatch) {
    let hex = hexMatch[1]!;
    if (hex.length === 3) hex = hex[0]! + hex[0]! + hex[1]! + hex[1]! + hex[2]! + hex[2]!;
    if (hex.length >= 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance < 0.35;
    }
  }

  const rgbaMatch = c.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1]!, 10);
    const g = parseInt(rgbaMatch[2]!, 10);
    const b = parseInt(rgbaMatch[3]!, 10);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.35;
  }

  return false;
}
