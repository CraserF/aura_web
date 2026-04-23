import { useState, useEffect } from 'react';
import { History, GitCommit, RotateCcw, X, Clock } from 'lucide-react';
import { listVersions, readVersionSnapshot } from '@/services/storage/versionHistory';
import { normalizeProjectData } from '@/services/projectRules/load';
import { useProjectStore } from '@/stores/projectStore';
import type { VersionEntry, ProjectDocument } from '@/types/project';
import type { ChatMessage } from '@/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VersionHistoryPanelProps {
  open: boolean;
  onClose: () => void;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function VersionHistoryPanel({ open, onClose }: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setProject = useProjectStore((s) => s.setProject);
  const project = useProjectStore((s) => s.project);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    listVersions()
      .then(setVersions)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [open]);

  const handleRestore = async (version: VersionEntry) => {
    setRestoring(version.hash);
    try {
      const snapshot = await readVersionSnapshot(version.hash);
      if (!snapshot) {
        setError('Could not read version snapshot.');
        return;
      }

      const manifest = JSON.parse(snapshot.manifest) as {
        id: string;
        title: string;
        updatedAt: number;
        activeDocumentId?: string | null;
      };
      const chatHistory = JSON.parse(snapshot.chatHistory) as ChatMessage[];
      const contextPolicy = JSON.parse(snapshot.contextPolicy) as typeof project.contextPolicy;
      const workflowPresets = JSON.parse(snapshot.workflowPresets) as typeof project.workflowPresets;

      const documents: ProjectDocument[] = Object.values(snapshot.documents).map(
        (raw) => JSON.parse(raw) as ProjectDocument,
      );

      const restoredActiveDocumentId =
        manifest.activeDocumentId && documents.some((d) => d.id === manifest.activeDocumentId)
          ? manifest.activeDocumentId
          : (documents[0]?.id ?? null);

      setProject(normalizeProjectData({
        ...project,
        title: manifest.title,
        documents,
        activeDocumentId: restoredActiveDocumentId,
        chatHistory,
        projectRules: {
          markdown: snapshot.projectRules,
          updatedAt: manifest.updatedAt,
        },
        contextPolicy: contextPolicy ?? undefined,
        workflowPresets: workflowPresets ?? undefined,
        updatedAt: manifest.updatedAt,
      }));

      onClose();
    } catch (e) {
      setError(`Restore failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setRestoring(null);
    }
  };

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close version history"
        className="fixed inset-0 z-30 bg-background/70 backdrop-blur-sm lg:hidden"
        onClick={onClose}
      />

      <aside className="fixed inset-y-0 right-0 z-40 flex w-[min(22rem,calc(100vw-1rem))] flex-col border-l border-border bg-background shadow-xl lg:static lg:z-auto lg:w-72 lg:shrink-0 lg:shadow-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <History className="size-4 text-violet-500" />
          <span className="text-sm font-semibold">Version History</span>
        </div>
        <Button variant="ghost" size="icon" className="size-7" onClick={onClose}>
          <X className="size-3.5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
            {error}
          </div>
        )}

        {!loading && !error && versions.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <div className="rounded-full bg-muted p-3">
              <GitCommit className="size-5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">No versions yet</p>
            <p className="text-[10px] text-muted-foreground/60">
              Versions are created automatically as you work
            </p>
          </div>
        )}

        {!loading && versions.length > 0 && (
          <div className="relative space-y-0">
            {/* Timeline line */}
            <div className="absolute left-[19px] top-4 bottom-4 w-px bg-border" />

            {versions.map((v, i) => (
              <div
                key={v.hash}
                className={cn(
                  'group relative flex gap-3 pb-3',
                  i === 0 && 'pt-0',
                )}
              >
                {/* Timeline dot */}
                <div
                  className={cn(
                    'relative z-10 mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2',
                    i === 0
                      ? 'border-violet-500 bg-violet-500 text-white'
                      : 'border-border bg-background text-muted-foreground',
                  )}
                >
                  <div
                    className={cn(
                      'size-1.5 rounded-full',
                      i === 0 ? 'bg-white' : 'bg-muted-foreground',
                    )}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground leading-tight truncate">
                    {v.message}
                  </p>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <Clock className="size-2.5" />
                    <span>{timeAgo(v.timestamp)}</span>
                    <span className="font-mono text-muted-foreground/50">
                      {v.hash.slice(0, 7)}
                    </span>
                  </div>

                  {i !== 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-1.5 h-6 gap-1 px-2 text-[10px] opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => handleRestore(v)}
                      disabled={restoring === v.hash}
                    >
                      {restoring === v.hash ? (
                        <div className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
                      ) : (
                        <RotateCcw className="size-2.5" />
                      )}
                      Restore
                    </Button>
                  )}
                  {i === 0 && (
                    <span className="mt-1 inline-flex items-center rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-600">
                      Current
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </aside>
    </>
  );
}
