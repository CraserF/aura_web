import { listRunRecords } from '@/services/runs/registry';
import { readRunOutputBuffer } from '@/services/runs/outputBuffer';
import { useProjectStore } from '@/stores/projectStore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface RunHistoryPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatTimestamp(value: number): string {
  return new Date(value).toLocaleString();
}

export function RunHistoryPanel({
  open,
  onOpenChange,
}: RunHistoryPanelProps) {
  const project = useProjectStore((state) => state.project);
  const documentTitleById = new Map(project.documents.map((document) => [document.id, document.title]));
  const runs = listRunRecords()
    .sort((left, right) => right.updatedAt - left.updatedAt)
    .slice(0, 12);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Recent runs</DialogTitle>
          <DialogDescription>
            Inspect recent workflow status, touched artifacts, and policy actions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {runs.length === 0 ? (
            <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
              No runs yet.
            </div>
          ) : runs.map((run) => {
            const outputBuffer = run.outputBufferId ? readRunOutputBuffer(run.outputBufferId) : null;
            return (
              <section key={run.runId} className="rounded-lg border border-border p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {run.intent.projectOperation ?? `${run.intent.artifactType} ${run.intent.operation}`}
                    </p>
                    <p className="text-muted-foreground">
                      {formatTimestamp(run.updatedAt)} · latest event {run.latestEventType ?? 'none'}
                    </p>
                  </div>
                  <span className="rounded-full border border-border px-2 py-1 text-xs font-medium capitalize">
                    {run.status}
                  </span>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="rounded-md bg-muted/30 px-3 py-2">
                    <p className="font-medium">Artifacts</p>
                    <p className="text-muted-foreground">
                      {run.touchedDocumentIds.length > 0
                        ? run.touchedDocumentIds.map((documentId) => documentTitleById.get(documentId) ?? documentId).join(', ')
                        : 'No touched artifacts recorded'}
                    </p>
                  </div>
                  <div className="rounded-md bg-muted/30 px-3 py-2">
                    <p className="font-medium">Policy</p>
                    <p className="text-muted-foreground">
                      {run.policyActions.length > 0 ? run.policyActions.join(', ') : 'No policy actions recorded'}
                    </p>
                  </div>
                </div>

                {(run.blockedReason || run.dependencyWarnings.length > 0 || outputBuffer?.summary) && (
                  <div className="mt-3 space-y-2">
                    {run.blockedReason && (
                      <div className="rounded-md bg-destructive/10 px-3 py-2">
                        <p className="font-medium">Blocked reason</p>
                        <p className="text-muted-foreground">{run.blockedReason}</p>
                      </div>
                    )}
                    {run.dependencyWarnings.length > 0 && (
                      <div className="rounded-md bg-muted/40 px-3 py-2">
                        <p className="font-medium">Dependency warnings</p>
                        {run.dependencyWarnings.map((warning) => (
                          <p key={warning} className="text-muted-foreground">{warning}</p>
                        ))}
                      </div>
                    )}
                    {outputBuffer?.summary && (
                      <div className="rounded-md bg-muted/40 px-3 py-2">
                        <p className="font-medium">Summary</p>
                        <p className="text-muted-foreground">{outputBuffer.summary}</p>
                      </div>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
