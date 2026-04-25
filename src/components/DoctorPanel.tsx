import type { DoctorReport } from '@/services/diagnostics/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface DoctorPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: DoctorReport | null;
  onRun: () => void;
}

export function DoctorPanel({
  open,
  onOpenChange,
  report,
  onRun,
}: DoctorPanelProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Doctor</DialogTitle>
          <DialogDescription>
            Run project health checks for provider setup, project config, exports, memory, data, and runtime dependencies.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
          <div className="text-sm">
            {report ? (
              <>
                <p className="font-medium capitalize">{report.overallStatus}</p>
                <p className="text-muted-foreground">
                  {report.blockingCount} blocking issue{report.blockingCount === 1 ? '' : 's'} · {report.warningCount} warning{report.warningCount === 1 ? '' : 's'}
                </p>
              </>
            ) : (
              <>
                <p className="font-medium">No report yet</p>
                <p className="text-muted-foreground">Run the doctor to inspect the current project state.</p>
              </>
            )}
          </div>
          <Button onClick={onRun}>Run doctor</Button>
        </div>

        {report && (
          <div className="space-y-3">
            {report.checks.map((check) => (
              <section key={check.id} className="rounded-lg border border-border p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold">{check.label}</h3>
                    <p className="text-sm text-muted-foreground">{check.summary}</p>
                  </div>
                  <span className="rounded-full border border-border px-2 py-1 text-xs font-medium capitalize">
                    {check.status}
                  </span>
                </div>

                {check.diagnostics.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {check.diagnostics.map((diagnostic, index) => (
                      <div key={`${diagnostic.code}-${diagnostic.path}-${index}`} className="rounded-md bg-muted/40 px-3 py-2 text-sm">
                        <p className="font-medium">
                          {diagnostic.severity.toUpperCase()} · {diagnostic.message}
                        </p>
                        <p className="text-muted-foreground">{diagnostic.path}</p>
                        {diagnostic.suggestion && (
                          <p className="text-muted-foreground">{diagnostic.suggestion}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
