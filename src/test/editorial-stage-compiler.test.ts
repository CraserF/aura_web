import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

import { createProjectMediaResolver } from '@/services/artifactPacks';
import { compileEditorialStagePack } from '@/services/artifactPacks/packs/presentation/editorial-stage-v1/compiler';
import type { EditorialStageSource } from '@/services/artifactPacks/packs/presentation/editorial-stage-v1/schemas';
import type { ProjectMediaAsset } from '@/types/project';

const EXAMPLE_SOURCE_PATH = 'src/services/artifactPacks/packs/presentation/editorial-stage-v1/examples/source.json';
const EXAMPLE_HTML_PATH = 'src/services/artifactPacks/packs/presentation/editorial-stage-v1/examples/example.html';
const EXAMPLE_MEDIA_PATH = 'src/services/artifactPacks/packs/presentation/editorial-stage-v1/examples/media.json';

const normalizeHtml = (html: string): string => html.replace(/\s+/g, ' ').trim();

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

  it('adds direction classes and omits unbound optional media frames', () => {
    const source = createSource();
    source.directionId = 'bold-editorial';
    source.slides[1] = {
      ...source.slides[1]!,
      layoutId: 'story-split',
      role: 'story',
      slots: {
        kicker: 'Context',
        title: 'The broad launch is diluting attention',
        quote: 'The team is carrying too many stories for one market moment.',
        body: 'Three audiences are being served at once, which makes proof harder to notice.',
        caption: '',
      },
      media: [],
      sourceNotes: [],
    };
    const result = compileEditorialStagePack({
      source,
      outputMode: 'html',
    });

    expect(result.output.content).toContain('data-direction="bold-editorial"');
    expect(result.output.content).toContain('es-direction-bold-editorial');
    expect(result.output.content).toContain('es-no-media');
    expect(result.output.content).not.toContain('data-media-slot="story_media"');
  });

  it('marks bound media slots with asset, crop, and accessible label metadata', () => {
    const source = createSource();
    source.slides[1] = {
      ...source.slides[1]!,
      layoutId: 'lead-media',
      role: 'explainer',
      slots: {
        kicker: 'Evidence',
        title: 'Show the proof where the claim is made',
        body: 'One annotated proof frame keeps the recommendation concrete.',
        caption: 'Proof screenshot',
      },
      media: [
        {
          slotId: 'lead_media',
          assetId: 'proof-shot',
          altText: 'Annotated proof screenshot',
          aspectRatio: '16:9',
          cropMode: 'contain',
          caption: 'Proof screenshot',
        },
      ],
      sourceNotes: ['Proof screenshot'],
    };
    const result = compileEditorialStagePack({
      source,
      outputMode: 'html',
      mediaResolver: createProjectMediaResolver([{
        id: 'proof-shot',
        filename: 'proof-shot.png',
        mimeType: 'image/png',
        relativePath: 'media/proof-shot.png',
        dataUrl: 'data:image/png;base64,proof',
      }]),
    });

    expect(result.validation.passed).toBe(true);
    expect(result.output.content).toContain('data-asset-id="proof-shot"');
    expect(result.output.content).toContain('class="es-media-placeholder es-media-bound es-crop-contain"');
    expect(result.output.content).toContain('<img src="data:image/png;base64,proof" alt="Annotated proof screenshot" />');
    expect(result.output.content).toContain('role="img"');
    expect(result.output.content).toContain('aria-label="Annotated proof screenshot"');
  });

  it('blocks required bound media when the project asset cannot be resolved', () => {
    const source = createSource();
    source.slides[1] = {
      ...source.slides[1]!,
      layoutId: 'lead-media',
      role: 'explainer',
      slots: {
        kicker: 'Evidence',
        title: 'Show the proof where the claim is made',
        body: 'One annotated proof frame keeps the recommendation concrete.',
        caption: 'Proof screenshot',
      },
      media: [
        {
          slotId: 'lead_media',
          assetId: 'missing-proof-shot',
          altText: 'Annotated proof screenshot',
          aspectRatio: '16:9',
          cropMode: 'cover-top',
          caption: 'Proof screenshot',
        },
      ],
      sourceNotes: ['Proof screenshot'],
    };

    const result = compileEditorialStagePack({
      source,
      outputMode: 'html',
      mediaResolver: createProjectMediaResolver([]),
    });

    const findingIds = result.validation.findings.map((finding) => finding.id);
    expect(result.validation.passed).toBe(false);
    expect(findingIds).toContain('media.required_unresolved');
    expect(findingIds).toContain('compiled.media_unresolved_placeholder');
  });

  it('keeps the checked-in example compiled from the source payload', () => {
    const source = JSON.parse(readFileSync(EXAMPLE_SOURCE_PATH, 'utf8')) as EditorialStageSource;
    const media = JSON.parse(readFileSync(EXAMPLE_MEDIA_PATH, 'utf8')) as ProjectMediaAsset[];
    const exampleHtml = readFileSync(EXAMPLE_HTML_PATH, 'utf8');
    const result = compileEditorialStagePack({
      source,
      outputMode: 'html',
      mediaResolver: createProjectMediaResolver(media),
    });

    expect(result.validation.passed).toBe(true);
    expect(result.output.content.match(/<section\b/g)).toHaveLength(source.slides.length);
    expect(result.output.content.match(/<style\b/g)).toHaveLength(1);
    expect(result.output.content).toContain('data-aura-style-system="presentation/editorial-stage-v1"');
    expect(result.output.content).toContain('data-layout="story-split"');
    expect(result.output.content).toContain('data-layout="question-hero"');
    expect(result.output.content).toContain('data-layout="lead-media"');
    expect(result.output.content).toContain('data-layout="process-pipeline"');
    expect(result.output.content).toContain('data-direction="editorial-magazine"');
    expect(result.output.content).toContain('<img src="data:image/svg+xml;base64,');
    expect(normalizeHtml(result.output.content)).toBe(normalizeHtml(exampleHtml));
  });
});
