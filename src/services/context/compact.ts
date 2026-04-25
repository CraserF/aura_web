import { getCompressionBudget } from '@/services/context/compressionBudget';
import { isCompactionProtected, resolveCompactionPolicy } from '@/services/context/compactionPolicy';
import type { ContextSelectionResult, SelectedContextEntry } from '@/services/context/select';
import type { ContextSelectionState } from '@/services/context/types';

export interface CompactContextResult extends ContextSelectionResult {
  entries: SelectedContextEntry[];
  compaction: {
    applied: boolean;
    beforeTokens: number;
    afterTokens: number;
    strategy: string;
    compactedSourceIds: string[];
  };
}

export function compactContextSources(
  selection: ContextSelectionResult,
  selectionState: ContextSelectionState,
): CompactContextResult {
  const strategy = resolveCompactionPolicy(selectionState);
  const beforeTokens = selection.entries.reduce((total, entry) => total + entry.source.tokenEstimate, 0);

  if (selectionState.compactionMode === 'off' || beforeTokens <= getCompressionBudget()) {
    return {
      ...selection,
      compaction: {
        applied: false,
        beforeTokens,
        afterTokens: beforeTokens,
        strategy,
        compactedSourceIds: [],
      },
    };
  }

  const recentConversationEntries = selection.entries
    .filter((entry) => entry.channel === 'conversation' && entry.message)
    .slice(-selectionState.recentMessageCount);
  const recentConversationIds = new Set(recentConversationEntries.map((entry) => entry.source.id));
  const compactedSourceIds = new Set<string>();

  const recentEntries: SelectedContextEntry[] = [];
  const olderConversationEntries: SelectedContextEntry[] = [];
  for (const entry of selection.entries) {
    if (entry.channel === 'conversation' && entry.message && !recentConversationIds.has(entry.source.id)) {
      olderConversationEntries.push(entry);
      continue;
    }
    recentEntries.push(entry);
  }

  if (olderConversationEntries.length > 0) {
    recentEntries.push(buildConversationSummaryEntry(olderConversationEntries));
    olderConversationEntries.forEach((entry) => compactedSourceIds.add(entry.source.id));
  }

  let workingEntries = recentEntries.map((entry) => ({ ...entry, source: { ...entry.source } }));
  let workingTokens = workingEntries.reduce((total, entry) => total + entry.source.tokenEstimate, 0);

  const degradableEntries = workingEntries.filter((entry) =>
    !isCompactionProtected(entry, recentConversationIds)
      && (entry.channel === 'memory' || entry.source.id.startsWith('artifact:related:')),
  );

  for (const detailLevel of ['overview', 'compact'] as const) {
    for (const entry of degradableEntries) {
      if (!entry.variants?.[detailLevel] || entry.source.detailLevel === detailLevel) continue;
      if (workingTokens <= getCompressionBudget()) break;

      const nextText = entry.variants[detailLevel];
      if (!nextText) continue;
      workingTokens -= entry.source.tokenEstimate;
      entry.text = nextText;
      entry.source.detailLevel = detailLevel;
      entry.source.compacted = true;
      entry.source.charCount = nextText.length;
      entry.source.tokenEstimate = Math.ceil(nextText.length / 4);
      workingTokens += entry.source.tokenEstimate;
      compactedSourceIds.add(entry.source.id);
    }
  }

  return {
    ...selection,
    entries: workingEntries,
    compaction: {
      applied: true,
      beforeTokens,
      afterTokens: workingTokens,
      strategy,
      compactedSourceIds: Array.from(compactedSourceIds),
    },
  };
}

function buildConversationSummaryEntry(entries: SelectedContextEntry[]): SelectedContextEntry {
  const text = [
    'Earlier conversation summary:',
    ...entries.slice(-6).map((entry) => `- ${entry.message?.role ?? 'assistant'}: ${entry.text.slice(0, 120)}`),
  ].join('\n');

  return {
    source: {
      kind: 'conversation',
      id: 'conversation:summary',
      label: 'Conversation summary',
      reasonIncluded: 'Older chat was compacted into a synthetic summary',
      tokenEstimate: Math.ceil(text.length / 4),
      detailLevel: 'compact',
      pinned: false,
      excluded: false,
      compacted: true,
      charCount: text.length,
    },
    text,
    channel: 'conversation',
  };
}
