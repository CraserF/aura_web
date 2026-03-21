/**
 * QA Validator — Programmatic (no LLM) post-generation validation.
 * Catches mechanical errors that don't need AI to detect:
 * missing styles, broken structure, external images, etc.
 */

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

/**
 * Run programmatic QA checks on generated HTML.
 * Returns structured violations without requiring an LLM call.
 */
export function validateSlides(html: string): QAResult {
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

  // Check each section
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

    // Rule: no external image URLs
    const imgRegex = /src=["'](https?:\/\/(?!fonts\.googleapis|fonts\.gstatic)[^"']+)["']/gi;
    let imgMatch: RegExpExecArray | null;
    while ((imgMatch = imgRegex.exec(section)) !== null) {
      violations.push({
        slide: slideNum,
        rule: 'no-external-images',
        severity: 'error',
        detail: `External image URL found: ${imgMatch[1]?.slice(0, 60)}...`,
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

  const errorCount = violations.filter((v) => v.severity === 'error').length;

  return {
    passed: errorCount === 0,
    violations,
  };
}

/**
 * Rough lightness check: returns true if a color is likely "light" (high luminance).
 * Handles hex (#fff, #ffffff, #F2F2F2), rgba(), and named colors.
 */
function isLightColor(color: string): boolean {
  const c = color.trim().toLowerCase();
  if (c === 'white' || c === '#fff' || c === '#ffffff') return true;

  // Hex colors
  const hexMatch = c.match(/^#([0-9a-f]{3,8})$/);
  if (hexMatch) {
    let hex = hexMatch[1]!;
    if (hex.length === 3) hex = hex[0]! + hex[0]! + hex[1]! + hex[1]! + hex[2]! + hex[2]!;
    if (hex.length >= 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      // Relative luminance approximation
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance > 0.65;
    }
  }

  // rgba/rgb
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
