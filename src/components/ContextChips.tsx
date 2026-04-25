import type { ContextBundle, ContextSelectionState } from '@/services/context/types';
import { Button } from '@/components/ui/button';

interface ContextChipsProps {
  selectionState: ContextSelectionState;
  lastContext: ContextBundle | null;
  onOpen: () => void;
}

export function ContextChips({ selectionState, lastContext, onOpen }: ContextChipsProps) {
  const pinCount = selectionState.pinnedDocumentIds.length
    + selectionState.pinnedMemoryPaths.length
    + selectionState.pinnedSheetRefs.length;
  const exclusionCount = selectionState.excludedSourceIds.length;
  const compactedCount = lastContext?.compaction.compactedSourceIds.length ?? 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={onOpen}>
        Context
      </Button>
      <span className="rounded-full border border-border px-2 py-1 text-[11px] capitalize text-muted-foreground">
        Scope: {selectionState.scopeMode}
      </span>
      <span className="rounded-full border border-border px-2 py-1 text-[11px] text-muted-foreground">
        Pins: {pinCount}
      </span>
      <span className="rounded-full border border-border px-2 py-1 text-[11px] text-muted-foreground">
        Excluded: {exclusionCount}
      </span>
      <span className="rounded-full border border-border px-2 py-1 text-[11px] text-muted-foreground">
        Compaction: {selectionState.compactionMode}{compactedCount > 0 ? ` (${compactedCount})` : ''}
      </span>
    </div>
  );
}
