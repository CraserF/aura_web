/**
 * M4.8 — patchUtils integration tests
 *
 * Tests the SEARCH/REPLACE diff format utilities used by the edit flow
 * to apply surgical changes to slide HTML without full regeneration.
 */
import { describe, it, expect } from 'vitest';
import {
  parsePatchBlocks,
  dryRunPatch,
  applyPatches,
} from '@/services/ai/workflow/patchUtils';

const BASE_HTML = `<section class="hero">
  <h1 class="title">Old Title</h1>
  <p class="subtitle">Subtitle text here</p>
  <div class="stat">42%</div>
</section>`;

// ── parsePatchBlocks ──────────────────────────────────────────────────────────

describe('parsePatchBlocks', () => {
  it('parses a single FIND/REPLACE block', () => {
    const input = `<<<<<<< FIND
<h1 class="title">Old Title</h1>
=======
<h1 class="title">New Title</h1>
>>>>>>> REPLACE`;

    const patches = parsePatchBlocks(input);
    expect(patches).toHaveLength(1);
    expect(patches[0]?.find).toBe('<h1 class="title">Old Title</h1>');
    expect(patches[0]?.replace).toBe('<h1 class="title">New Title</h1>');
  });

  it('parses multiple blocks from a single model output', () => {
    const input = `<<<<<<< FIND
Old Title
=======
New Title
>>>>>>> REPLACE
Some other text in between.
<<<<<<< FIND
42%
=======
58%
>>>>>>> REPLACE`;

    const patches = parsePatchBlocks(input);
    expect(patches).toHaveLength(2);
    expect(patches[0]?.find).toBe('Old Title');
    expect(patches[1]?.find).toBe('42%');
  });

  it('returns an empty array when no blocks are present', () => {
    expect(parsePatchBlocks('No patches here')).toHaveLength(0);
  });

  it('ignores blocks where the FIND content is whitespace-only', () => {
    const input = `<<<<<<< FIND

=======
something
>>>>>>> REPLACE`;

    expect(parsePatchBlocks(input)).toHaveLength(0);
  });

  it('preserves multi-line find and replace content', () => {
    const find = '<div class="card">\n  <p>Old</p>\n</div>';
    const replace = '<div class="card card--highlighted">\n  <p>New</p>\n</div>';
    const input = `<<<<<<< FIND\n${find}\n=======\n${replace}\n>>>>>>> REPLACE`;
    const [patch] = parsePatchBlocks(input);
    expect(patch?.find).toBe(find);
    expect(patch?.replace).toBe(replace);
  });
});

// ── dryRunPatch ───────────────────────────────────────────────────────────────

describe('dryRunPatch', () => {
  it('returns an empty array when all find strings exist in the HTML', () => {
    const patches = [
      { find: 'Old Title', replace: 'New Title' },
      { find: 'Subtitle text here', replace: 'Updated subtitle' },
    ];
    expect(dryRunPatch(BASE_HTML, patches)).toHaveLength(0);
  });

  it('returns the patches whose find strings are missing', () => {
    const patches = [
      { find: 'Old Title', replace: 'New Title' },
      { find: 'DOES NOT EXIST', replace: 'something' },
    ];
    const failed = dryRunPatch(BASE_HTML, patches);
    expect(failed).toHaveLength(1);
    expect(failed[0]?.find).toBe('DOES NOT EXIST');
  });

  it('returns all patches when none match', () => {
    const patches = [
      { find: 'absent1', replace: 'x' },
      { find: 'absent2', replace: 'y' },
    ];
    expect(dryRunPatch(BASE_HTML, patches)).toHaveLength(2);
  });
});

// ── applyPatches ──────────────────────────────────────────────────────────────

describe('applyPatches', () => {
  it('applies a single valid patch', () => {
    const result = applyPatches(BASE_HTML, [
      { find: 'Old Title', replace: 'New Title' },
    ]);
    expect(result.success).toBe(true);
    expect(result.html).toContain('New Title');
    expect(result.html).not.toContain('Old Title');
    expect(result.failedPatches).toHaveLength(0);
  });

  it('applies multiple patches sequentially', () => {
    const result = applyPatches(BASE_HTML, [
      { find: 'Old Title', replace: 'New Title' },
      { find: '42%', replace: '99%' },
    ]);
    expect(result.success).toBe(true);
    expect(result.html).toContain('New Title');
    expect(result.html).toContain('99%');
  });

  it('returns the original HTML unchanged if any find string is missing', () => {
    const result = applyPatches(BASE_HTML, [
      { find: 'Old Title', replace: 'New Title' },
      { find: 'MISSING', replace: 'anything' },
    ]);
    expect(result.success).toBe(false);
    expect(result.html).toBe(BASE_HTML);
    expect(result.failedPatches).toHaveLength(1);
    expect(result.failedPatches[0]?.find).toBe('MISSING');
  });

  it('returns the original HTML for an empty patch list', () => {
    const result = applyPatches(BASE_HTML, []);
    expect(result.success).toBe(true);
    expect(result.html).toBe(BASE_HTML);
  });

  it('round-trips: parsed patches can be applied correctly', () => {
    const modelOutput = `<<<<<<< FIND
Old Title
=======
Quarterly Review
>>>>>>> REPLACE
<<<<<<< FIND
42%
=======
73%
>>>>>>> REPLACE`;

    const patches = parsePatchBlocks(modelOutput);
    const result = applyPatches(BASE_HTML, patches);
    expect(result.success).toBe(true);
    expect(result.html).toContain('Quarterly Review');
    expect(result.html).toContain('73%');
  });
});
