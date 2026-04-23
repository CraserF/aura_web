import { describe, expect, it } from 'vitest';

import { buildDesignerPrompt } from '@/services/ai/prompts/composer';
import { getTemplateBlueprint } from '@/services/ai/templates';
import { listDocumentBlueprints } from '@/services/ai/templates/document-blueprints';

describe('mobile guidance', () => {
  it('includes contained mobile viewport guidance in presentation designer prompts', async () => {
    const prompt = await buildDesignerPrompt(
      getTemplateBlueprint('keynote'),
      'keynote',
      'default-template',
      2,
    );

    expect(prompt).toContain('MOBILE-STAGE READABILITY');
    expect(prompt).toContain('fixed 16:9 stage');
    expect(prompt).toContain('smaller framed mobile viewport');
  });

  it('bakes narrow-screen stacking guidance into every document blueprint', () => {
    for (const blueprint of listDocumentBlueprints()) {
      const joinedRules = [...blueprint.compositionRules, ...blueprint.componentRules].join(' ');
      expect(joinedRules).toMatch(/narrow screens|mobile/i);
      expect(joinedRules).toMatch(/stack|single-column|fluid/i);
    }
  });
});
