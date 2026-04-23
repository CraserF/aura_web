export const RUN_STATUSES = [
  'pending',
  'running',
  'blocked',
  'completed',
  'failed',
  'cancelled',
] as const;

export type RunStatus = (typeof RUN_STATUSES)[number];
