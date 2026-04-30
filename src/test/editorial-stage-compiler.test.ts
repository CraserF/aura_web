import { describe, expect, it } from 'vitest';

import { compileEditorialStagePack } from '@/services/artifactPacks/packs/presentation/editorial-stage-v1/compiler';
import type { EditorialStageSource } from '@/services/artifactPacks/packs/presentation/editorial-stage-v1/schemas';

function createSource(): EditorialStageSource {
  return {
    schemaVersion: 1,
    artifactType: 'presentation',
    packId: 'presentation/editorial-stage-v1',
    packVersion: '1.0.0',
    title: 'Choose the focused launch path',
    audience: 'executive decision makers',
    directionId: 'editorial-magazine',
    outputMode: 'html',
    brief: 'A focused launch decision brief.',
    rhythmPlan: [
      {
        slideIndex: 1,
        slideId: 'slide-1',
        narrativeRole: 'Opening',
        layoutId: 'cover',
        mood: 'hero-dark',
        density: 'calm',
        visualWeight: 'hero',
        motion: 'hero',
        transitionPurpose: 'Open the decision.',
        mediaNeeds: [],
      },
      {
        slideIndex: 2,
        slideId: 'slide-2',
        narrativeRole: 'Proof',
        layoutId: 'big-number',
        mood: 'light',
        density: 'balanced',
        visualWeight: 'proof',
        motion: 'cascade',
        transitionPurpose: 'Make the proof concrete.',
        mediaNeeds: [],
      },
    ],
    slides: [
      {
        slideId: 'slide-1',
        layoutId: 'cover',
        role: 'title-scene',
        mood: 'hero-dark',
        density: 'calm',
        visualWeight: 'hero',
        motion: 'hero',
        slots: {
          kicker: 'Board review',
          title: 'Choose the focused launch path',
          subtitle: 'A staged argument for fewer things with stronger proof.',
          meta: 'April 2026',
        },
        media: [],
        sourceNotes: [],
      },
      {
        slideId: 'slide-2',
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
          metric_label: 'of demand came from the focused buyer segment.',
          interpretation: 'The strongest signal is narrow enough to act on and broad enough to compound.',
          source: 'Pipeline review',
        },
        media: [],
        sourceNotes: ['Pipeline review'],
      },
    ],
  };
}

describe('editorial-stage presentation compiler', () => {
  it('compiles source payloads into one locked style block plus pack-marked sections', () => {
    const result = compileEditorialStagePack({
      source: createSource(),
      outputMode: 'html',
    });

    expect(result.validation.passed).toBe(true);
    expect(result.output.content.match(/<style\b/g)).toHaveLength(1);
    expect(result.output.content.match(/<section\b/g)).toHaveLength(2);
    expect(result.output.content).toContain('data-aura-style-system="presentation/editorial-stage-v1"');
    expect(result.output.content).toContain('data-pack="presentation/editorial-stage-v1"');
    expect(result.output.content).not.toContain('data-scaffold=');
    expect(result.output.content).not.toContain('style=');
    expect(result.output.content).not.toContain('{{');
    expect(result.output.content).toContain('.es-cover');
  });

  it('escapes slot text instead of accepting model-authored markup', () => {
    const source = createSource();
    source.slides[0]!.slots.title = '<strong>Unsafe</strong> launch';

    const result = compileEditorialStagePack({
      source,
      outputMode: 'html',
    });

    expect(result.output.content).toContain('&lt;strong&gt;Unsafe&lt;/strong&gt; launch');
    expect(result.validation.findings.map((finding) => finding.id)).toContain('slot.html_detected');
  });
});
