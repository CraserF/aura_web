import type { SelectedContextEntry } from '@/services/context/select';
import type { ContextSelectionState } from '@/services/context/types';

export function resolveCompactionPolicy(selectionState: ContextSelectionState): string {
  return selectionState.compactionMode === 'off'
    ? 'disabled'
    : 'deterministic-preserve-pins';
}

export function isCompactionProtected(
  entry: SelectedContextEntry,
  recentConversationIds: Set<string>,
): boolean {
  return entry.channel === 'prompt'
    || entry.source.pinned
    || entry.source.id.startsWith('artifact:html:')
    || entry.source.id.startsWith('artifact:markdown:')
    || recentConversationIds.has(entry.source.id);
}
