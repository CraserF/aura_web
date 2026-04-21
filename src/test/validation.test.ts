/**
 * M4.6 + M4.8 — validation.ts unit tests
 *
 * Tests classifyIntent (M2.7 batch detection already covered in
 * batchIntentDetection.test.ts) and the new detectAmbiguity helper (M4.6).
 */
import { describe, it, expect } from 'vitest';
import { detectAmbiguity } from '@/services/ai/validation';

// ── detectAmbiguity ───────────────────────────────────────────────────────────

describe('detectAmbiguity', () => {
  it('returns options for a short, vague create prompt', () => {
    const opts = detectAmbiguity('Create a slide about revenue');
    expect(opts).not.toBeNull();
    expect(opts!.length).toBeGreaterThan(0);
  });

  it('returns null for a long descriptive prompt', () => {
    const prompt =
      'Create a slide that shows our Q3 revenue growth from 2M to 4.5M with month-by-month breakdown';
    expect(detectAmbiguity(prompt)).toBeNull();
  });

  it('returns null when a layout keyword is already in the prompt', () => {
    expect(detectAmbiguity('Create a timeline slide for our roadmap')).toBeNull();
    expect(detectAmbiguity('Build a comparison slide for two products')).toBeNull();
    expect(detectAmbiguity('Make a metrics dashboard slide')).toBeNull();
    expect(detectAmbiguity('Create an agenda overview')).toBeNull();
  });

  it('returns null for prompts with milestone keyword', () => {
    expect(detectAmbiguity('Show our milestones for 2025')).toBeNull();
  });

  it('options each have non-empty label and value', () => {
    const opts = detectAmbiguity('Create a slide about our product');
    expect(opts).not.toBeNull();
    for (const opt of opts!) {
      expect(opt.label).toBeTruthy();
      expect(opt.value).toBeTruthy();
    }
  });

  it('returns no more than 4 options', () => {
    const opts = detectAmbiguity('Create a slide');
    expect(opts!.length).toBeLessThanOrEqual(4);
  });

  it('returns null for a 10-word prompt (boundary)', () => {
    const prompt = 'Show our customer retention data broken down by the last quarter';
    const words = prompt.split(/\s+/).filter(Boolean);
    expect(words.length).toBeGreaterThanOrEqual(10);
    expect(detectAmbiguity(prompt)).toBeNull();
  });
});
