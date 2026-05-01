import { Info } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { ProjectDocument } from '@/types/project';

const EDITORIAL_STAGE_PACK_ID = 'presentation/editorial-stage-v1';

const GUIDED_EDIT_PROMPTS = [
  {
    label: 'Title',
    ariaLabel: 'Use guided edit: change slide title',
    prompt: 'Change slide 1 title to "..."',
  },
  {
    label: 'Add slide',
    ariaLabel: 'Use guided edit: add slide',
    prompt: 'Add one slide about ...',
  },
  {
    label: 'Restyle',
    ariaLabel: 'Use guided edit: restyle deck',
    prompt: 'Restyle this deck for a sharper executive review',
  },
] as const;

interface GuidedEditChipsProps {
  activeDocument: ProjectDocument | null;
  disabled?: boolean;
  onSelectPrompt: (prompt: string) => void;
}

export function GuidedEditChips({ activeDocument, disabled = false, onSelectPrompt }: GuidedEditChipsProps) {
  const [showUnsupportedInfo, setShowUnsupportedInfo] = useState(false);
  const isEditorialStageDeck =
    activeDocument?.type === 'presentation'
    && activeDocument.artifactManifest?.packId === EDITORIAL_STAGE_PACK_ID
    && !!activeDocument.artifactSourcePayload;

  if (!isEditorialStageDeck) return null;

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5" aria-label="Guided deck edits">
      {GUIDED_EDIT_PROMPTS.map((chip) => (
        <Button
          key={chip.prompt}
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          className="h-7 rounded-md border border-border/60 bg-background/60 px-2 text-[11px] font-normal text-muted-foreground hover:bg-muted/70 hover:text-foreground"
          aria-label={chip.ariaLabel}
          onClick={() => {
            setShowUnsupportedInfo(false);
            onSelectPrompt(chip.prompt);
          }}
        >
          {chip.label}
        </Button>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled}
        className="h-7 rounded-md border border-border/60 bg-background/60 px-2 text-[11px] font-normal text-muted-foreground hover:bg-muted/70 hover:text-foreground"
        aria-label="Show unsupported guided edit info"
        onClick={() => setShowUnsupportedInfo((value) => !value)}
      >
        <Info size={12} strokeWidth={2} />
        Limits
      </Button>
      {showUnsupportedInfo && (
        <span className="text-[11px] text-muted-foreground" role="status">
          Reorder, delete, and media swap edits are not supported yet.
        </span>
      )}
    </div>
  );
}
