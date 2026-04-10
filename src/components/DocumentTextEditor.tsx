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
import { Link2, RotateCcw } from 'lucide-react';
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
  contentSource?: 'original' | 'derived';
}

type EditorViewMode = 'rich' | 'markdown';

function normalizeEditorMarkdown(value: string): string {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
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
  contentSource = 'original',
}: DocumentTextEditorProps) {
  const editorRef = useRef<MDXEditorMethods>(null);
  const markdownTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [markdown, setMarkdown] = useState(normalizeEditorMarkdown(initialMarkdown));
  const [linkPickerOpen, setLinkPickerOpen] = useState(false);
  const [linkQuery, setLinkQuery] = useState('');
  const [editorViewMode, setEditorViewMode] = useState<EditorViewMode>('rich');

  useEffect(() => {
    if (!open) {
      setLinkPickerOpen(false);
      return;
    }

    const normalized = normalizeEditorMarkdown(initialMarkdown);
    setMarkdown(normalized);
    setEditorViewMode('rich');
    setLinkQuery('');

    const handle = window.requestAnimationFrame(() => {
      editorRef.current?.setMarkdown(normalized);
    });

    return () => window.cancelAnimationFrame(handle);
  }, [initialMarkdown, open]);

  useEffect(() => {
    if (!open || editorViewMode !== 'rich') return;

    const handle = window.requestAnimationFrame(() => {
      editorRef.current?.setMarkdown(markdown);
    });

    return () => window.cancelAnimationFrame(handle);
  }, [editorViewMode, open]);

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

  const wordCount = useMemo(
    () => markdown.split(/\s+/).filter(Boolean).length,
    [markdown],
  );

  const getLatestMarkdown = () => {
    const liveMarkdown = editorRef.current?.getMarkdown();
    if (liveMarkdown && liveMarkdown.trim().length > 0) {
      return normalizeEditorMarkdown(liveMarkdown);
    }

    if (markdown.trim().length > 0) {
      return normalizeEditorMarkdown(markdown);
    }

    return normalizeEditorMarkdown(initialMarkdown);
  };

  useEffect(() => {
    if (open && autoOpenLinkPicker && linkableDocuments.length > 0) {
      setLinkPickerOpen(true);
    }
  }, [autoOpenLinkPicker, linkableDocuments.length, open]);

  const handleSetViewMode = (nextMode: EditorViewMode) => {
    if (nextMode === editorViewMode) return;

    if (editorViewMode === 'rich') {
      setMarkdown(getLatestMarkdown());
    }

    setEditorViewMode(nextMode);
  };

  const handleInsertDocumentLink = (doc: ProjectDocument) => {
    const label = doc.title?.trim() || 'Linked document';
    const insertion = `[${label}](#${doc.id})`;

    if (editorViewMode === 'rich' && editorRef.current) {
      editorRef.current.insertMarkdown(insertion);
      setMarkdown(getLatestMarkdown());
    } else {
      const textarea = markdownTextareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart ?? markdown.length;
        const end = textarea.selectionEnd ?? markdown.length;
        const before = markdown.slice(0, start);
        const after = markdown.slice(end);
        const spacerBefore = before.trimEnd().length > 0 && !before.endsWith('\n') ? '\n\n' : '';
        const spacerAfter = after.trimStart().length > 0 && !after.startsWith('\n') ? '\n\n' : '';
        const nextMarkdown = `${before}${spacerBefore}${insertion}${spacerAfter}${after}`;
        setMarkdown(nextMarkdown);

        window.requestAnimationFrame(() => {
          const cursor = (before + spacerBefore + insertion).length;
          textarea.focus();
          textarea.setSelectionRange(cursor, cursor);
        });
      } else {
        setMarkdown((current) => normalizeEditorMarkdown(`${current}\n\n${insertion}`));
      }
    }

    setLinkPickerOpen(false);
    setLinkQuery('');
  };

  const handleReset = () => {
    const normalized = normalizeEditorMarkdown(initialMarkdown);
    setMarkdown(normalized);

    if (editorViewMode === 'rich') {
      editorRef.current?.setMarkdown(normalized);
    }
  };

  const handleSave = () => {
    const normalized = editorViewMode === 'rich'
      ? getLatestMarkdown()
      : normalizeEditorMarkdown(markdown);
    setMarkdown(normalized);
    void onSave(normalized);
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

  const sourceLabel = contentSource === 'derived' ? 'Derived from current document layout' : 'Editing original markdown source';

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
              <div className="space-y-3 border-b border-border px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full bg-muted px-2 py-0.5">{sourceLabel}</span>
                      <span>{wordCount} words</span>
                      <span>{markdown.length} chars</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-lg border border-border bg-muted/30 p-0.5">
                      <button
                        type="button"
                        onClick={() => handleSetViewMode('rich')}
                        className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${editorViewMode === 'rich' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        Rich text
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetViewMode('markdown')}
                        className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${editorViewMode === 'markdown' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        Markdown
                      </button>
                    </div>

                    <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={handleReset}>
                      <RotateCcw className="size-3.5" />
                      Reset
                    </Button>
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
                </div>

                {contentSource === 'derived' && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-950">
                    Best results: <strong>1)</strong> update wording in rich mode, <strong>2)</strong> switch to Markdown mode for exact structural edits, <strong>3)</strong> save to re-render the polished layout.
                  </div>
                )}
              </div>

              <div className="px-4 py-4">
                {editorViewMode === 'rich' ? (
                  <MDXEditor
                    key="rich-editor"
                    ref={editorRef}
                    markdown={markdown}
                    onChange={setMarkdown}
                    plugins={plugins}
                    contentEditableClassName="prose prose-slate max-w-none min-h-[380px] px-2 py-1 focus:outline-none"
                  />
                ) : (
                  <div className="space-y-2">
                    <textarea
                      ref={markdownTextareaRef}
                      value={markdown}
                      onChange={(event) => setMarkdown(event.target.value)}
                      spellCheck={false}
                      aria-label="Markdown source editor"
                      placeholder="Edit the document markdown directly…"
                      className="min-h-[420px] w-full resize-none rounded-xl border border-border bg-muted/20 px-4 py-3 font-mono text-sm leading-6 text-foreground outline-none transition-colors focus:border-foreground/20 focus:bg-background"
                    />
                    <p className="text-xs text-muted-foreground">
                      Markdown mode gives exact control when a block needs precise edits or if rich-text behavior feels limiting.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
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
