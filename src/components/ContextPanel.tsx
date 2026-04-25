import type { ContextBundle, ContextSelectionState, ContextScopeMode, PinnedSheetRef } from '@/services/context/types';
import type { MemoryDirectory } from '@/services/memory';
import type { ProjectDocument } from '@/types/project';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ContextPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectionState: ContextSelectionState;
  activeDocument: ProjectDocument | null;
  projectDocuments: ProjectDocument[];
  memoryTree?: MemoryDirectory;
  lastContext: ContextBundle | null;
  onSetScopeMode: (scopeMode: ContextScopeMode) => void;
  onSetCompactionMode: (mode: ContextSelectionState['compactionMode']) => void;
  onSetRecentMessageCount: (count: number) => void;
  onTogglePinnedDocumentId: (documentId: string) => void;
  onTogglePinnedMemoryPath: (path: string) => void;
  onTogglePinnedSheetRef: (sheetRef: PinnedSheetRef) => void;
  onToggleExcludedSourceId: (sourceId: string) => void;
  onReset: () => void;
}

const SCOPE_OPTIONS: ContextScopeMode[] = ['auto', 'current-artifact', 'selected-artifacts', 'project'];

export function ContextPanel({
  open,
  onOpenChange,
  selectionState,
  activeDocument,
  projectDocuments,
  memoryTree,
  lastContext,
  onSetScopeMode,
  onSetCompactionMode,
  onSetRecentMessageCount,
  onTogglePinnedDocumentId,
  onTogglePinnedMemoryPath,
  onTogglePinnedSheetRef,
  onToggleExcludedSourceId,
  onReset,
}: ContextPanelProps) {
  const relatedDocuments = projectDocuments.filter((document) => document.id !== activeDocument?.id);
  const memoryPaths = collectMemoryPaths(memoryTree);
  const activeSheets = activeDocument?.type === 'spreadsheet'
    ? activeDocument.workbook?.sheets ?? []
    : [];
  const exclusionEntries = (lastContext?.sources
    .filter((source) =>
      source.id !== 'conversation:prompt'
      && !source.pinned
      && !source.id.startsWith(`artifact:html:${activeDocument?.id ?? ''}`)
      && !source.id.startsWith(`artifact:markdown:${activeDocument?.id ?? ''}`),
    )
    .map((source) => ({
      id: source.id,
      label: `${source.label} (${source.kind})`,
    }))
    ?? [
      { id: 'attachments:text', label: 'Attachment text' },
      ...relatedDocuments.map((document) => ({
        id: `artifact:related:${document.id}`,
        label: `Related document: ${document.title}`,
      })),
    ])
    .filter((entry, index, entries) => entries.findIndex((candidate) => candidate.id === entry.id) === index);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Context Controls</DialogTitle>
          <DialogDescription>
            Control scope, pins, exclusions, and deterministic compaction for the next run.
          </DialogDescription>
        </DialogHeader>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Runtime Settings</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="space-y-1 text-sm">
              <span className="font-medium">Scope mode</span>
              <select
                value={selectionState.scopeMode}
                onChange={(event) => onSetScopeMode(event.target.value as ContextScopeMode)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {SCOPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium">Compaction</span>
              <select
                value={selectionState.compactionMode}
                onChange={(event) => onSetCompactionMode(event.target.value as ContextSelectionState['compactionMode'])}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="auto">auto</option>
                <option value="off">off</option>
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium">Recent messages kept</span>
              <input
                type="number"
                min={1}
                value={selectionState.recentMessageCount}
                onChange={(event) => onSetRecentMessageCount(Number.parseInt(event.target.value || '1', 10) || 1)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Pinned Documents</h3>
          <div className="space-y-2">
            {relatedDocuments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No other project documents available.</p>
            ) : relatedDocuments.map((document) => (
              <label key={document.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectionState.pinnedDocumentIds.includes(document.id)}
                  onChange={() => onTogglePinnedDocumentId(document.id)}
                />
                {document.title} <span className="text-muted-foreground">({document.type})</span>
              </label>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Pinned Memory Directories</h3>
          <div className="space-y-2">
            {memoryPaths.length === 0 ? (
              <p className="text-sm text-muted-foreground">No memory directories available.</p>
            ) : memoryPaths.map((path) => (
              <label key={path} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectionState.pinnedMemoryPaths.includes(path)}
                  onChange={() => onTogglePinnedMemoryPath(path)}
                />
                {path}
              </label>
            ))}
          </div>
        </section>

        {activeSheets.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Pinned Sheets</h3>
            <div className="space-y-2">
              {activeSheets.map((sheet) => {
                const checked = selectionState.pinnedSheetRefs.some(
                  (ref) => ref.documentId === activeDocument?.id && ref.sheetId === sheet.id,
                );
                return (
                  <label key={sheet.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onTogglePinnedSheetRef({
                        documentId: activeDocument!.id,
                        sheetId: sheet.id,
                      })}
                    />
                    {sheet.name}
                  </label>
                );
              })}
            </div>
          </section>
        )}

        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Quick Exclusions</h3>
          <div className="space-y-2 text-sm">
            {exclusionEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">Run a prompt to inspect individual sources, then exclude noisy ones here.</p>
            ) : exclusionEntries.map((entry) => (
              <label key={entry.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectionState.excludedSourceIds.includes(entry.id)}
                  onChange={() => onToggleExcludedSourceId(entry.id)}
                />
                {entry.label}
              </label>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Last Run Snapshot</h3>
          {!lastContext ? (
            <p className="text-sm text-muted-foreground">Run a prompt to inspect the last assembled context.</p>
          ) : (
            <div className="space-y-2 rounded-lg border border-border p-3 text-sm">
              <p>Estimated tokens: {lastContext.metrics.estimatedTotalTokens}</p>
              <p>Compaction: {lastContext.compaction.applied ? 'applied' : 'not applied'}</p>
              <p>Compacted sources: {lastContext.compaction.compactedSourceIds.length}</p>
              <div className="max-h-40 space-y-1 overflow-y-auto">
                {lastContext.sources.map((source) => (
                  <div key={source.id} className="rounded-md bg-muted/40 px-2 py-1">
                    <span className="font-medium">{source.label}</span>
                    <span className="ml-2 text-muted-foreground">
                      {source.detailLevel} · {source.tokenEstimate} tokens{source.compacted ? ' · compacted' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <DialogFooter>
          <Button variant="outline" onClick={onReset}>
            Reset
          </Button>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function collectMemoryPaths(root?: MemoryDirectory): string[] {
  if (!root) return [];
  const paths: string[] = [];

  const walk = (directory: MemoryDirectory) => {
    if (directory.path !== 'memory') {
      paths.push(directory.path);
    }
    for (const subdir of directory.subdirs) {
      walk(subdir);
    }
  };

  walk(root);
  return paths.sort();
}
