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
