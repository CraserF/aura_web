import { describe, it, expect } from 'vitest';
import { validateDocument } from '@/services/ai/workflow/agents/document-qa';
import {
  DENSE_DOCUMENT_FIXTURE,
  LONG_FORM_DOCUMENT_FIXTURE,
} from '@/test/fixtures/workstream-f';

const MINIMAL_VALID_HTML = `
<style>
  .doc-shell {
    --doc-primary: #1e40af;
    --doc-accent: #60a5fa;
    --doc-text: #0f172a;
    --doc-bg: #f8fafc;
    --doc-surface: rgba(0,0,0,0.04);
  }
</style>
<div class="doc-shell">
  <h1>Test Document</h1>
  <h2>Introduction</h2>
  <p>Some introductory text here.</p>
</div>
`;

describe('validateDocument', () => {
  it('returns passed=false and score=0 for empty HTML', () => {
    const result = validateDocument('');
    expect(result.passed).toBe(false);
    expect(result.score).toBe(0);
    expect(result.violations.some((v) => v.rule === 'empty')).toBe(true);
  });

  it('flags missing <style> block', () => {
    const html = '<div class="doc-shell"><h1>Title</h1><h2>Section</h2><p>text</p></div>';
    const result = validateDocument(html);
    const hasStyleViolation = result.violations.some((v) => v.rule === 'has-style');
    expect(hasStyleViolation).toBe(true);
  });

  it('flags missing h1', () => {
    const html = '<style>.doc-shell{--doc-primary:#000}</style><div class="doc-shell"><h2>Section</h2></div>';
    const result = validateDocument(html);
    const missingH1 = result.violations.some((v) => v.rule === 'has-h1');
    expect(missingH1).toBe(true);
  });

  it('passes a valid document', () => {
    const result = validateDocument(MINIMAL_VALID_HTML);
    const errors = result.violations.filter((v) => v.severity === 'error');
    expect(errors).toHaveLength(0);
  });

  it('returns a numeric score between 0 and 100', () => {
    const result = validateDocument(MINIMAL_VALID_HTML);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('flags wall-of-text when more than 5 consecutive paragraphs', () => {
    const paras = Array.from({ length: 7 }, (_, i) => `<p>Paragraph ${i + 1}</p>`).join('');
    const html = `<style>.doc-shell{--doc-primary:#000}</style><div class="doc-shell"><h1>T</h1><h2>S</h2>${paras}</div>`;
    const result = validateDocument(html);
    const wallViolation = result.violations.some((v) => v.rule === 'wall-of-text');
    expect(wallViolation).toBe(true);
  });

  it('flags dense fixed multi-column grids without a single-column fallback', () => {
    const result = validateDocument(DENSE_DOCUMENT_FIXTURE);
    expect(result.violations.some((v) => v.rule === 'mobile-grid-density')).toBe(true);
  });

  it('does not flag mobile grid density for a wrap-safe long-form layout', () => {
    const result = validateDocument(LONG_FORM_DOCUMENT_FIXTURE);
    expect(result.violations.some((v) => v.rule === 'mobile-grid-density')).toBe(false);
  });

  it('flags fixed-width media that could clip in a framed mobile viewport', () => {
    const html = `
      <style>.doc-shell{--doc-primary:#000;--doc-accent:#111;--doc-text:#111;--doc-bg:#fff;--doc-surface:#f5f5f5}</style>
      <div class="doc-shell">
        <h1>Document</h1>
        <h2>Section</h2>
        <img src="hero.png" width="640" alt="hero" />
      </div>
    `;
    const result = validateDocument(html);
    expect(result.violations.some((v) => v.rule === 'mobile-media-clipping')).toBe(true);
  });
});
