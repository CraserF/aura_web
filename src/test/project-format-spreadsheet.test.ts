import { describe, expect, it, vi } from 'vitest';

const importSheetParquetMock = vi.fn(async () => {});

const zipFiles: Record<string, { async: (type: string) => Promise<unknown> }> = {
  'manifest.json': {
    async: async () => JSON.stringify({
      version: '2.1',
      schemaType: 'project',
      id: 'project-1',
      title: 'Spreadsheet Project',
      documentCount: 1,
      activeDocumentId: 'doc-1',
      visibility: 'private',
      createdAt: 1,
      updatedAt: 2,
    }),
  },
  'chat-history.json': {
    async: async () => '[]',
  },
  'documents/doc-1.meta.json': {
    async: async () => JSON.stringify({
      id: 'doc-1',
      title: 'Finance Sheet',
      type: 'spreadsheet',
      contentHtml: '',
      themeCss: '',
      slideCount: 0,
      order: 0,
      workbook: {
        activeSheetIndex: 0,
        sheets: [
          {
            id: 'sheet-1',
            name: 'Sheet 1',
            tableName: 'sheet_table_1',
            schema: [{ name: 'A', type: 'text', nullable: true }],
            frozenRows: 1,
            frozenCols: 0,
            columnWidths: {},
            formulas: [],
          },
        ],
      },
      createdAt: 1,
      updatedAt: 2,
    }),
  },
  'documents/doc-1.html': {
    async: async () => '',
  },
  'documents/doc-1.sheet-1.parquet': {
    async: async () => new Uint8Array([1, 2, 3]),
  },
};

const zipMock = {
  files: {
    'documents/doc-1.meta.json': {},
  },
  file(path: string) {
    return zipFiles[path];
  },
  folder(name: string) {
    if (name === 'documents') return {};
    return null;
  },
};

vi.mock('jszip', () => {
  class MockZip {
    static async loadAsync() {
      return zipMock;
    }
    file() {
      return null;
    }
    folder() {
      return this;
    }
    async generateAsync() {
      return new Blob();
    }
  }
  return { default: MockZip };
});

vi.mock('file-saver', () => ({
  saveAs: vi.fn(),
}));

vi.mock('@/services/charts', () => ({
  extractChartSpecsFromHtml: vi.fn(() => ({})),
}));

vi.mock('@/services/spreadsheet/workbook', () => ({
  exportSheetParquet: vi.fn(async () => new Uint8Array([1, 2, 3])),
  importSheetParquet: importSheetParquetMock,
}));

describe('projectFormat spreadsheet persistence', () => {
  it('loads spreadsheet parquet artifacts into DuckDB tables during openProjectFile', async () => {
    const { openProjectFile } = await import('@/services/storage/projectFormat');

    const project = await openProjectFile(new File(['data'], 'project.aura'));

    expect(project.documents).toHaveLength(1);
    expect(project.documents[0]?.type).toBe('spreadsheet');
    expect(importSheetParquetMock).toHaveBeenCalledWith('sheet_table_1', expect.any(Uint8Array));
  });
});
