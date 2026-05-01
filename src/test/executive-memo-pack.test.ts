import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  buildDesignContextSpec,
  listArtifactPackManifests,
  resolveArtifactPackForSelection,
  validateArtifactPackManifest,
} from '@/services/artifactPacks';
import {
  compileExecutiveMemoPack,
  EXECUTIVE_MEMO_PROJECT_DESIGN_ADAPTER,
  validateExecutiveMemoCompiledOutput,
  validateExecutiveMemoSource,
} from '@/services/artifactPacks/packs/document/executive-memo-v1/compiler';
import { EXECUTIVE_MEMO_PACK } from '@/services/artifactPacks/packs/document/executive-memo-v1/manifest';
import type { ExecutiveMemoSource } from '@/services/artifactPacks/packs/document/executive-memo-v1/schemas';

const PACK_ROOT = 'src/services/artifactPacks/packs/document/executive-memo-v1';
const SOURCE_PATH = `${PACK_ROOT}/examples/source.json`;
const EXAMPLE_HTML_PATH = `${PACK_ROOT}/examples/example.html`;

const normalizeHtml = (html: string): string => html.replace(/\s+/g, ' ').trim();

function loadExampleSource(): ExecutiveMemoSource {
  return JSON.parse(readFileSync(join(process.cwd(), SOURCE_PATH), 'utf8')) as ExecutiveMemoSource;
}

function cloneSource(overrides: Partial<ExecutiveMemoSource> = {}): ExecutiveMemoSource {
  return {
    ...loadExampleSource(),
    ...overrides,
    modules: overrides.modules ?? loadExampleSource().modules.map((module) => ({
      ...module,
      slots: { ...module.slots },
      items: module.items.map((item) => ({ ...item })),
      ...(module.table ? {
        table: {
          columns: [...module.table.columns],
          rows: module.table.rows.map((row) => [...row]),
        },
      } : {}),
      sourceNotes: [...module.sourceNotes],
    })),
  };
}

