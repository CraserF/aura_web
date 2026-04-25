import type { ProjectGraph, ProjectGraphEdge, ProjectGraphIssue } from './types';

export function validateProjectGraph(graph: ProjectGraph): ProjectGraphIssue[] {
  return graph.edges.flatMap((edge: ProjectGraphEdge): ProjectGraphIssue[] => {
    if (edge.status === 'valid') {
      return [];
    }

    if (edge.kind === 'linked-table') {
      return [{
        code: 'broken-linked-table',
        message: 'A linked table reference points to a missing spreadsheet or sheet.',
        edgeId: edge.id,
        documentId: edge.from.replace(/^document:/, ''),
        sheetId: edge.to.split(':').slice(2).join(':') || undefined,
        status: edge.status,
      }];
    }

    if (edge.kind === 'derived-summary') {
      return [{
        code: 'stale-project-summary',
        message: 'The managed project summary is older than one or more source artifacts.',
        edgeId: edge.id,
        documentId: edge.from.replace(/^document:/, ''),
        status: edge.status,
      }];
    }

    if (edge.kind === 'query-view') {
      return [{
        code: edge.status === 'broken' ? 'broken-query-view' : 'stale-query-view',
        message: edge.status === 'broken'
          ? 'A derived spreadsheet query view points to a missing source sheet.'
          : 'A derived spreadsheet query view is older than its workbook document.',
        edgeId: edge.id,
        documentId: edge.from.split(':')[1] || undefined,
        sheetId: edge.from.split(':').slice(2).join(':') || undefined,
        status: edge.status,
      }];
    }

    return [{
      code: 'dependency-issue',
      message: 'A project dependency needs attention.',
      edgeId: edge.id,
      documentId: edge.from.replace(/^document:/, ''),
      status: edge.status,
    }];
  });
}
