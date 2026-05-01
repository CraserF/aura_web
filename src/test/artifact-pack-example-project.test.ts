import { describe, expect, it, vi } from 'vitest';

const replaceSheetDataMock = vi.hoisted(() => vi.fn(async (
  _sheet: unknown,
  schema: unknown,
  _rows: unknown,
) => {
  void _rows;
  return schema;
}));

vi.mock('@/services/spreadsheet/workbook', () => ({
  replaceSheetData: replaceSheetDataMock,
}));

import {
  createArtifactPackExampleDocument,
  createArtifactPackExampleProject,
  listShippedArtifactPackExamples,
  toShippedArtifactPackExampleId,
  type ShippedArtifactPackExampleId,
} from '@/services/artifactPacks';

const NOW = 1_775_232_000_000;

describe('artifact pack example project starters', () => {
  it('lists the shipped pack examples available for project creation', () => {
    expect(listShippedArtifactPackExamples()).toEqual([
      'presentation/editorial-stage-v1:decision-brief-example',
      'document/executive-memo-v1:executive-memo-example',
      'spreadsheet/operating-model-v1:operating-model-example',
    ]);
  });

  it('maps gallery pack/example ids to shipped example starters', () => {
    expect(toShippedArtifactPackExampleId(
      'document/executive-memo-v1',
      'executive-memo-example',
    )).toBe('document/executive-memo-v1:executive-memo-example');
    expect(toShippedArtifactPackExampleId(
      'document/executive-memo-v1',
      'missing-example',
    )).toBeNull();
  });

  it.each([
    ['presentation/editorial-stage-v1:decision-brief-example', 'presentation', 'presentation/editorial-stage-v1'],
    ['document/executive-memo-v1:executive-memo-example', 'document', 'document/executive-memo-v1'],
    ['spreadsheet/operating-model-v1:operating-model-example', 'spreadsheet', 'spreadsheet/operating-model-v1'],
  ] as const)('creates a project document for %s with pack metadata and source payload', (exampleId, type, packId) => {
    const document = createArtifactPackExampleDocument({
      exampleId,
      documentId: `${type}-doc`,
      now: NOW,
    });

    expect(document.id).toBe(`${type}-doc`);
    expect(document.type).toBe(type);
    expect(document.lifecycleState).toBe('draft');
    expect(document.artifactManifest).toEqual(expect.objectContaining({
      packId,
      packVersion: '1.0.0',
      sourcePayloadVersion: 1,
      renderer: type,
      validationStatus: expect.stringMatching(/^(passed|warnings)$/),
      updatedAt: NOW,
    }));
    expect(document.artifactSourcePayload).toEqual(expect.objectContaining({
      schemaVersion: 1,
      packId,
      packVersion: '1.0.0',
    }));
    expect(document.starterRef).toEqual({
      artifactKey: exampleId,
      starterId: packId,
      starterType: type,
    });
    expect(document.contentHtml.length).toBeGreaterThan(100);
  });

  it('preserves the editorial stage compiled example as presentation content', () => {
    const document = createArtifactPackExampleDocument({
      exampleId: 'presentation/editorial-stage-v1:decision-brief-example',
      now: NOW,
    });

    expect(document.title).toBe('Choose the focused launch path');
    expect(document.slideCount).toBe(8);
    expect(document.contentHtml).toContain('data-pack="presentation/editorial-stage-v1"');
    expect(document.artifactManifest?.exports).toEqual(['html', 'pdf', 'editable-pptx']);
  });

  it('includes shipped media assets when wrapping the presentation example as a project', async () => {
    const project = await createArtifactPackExampleProject({
      exampleId: 'presentation/editorial-stage-v1:decision-brief-example',
      now: NOW,
    });

    expect(project.media?.map((asset) => asset.id)).toEqual(['launch-proof-screenshot']);
    expect(project.documents[0]?.contentHtml).toContain('data:image/svg+xml;base64');
  });

  it('preserves the executive memo compiled example as document content', () => {
    const document = createArtifactPackExampleDocument({
      exampleId: 'document/executive-memo-v1:executive-memo-example',
      now: NOW,
    });

    expect(document.title).toBe('Enterprise Search Decision Memo');
    expect(document.slideCount).toBe(0);
    expect(document.contentHtml).toContain('data-pack="document/executive-memo-v1"');
    expect(document.artifactManifest?.exports).toEqual(['html', 'pdf', 'docx']);
  });

  it('preserves the operating model workbook metadata, compiled data, and source payload', () => {
    const document = createArtifactPackExampleDocument({
      exampleId: 'spreadsheet/operating-model-v1:operating-model-example',
      now: NOW,
    });
    const compiled = JSON.parse(document.contentHtml) as {
      data: Record<string, unknown[]>;
      workbook: { sheets: Array<{ name: string }> };
    };

    expect(document.title).toBe('Regional Operating Model');
    expect(document.workbook?.sheets.map((sheet) => sheet.name)).toEqual(['Inputs', 'Model', 'Summary']);
    expect(compiled.data.inputs).toHaveLength(3);
    expect(document.chartSpecs?.['variance-chart']).toEqual(expect.objectContaining({
      id: 'variance-chart',
      labels: ['North', 'South', 'West'],
    }));
    expect(document.artifactSourcePayload).toEqual(expect.objectContaining({
      sheets: expect.any(Array),
    }));
  });

  it('wraps an example document in a normal ProjectData shell', async () => {
    const ids = ['doc-1', 'project-1'];
    const project = await createArtifactPackExampleProject({
      exampleId: 'document/executive-memo-v1:executive-memo-example',
      createId: () => ids.shift() ?? 'extra-id',
      now: NOW,
    });

    expect(project.id).toBe('project-1');
    expect(project.activeDocumentId).toBe('doc-1');
    expect(project.sections.drafts).toEqual(['doc-1']);
    expect(project.documents).toHaveLength(1);
    expect(project.documents[0]?.artifactManifest?.packId).toBe('document/executive-memo-v1');
  });

  it('materializes spreadsheet example rows before handing off the project shell', async () => {
    replaceSheetDataMock.mockClear();
    const project = await createArtifactPackExampleProject({
      exampleId: 'spreadsheet/operating-model-v1:operating-model-example',
      documentId: 'doc-1',
      now: NOW,
    });

    expect(project.documents[0]?.type).toBe('spreadsheet');
    expect(replaceSheetDataMock).toHaveBeenCalledTimes(3);
    expect(replaceSheetDataMock.mock.calls.map((call) => (call[0] as { name: string }).name)).toEqual([
      'Inputs',
      'Model',
      'Summary',
    ]);
    expect(replaceSheetDataMock.mock.calls.map((call) => (call[0] as { tableName: string }).tableName)).toEqual([
      'aura_doc_1_inputs',
      'aura_doc_1_model',
      'aura_doc_1_summary',
    ]);
    expect(replaceSheetDataMock.mock.calls[0]?.[2]).toEqual([
      { Region: 'North', Quarter: 'Q1', PlanRevenue: 1250000, ActualRevenue: 1320000, Cost: 760000 },
      { Region: 'South', Quarter: 'Q1', PlanRevenue: 980000, ActualRevenue: 910000, Cost: 580000 },
      { Region: 'West', Quarter: 'Q1', PlanRevenue: 1110000, ActualRevenue: 1165000, Cost: 690000 },
    ]);
    expect(project.documents[0]?.workbook?.sheets.map((sheet) => sheet.tableName)).toEqual([
      'aura_doc_1_inputs',
      'aura_doc_1_model',
      'aura_doc_1_summary',
    ]);
    expect((project.documents[0]?.artifactSourcePayload as { sheets: Array<{ tableName: string }> }).sheets.map((sheet) => sheet.tableName)).toEqual([
      'aura_doc_1_inputs',
      'aura_doc_1_model',
      'aura_doc_1_summary',
    ]);
    expect((JSON.parse(project.documents[0]?.contentHtml ?? '{}') as { workbook: { sheets: Array<{ tableName: string }> } }).workbook.sheets.map((sheet) => sheet.tableName)).toEqual([
      'aura_doc_1_inputs',
      'aura_doc_1_model',
      'aura_doc_1_summary',
    ]);
  });

  it('accepts title and project title overrides without changing the source title', async () => {
    const exampleId: ShippedArtifactPackExampleId = 'spreadsheet/operating-model-v1:operating-model-example';
    const project = await createArtifactPackExampleProject({
      exampleId,
      documentId: 'model-doc',
      projectId: 'model-project',
      title: 'Board Model',
      projectTitle: 'Board Pack',
      now: NOW,
    });

    expect(project.title).toBe('Board Pack');
    expect(project.documents[0]?.title).toBe('Board Model');
    expect(project.documents[0]?.artifactSourcePayload).toEqual(expect.objectContaining({
      title: 'Regional Operating Model',
    }));
  });
});
