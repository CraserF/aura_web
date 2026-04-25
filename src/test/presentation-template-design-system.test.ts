import { describe, expect, it } from 'vitest';

import { getTemplateHtml, type TemplateId } from '@/services/ai/templates';

const STARTER_GRADE_TEMPLATES: TemplateId[] = [
  'executive-briefing-light',
  'launch-narrative-light',
];

const PRODUCTION_RECIPE_TEMPLATES: TemplateId[] = [
  ...STARTER_GRADE_TEMPLATES,
  'editorial-light',
  'finance-grid-light',
  'stage-setting-light',
  'interactive-quiz',
  'split-world',
];

describe('production presentation templates', () => {
  it('ship in production slide format without unsupported wrappers or inline styles', async () => {
    for (const templateId of PRODUCTION_RECIPE_TEMPLATES) {
      const html = await getTemplateHtml(templateId);
      const sectionCount = html.match(/<section\b/gi)?.length ?? 0;
      const dataBackgroundCount = html.match(/data-background-color=["']#[0-9a-f]{6}["']/gi)?.length ?? 0;

      expect(html.trim().startsWith('<style>')).toBe(true);
      expect(sectionCount).toBeGreaterThanOrEqual(1);
      expect(sectionCount).toBeLessThanOrEqual(5);
      expect(dataBackgroundCount).toBe(sectionCount);
      expect(html).toMatch(/@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/i);
      expect(html).not.toMatch(/<(?:html|body|script)\b/i);
      expect(html).not.toMatch(/class=["'][^"']*\b(?:reveal|slides)\b/i);
      expect(html).not.toMatch(/\sstyle=/i);
      expect(html).not.toMatch(/https?:\/\/|mailto:|presented by|[$€£]\s?\d/i);
    }
  });

  it('keeps essential source typography above the minimum readable floor', async () => {
    for (const templateId of PRODUCTION_RECIPE_TEMPLATES) {
      const html = await getTemplateHtml(templateId);
      const smallCssFontSizes = Array.from(html.matchAll(/font-size\s*:\s*(\d+(?:\.\d+)?)px/gi))
        .map(([, size]) => Number.parseFloat(size ?? '0'))
        .filter((size) => size > 0 && size < 16);

      expect(smallCssFontSizes).toEqual([]);
    }
  });

  it('keeps starter templates as multi-slide starter decks', async () => {
    for (const templateId of STARTER_GRADE_TEMPLATES) {
      const html = await getTemplateHtml(templateId);
      const sectionCount = html.match(/<section\b/gi)?.length ?? 0;

      expect(sectionCount).toBeGreaterThanOrEqual(3);
      expect(sectionCount).toBeLessThanOrEqual(5);
    }
  });
});
