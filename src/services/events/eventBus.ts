import { createRunEventFingerprint } from './fingerprint';
import type { RunEvent, RunEventType } from './types';

const events: RunEvent[] = [];
const fingerprintIndex = new Map<string, RunEvent>();

export interface PublishRunEventInput {
  type: RunEventType;
  runId: string;
  source: string;
  payload?: Record<string, unknown>;
}

export function publishRunEvent(input: PublishRunEventInput): RunEvent {
  const payload = input.payload ?? {};
  const fingerprint = createRunEventFingerprint({
    type: input.type,
    runId: input.runId,
    source: input.source,
    payload,
  });
  const existing = fingerprintIndex.get(fingerprint);
  if (existing) {
    return existing;
  }

  const event: RunEvent = {
    id: crypto.randomUUID(),
    type: input.type,
    runId: input.runId,
    timestamp: Date.now(),
    fingerprint,
    source: input.source,
    payload,
  };

  events.push(event);
  fingerprintIndex.set(fingerprint, event);
  return event;
}

export function listRunEvents(runId?: string): RunEvent[] {
  if (!runId) {
    return [...events];
  }
  return events.filter((event) => event.runId === runId);
}

export function clearRunEvents(): void {
  events.length = 0;
  fingerprintIndex.clear();
}
