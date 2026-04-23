import type { ValidationResult } from '@/services/validation/types';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ValidationPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artifactLabel?: string;
  artifactValidation: ValidationResult | null;
  projectValidation: ValidationResult | null;
  isRunning?: boolean;
  onRun: () => void;
}

function ValidationSection({
  title,
  result,
}: {
  title: string;
  result: ValidationResult | null;
}) {
  if (!result) {
    return (
      <section className="rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">No validation result yet.</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">
            {result.profileId} · score {result.score}
          </p>
        </div>
        <span className="rounded-full border border-border px-2 py-1 text-xs font-medium capitalize">
          {result.passed ? 'pass' : 'blocked'}
        </span>
      </div>

      <div className="mt-3 space-y-2 text-sm">
        {result.blockingIssues.length > 0 ? (
          <div className="rounded-md bg-destructive/10 px-3 py-2">
            <p className="font-medium">Blocking issues</p>
            {result.blockingIssues.map((issue) => (
              <p key={`${title}-block-${issue.code}-${issue.message}`} className="text-muted-foreground">
                {issue.message}
              </p>
            ))}
          </div>
        ) : (
          <div className="rounded-md bg-emerald-500/10 px-3 py-2">
            <p className="font-medium">No blocking issues</p>
          </div>
        )}

        {result.warnings.length > 0 && (
          <div className="rounded-md bg-muted/40 px-3 py-2">
            <p className="font-medium">Warnings</p>
            {result.warnings.map((issue) => (
              <p key={`${title}-warn-${issue.code}-${issue.message}`} className="text-muted-foreground">
                {issue.message}
              </p>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function ValidationPanel({
  open,
  onOpenChange,
  artifactLabel,
  artifactValidation,
  projectValidation,
  isRunning = false,
  onRun,
}: ValidationPanelProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Readiness</DialogTitle>
          <DialogDescription>
            Review the current artifact and project against the active validation profiles before exporting or publishing.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
          <div className="text-sm">
            <p className="font-medium">Validation profiles</p>
            <p className="text-muted-foreground">
              {artifactLabel ? `Artifact: ${artifactLabel}` : 'Project-wide readiness only'}
            </p>
          </div>
          <Button onClick={onRun} disabled={isRunning}>
            {isRunning ? 'Running…' : 'Run validation'}
          </Button>
        </div>

        <div className="space-y-3">
          <ValidationSection
            title={artifactLabel ? `${artifactLabel} validation` : 'Artifact validation'}
            result={artifactValidation}
          />
          <ValidationSection title="Project readiness" result={projectValidation} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
