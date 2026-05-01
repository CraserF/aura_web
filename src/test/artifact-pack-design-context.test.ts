import { describe, expect, it } from 'vitest';

import {
  buildDesignContextSpec,
  extractDesignDirectionFromRules,
  resolveProjectDesignSystemSpec,
  resolveDesignDirectionForArtifact,
} from '@/services/artifactPacks';

describe('artifact pack design context', () => {
  it('extracts direction hints from project rules', () => {
    expect(extractDesignDirectionFromRules('Direction: Data Utility')).toBe('data-utility');
    expect(extractDesignDirectionFromRules('- Visual direction: Warm teaching story')).toBe('warm-narrative');
    expect(extractDesignDirectionFromRules('Design direction: bold-editorial')).toBe('bold-editorial');
    expect(extractDesignDirectionFromRules('Visual direction: Executive')).toBe('modern-minimal');
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

  it('maps project DESIGN.md color roles into safe token overrides', () => {
    const designSystem = resolveProjectDesignSystemSpec(`
# DESIGN.md

## Color Roles
- Canvas: #101820
- Surface: #f7f3e8
- Text: #fdfcf8
- Accent: #F59E0B
- Brand: linear-gradient(red, blue)
`);

    expect(designSystem?.source).toBe('project-design-md');
    expect(designSystem?.colorOverrides).toEqual(expect.arrayContaining([
      expect.objectContaining({ role: 'canvas', value: '#101820' }),
      expect.objectContaining({ role: 'surface', value: '#f7f3e8' }),
      expect.objectContaining({ role: 'text', value: '#fdfcf8' }),
      expect.objectContaining({ role: 'accent', value: '#f59e0b' }),
    ]));
    expect(designSystem?.preview.ignoredColorLines[0]).toContain('linear-gradient');
  });

  it('rejects CSS declarations, functions, and unknown token roles in project design input', () => {
    const designSystem = resolveProjectDesignSystemSpec([
      '.deck {',
      '  background: #ffffff;',
      '  border: #dddddd;',
      '  color: #ffffff;',
      '}',
      'Accent: var(--brand)',
      '.deck { background: #000000; border: #222222; }',
      'background: #101010;',
      'border: #dddddd',
      '```css',
      'Accent: #ff0000',
      '```',
      'Background color: #000000',
      'Type scale: 72px',
    ].join('\n'));

    expect(designSystem?.colorOverrides).toEqual([]);
    expect(designSystem?.preview.palette).toEqual([]);
    expect(designSystem?.preview.ignoredColorLines.join('\n')).toContain('background: #ffffff');
    expect(designSystem?.preview.ignoredColorLines.join('\n')).toContain('.deck { background: #000000; border: #222222; }');
    expect(designSystem?.preview.ignoredColorLines.join('\n')).toContain('background: #101010;');
    expect(designSystem?.preview.ignoredColorLines.join('\n')).toContain('border: #dddddd');
    expect(designSystem?.preview.ignoredColorLines.join('\n')).toContain('Accent: #ff0000');
    expect(designSystem?.preview.ignoredColorLines.join('\n')).toContain('color: #ffffff');
    expect(designSystem?.preview.ignoredColorLines.join('\n')).toContain('Accent: var(--brand)');
  });

  it('applies validated project design colors to the design context tokens', () => {
    const context = buildDesignContextSpec({
      artifactType: 'presentation',
      project: {
        projectRules: {
          markdown: [
            '# DESIGN.md',
            'Design direction: data-utility',
            'Canvas: #08111f',
            'Text: #f8fafc',
            'Accent: #22c55e',
            'Surface: rgb(255, 255, 255)',
          ].join('\n'),
          updatedAt: 1,
        },
      },
    });

    expect(context.source).toBe('project-design-md');
    expect(context.directionId).toBe('data-utility');
    expect(context.tokens.colors.canvas).toBe('#08111f');
    expect(context.tokens.colors.text).toBe('#f8fafc');
    expect(context.tokens.colors.accent).toBe('#22c55e');
    expect(context.tokens.colors.surface).not.toBe('rgb(255, 255, 255)');
    expect(context.projectDesignSystem?.preview.ignoredColorLines[0]).toContain('rgb');
    expect(context.constraints).toContain('Use only validated project design token roles; ignore raw CSS color syntax from project rules.');
  });

  it('falls back to project color theme as user-selected token roles when DESIGN.md roles are absent', () => {
    const context = buildDesignContextSpec({
      artifactType: 'document',
      project: {
        colorTheme: {
          background: '#ffffff',
          primary: '#111827',
          accent: '#2563eb',
        },
      },
    });

    expect(context.source).toBe('user-selection');
    expect(context.tokens.colors.canvas).toBe('#ffffff');
    expect(context.tokens.colors.text).toBe('#111827');
    expect(context.tokens.colors.accent).toBe('#2563eb');
    expect(context.projectDesignSystem?.preview.summary).toContain('Project color theme');
  });

  it('merges project color theme with DESIGN.md overrides, with DESIGN.md winning matching roles', () => {
    const context = buildDesignContextSpec({
      artifactType: 'presentation',
      project: {
        colorTheme: {
          background: '#ffffff',
          primary: '#111827',
          accent: '#2563eb',
        },
        projectRules: {
          markdown: [
            'Design direction: editorial',
            'Accent: #f97316',
          ].join('\n'),
          updatedAt: 1,
        },
      },
    });

    expect(context.source).toBe('project-design-md');
    expect(context.tokens.colors.canvas).toBe('#ffffff');
    expect(context.tokens.colors.text).toBe('#111827');
    expect(context.tokens.colors.accent).toBe('#f97316');
  });

  it('accepts lowercase role assignments when they are clearly authored as design-list items', () => {
    const designSystem = resolveProjectDesignSystemSpec([
      '- accent: #f97316',
      '- background: #fff7ed',
    ].join('\n'));

    expect(designSystem?.colorOverrides).toEqual(expect.arrayContaining([
      expect.objectContaining({ role: 'accent', value: '#f97316' }),
      expect.objectContaining({ role: 'canvas', value: '#fff7ed' }),
    ]));
  });

  it('reports color-theme fallback honestly when DESIGN.md only contains unsafe colors', () => {
    const designSystem = resolveProjectDesignSystemSpec(
      '.deck { background: #000000; }',
      {
        background: '#ffffff',
        primary: '#111827',
        accent: '#2563eb',
      },
    );

    expect(designSystem?.source).toBe('project-color-theme');
    expect(designSystem?.preview.summary).toContain('Project color theme');
    expect(designSystem?.colorOverrides).toEqual(expect.arrayContaining([
      expect.objectContaining({ role: 'canvas', source: 'project-color-theme', value: '#ffffff' }),
      expect.objectContaining({ role: 'text', source: 'project-color-theme', value: '#111827' }),
      expect.objectContaining({ role: 'accent', source: 'project-color-theme', value: '#2563eb' }),
    ]));
    expect(designSystem?.preview.ignoredColorLines[0]).toContain('background: #000000');
  });
});
