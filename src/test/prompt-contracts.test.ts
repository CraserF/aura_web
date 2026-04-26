import { describe, expect, it } from 'vitest';

import {
  buildCoreArtifactContractPack,
  buildPresentationFragmentContractPack,
} from '@/services/artifactRuntime/promptPacks';
import { buildEditDesignerPrompt } from '@/services/ai/prompts/composer';

describe('artifact prompt contracts', () => {
  it('keeps the presentation fragment contract strict and canvas-safe', () => {
    const contract = buildPresentationFragmentContractPack({
      artifactType: 'presentation',
      intentFamily: 'create',
      providerTier: 'frontier',
      selectedTemplateId: 'executive-briefing-light',
      presentationRecipeId: 'general-polished',
      referenceStylePackId: 'presentation-executive-starter',
      designConstraints: ['Use a production design family.'],
      antiPatterns: ['Avoid generic card walls.'],
    });

    expect(contract).toContain('Return only <style> plus one or more <section> elements.');
    expect(contract).toContain('No <!DOCTYPE>, <html>, <head>, <body>, scripts, external images, or remote assets.');
    expect(contract).toContain('Use class-based CSS');
    expect(contract).toContain('Include reduced-motion handling');
    expect(contract).toContain('Template family: executive-briefing-light');
    expect(contract).toContain('Slide recipe: general-polished');
  });

  it('does not reintroduce wrapper or link output in final designer rules', () => {
    const prompt = buildEditDesignerPrompt(undefined, 2);

    expect(buildCoreArtifactContractPack()).toContain('small artifact part');
    expect(prompt).toContain('Output structure is exactly: `<style>` block + `<section>` element(s)');
    expect(prompt).toContain('No `<link>`');
    expect(prompt).not.toContain('`<link>` (if present)');
    expect(prompt).not.toContain('`<link>` (if fonts needed)');
  });
});
