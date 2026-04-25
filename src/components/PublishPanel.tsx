import type { ValidationResult } from '@/services/validation/types';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface PublishPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionLabel: string;
  artifactValidation: ValidationResult | null;
  projectValidation: ValidationResult | null;
  onConfirm: () => void;
}

export function PublishPanel({
  open,
  onOpenChange,
  actionLabel,
  artifactValidation,
  projectValidation,
  onConfirm,
}: PublishPanelProps) {
  const isBlocked = !!artifactValidation && !artifactValidation.passed;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{actionLabel}</DialogTitle>
          <DialogDescription>
            Review artifact readiness before continuing with this export action.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          {artifactValidation && (
            <section className="rounded-lg border border-border p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold">Artifact readiness</h3>
                  <p className="text-muted-foreground">
                    {artifactValidation.profileId} · score {artifactValidation.score}
                  </p>
                </div>
                <span className="rounded-full border border-border px-2 py-1 text-xs font-medium capitalize">
                  {artifactValidation.passed ? 'pass' : 'blocked'}
                </span>
              </div>

              {artifactValidation.blockingIssues.length > 0 && (
                <div className="mt-3 rounded-md bg-destructive/10 px-3 py-2">
                  <p className="font-medium">Blocking issues</p>
                  {artifactValidation.blockingIssues.map((issue) => (
                    <p key={`${issue.code}-${issue.message}`} className="text-muted-foreground">
                      {issue.message}
                    </p>
                  ))}
                </div>
              )}

              {artifactValidation.warnings.length > 0 && (
                <div className="mt-3 rounded-md bg-muted/40 px-3 py-2">
                  <p className="font-medium">Warnings</p>
                  {artifactValidation.warnings.map((issue) => (
                    <p key={`${issue.code}-${issue.message}`} className="text-muted-foreground">
                      {issue.message}
                    </p>
                  ))}
                </div>
              )}
            </section>
          )}

          {projectValidation && (
            <section className="rounded-lg border border-border p-4">
              <h3 className="font-semibold">Project readiness</h3>
              <p className="text-muted-foreground">
                {projectValidation.profileId} · {projectValidation.blockingIssues.length} blocking · {projectValidation.warnings.length} warnings
              </p>
            </section>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant={isBlocked ? 'secondary' : 'default'}
            size="sm"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            {isBlocked ? 'Override and export' : 'Export'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
