import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface DocumentPdfPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  pdfUrl: string | null;
  isLoading?: boolean;
  error?: string | null;
  onDownload?: () => void;
}

export function DocumentPdfPreview({
  open,
  onOpenChange,
  title,
  pdfUrl,
  isLoading = false,
  error,
  onDownload,
}: DocumentPdfPreviewProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[92vh] max-w-6xl flex-col gap-0 overflow-hidden p-0">
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
          <DialogHeader className="gap-1 text-left">
            <DialogTitle>PDF Preview</DialogTitle>
            <DialogDescription>
              {title || 'Document'} · print-accurate preview for export
            </DialogDescription>
          </DialogHeader>
          {onDownload && (
            <Button size="sm" onClick={onDownload} disabled={isLoading}>
              Export PDF
            </Button>
          )}
        </div>

        <div className="min-h-0 flex-1 bg-muted/30">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex items-center gap-2 rounded-full bg-background px-4 py-2 text-sm text-muted-foreground shadow-sm">
                <Loader2 className="size-4 animate-spin" />
                Preparing PDF preview…
              </div>
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center px-6">
              <div className="max-w-md rounded-2xl border border-destructive/20 bg-background p-5 text-center shadow-sm">
                <p className="text-sm font-medium text-foreground">Preview unavailable</p>
                <p className="mt-2 text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
          ) : pdfUrl ? (
            <iframe
              title="PDF preview"
              src={pdfUrl}
              className="h-full w-full border-0 bg-white"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-6">
              <div className="max-w-md rounded-2xl border border-border bg-background p-5 text-center shadow-sm">
                <p className="text-sm font-medium text-foreground">No preview yet</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Generate a PDF preview to inspect the paged export experience.
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
