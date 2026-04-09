import { useEffect, useMemo, useState } from 'react';
import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CreateLink,
  headingsPlugin,
  linkPlugin,
  listsPlugin,
  ListsToggle,
  markdownShortcutPlugin,
  MDXEditor,
  quotePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
  UndoRedo,
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface DocumentTextEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initialMarkdown: string;
  onSave: (markdown: string) => void | Promise<void>;
  isSaving?: boolean;
}

export function DocumentTextEditor({
  open,
  onOpenChange,
  title,
  initialMarkdown,
  onSave,
  isSaving = false,
}: DocumentTextEditorProps) {
  const [markdown, setMarkdown] = useState(initialMarkdown);

  useEffect(() => {
    if (open) {
      setMarkdown(initialMarkdown);
    }
  }, [initialMarkdown, open]);

  const plugins = useMemo(() => [
    headingsPlugin(),
    listsPlugin(),
    quotePlugin(),
    thematicBreakPlugin(),
    linkPlugin(),
    markdownShortcutPlugin(),
    toolbarPlugin({
      toolbarContents: () => (
        <>
          <UndoRedo />
          <BoldItalicUnderlineToggles />
          <BlockTypeSelect />
          <ListsToggle />
          <CreateLink />
        </>
      ),
    }),
  ], []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[88vh] max-w-5xl flex-col overflow-hidden p-0">
        <div className="border-b border-border px-6 py-4">
          <DialogHeader className="gap-1 text-left">
            <DialogTitle>Edit text</DialogTitle>
            <DialogDescription>
              Update the document wording and structure while Aura keeps the visual styling polished.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-muted/20 px-6 py-5">
          <div className="rounded-2xl border border-border bg-background shadow-sm">
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-medium text-foreground">{title}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Rich text editing only — HTML stays hidden.
              </p>
            </div>
            <div className="px-4 py-4">
              <MDXEditor
                markdown={markdown}
                onChange={setMarkdown}
                plugins={plugins}
                contentEditableClassName="prose prose-slate max-w-none min-h-[380px] px-2 py-1 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={() => void onSave(markdown)} disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
