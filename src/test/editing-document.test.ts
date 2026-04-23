import { describe, expect, it } from 'vitest';

import {
  applyDocumentTargetedEdit,
  prepareDocumentHtmlForEditing,
  resolveDocumentTargets,
} from '@/services/editing/patchDocument';

const BASE_HTML = `
<style>:root { --doc-primary: #123456; --doc-accent: #ff9900; }</style>
<section><h2>Executive Summary</h2><p>Old summary copy.</p></section>
<div class="doc-callout"><p>Important insight.</p></div>
<table><tr><th>Quarter</th><th>Revenue</th></tr><tr><td>Q1</td><td>10</td></tr></table>
`.trim();

describe('document editing helpers', () => {
  it('adds deterministic block ids while preserving existing style blocks', () => {
    const first = prepareDocumentHtmlForEditing(BASE_HTML);
    const second = prepareDocumentHtmlForEditing(BASE_HTML);

    expect(first.html).toContain('<style>');
    expect(first.blocks.map((block) => block.id)).toEqual(second.blocks.map((block) => block.id));
    expect(first.blocks.map((block) => block.type)).toEqual([
      'heading-section',
      'callout-block',
      'table-block',
    ]);
  });

  it('resolves semantic targets for heading sections and callouts', () => {
    const headingTargets = resolveDocumentTargets(BASE_HTML, [
      { type: 'heading-section', value: 'Executive Summary', label: 'Section "Executive Summary"' },
    ], 'Tighten the Executive Summary section');
    const calloutTargets = resolveDocumentTargets(BASE_HTML, [
      { type: 'callout-block', label: 'Callout block' },
    ], 'Revise the callout');

    expect(headingTargets).toHaveLength(1);
    expect(headingTargets[0]?.blockId).toBe('heading-section-1');
    expect(calloutTargets[0]?.blockId).toBe('callout-block-2');
  });

  it('replaces only the targeted block and preserves surrounding content', () => {
    const prepared = prepareDocumentHtmlForEditing(BASE_HTML);
    const targets = resolveDocumentTargets(prepared.html, [
      { type: 'heading-section', value: 'Executive Summary', label: 'Section "Executive Summary"' },
    ], 'Tighten the Executive Summary section');

    const generated = `
<style>:root { --doc-primary: #123456; --doc-accent: #ff9900; }</style>
<section><h2>Executive Summary</h2><p>New concise summary.</p></section>
<div class="doc-callout"><p>Important insight.</p></div>
<table><tr><th>Quarter</th><th>Revenue</th></tr><tr><td>Q1</td><td>10</td></tr></table>
`.trim();

    const result = applyDocumentTargetedEdit({
      existingHtml: prepared.html,
      generatedHtml: generated,
      targets,
      strategyHint: 'block-replace',
      allowFullRegeneration: false,
    });

    expect(result.strategyUsed).toBe('block-replace');
    expect(result.html).toContain('New concise summary');
    expect(result.html).toContain('Important insight');
    expect(result.html).toContain('data-aura-block-id="heading-section-1"');
  });

  it('applies style-token updates without replacing content blocks', () => {
    const generated = `
<style>:root { --doc-primary: #abcdef; --doc-accent: #ff9900; }</style>
<section><h2>Executive Summary</h2><p>Completely different content.</p></section>
`.trim();

    const result = applyDocumentTargetedEdit({
      existingHtml: prepareDocumentHtmlForEditing(BASE_HTML).html,
      generatedHtml: generated,
      targets: [],
      strategyHint: 'style-token',
      allowFullRegeneration: false,
    });

    expect(result.strategyUsed).toBe('style-token');
    expect(result.html).toContain('--doc-primary: #abcdef;');
    expect(result.html).toContain('Old summary copy.');
  });
});
