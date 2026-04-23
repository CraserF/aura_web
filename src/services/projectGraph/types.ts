export type ProjectGraphNodeKind = 'document' | 'sheet' | 'chart';

export type ProjectGraphEdgeKind = 'linked-table' | 'chart-source' | 'derived-summary' | 'query-view';

export type ProjectGraphEdgeStatus = 'valid' | 'broken' | 'stale';

export interface ProjectGraphNode {
  id: string;
  kind: ProjectGraphNodeKind;
  label: string;
  documentId?: string;
  sheetId?: string;
}

export interface ProjectGraphEdge {
  id: string;
  from: string;
  to: string;
  kind: ProjectGraphEdgeKind;
  status: ProjectGraphEdgeStatus;
}

export interface ProjectGraph {
  nodes: ProjectGraphNode[];
  edges: ProjectGraphEdge[];
}

export interface ProjectGraphIssue {
  code: string;
  message: string;
  edgeId?: string;
  documentId?: string;
  sheetId?: string;
  status: ProjectGraphEdgeStatus;
}

export interface ProjectGraphRefreshChange {
  documentId: string;
  action: 'updated' | 'none';
  reason: string;
}
