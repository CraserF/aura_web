import type { RunRecord } from '@/services/runs/types';
import type { ResolvedIntent } from '@/services/ai/intent/types';
import type { RunEvent } from '@/services/events/types';

const registry = new Map<string, RunRecord>();

export function createRunRecord(runId: string, intent: ResolvedIntent): RunRecord {
  const now = Date.now();
  const record: RunRecord = {
    runId,
    status: 'pending',
    intent,
    touchedDocumentIds: [],
    dependencyWarnings: [],
    retryCount: 0,
    policyActions: [],
    createdAt: now,
    updatedAt: now,
  };

  registry.set(runId, record);
  return record;
}

export function updateRunRecordStatus(runId: string, status: RunRecord['status']): RunRecord | null {
  const record = registry.get(runId);
  if (!record) return null;

  const updated: RunRecord = {
    ...record,
    status,
    updatedAt: Date.now(),
  };

  registry.set(runId, updated);
  return updated;
}

export function recordRunEvent(runId: string, event: Pick<RunEvent, 'id' | 'type'>): RunRecord | null {
  const record = registry.get(runId);
  if (!record) return null;

  const updated: RunRecord = {
    ...record,
    latestEventId: event.id,
    latestEventType: event.type,
    updatedAt: Date.now(),
  };

  registry.set(runId, updated);
  return updated;
}

export function markRunTouchedDocuments(runId: string, documentIds: string[]): RunRecord | null {
  const record = registry.get(runId);
  if (!record) return null;

  const touchedDocumentIds = Array.from(new Set([
    ...record.touchedDocumentIds,
    ...documentIds.filter(Boolean),
  ]));

  const updated: RunRecord = {
    ...record,
    touchedDocumentIds,
    updatedAt: Date.now(),
  };

  registry.set(runId, updated);
  return updated;
}

export function setRunDependencyWarnings(runId: string, warnings: string[]): RunRecord | null {
  const record = registry.get(runId);
  if (!record) return null;

  const updated: RunRecord = {
    ...record,
    dependencyWarnings: warnings,
    updatedAt: Date.now(),
  };

  registry.set(runId, updated);
  return updated;
}

export function setRunBlockedReason(runId: string, blockedReason?: string): RunRecord | null {
  const record = registry.get(runId);
  if (!record) return null;

  const updated: RunRecord = {
    ...record,
    blockedReason,
    updatedAt: Date.now(),
  };

  registry.set(runId, updated);
  return updated;
}

export function appendRunPolicyActions(runId: string, actions: string[]): RunRecord | null {
  if (actions.length === 0) return registry.get(runId) ?? null;

  const record = registry.get(runId);
  if (!record) return null;

  const updated: RunRecord = {
    ...record,
    policyActions: Array.from(new Set([...record.policyActions, ...actions])),
    updatedAt: Date.now(),
  };

  registry.set(runId, updated);
  return updated;
}

export function setRunOutputSummary(
  runId: string,
  summary: string,
  outputBufferId?: string,
): RunRecord | null {
  const record = registry.get(runId);
  if (!record) return null;

  const updated: RunRecord = {
    ...record,
    finalOutputSummary: summary,
    outputBufferId,
    updatedAt: Date.now(),
  };

  registry.set(runId, updated);
  return updated;
}

export function setRunRetryInfo(
  runId: string,
  retryChainRootId: string,
  retryCount: number,
): RunRecord | null {
  const record = registry.get(runId);
  if (!record) return null;

  const updated: RunRecord = {
    ...record,
    retryChainRootId,
    retryCount,
    updatedAt: Date.now(),
  };

  registry.set(runId, updated);
  return updated;
}

export function markSupersededRuns(
  currentRunId: string,
  documentIds: string[],
): RunRecord[] {
  if (documentIds.length === 0) return [];

  const superseded: RunRecord[] = [];
  for (const [runId, record] of registry.entries()) {
    if (runId === currentRunId) continue;
    if (!['pending', 'running', 'blocked', 'review-ready'].includes(record.status)) continue;
    if (!record.touchedDocumentIds.some((documentId) => documentIds.includes(documentId))) continue;

    const updated: RunRecord = {
      ...record,
      status: 'superseded',
      updatedAt: Date.now(),
    };
    registry.set(runId, updated);
    superseded.push(updated);
  }

  return superseded;
}

export function getRunRecord(runId: string): RunRecord | null {
  return registry.get(runId) ?? null;
}

export function listRunRecords(): RunRecord[] {
  return Array.from(registry.values());
}

export function clearRunRegistry(): void {
  registry.clear();
}

// TODO(phase-1): Add richer metadata and derived selectors once the submit
// pipeline starts updating the registry through the shared run contract.
