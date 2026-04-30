import { useEffect, useState } from 'react';
import type {
  DocumentStarterTemplate,
  PresentationStarterTemplate,
  SpreadsheetStarterTemplate,
  StarterArtifactType,
} from '@/services/bootstrap/types';
import type { ProjectStarterKit } from '@/services/bootstrap/types';
import {
  DEFAULT_VISUAL_VARIANT_ID,
  listVisualVariants,
} from '@/services/bootstrap/visualVariants';
import type { VisualVariantId } from '@/services/bootstrap/visualVariants';
import {
  listPresentationScaffolds,
  type PresentationExportIntent,
  type PresentationScaffoldDirectionId,
  type PresentationScaffoldId,
} from '@/services/presentationScaffolds';
import type { ColorTheme } from '@/types/project';
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
  | { mode: 'blank'; variantId: VisualVariantId; colorTheme: ColorTheme; presentationSetup?: PresentationSetupSelection }
  | { mode: 'starter-kit'; kitId: string; variantId: VisualVariantId; colorTheme: ColorTheme; presentationSetup?: PresentationSetupSelection }
  | { mode: 'quick-start'; artifactType: StarterArtifactType; starterId: string; variantId: VisualVariantId; colorTheme: ColorTheme; presentationSetup?: PresentationSetupSelection };

export interface PresentationSetupSelection {
  scaffoldId: PresentationScaffoldId;
  directionId: PresentationScaffoldDirectionId;
  themeId: PresentationScaffoldDirectionId;
  slideCount: number;
  audience: string;
  exportIntent: PresentationExportIntent;
}

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

