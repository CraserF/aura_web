import type { InitReport } from '@/services/bootstrap/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ProjectInitReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: InitReport | null;
}

export function ProjectInitReportDialog({
  open,
  onOpenChange,
  report,
}: ProjectInitReportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Project init report</DialogTitle>
          <DialogDescription>
            Starter initialization is local and deterministic. This report shows what was created, updated, or skipped.
          </DialogDescription>
        </DialogHeader>

        {report ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm">
              <p className="font-medium">
                {report.createdCount} created · {report.updatedCount} updated · {report.skippedCount} skipped
              </p>
            </div>

            <div className="space-y-2">
              {report.items.map((item, index) => (
                <div key={`${item.target}-${index}`} className="rounded-lg border border-border p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{item.target}</p>
                    <span className="rounded-full border border-border px-2 py-1 text-xs capitalize">
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-1 text-muted-foreground">{item.summary}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            No init report available yet.
          </div>
        )}

        <DialogFooter>
          <Button size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
