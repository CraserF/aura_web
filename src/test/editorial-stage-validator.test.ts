import { describe, expect, it } from 'vitest';

import {
  validateEditorialStageCompiledOutput,
  validateEditorialStageLayoutSequence,
  validateEditorialStageSource,
} from '@/services/artifactPacks/packs/presentation/editorial-stage-v1/validator';
import type { EditorialStageSource } from '@/services/artifactPacks/packs/presentation/editorial-stage-v1/schemas';

function createSource(): EditorialStageSource {
  return {
    schemaVersion: 1,
    artifactType: 'presentation',
    packId: 'presentation/editorial-stage-v1',
    packVersion: '1.0.0',
    title: 'Focused launch',
    audience: 'executive decision makers',
    directionId: 'editorial-magazine',
    outputMode: 'html',
    brief: 'Focused launch brief.',
    rhythmPlan: [],
    slides: [
      {
        slideId: 'slide-1',
        layoutId: 'big-number',
        role: 'proof',
        mood: 'light',
        density: 'balanced',
        visualWeight: 'proof',
        motion: 'cascade',
        slots: {
          kicker: 'Proof',
          title: 'One segment is already carrying momentum',
          metric_value: '42%',
          metric_label: 'of demand came from the focused segment.',
          interpretation: 'The signal is strong enough to shape the launch.',
          source: 'Pipeline review',
        },
        media: [],
        sourceNotes: ['Pipeline review'],
      },
    ],
  };
}

describe('editorial-stage presentation validator', () => {
  it('catches missing required slots, unknown keys, and slot HTML', () => {
    const source = createSource();
    delete source.slides[0]!.slots.metric_label;
    source.slides[0]!.slots.extra_slot = 'Not declared';
    source.slides[0]!.slots.interpretation = '<em>Unsafe</em>';

    const ids = validateEditorialStageSource(source).findings.map((finding) => finding.id);

    expect(ids).toContain('slot.required_missing');
    expect(ids).toContain('slot.unknown_key');
    expect(ids).toContain('slot.html_detected');
  });

  it('flags metric values without source notes as fake-metric risk', () => {
    const source = createSource();
    source.slides[0]!.sourceNotes = [];

    expect(validateEditorialStageSource(source).findings.map((finding) => finding.id))
      .toContain('presentation.fake_metric');
  });

  it('flags repeated layouts and missing breaker rhythm', () => {
    const repeated = validateEditorialStageLayoutSequence([
      'story-split',
      'story-split',
      'comparison',
      'process-pipeline',
      'decision',
      'comparison',
    ]);

    expect(repeated.findings.map((finding) => finding.id)).toEqual(expect.arrayContaining([
      'rhythm.adjacent_repeated_layout',
      'rhythm.hero_breaker_gap',
    ]));
  });

  it('catches compiled output contract violations', () => {
    const report = validateEditorialStageCompiledOutput(`
      <style data-aura-style-system="presentation/editorial-stage-v1"></style>
      <style></style>
      <section style="color:red"><h1>{{title}}</h1></section>
    `);

    expect(report.findings.map((finding) => finding.id)).toEqual(expect.arrayContaining([
      'compiled.style_block_invalid',
      'compiled.inline_style_detected',
      'compiled.placeholder_unresolved',
      'compiled.section_marker_missing',
    ]));
  });
});