describe('document/executive-memo-v1 pack', () => {
  it('registers the executive memo pack with document-specific surfaces', () => {
    const pack = listArtifactPackManifests()
      .find((manifest) => manifest.id === 'document/executive-memo-v1');

    expect(pack).toBeTruthy();
    expect(pack?.artifactType).toBe('document');
    expect(pack?.layoutFamilies).toEqual([
      'memo-cover',
      'decision-summary',
      'context',
      'recommendation',
      'evidence-table',
      'risk-register',
      'action-plan',
      'source-notes',
    ]);
    expect(pack?.editSurfaces.map((surface) => surface.kind)).toContain('add-module');
    expect(pack?.editSurfaces.some((surface) => surface.label.toLowerCase().includes('slide'))).toBe(false);
    expect(validateArtifactPackManifest(pack!)).toEqual([]);

    const resolved = resolveArtifactPackForSelection({
      artifactType: 'document',
      outputMode: 'html',
      prompt: 'Create an executive memo for the board',
    });
    expect(resolved?.manifest.id).toBe('document/executive-memo-v1');
  });

  it('compiles module payloads into one scoped document style system', () => {
    const source = loadExampleSource();
    const designContext = buildDesignContextSpec({
      artifactType: 'document',
      packId: EXECUTIVE_MEMO_PACK.manifest.id,
      packVersion: EXECUTIVE_MEMO_PACK.manifest.version,
      directionId: source.directionId,
      audience: source.audience,
      briefSummary: source.brief,
      project: {
        projectRules: {
          markdown: '- Accent: #174ea6\n- Background: #f7f9fc',
          updatedAt: 1,
        },
      },
    });

    const result = compileExecutiveMemoPack({ source, designContext, outputMode: 'html' });

    expect(result.validation.findings).toEqual([]);
    expect(result.validation.passed).toBe(true);
    expect(result.output.mode).toBe('html');
    expect(result.output.content.match(/<style\b/g)).toHaveLength(1);
    expect(result.output.content).toContain('data-aura-style-system="document/executive-memo-v1"');
    expect(result.output.content).toContain('data-pack="document/executive-memo-v1"');
    expect(result.output.content).toContain('class="em-doc em-direction-modern-minimal"');
    expect(result.output.content).toContain('Enterprise Search Decision Memo');
    expect(result.output.content).toContain('<table class="em-table">');
    expect(result.output.content).toContain('--em-accent: #174ea6;');
    expect(result.output.content).not.toMatch(/\sstyle=/i);
    expect(result.output.content).not.toContain('{{');
  });

  it('keeps the checked-in example generated from the compiler-owned source and CSS', () => {
    const source = loadExampleSource();
    const result = compileExecutiveMemoPack({ source, outputMode: 'html' });
    const exampleHtml = readFileSync(join(process.cwd(), EXAMPLE_HTML_PATH), 'utf8');

    expect(result.validation.passed).toBe(true);
    expect(normalizeHtml(result.output.content)).toBe(normalizeHtml(exampleHtml));
  });

  it('validates source heading, table, source-note, slot, and tone constraints', () => {
    const invalid = cloneSource();
    invalid.modules[0] = {
      ...invalid.modules[0]!,
      layoutId: 'context',
      role: 'context',
    };
    invalid.modules[1] = {
      ...invalid.modules[1]!,
      slots: {
        ...invalid.modules[1]!.slots,
        recommendation: '<strong>Approve everything</strong>',
      },
    };
    invalid.modules[4] = {
      ...invalid.modules[4]!,
      sourceNotes: [],
    };
    invalid.modules[6] = {
      ...invalid.modules[6]!,
      table: {
        columns: ['Owner', 'Action', 'Timing'],
        rows: [['Product', 'Confirm scope']],
      },
    };
    invalid.modules[5] = {
      ...invalid.modules[5]!,
      items: [
        {
          label: 'World-class launch risk',
          body: 'This would be amazing without controls.',
          status: 'Needs control',
        },
      ],
    };

    const report = validateExecutiveMemoSource(invalid);
    const ids = report.findings.map((finding) => finding.id);

    expect(report.passed).toBe(false);
    expect(ids).toContain('document.heading_structure_invalid');
    expect(ids).toContain('slot.html_detected');
    expect(ids).toContain('document.source_notes_missing');
    expect(ids).toContain('module.table_row_width_mismatch');
    expect(ids).toContain('module.items_missing');
    expect(ids).toContain('document.tone_unsupported');
  });

  it('validates schema-defaulted module payloads without crashing', () => {
    const source = cloneSource();
    const withoutDefaultedArrays = {
      ...source,
      modules: source.modules.map((module) => {
        const nextModule: Record<string, unknown> = { ...module };
        delete nextModule.items;
        delete nextModule.sourceNotes;
        return nextModule;
      }),
    };

    expect(() => validateExecutiveMemoSource(withoutDefaultedArrays)).not.toThrow();
    const report = validateExecutiveMemoSource(withoutDefaultedArrays);

    expect(report.findings.map((finding) => finding.id)).toContain('module.items_missing');
    expect(report.findings.map((finding) => finding.id)).toContain('document.source_notes_missing');
  });

  it('rejects compiled output with unsafe document CSS and undefined classes', () => {
    const report = validateExecutiveMemoCompiledOutput(`
      <style data-aura-style-system="document/executive-memo-v1">
        :root { --bad: red; }
        .em-doc { width: 100vw; }
      </style>
      <article class="em-doc em-unknown" data-pack="document/executive-memo-v1">
        <h1>Memo</h1><section><h2>Decision</h2><p style="color:red">Bad</p></section>
      </article>
    `);
    const ids = report.findings.map((finding) => finding.id);

    expect(report.passed).toBe(false);
    expect(ids).toContain('compiled.inline_style_detected');
    expect(ids).toContain('compiled.global_root_selector_detected');
    expect(ids).toContain('export.viewport_units_detected');
    expect(ids).toContain('compiled.undefined_class');
  });

  it('rejects compiled output with multiple h1 headings', () => {
    const report = validateExecutiveMemoCompiledOutput(`
      <style data-aura-style-system="document/executive-memo-v1">
        .em-doc { width: 100%; }
        @media print { .em-doc { max-width: none; } }
      </style>
      <article class="em-doc" data-pack="document/executive-memo-v1">
        <h1>Memo</h1><h1>Duplicate</h1><section><h2>Decision</h2></section>
      </article>
    `);

    expect(report.findings.map((finding) => finding.id)).toContain('compiled.heading_hierarchy_invalid');
  });

  it('maps project design roles through the document adapter only', () => {
    expect(EXECUTIVE_MEMO_PROJECT_DESIGN_ADAPTER).toMatchObject({
      artifactType: 'document',
      target: 'document-tokens',
    });

    const mapped = EXECUTIVE_MEMO_PROJECT_DESIGN_ADAPTER.mapColorOverrides([
      { role: 'accent', value: '#2255aa', source: 'project-design-md', label: 'Accent' },
      { role: 'text', value: '#101828', source: 'project-design-md', label: 'Text' },
      { role: 'accent', value: 'var(--bad)', source: 'project-design-md', label: 'Unsafe' },
    ]);

    expect(mapped).toEqual({
      '--em-accent': '#2255aa',
      '--em-ink': '#101828',
    });
  });

  it('blocks compiled document output without print-safe CSS', () => {
    const report = validateExecutiveMemoCompiledOutput(`
      <style data-aura-style-system="document/executive-memo-v1">
        .em-doc { width: 100%; }
      </style>
      <article class="em-doc" data-pack="document/executive-memo-v1">
        <h1>Memo</h1><section><h2>Decision</h2></section>
      </article>
    `);

    expect(report.findings.map((finding) => finding.id)).toContain('export.print_rules_missing');
  });
});
