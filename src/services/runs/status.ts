export const RUN_STATUSES = [
  'pending',
  'running',
  'blocked',
  'review-ready',
  'completed',
  'failed',
  'cancelled',
  'superseded',
] as const;

export type RunStatus = (typeof RUN_STATUSES)[number];
