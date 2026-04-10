import { useEffect, useMemo, useRef, useState } from 'react';
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
  type MDXEditorMethods,
  UndoRedo,
} from '@mdxeditor/editor';
import { Link2 } from 'lucide-react';
import '@mdxeditor/editor/style.css';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ProjectDocument } from '@/types/project';

interface DocumentTextEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initialMarkdown: string;
  onSave: (markdown: string) => void | Promise<void>;
  isSaving?: boolean;
  availableDocuments?: ProjectDocument[];
  currentDocumentId?: string;
  autoOpenLinkPicker?: boolean;
}

export function DocumentTextEditor({
  open,
  onOpenChange,
  title,
  initialMarkdown,
  onSave,
  isSaving = false,
  availableDocuments = [],
  currentDocumentId,
  autoOpenLinkPicker = false,
}: DocumentTextEditorProps) {
  const editorRef = useRef<MDXEditorMethods>(null);
  const [markdown, setMarkdown] = useState(initialMarkdown);
  const [linkPickerOpen, setLinkPickerOpen] = useState(false);
  const [linkQuery, setLinkQuery] = useState('');

  useEffect(() => {
    if (!open) return;

    setMarkdown(initialMarkdown);
    const handle = window.requestAnimationFrame(() => {
      editorRef.current?.setMarkdown(initialMarkdown);
    });

    return () => window.cancelAnimationFrame(handle);
  }, [initialMarkdown, open]);

  const linkableDocuments = useMemo(
    () => availableDocuments.filter((doc) => doc.type === 'document' && doc.id !== currentDocumentId),
    [availableDocuments, currentDocumentId],
  );

  const filteredDocuments = useMemo(() => {
    const query = linkQuery.trim().toLowerCase();
    if (!query) return linkableDocuments;

    return linkableDocuments.filter((doc) => {
      const haystack = `${doc.title} ${doc.description ?? ''}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [linkQuery, linkableDocuments]);

  useEffect(() => {
    if (open && autoOpenLinkPicker && linkableDocuments.length > 0) {
      setLinkPickerOpen(true);
    }
  }, [autoOpenLinkPicker, linkableDocuments.length, open]);

  const handleInsertDocumentLink = (doc: ProjectDocument) => {
    const label = doc.title?.trim() || 'Linked document';
    editorRef.current?.insertMarkdown(`[${label}](#${doc.id})`);
    setLinkPickerOpen(false);
    setLinkQuery('');
  };

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
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => setLinkPickerOpen(true)}
            disabled={linkableDocuments.length === 0}
            title={linkableDocuments.length === 0 ? 'Create another document first to add an internal link.' : 'Insert a link to another document'}
          >
            <Link2 className="size-3.5" />
            <span className="hidden sm:inline">Doc link</span>
          </button>
        </>
      ),
    }),
  ], [linkableDocuments.length]);

  return (
    <>
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
              <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Rich text editing only — HTML stays hidden.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setLinkPickerOpen(true)}
                  disabled={linkableDocuments.length === 0}
                >
                  <Link2 className="size-3.5" />
                  Link document
                </Button>
              </div>
              <div className="px-4 py-4">
                <MDXEditor
                  ref={editorRef}
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

      <Dialog open={linkPickerOpen} onOpenChange={setLinkPickerOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader className="gap-1 text-left">
            <DialogTitle>Link to another document</DialogTitle>
            <DialogDescription>
              Insert an internal project link that jumps to another document in this workspace.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              value={linkQuery}
              onChange={(event) => setLinkQuery(event.target.value)}
              placeholder="Search documents…"
              aria-label="Search documents"
            />

            <div className="max-h-72 space-y-2 overflow-auto pr-1">
              {filteredDocuments.length > 0 ? (
                filteredDocuments.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    className="flex w-full items-start justify-between gap-3 rounded-xl border border-border bg-background px-3 py-3 text-left transition-colors hover:border-primary/35 hover:bg-muted/30"
                    onClick={() => handleInsertDocumentLink(doc)}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{doc.title}</p>
                      {doc.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{doc.description}</p>
                      )}
                    </div>
                    <span className="rounded-full bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
                      internal link
                    </span>
                  </button>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
                  {linkableDocuments.length === 0
                    ? 'Create another document first to add an internal link.'
                    : 'No matching documents found.'}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
