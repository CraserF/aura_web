import type { ProjectData } from '@/types/project';
import type { ProjectGraph } from './types';
import type { LinkedTableRef, ProjectDocument } from '@/types/project';

function documentNodeId(documentId: string): string {
  return `document:${documentId}`;
}

function sheetNodeId(documentId: string, sheetId: string): string {
  return `sheet:${documentId}:${sheetId}`;
}

function chartNodeId(documentId: string, chartId: string): string {
  return `chart:${documentId}:${chartId}`;
}

export function extractLinkedTableRefsFromHtml(html: string): LinkedTableRef[] {
  const refs: LinkedTableRef[] = [];
  const seen = new Set<string>();
  const matches = html.matchAll(/data-aura-linked-table\s*=\s*"([^"]+)"/g);

  for (const match of matches) {
    const raw = (match[1] ?? '').trim();
    const [spreadsheetDocId, sheetId] = raw.split(':');
    if (!spreadsheetDocId || !sheetId) continue;
    const key = `${spreadsheetDocId}:${sheetId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    refs.push({ spreadsheetDocId, sheetId });
  }

  return refs;
}

function getDocumentLinkedTableRefs(document: ProjectDocument): LinkedTableRef[] {
  if (document.linkedTableRefs?.length) {
    return document.linkedTableRefs;
  }

  return extractLinkedTableRefsFromHtml(document.contentHtml);
}

export function buildProjectGraph(project: ProjectData): ProjectGraph {
  const nodes: ProjectGraph['nodes'] = [];
  const edges: ProjectGraph['edges'] = [];
  const documentsById = new Map(project.documents.map((document) => [document.id, document]));
  const summaryDocument = project.documents.find((document) => document.starterRef?.artifactKey === 'project-summary');

  for (const document of project.documents) {
    nodes.push({
      id: documentNodeId(document.id),
      kind: 'document',
      label: document.title,
      documentId: document.id,
    });

    if (document.type === 'spreadsheet' && document.workbook) {
      for (const sheet of document.workbook.sheets) {
        nodes.push({
          id: sheetNodeId(document.id, sheet.id),
          kind: 'sheet',
          label: `${document.title} / ${sheet.name}`,
          documentId: document.id,
          sheetId: sheet.id,
        });
      }
    }

    for (const chartId of Object.keys(document.chartSpecs ?? {}).sort()) {
      nodes.push({
        id: chartNodeId(document.id, chartId),
        kind: 'chart',
        label: `${document.title} / ${chartId}`,
        documentId: document.id,
      });
      edges.push({
        id: `edge:${document.id}:chart:${chartId}`,
        from: documentNodeId(document.id),
        to: chartNodeId(document.id, chartId),
        kind: 'chart-source',
        status: 'valid',
      });
    }
  }

  for (const document of project.documents) {
    for (const ref of getDocumentLinkedTableRefs(document)) {
      const targetSpreadsheet = documentsById.get(ref.spreadsheetDocId);
      const targetSheet = targetSpreadsheet?.type === 'spreadsheet'
        ? targetSpreadsheet.workbook?.sheets.find((sheet) => sheet.id === ref.sheetId)
        : undefined;

      edges.push({
        id: `edge:${document.id}:linked-table:${ref.spreadsheetDocId}:${ref.sheetId}`,
        from: documentNodeId(document.id),
        to: sheetNodeId(ref.spreadsheetDocId, ref.sheetId),
        kind: 'linked-table',
        status: targetSheet ? 'valid' : 'broken',
      });
    }
  }

  if (summaryDocument) {
    for (const document of project.documents) {
      if (document.id === summaryDocument.id) continue;
      edges.push({
        id: `edge:${summaryDocument.id}:derived-summary:${document.id}`,
        from: documentNodeId(summaryDocument.id),
        to: documentNodeId(document.id),
        kind: 'derived-summary',
        status: document.updatedAt > summaryDocument.updatedAt ? 'stale' : 'valid',
      });
    }
  }

  return {
    nodes,
    edges,
  };
}
