import { useEffect, useState } from 'react';
import type {
  DocumentStarterTemplate,
  PresentationStarterTemplate,
  SpreadsheetStarterTemplate,
  StarterArtifactType,
} from '@/services/bootstrap/types';
import type { ProjectStarterKit } from '@/services/bootstrap/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export type NewProjectSelection =
  | { mode: 'blank' }
  | { mode: 'starter-kit'; kitId: string }
  | { mode: 'quick-start'; artifactType: StarterArtifactType; starterId: string };

interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  starterKits: ProjectStarterKit[];
  documentStarters: DocumentStarterTemplate[];
  presentationStarters: PresentationStarterTemplate[];
  spreadsheetStarters: SpreadsheetStarterTemplate[];
  onSubmit: (selection: NewProjectSelection) => void;
}

function describeQuickStartType(type: StarterArtifactType): string {
  switch (type) {
    case 'document':
      return 'Seed one starter document from the blueprint registry.';
    case 'presentation':
      return 'Seed one starter presentation from the template registry.';
    case 'spreadsheet':
      return 'Seed one deterministic starter spreadsheet.';
    default:
      return '';
  }
}

export function NewProjectDialog({
  open,
  onOpenChange,
  starterKits,
  documentStarters,
  presentationStarters,
  spreadsheetStarters,
  onSubmit,
}: NewProjectDialogProps) {
  const [mode, setMode] = useState<'blank' | 'starter-kit' | 'quick-start'>('blank');
  const [selectedKitId, setSelectedKitId] = useState(starterKits[0]?.id ?? '');
  const [artifactType, setArtifactType] = useState<StarterArtifactType>('document');
  const [selectedStarterId, setSelectedStarterId] = useState(documentStarters[0]?.id ?? '');

  useEffect(() => {
    if (!open) return;
    setMode('blank');
    setSelectedKitId(starterKits[0]?.id ?? '');
    setArtifactType('document');
    setSelectedStarterId(documentStarters[0]?.id ?? '');
  }, [documentStarters, open, starterKits]);

  const starterOptions = artifactType === 'document'
    ? documentStarters
    : artifactType === 'presentation'
      ? presentationStarters
      : spreadsheetStarters;

  useEffect(() => {
    setSelectedStarterId(starterOptions[0]?.id ?? '');
  }, [artifactType]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedKit = starterKits.find((kit) => kit.id === selectedKitId);
  const selectedStarter = starterOptions.find((starter) => starter.id === selectedStarterId);

  const handleCreate = () => {
    if (mode === 'blank') {
      onSubmit({ mode: 'blank' });
      return;
    }

    if (mode === 'starter-kit' && selectedKitId) {
      onSubmit({ mode: 'starter-kit', kitId: selectedKitId });
      return;
    }

    if (mode === 'quick-start' && selectedStarterId) {
      onSubmit({
        mode: 'quick-start',
        artifactType,
        starterId: selectedStarterId,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>
            Start blank, use a starter kit, or seed a single artifact without going through chat.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              className={`rounded-xl border p-3 text-left ${
                mode === 'blank' ? 'border-foreground bg-muted/40' : 'border-border'
              }`}
              onClick={() => setMode('blank')}
            >
              <p className="text-sm font-semibold">Blank project</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Start from the current empty-project baseline.
              </p>
            </button>
            <button
              type="button"
              className={`rounded-xl border p-3 text-left ${
                mode === 'starter-kit' ? 'border-foreground bg-muted/40' : 'border-border'
              }`}
              onClick={() => setMode('starter-kit')}
            >
              <p className="text-sm font-semibold">Starter kit</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create a multi-artifact project with starter defaults.
              </p>
            </button>
            <button
              type="button"
              className={`rounded-xl border p-3 text-left ${
                mode === 'quick-start' ? 'border-foreground bg-muted/40' : 'border-border'
              }`}
              onClick={() => setMode('quick-start')}
            >
              <p className="text-sm font-semibold">Single artifact</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Seed one document, presentation, or spreadsheet.
              </p>
            </button>
          </div>

          {mode === 'starter-kit' && (
            <div className="space-y-2 rounded-xl border border-border p-4">
              <label className="block text-sm font-medium text-foreground" htmlFor="starter-kit-select">
                Starter kit
              </label>
              <select
                id="starter-kit-select"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={selectedKitId}
                onChange={(event) => setSelectedKitId(event.target.value)}
              >
                {starterKits.map((kit) => (
                  <option key={kit.id} value={kit.id}>
                    {kit.label}
                  </option>
                ))}
              </select>
              {selectedKit && (
                <div className="rounded-lg bg-muted/30 p-3 text-sm">
                  <p className="font-medium">{selectedKit.label}</p>
                  <p className="mt-1 text-muted-foreground">{selectedKit.description}</p>
                  <p className="mt-2 text-muted-foreground">
                    {selectedKit.artifacts.length} starter artifact{selectedKit.artifacts.length === 1 ? '' : 's'}.
                  </p>
                </div>
              )}
            </div>
          )}

          {mode === 'quick-start' && (
            <div className="space-y-3 rounded-xl border border-border p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground" htmlFor="artifact-type-select">
                    Artifact type
                  </label>
                  <select
                    id="artifact-type-select"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    value={artifactType}
                    onChange={(event) => setArtifactType(event.target.value as StarterArtifactType)}
                  >
                    <option value="document">Document</option>
                    <option value="presentation">Presentation</option>
                    <option value="spreadsheet">Spreadsheet</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground" htmlFor="artifact-starter-select">
                    Starter
                  </label>
                  <select
                    id="artifact-starter-select"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    value={selectedStarterId}
                    onChange={(event) => setSelectedStarterId(event.target.value)}
                  >
                    {starterOptions.map((starter) => (
                      <option key={starter.id} value={starter.id}>
                        {starter.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="rounded-lg bg-muted/30 p-3 text-sm">
                <p className="font-medium">
                  {selectedStarter?.label ?? 'Starter'}
                </p>
                <p className="mt-1 text-muted-foreground">
                  {selectedStarter?.description ?? describeQuickStartType(artifactType)}
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleCreate}>
            Create project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
