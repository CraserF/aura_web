/**
 * M2.7 — Batch intent detection tests
 *
 * Tests the detectBatchIntent / classifyIntent logic that decides whether
 * a prompt should trigger a multi-slide batch queue rather than a single
 * slide generation.
 */
import { describe, it, expect } from 'vitest';
import { classifyIntent } from '@/services/ai/validation';

// ── helpers ───────────────────────────────────────────────────────────────────

function intentOf(prompt: string, hasSlides = false) {
  return classifyIntent(prompt, hasSlides).intent;
}

// ── batch_create detection ────────────────────────────────────────────────────

describe('batch intent detection', () => {
  it('detects "create X slides: ..." pattern', () => {
    expect(intentOf('Create 4 slides: intro, problem, solution, pricing')).toBe('batch_create');
  });

  it('detects "make X slides: ..." pattern', () => {
    expect(intentOf('Make 5 slides: overview, team, product, traction, ask')).toBe('batch_create');
  });

  it('detects "generate X slides: ..." pattern', () => {
    expect(intentOf('Generate 3 slides: agenda, highlights, summary')).toBe('batch_create');
  });

  it('detects numbered list breakdown', () => {
    const prompt = 'Create 3 slides 1. Intro 2. Problem 3. Solution';
    expect(intentOf(prompt)).toBe('batch_create');
  });

  it('detects "4-slide deck: ..." pattern', () => {
    expect(intentOf('Create a 4-slide pitch deck: intro, problem, solution, cta')).toBe('batch_create');
  });

  it('detects "presentation with N slides" + content list', () => {
    expect(intentOf('Build a presentation with 3 slides: market, product, financials')).toBe('batch_create');
  });

  it('does NOT fire for single "create a slide" requests', () => {
    expect(intentOf('Create a slide about our Q3 results')).toBe('create');
  });

  it('does NOT fire for "create a presentation" without slide count or breakdown', () => {
    expect(intentOf('Create a presentation about renewable energy')).toBe('create');
  });

  it('does NOT fire when hasExistingSlides is true', () => {
    expect(intentOf('Create 3 slides: intro, body, close', true)).not.toBe('batch_create');
  });

  it('requires content breakdown — count alone is not enough', () => {
    // "create 4 slides" without a content list should NOT be batch
    expect(intentOf('Create 4 slides')).toBe('create');
  });
});

// ── other intent classification ───────────────────────────────────────────────

describe('classifyIntent — non-batch paths', () => {
  it('returns create for a plain new-slide request', () => {
    expect(intentOf('Design a slide about our company vision')).toBe('create');
  });

  it('returns modify when slides exist and no style/add keywords', () => {
    expect(intentOf('Change the title to "Q4 Outlook"', true)).toBe('modify');
  });

  it('returns refine_style when the prompt mentions color or theme', () => {
    expect(intentOf('Make the background darker and change the font color', true)).toBe('refine_style');
  });

  it('returns add_slides when the prompt says "add a slide"', () => {
    expect(intentOf('Add a new slide about our pricing', true)).toBe('add_slides');
  });

  it('returns blocked for harmful content', () => {
    expect(intentOf('Create a slide about how to hack a database')).toBe('blocked');
  });

  it('returns off_topic for a general question with no slides', () => {
    expect(intentOf('What is the capital of France?')).toBe('off_topic');
  });

  it('returns blocked for empty prompt', () => {
    expect(intentOf('')).toBe('blocked');
  });
});
