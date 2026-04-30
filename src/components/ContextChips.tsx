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
  const hasNonDefaultContext =
    selectionState.scopeMode !== 'auto'
    || selectionState.compactionMode !== 'auto'
    || pinCount > 0
    || exclusionCount > 0
    || compactedCount > 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={onOpen}>
        {hasNonDefaultContext ? 'Context adjusted' : 'Context'}
      </Button>
      {hasNonDefaultContext && (
        <>
          {selectionState.scopeMode !== 'auto' && (
            <span className="rounded-full border border-border px-2 py-1 text-[11px] capitalize text-muted-foreground">
              Scope: {selectionState.scopeMode}
            </span>
          )}
          {pinCount > 0 && (
            <span className="rounded-full border border-border px-2 py-1 text-[11px] text-muted-foreground">
              Pins: {pinCount}
            </span>
          )}
          {exclusionCount > 0 && (
            <span className="rounded-full border border-border px-2 py-1 text-[11px] text-muted-foreground">
              Excluded: {exclusionCount}
            </span>
          )}
          {(selectionState.compactionMode !== 'auto' || compactedCount > 0) && (
            <span className="rounded-full border border-border px-2 py-1 text-[11px] text-muted-foreground">
              Compaction: {selectionState.compactionMode}{compactedCount > 0 ? ` (${compactedCount})` : ''}
            </span>
          )}
        </>
      )}
    </div>
  );
}
