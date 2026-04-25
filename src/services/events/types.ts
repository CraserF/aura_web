export type RunEventType =
  | 'run.started'
  | 'run.plan-built'
  | 'run.context-assembled'
  | 'run.intent-resolved'
  | 'run.blocked'
  | 'run.generating'
  | 'run.policy-applied'
  | 'run.completed'
  | 'run.failed'
  | 'artifact.updated'
  | 'artifact.created'
  | 'dependency.broken'
  | 'dependency.refreshed';

export interface RunEvent {
  id: string;
  type: RunEventType;
  runId: string;
  timestamp: number;
  fingerprint: string;
  source: string;
  payload: Record<string, unknown>;
}
