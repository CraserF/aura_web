import { describe, expect, it } from 'vitest';

import {
  listArtifactDesignDirections,
  listArtifactPackManifests,
  validateArtifactPackManifest,
} from '@/services/artifactPacks';
import type { ArtifactPackManifest } from '@/services/artifactPacks';

describe('artifact pack registry foundation', () => {
  it('ships five distinct Aura design directions with complete posture metadata', () => {
    const directions = listArtifactDesignDirections();

    expect(directions.map((direction) => direction.id)).toEqual([
      'editorial-magazine',
      'modern-minimal',
      'data-utility',
      'warm-narrative',
      'bold-editorial',
    ]);
    expect(new Set(directions.map((direction) => direction.id)).size).toBe(directions.length);

    for (const direction of directions) {
      expect(direction.label).toBeTruthy();
      expect(direction.bestFor.length).toBeGreaterThan(0);
      expect(direction.palette.colors.canvas).toMatch(/^#/);
      expect(direction.palette.chartPalette.length).toBeGreaterThanOrEqual(5);
      expect(direction.typography.families.display).toBeTruthy();
      expect(direction.layoutPosture.length).toBeGreaterThan(0);
      expect(direction.artifactPosture.presentation.length).toBeGreaterThan(0);
      expect(direction.artifactPosture.document.length).toBeGreaterThan(0);
      expect(direction.artifactPosture.spreadsheet.length).toBeGreaterThan(0);
      expect(direction.do.length).toBeGreaterThan(0);
      expect(direction.dont.length).toBeGreaterThan(0);
    }
  });

  it('registers the new editorial-stage presentation pack', () => {
    const manifests = listArtifactPackManifests();
    expect(manifests.map((manifest) => manifest.id)).toContain('presentation/editorial-stage-v1');
    const pack = manifests.find((manifest) => manifest.id === 'presentation/editorial-stage-v1')!;

    expect(pack.artifactType).toBe('presentation');
    expect(pack.supportedDirections).toEqual([
      'editorial-magazine',
      'modern-minimal',
      'data-utility',
      'warm-narrative',
      'bold-editorial',
    ]);
    expect(pack.layoutFamilies).toHaveLength(12);
    expect(validateArtifactPackManifest(pack)).toEqual([]);
  });

  it('validates pack manifest essentials', () => {
    const manifest: ArtifactPackManifest = {
      id: 'presentation/example-v1',
      version: '1.0.0',
      label: 'Example',
      description: 'Example manifest for validator coverage.',
      status: 'shippable',
      artifactType: 'presentation',
      bestFor: [],
      supportedOutputModes: [],
      supportedDirections: [],
      requiredSourceAssets: [],
      optionalSourceAssets: [],
      layoutFamilies: [],
      contentLimits: {},
      editSurfaces: [],
      exportCaveats: [],
      examples: [],
    };

    expect(validateArtifactPackManifest(manifest)).toEqual([
      'Pack presentation/example-v1 must declare bestFor.',
      'Pack presentation/example-v1 must declare output modes.',
      'Pack presentation/example-v1 must declare supported directions.',
      'Pack presentation/example-v1 must declare layout families.',
      'Pack presentation/example-v1 must declare edit surfaces.',
      'Shippable pack presentation/example-v1 must include examples.',
    ]);
  });
});
