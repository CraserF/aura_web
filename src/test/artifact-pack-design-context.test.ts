import { describe, expect, it } from 'vitest';

import {
  buildDesignContextSpec,
  extractDesignDirectionFromRules,
  resolveDesignDirectionForArtifact,
} from '@/services/artifactPacks';

describe('artifact pack design context', () => {
  it('extracts direction hints from project rules', () => {
    expect(extractDesignDirectionFromRules('Direction: Data Utility')).toBe('data-utility');
    expect(extractDesignDirectionFromRules('- Visual direction: Warm teaching story')).toBe('warm-narrative');
  });

  it('defaults artifact types to suitable directions', () => {
    expect(resolveDesignDirectionForArtifact({ artifactType: 'presentation' }).id).toBe('editorial-magazine');
    expect(resolveDesignDirectionForArtifact({ artifactType: 'document' }).id).toBe('modern-minimal');
    expect(resolveDesignDirectionForArtifact({ artifactType: 'spreadsheet' }).id).toBe('data-utility');
  });

  it('builds a source-of-truth design context with media and data binding defaults', () => {
    const context = buildDesignContextSpec({
      artifactType: 'presentation',
      packId: 'presentation/editorial-stage-v1',
      packVersion: '1.0.0',
      directionId: 'bold launch',
      audience: 'launch team',
      briefSummary: 'Launch narrative',
      project: {
        media: [{
          id: 'asset-1',
          filename: 'screen.png',
          mimeType: 'image/png',
          relativePath: 'media/screen.png',
          dataUrl: 'data:image/png;base64,AA==',
        }],
      },
    });

    expect(context.directionId).toBe('bold-editorial');
    expect(context.packId).toBe('presentation/editorial-stage-v1');
    expect(context.packVersion).toBe('1.0.0');
    expect(context.audience).toBe('launch team');
    expect(context.mediaBindingPlan?.availableAssetIds).toEqual(['asset-1']);
    expect(context.mediaBindingPlan?.missingAssetPolicy).toBe('use-placeholder');
    expect(context.dataBindingPlan?.inventedMetricPolicy).toBe('flag');
    expect(context.constraints.some((constraint) => constraint.startsWith('Avoid:'))).toBe(true);
  });
});

