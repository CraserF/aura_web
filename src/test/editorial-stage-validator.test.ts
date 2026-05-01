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

  it('emits stable named rhythm findings for repeated and card-wall runs', () => {
    expect(validateEditorialStageLayoutSequence([
      'story-split',
      'story-split',
    ]).findings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'rhythm.adjacent_repeated_layout',
        severity: 'advisory',
        path: ['slides', 1, 'layoutId'],
      }),
    ]));

    expect(validateEditorialStageLayoutSequence([
      'story-split',
      'comparison',
      'process-pipeline',
      'decision',
      'comparison',
      'process-pipeline',
    ]).findings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'rhythm.hero_breaker_gap',
        severity: 'advisory',
        path: ['slides', 0],
      }),
    ]));

    expect(validateEditorialStageLayoutSequence([
      'media-grid',
      'comparison',
      'lead-media',
    ]).findings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'rhythm.repeated_card_media_wall_risk',
        severity: 'advisory',
        path: ['slides', 2],
      }),
    ]));
  });

  it('blocks required media layouts without valid bound media', () => {
    const source = createSource();
    source.slides[0] = {
      ...source.slides[0]!,
      layoutId: 'lead-media',
      role: 'explainer',
      slots: {
        kicker: 'Evidence',
        title: 'Show the proof where the claim is made',
        body: 'The launch story should point to one annotated evidence frame.',
        caption: 'Proof frame',
      },
      media: [],
      sourceNotes: [],
    };

    const report = validateEditorialStageSource(source);

    expect(report.passed).toBe(false);
    expect(report.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'presentation.asset_missing_when_required',
        severity: 'blocking',
        path: ['slides', 0, 'media', 'lead_media'],
      }),
    ]));
  });

  it('rejects media bindings outside the declared slot aspect and crop contract', () => {
    const source = createSource();
    source.slides[0] = {
      ...source.slides[0]!,
      layoutId: 'lead-media',
      role: 'explainer',
      slots: {
        kicker: 'Evidence',
        title: 'Show the proof where the claim is made',
        body: 'The launch story should point to one annotated evidence frame.',
        caption: 'Proof frame',
      },
      media: [
        {
          slotId: 'lead_media',
          assetId: 'proof-shot',
          altText: 'Annotated proof screenshot',
          aspectRatio: '1:1',
          cropMode: 'cover-center',
          caption: 'Proof frame',
        },
      ],
      sourceNotes: ['Proof screenshot'],
    };

    expect(validateEditorialStageSource(source).findings.map((finding) => finding.id))
      .toEqual(expect.arrayContaining(['media.aspect_invalid', 'media.crop_invalid']));
  });

  it('catches compiled output contract violations', () => {
    const report = validateEditorialStageCompiledOutput(`
      <style data-aura-style-system="presentation/editorial-stage-v1">:root { --es-canvas: #fff; }</style>
      <style></style>
      <section style="color:red"><h1>{{title}}</h1></section>
    `);

    expect(report.findings.map((finding) => finding.id)).toEqual(expect.arrayContaining([
      'compiled.style_block_invalid',
      'compiled.inline_style_detected',
      'compiled.placeholder_unresolved',
      'compiled.section_marker_missing',
      'compiled.global_root_selector_detected',
      'export.background_color_missing',
    ]));
  });

  it('blocks export-unsafe viewport units and missing reduced-motion fallbacks', () => {
    const report = validateEditorialStageCompiledOutput(`
      <style data-aura-style-system="presentation/editorial-stage-v1">
        .es-slide { width: 100vw; transition: opacity 180ms ease; }
      </style>
      <section class="es-slide" data-pack="presentation/editorial-stage-v1" data-background-color="#f7f3e8"></section>
    `);

    expect(report.findings.map((finding) => finding.id)).toEqual(expect.arrayContaining([
      'export.viewport_units_detected',
      'export.reduced_motion_missing',
    ]));
  });

  it('enforces editable-pptx export restrictions', () => {
    const report = validateEditorialStageCompiledOutput({
      mode: 'editable-pptx',
      assets: [],
      generatedAt: 1,
      content: `
        <style data-aura-style-system="presentation/editorial-stage-v1">
          .es-slide { width: 1280px; height: 720px; filter: blur(2px); }
          @media (prefers-reduced-motion: reduce) { .es-slide { animation: none; } }
        </style>
        <section class="es-slide" data-pack="presentation/editorial-stage-v1" data-background-color="#f7f3e8">
          <p><span>Outer <span>Inner</span></span></p>
          <svg><text>Rendered heading</text></svg>
        </section>
      `,
    });

    expect(report.findings.map((finding) => finding.id)).toEqual(expect.arrayContaining([
      'export.pptx_unsupported_css',
      'export.pptx_nested_span_risk',
      'export.pptx_text_as_image_detected',
    ]));
  });
});