const VARIANTS = listVisualVariants();
const PRESENTATION_SCAFFOLDS = listPresentationScaffolds();
const DEFAULT_PRESENTATION_SCAFFOLD = PRESENTATION_SCAFFOLDS[0]!;

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
  const [variantId, setVariantId] = useState<VisualVariantId>(DEFAULT_VISUAL_VARIANT_ID);
  const [presentationScaffoldId, setPresentationScaffoldId] = useState<PresentationScaffoldId>(DEFAULT_PRESENTATION_SCAFFOLD.id);
  const [presentationThemeId, setPresentationThemeId] = useState<PresentationScaffoldDirectionId>('executive');
  const [presentationSlideCount, setPresentationSlideCount] = useState(5);
  const [presentationAudience, setPresentationAudience] = useState('executive decision makers');
  const [presentationExportIntent, setPresentationExportIntent] = useState<PresentationExportIntent>('html');

  const selectedVariant = VARIANTS.find((v) => v.id === variantId) ?? VARIANTS[0]!;
  const [colorTheme, setColorTheme] = useState<ColorTheme>(selectedVariant.palette);
  const selectedScaffold = PRESENTATION_SCAFFOLDS.find((scaffold) => scaffold.id === presentationScaffoldId) ?? DEFAULT_PRESENTATION_SCAFFOLD;
  const selectedScaffoldTheme = selectedScaffold.themes.find((theme) => theme.id === presentationThemeId)
    ?? selectedScaffold.themes[0]!;

  useEffect(() => {
    if (!open) return;
    setMode('blank');
    setSelectedKitId(starterKits[0]?.id ?? '');
    setArtifactType('document');
    setSelectedStarterId(documentStarters[0]?.id ?? '');
    setVariantId(DEFAULT_VISUAL_VARIANT_ID);
    setPresentationScaffoldId(DEFAULT_PRESENTATION_SCAFFOLD.id);
    setPresentationThemeId(DEFAULT_PRESENTATION_SCAFFOLD.fallbackThemeId);
    setPresentationSlideCount(5);
    setPresentationAudience('executive decision makers');
    setPresentationExportIntent('html');
    const defaultVariant = VARIANTS.find((v) => v.id === DEFAULT_VISUAL_VARIANT_ID) ?? VARIANTS[0]!;
    setColorTheme(defaultVariant.palette);
  }, [documentStarters, open, starterKits]);

  const handleVariantChange = (id: VisualVariantId) => {
    setVariantId(id);
    const variant = VARIANTS.find((v) => v.id === id);
    if (variant) setColorTheme(variant.palette);
    if (selectedScaffold.supportedDirections.includes(id)) {
      setPresentationThemeId(id);
    }
  };

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
  const buildPresentationSetup = (): PresentationSetupSelection => ({
    scaffoldId: presentationScaffoldId,
    directionId: presentationThemeId,
    themeId: presentationThemeId,
    slideCount: presentationSlideCount,
    audience: presentationAudience.trim() || 'presentation viewers',
    exportIntent: presentationExportIntent,
  });

  const handleCreate = () => {
    const presentationSetup = buildPresentationSetup();
    if (mode === 'blank') {
      onSubmit({ mode: 'blank', variantId, colorTheme, presentationSetup });
      return;
    }

    if (mode === 'starter-kit' && selectedKitId) {
      onSubmit({ mode: 'starter-kit', kitId: selectedKitId, variantId, colorTheme, presentationSetup });
      return;
    }

    if (mode === 'quick-start' && selectedStarterId) {
      onSubmit({
        mode: 'quick-start',
        artifactType,
        starterId: selectedStarterId,
        variantId,
        colorTheme,
        presentationSetup,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
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

          {/* Visual direction */}
          <div className="space-y-3 rounded-xl border border-border p-4">
            <p className="text-sm font-medium text-foreground">Visual direction</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {VARIANTS.map((variant) => (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => handleVariantChange(variant.id)}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    variantId === variant.id
                      ? 'border-foreground bg-muted/40'
                      : 'border-border hover:border-muted-foreground'
                  }`}
                >
                  <div
                    className="mb-2 flex h-8 w-full overflow-hidden rounded"
                    style={{ background: variant.palette.background }}
                  >
                    <div
                      className="h-full w-1/2"
                      style={{ background: variant.palette.primary }}
                    />
                    <div
                      className="h-full w-1/2"
                      style={{ background: variant.palette.accent }}
                    />
                  </div>
                  <p className="text-xs font-semibold leading-tight">{variant.label}</p>
                  <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                    {variant.layoutFamilies.slice(0, 2).join(' / ')}
                  </p>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{selectedVariant.shortDescription}</p>

            {/* Color theme editing */}
            <div className="flex items-center gap-3 pt-0.5">
              <span className="text-xs text-muted-foreground">Colors</span>
              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="color"
                  value={colorTheme.background}
                  onChange={(e) => setColorTheme((t) => ({ ...t, background: e.target.value }))}
                  className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent p-0"
                  title="Background"
                />
                BG
              </label>
              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="color"
                  value={colorTheme.primary}
                  onChange={(e) => setColorTheme((t) => ({ ...t, primary: e.target.value }))}
                  className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent p-0"
                  title="Primary"
                />
                Primary
              </label>
              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="color"
                  value={colorTheme.accent}
                  onChange={(e) => setColorTheme((t) => ({ ...t, accent: e.target.value }))}
                  className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent p-0"
                  title="Accent"
                />
                Accent
              </label>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-border p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">Presentation scaffold</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {selectedScaffold.label}: {selectedScaffold.bestFor.slice(0, 3).join(', ')}.
                </p>
              </div>
              <select
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={presentationScaffoldId}
                onChange={(event) => setPresentationScaffoldId(event.target.value as PresentationScaffoldId)}
              >
                {PRESENTATION_SCAFFOLDS.map((scaffold) => (
                  <option key={scaffold.id} value={scaffold.id}>
                    {scaffold.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2 sm:grid-cols-5">
              {selectedScaffold.themes.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  className={`rounded-lg border p-2 text-left ${
                    presentationThemeId === theme.id
                      ? 'border-foreground bg-muted/40'
                      : 'border-border hover:border-muted-foreground'
                  }`}
                  onClick={() => {
                    setPresentationThemeId(theme.id);
                    handleVariantChange(theme.directionId as VisualVariantId);
                    setColorTheme(theme.colorTheme);
                  }}
                >
                  <div className="mb-2 flex h-6 overflow-hidden rounded">
                    <span className="block flex-1" style={{ background: theme.tokens['--pes-bg'] }} />
                    <span className="block flex-1" style={{ background: theme.tokens['--pes-primary'] }} />
                    <span className="block flex-1" style={{ background: theme.tokens['--pes-accent'] }} />
                  </div>
                  <p className="text-xs font-semibold">{theme.label}</p>
                  <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                    {theme.bestFor[0]}
                  </p>
                </button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="space-y-1 text-xs text-muted-foreground">
                <span className="block">Slides</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={presentationSlideCount}
                  onChange={(event) => setPresentationSlideCount(Math.max(1, Math.min(10, Number(event.target.value) || 1)))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </label>
              <label className="space-y-1 text-xs text-muted-foreground">
                <span className="block">Export</span>
                <select
                  value={presentationExportIntent}
                  onChange={(event) => setPresentationExportIntent(event.target.value as PresentationExportIntent)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="html">HTML</option>
                  <option value="pdf">PDF</option>
                  <option value="editable-pptx">Editable PPTX</option>
                </select>
              </label>
              <label className="space-y-1 text-xs text-muted-foreground">
                <span className="block">Audience</span>
                <input
                  value={presentationAudience}
                  onChange={(event) => setPresentationAudience(event.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </label>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <p className="font-mono text-xs uppercase text-muted-foreground">
                {selectedScaffoldTheme.label} / {presentationExportIntent}
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {selectedScaffold.exampleDeckHtml.includes('data-scaffold') ? 'Compiled scaffold preview available' : 'Preview will compile from the scaffold pack'}
              </p>
            </div>
          </div>
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
