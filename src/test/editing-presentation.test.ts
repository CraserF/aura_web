import { describe, expect, it } from 'vitest';

import { applyPresentationPatchBlocks, resolvePresentationTargets } from '@/services/editing/patchPresentation';
import type { ProjectDocument } from '@/types/project';

const deck: ProjectDocument = {
  id: 'presentation-1',
  title: 'Deck',
  type: 'presentation',
  contentHtml: `
<style>.hero{color:#123456;}</style>
<section><h1>Launch Plan</h1><p>Original title slide copy.</p></section>
<section><h2>Metrics</h2><p>Original metrics slide copy.</p></section>
`.trim(),
  themeCss: '',
  slideCount: 2,
  chartSpecs: {},
  order: 0,
  createdAt: 1,
  updatedAt: 1,
};

describe('presentation editing helpers', () => {
  it('resolves slide-number and slide-title selectors', () => {
    const byNumber = resolvePresentationTargets(deck, [
      { type: 'slide-number', value: '2', label: 'Slide 2' },
    ]);
    const byTitle = resolvePresentationTargets(deck, [
      { type: 'slide-title', value: 'Launch Plan', label: 'Slide matching "Launch Plan"' },
    ]);

    expect(byNumber[0]?.slideIndex).toBe(1);
    expect(byTitle[0]?.slideIndex).toBe(0);
  });

  it('applies SEARCH/REPLACE patch blocks against the existing deck', () => {
    const patchText = `<<<<<<< FIND
<p>Original title slide copy.</p>
=======
<p>Updated title slide copy.</p>
>>>>>>> REPLACE`;

    const result = applyPresentationPatchBlocks(deck.contentHtml, patchText);

    expect(result.success).toBe(true);
    expect(result.patchCount).toBe(1);
    expect(result.html).toContain('Updated title slide copy.');
  });

  it('reports dry-run failures when a FIND block does not match', () => {
    const patchText = `<<<<<<< FIND
<p>Missing copy.</p>
=======
<p>Updated copy.</p>
>>>>>>> REPLACE`;

    const result = applyPresentationPatchBlocks(deck.contentHtml, patchText);

    expect(result.success).toBe(false);
    expect(result.dryRunFailures).toHaveLength(1);
  });
});
