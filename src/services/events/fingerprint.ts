import type { RunEvent, RunEventType } from './types';

export interface RunEventFingerprintInput {
  type: RunEventType;
  runId: string;
  source: string;
  payload: Record<string, unknown>;
}

function stableSerialize(value: unknown): string {
  if (value == null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableSerialize(entry)).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`);
  return `{${entries.join(',')}}`;
}

export function createRunEventFingerprint(input: RunEventFingerprintInput): string {
  return `${input.type}|${input.runId}|${input.source}|${stableSerialize(input.payload)}`;
}

export function getRunEventFingerprint(event: Pick<RunEvent, 'type' | 'runId' | 'source' | 'payload'>): string {
  return createRunEventFingerprint(event);
}
