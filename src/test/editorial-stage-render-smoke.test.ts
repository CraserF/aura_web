import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

import { createProjectMediaResolver } from '@/services/artifactPacks';
import { compileEditorialStagePack } from '@/services/artifactPacks/packs/presentation/editorial-stage-v1/compiler';
import type { EditorialStageSource } from '@/services/artifactPacks/packs/presentation/editorial-stage-v1/schemas';
import type { ProjectMediaAsset } from '@/types/project';

const EXAMPLE_SOURCE_PATH = 'src/services/artifactPacks/packs/presentation/editorial-stage-v1/examples/source.json';
const EXAMPLE_MEDIA_PATH = 'src/services/artifactPacks/packs/presentation/editorial-stage-v1/examples/media.json';
const STYLE_CSS_PATH = 'src/services/artifactPacks/packs/presentation/editorial-stage-v1/style.css';
const DIRECTIONS: EditorialStageSource['directionId'][] = [
  'editorial-magazine',
  'modern-minimal',
  'data-utility',
];

describe('editorial-stage presentation render smoke', () => {
  it('renders the example deck with the fixed stage and pack metadata contract', () => {
    const source = JSON.parse(readFileSync(EXAMPLE_SOURCE_PATH, 'utf8')) as EditorialStageSource;
    const media = JSON.parse(readFileSync(EXAMPLE_MEDIA_PATH, 'utf8')) as ProjectMediaAsset[];
    const result = compileEditorialStagePack({
      source,
      outputMode: 'html',
      mediaResolver: createProjectMediaResolver(media),
    });
    document.body.innerHTML = result.output.content;
    const sections = [...document.querySelectorAll<HTMLElement>('section.es-slide')];

    expect(document.querySelectorAll('style[data-aura-style-system="presentation/editorial-stage-v1"]')).toHaveLength(1);
    expect(sections).toHaveLength(source.slides.length);

    source.slides.forEach((slide, index) => {
      const section = sections[index]!;
      expect(section.dataset.pack).toBe('presentation/editorial-stage-v1');
      expect(section.dataset.slideId).toBe(slide.slideId);
      expect(section.dataset.layout).toBe(slide.layoutId);
      expect(section.dataset.direction).toBe(source.directionId);
      expect(section.classList.contains(`es-mood-${slide.mood}`)).toBe(true);
      expect(section.classList.contains(`es-direction-${source.directionId}`)).toBe(true);
      expect(section.dataset.backgroundColor).toMatch(/^#/);
    });

    const firstSlideStyle = getComputedStyle(sections[0]!);
    expect(firstSlideStyle.width).toBe('1280px');
    expect(firstSlideStyle.height).toBe('720px');
    expect(firstSlideStyle.overflow).toBe('hidden');
    expect(firstSlideStyle.display).toBe('grid');

    const mediaFrame = document.querySelector<HTMLElement>('[data-media-slot="lead_media"] .es-media-bound');
    const mediaImage = mediaFrame?.querySelector('img');
    expect(mediaFrame?.dataset.assetId).toBe('launch-proof-screenshot');
    expect(mediaFrame?.classList.contains('es-crop-contain')).toBe(true);
    expect(mediaFrame?.getAttribute('role')).toBe('img');
    expect(mediaFrame?.getAttribute('aria-label')).toBe('Annotated screenshot showing focused buyer demand and launch proof points');
    expect(mediaImage?.getAttribute('src')).toContain('data:image/svg+xml;base64,');
    expect(mediaImage?.getAttribute('alt')).toBe('Annotated screenshot showing focused buyer demand and launch proof points');
    expect(result.validation.findings.map((finding) => finding.id)).not.toContain('compiled.media_unresolved_placeholder');
  });

  it('compiles the same source cleanly across priority directions', () => {
    const baseSource = JSON.parse(readFileSync(EXAMPLE_SOURCE_PATH, 'utf8')) as EditorialStageSource;
    const media = JSON.parse(readFileSync(EXAMPLE_MEDIA_PATH, 'utf8')) as ProjectMediaAsset[];
    const mediaResolver = createProjectMediaResolver(media);

    for (const directionId of DIRECTIONS) {
      const source = {
        ...baseSource,
        directionId,
        slides: baseSource.slides.map((slide) => ({ ...slide, slots: { ...slide.slots }, media: [...slide.media] })),
      };
      const result = compileEditorialStagePack({ source, outputMode: 'html', mediaResolver });
      document.body.innerHTML = result.output.content;
      const sections = [...document.querySelectorAll<HTMLElement>('section.es-slide')];
      const findingIds = result.validation.findings.map((finding) => finding.id);

      expect(result.validation.passed).toBe(true);
      expect(findingIds).not.toContain('presentation.asset_missing_when_required');
      expect(findingIds).not.toContain('rhythm.repeated_card_media_wall_risk');
      expect(findingIds).not.toContain('rhythm.adjacent_repeated_layout');
      expect(findingIds).not.toContain('rhythm.hero_breaker_gap');
      expect(sections).toHaveLength(source.slides.length);
      expect(sections.every((section) => section.dataset.direction === directionId)).toBe(true);
      expect(sections.every((section) => section.classList.contains(`es-direction-${directionId}`))).toBe(true);
      expect(result.output.content).not.toContain('data-media-slot="story_media"');
    }
  });

  it('keeps the pack CSS free of decorative radial gradients', () => {
    const css = readFileSync(STYLE_CSS_PATH, 'utf8');

    expect(css).not.toMatch(/radial-gradient/i);
  });
});
