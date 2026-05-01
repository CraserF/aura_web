import { Eye, FileCode2, Layers3, PackageOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  listArtifactPackGalleryItems,
  type ArtifactPackGalleryItem,
} from '@/services/artifactPacks';

interface ArtifactLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatList(values: readonly string[]): string {
  return values.length > 0 ? values.join(', ') : 'None declared';
}

function statusVariant(status: ArtifactPackGalleryItem['status']): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (status) {
    case 'shippable':
      return 'default';
    case 'deprecated':
      return 'destructive';
    case 'draft':
      return 'secondary';
    case 'internal':
    default:
      return 'outline';
  }
}

export function ArtifactLibraryDialog({ open, onOpenChange }: ArtifactLibraryDialogProps) {
  const galleryItems = listArtifactPackGalleryItems();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-5xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-5 py-4 text-left">
          <DialogTitle className="flex items-center gap-2">
            <PackageOpen className="size-4" />
            Artifact library
          </DialogTitle>
          <DialogDescription>
            Browse the installed artifact packs, examples, output targets, and design directions.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="grid gap-3 p-4 lg:grid-cols-2">
            {galleryItems.map((pack) => (
              <article key={pack.packId} className="rounded-lg border border-border bg-background p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{pack.label}</h3>
                      <Badge variant={statusVariant(pack.status)}>{pack.status}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{pack.packId}</p>
                  </div>
                  <Badge variant="outline">{pack.artifactType}</Badge>
                </div>

                <p className="mt-3 text-sm leading-6 text-foreground/85">{pack.description}</p>

                <div className="mt-4 grid gap-3 text-sm">
                  <section>
                    <div className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-normal text-muted-foreground">
                      <Layers3 className="size-3.5" />
                      Best for
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {pack.bestFor.map((item) => (
                        <Badge key={item} variant="secondary">{item}</Badge>
                      ))}
                    </div>
                  </section>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <section>
                      <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">Directions</p>
                      <p className="mt-1 text-sm text-foreground/85">{formatList(pack.supportedDirectionLabels)}</p>
                    </section>
                    <section>
                      <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">Output modes</p>
                      <p className="mt-1 text-sm text-foreground/85">{formatList(pack.supportedOutputModes)}</p>
                    </section>
                  </div>

                  <section>
                    <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-normal text-muted-foreground">
                      <FileCode2 className="size-3.5" />
                      Compiled examples
                    </div>
                    {pack.examples.length > 0 ? (
                      <div className="space-y-2">
                        {pack.examples.map((example) => (
                          <div key={example.id} className="rounded-md border border-border bg-muted/25 p-3 text-sm">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="font-medium text-foreground">{example.label}</p>
                              <Badge variant="outline">{example.id}</Badge>
                            </div>
                            <dl className="mt-2 grid gap-1 text-xs text-muted-foreground">
                              <div className="grid gap-1 sm:grid-cols-[6rem_1fr]">
                                <dt>Source</dt>
                                <dd className="break-all text-foreground/80">{example.resolvedSourcePath}</dd>
                              </div>
                              <div className="grid gap-1 sm:grid-cols-[6rem_1fr]">
                                <dt>Compiled</dt>
                                <dd className="break-all text-foreground/80">{example.resolvedCompiledPath}</dd>
                              </div>
                              {example.resolvedPreviewPath && (
                                <div className="grid gap-1 sm:grid-cols-[6rem_1fr]">
                                  <dt className="flex items-center gap-1">
                                    <Eye className="size-3" />
                                    Preview
                                  </dt>
                                  <dd className="break-all text-foreground/80">
                                    {example.resolvedPreviewPath}
                                    <span className="ml-1 text-muted-foreground">({example.previewKind})</span>
                                  </dd>
                                </div>
                              )}
                            </dl>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
                        No compiled examples registered yet.
                      </p>
                    )}
                  </section>

                  <Button type="button" variant="outline" size="sm" disabled className="w-fit">
                    Save as pack deferred
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
