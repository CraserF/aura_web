import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ConfirmDialogProps {
  /** The element that triggers the dialog to open (uncontrolled mode). */
  trigger?: ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Variant for the confirm button. Defaults to 'destructive'. */
  variant?: 'default' | 'destructive';
  onConfirm: () => void;
  /** Controlled open state. Use together with onOpenChange for controlled mode. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * A reusable confirmation dialog for destructive or irreversible actions.
 *
 * Can be used in two ways:
 * - **Uncontrolled** (trigger prop): wrap any element as a trigger; Dialog
 *   manages open state internally.
 * - **Controlled** (open + onOpenChange): manage open state yourself and omit
 *   the trigger prop.
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'destructive',
  onConfirm,
  open: controlledOpen,
  onOpenChange: onControlledOpenChange,
}: ConfirmDialogProps) {
  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);

  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled
    ? (onControlledOpenChange ?? ((_v: boolean) => undefined))
    : setInternalOpen;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant}
            size="sm"
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
