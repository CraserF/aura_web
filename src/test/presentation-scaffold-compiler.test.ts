import { describe, expect, it } from 'vitest';

import {
  assembleScaffoldDeck,
  compileScaffoldSlide,
  getPresentationScaffold,
  getScaffoldTheme,
  planDeckRhythm,
  validateScaffoldedDeck,
} from '@/services/presentationScaffolds';
import type { SlideBrief } from '@/services/ai/workflow/agents/planner';

const scaffold = getPresentationScaffold('executive-editorial-v1')!;
const theme = getScaffoldTheme(scaffold, 'executive');

const briefs: SlideBrief[] = [
  { index: 1, title: 'Board decision path', contentGuidance: 'Open with the leadership decision and why it matters.' },
  { index: 2, title: 'Signals to trust', contentGuidance: 'Show the evidence that supports the recommendation.' },
  { index: 3, title: 'Next move', contentGuidance: 'Close with ownership and the review point.' },
];

describe('presentation scaffold compiler', () => {
  it('registers the executive editorial scaffold with locked skeleton and theme coverage', () => {
    expect(scaffold.skeletons.map((skeleton) => skeleton.id)).toEqual([
      'cover',
      'context',
      'metric-proof',
      'comparison',
      'mechanism-process',
      'closing-action',
    ]);
    expect(scaffold.themes.map((entry) => entry.id)).toEqual([
      'executive',
      'launch',
      'editorial',
      'research',
      'teaching',
    ]);
    expect(scaffold.styleCss).toContain('.pes-slide');
    expect(scaffold.checklistMarkdown).toContain('P0 Blocking');
    expect(scaffold.exampleDeckHtml).toContain('data-scaffold="executive-editorial-v1"');
  });

  it('compiles slot payloads into one style block plus scaffold sections', () => {
    const rhythm = planDeckRhythm({
      scaffold,
      theme,
      directionId: 'executive',
      exportIntent: 'html',
      briefs,
    });
    const sections = rhythm.entries.map((entry, index) => {
      const skeleton = scaffold.skeletons.find((candidate) => candidate.id === entry.skeletonId)!;
      return compileScaffoldSlide({
        scaffold,
        theme,
        skeleton,
        rhythmEntry: entry,
        totalSlides: briefs.length,
        payload: {
          slideId: entry.slideId,
          skeletonId: skeleton.id,
          slots: Object.fromEntries(skeleton.slots.map((slot) => [
            slot.id,
            slot.id === 'title' ? briefs[index]!.title : slot.placeholder ?? `${slot.label} copy`,
          ])),
        },
      });
    });
    const deck = assembleScaffoldDeck({
      scaffold,
      theme,
      directionId: 'executive',
      exportIntent: 'html',
      sections,
    });

    expect(deck.html.match(/<style\b/gi)).toHaveLength(1);
    expect(deck.html.match(/<section\b/gi)).toHaveLength(3);
    expect(deck.html).toContain('data-aura-style-system="executive-editorial-v1"');
    expect(deck.html).toContain('data-slot="title"');
    expect(deck.html).not.toMatch(/\{\{[^}]+\}\}/);
    expect(deck.html).not.toMatch(/\sstyle=/i);

    const validation = validateScaffoldedDeck({
      html: deck.html,
      scaffold,
      rhythmPlan: rhythm,
      exportIntent: 'html',
    });
    expect(validation.blockingCount).toBe(0);
  });

  it('catches scaffold contract violations deterministically', () => {
    const broken = `<style data-aura-style-system="executive-editorial-v1">:root{--pes-bg:#fff}@keyframes bad{from{opacity:0}to{opacity:1}}.pes-slide{font-size:24px;animation:bad 1s ease}.made-up-class{font-size:20px}</style>
      <section class="pes-slide missing-class" data-scaffold="executive-editorial-v1" data-skeleton="cover">
        <h1 data-slot="title">Broken</h1>
      </section>`;

    const validation = validateScaffoldedDeck({
      html: broken,
      scaffold,
      exportIntent: 'html',
    });

    expect(validation.passed).toBe(false);
    expect(validation.findings.map((finding) => finding.id)).toContain('undefined-class');
    expect(validation.findings.map((finding) => finding.id)).toContain('missing-background');
    expect(validation.findings.map((finding) => finding.id)).toContain('missing-reduced-motion');
  });
});
