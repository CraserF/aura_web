import { Suspense, lazy, useEffect, useState, useCallback } from 'react';
import { Toolbar } from '@/components/Toolbar';
import { PresentationCanvas } from '@/components/PresentationCanvas';
import { DocumentCanvas } from '@/components/DocumentCanvas';
import { ChatBar } from '@/components/ChatBar';
import { ChatPanel } from '@/components/ChatPanel';
import { ProviderModal } from '@/components/ProviderModal';
import { ProjectSidebar } from '@/components/ProjectSidebar';
import { VersionHistoryPanel } from '@/components/VersionHistoryPanel';
import { useProjectStore } from '@/stores/projectStore';
import { usePresentationStore } from '@/stores/presentationStore';
import { useChatStore } from '@/stores/chatStore';
import { useSettingsStore } from '@/stores/settingsStore';
import {
  autosaveProject,
  getProjectAutosave,
} from '@/services/storage/projectAutosave';
import type { ProjectDocument } from '@/types/project';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DocumentPdfPreview } from '@/components/DocumentPdfPreview';
import { sanitizeFilename } from '@/lib/sanitizeFilename';
import { extractChartSpecsFromHtml } from '@/services/charts';
import { BookOpen, ChevronDown, Eye, FileDown, Link2, Loader2, PenSquare, Printer } from 'lucide-react';

const LazyDocumentTextEditor = lazy(async () => {
  const mod = await import('@/components/DocumentTextEditor');
  return { default: mod.DocumentTextEditor };
});

function normalizeEditorMarkdown(value: string): string {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeDocumentReference(value: string): string {
  const normalized = value
    .trim()
    .replace(/^.*#/, '')
    .replace(/^[/#.]+/, '')
    .replace(/\?.*$/, '')
    .trim();

  return sanitizeFilename(normalized || value);
}

function resolveProjectDocumentReference(documents: ProjectDocument[], value: string): ProjectDocument | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const hashRef = trimmed.includes('#') ? trimmed.slice(trimmed.lastIndexOf('#') + 1).trim() : '';
  const pathRef = (trimmed
    .replace(/^\.\//, '')
    .replace(/^\//, '')
    .split(/[?#]/)[0] ?? '')
    .trim();
  const normalizedRef = normalizeDocumentReference(trimmed);

  return documents.find((doc) => {
    const titleSlug = sanitizeFilename(doc.title || '');
    const titleText = doc.title?.trim().toLowerCase() ?? '';
    return doc.id === trimmed
      || (!!hashRef && doc.id === hashRef)
      || (!!pathRef && doc.id === pathRef)
      || (!!normalizedRef && titleSlug === normalizedRef)
      || (!!titleText && titleText === trimmed.toLowerCase());
  });
}

export default function App() {
  const project = useProjectStore((s) => s.project);
  const activeDocument = useProjectStore((s) => s.activeDocument());
  const setProject = useProjectStore((s) => s.setProject);
  const addDocument = useProjectStore((s) => s.addDocument);
  const updateDocument = useProjectStore((s) => s.updateDocument);

  // Presentation store — still used for reveal.js UI state
  const setSlides = usePresentationStore((s) => s.setSlides);
  const setTitle = usePresentationStore((s) => s.setTitle);
  const setThemeCss = usePresentationStore((s) => s.setThemeCss);
  const isPresenting = usePresentationStore((s) => s.isPresenting);
  const setPresenting = usePresentationStore((s) => s.setPresenting);

  const messages = useChatStore((s) => s.messages);
  const setMessages = useChatStore((s) => s.setMessages);
  const showDocumentPagesView = useSettingsStore((s) => s.showDocumentPagesView);

  const [chatPanelOpen, setChatPanelOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [historyPanelOpen, setHistoryPanelOpen] = useState(false);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [textEditorOpen, setTextEditorOpen] = useState(false);
  const [editorInitialMarkdown, setEditorInitialMarkdown] = useState('');
  const [editorContentSource, setEditorContentSource] = useState<'original' | 'derived'>('original');
  const [textEditorMode, setTextEditorMode] = useState<'edit' | 'link'>('edit');
  const [documentAction, setDocumentAction] = useState<'preview-pdf' | 'export-pdf' | 'export-word' | 'save-text' | null>(null);
  const [documentError, setDocumentError] = useState<string | null>(null);

  // Restore autosaved project on mount
  useEffect(() => {
    getProjectAutosave().then((saved) => {
      if (!saved) return;
      setProject(saved.project);
      setMessages(saved.project.chatHistory);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync active presentation document → presentationStore for reveal.js
  useEffect(() => {
    if (activeDocument?.type === 'presentation') {
      setSlides(activeDocument.contentHtml);
      setTitle(activeDocument.title);
      setThemeCss(activeDocument.themeCss ?? '');
    } else {
      setSlides('');
    }
  }, [activeDocument, setSlides, setTitle, setThemeCss]);

  // Autosave project state
  useEffect(() => {
    if (project.documents.length === 0) return;
    autosaveProject({ ...project, chatHistory: messages });
  }, [project, messages]);

  // Exit present mode on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPresenting) {
        setPresenting(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isPresenting, setPresenting]);

  useEffect(() => () => {
    if (pdfPreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(pdfPreviewUrl);
    }
  }, [pdfPreviewUrl]);

  // Auto-open chat panel when messages arrive
  useEffect(() => {
    if (messages.length > 0 && window.matchMedia('(min-width: 1024px)').matches) {
      setChatPanelOpen(true);
    }
  }, [messages.length]);

  const handleAddDocument = useCallback(
    (type: 'document' | 'presentation', parentId?: string) => {
      const doc: ProjectDocument = {
        id: crypto.randomUUID(),
        title: type === 'presentation' ? 'New Presentation' : 'New Document',
        type,
        contentHtml: '',
        themeCss: '',
        slideCount: 0,
        chartSpecs: {},
        order: project.documents.length,
        parentId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      addDocument(doc);
    },
    [addDocument, project.documents.length],
  );

  const showPresentation = activeDocument?.type === 'presentation';
  const showDocument = activeDocument?.type === 'document';
  const isDocumentBusy = documentAction !== null;
  const canLinkAnotherDocument = activeDocument?.type === 'document'
    ? project.documents.some((doc) => doc.type === 'document' && doc.id !== activeDocument.id)
    : false;

  const handlePreviewPdf = useCallback(async () => {
    if (!activeDocument || activeDocument.type !== 'document' || !activeDocument.contentHtml) return;

    setPdfPreviewOpen(true);
    setDocumentError(null);
    setDocumentAction('preview-pdf');

    try {
      const { createDocumentPdfBlob } = await import('@/services/export/pdf');
      const blob = await createDocumentPdfBlob({
        html: activeDocument.contentHtml,
        title: activeDocument.title,
      });

      setPdfPreviewUrl((current) => {
        if (current?.startsWith('blob:')) {
          URL.revokeObjectURL(current);
        }
        return URL.createObjectURL(blob);
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to prepare PDF preview.';
      setDocumentError(message);
    } finally {
      setDocumentAction(null);
    }
  }, [activeDocument]);

  const handleExportPdf = useCallback(async () => {
    if (!activeDocument || activeDocument.type !== 'document' || !activeDocument.contentHtml) return;

    setDocumentError(null);
    setDocumentAction('export-pdf');

    try {
      const { exportDocumentPdf } = await import('@/services/export/pdf');
      await exportDocumentPdf({
        html: activeDocument.contentHtml,
        title: activeDocument.title,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export PDF.';
      setDocumentError(message);
      setPdfPreviewOpen(true);
    } finally {
      setDocumentAction(null);
    }
  }, [activeDocument]);

  const handleExportWord = useCallback(async () => {
    if (!activeDocument || activeDocument.type !== 'document') return;

    setDocumentError(null);
    setDocumentAction('export-word');

    try {
      const { exportDocumentDocx } = await import('@/services/export/docx');
      await exportDocumentDocx({
        title: activeDocument.title,
        markdown: activeDocument.sourceMarkdown,
        html: activeDocument.contentHtml,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export Word document.';
      setDocumentError(message);
    } finally {
      setDocumentAction(null);
    }
  }, [activeDocument]);

  const handleOpenTextEditor = useCallback(async (mode: 'edit' | 'link' = 'edit') => {
    if (!activeDocument || activeDocument.type !== 'document') return;

    setDocumentError(null);
    setTextEditorMode(mode);

    if (activeDocument.sourceMarkdown?.trim()) {
      setEditorContentSource('original');
      setEditorInitialMarkdown(normalizeEditorMarkdown(activeDocument.sourceMarkdown));
      setTextEditorOpen(true);
      return;
    }

    try {
      const { deriveDocumentTextSource } = await import('@/services/ai/workflow/document');
      setEditorContentSource('derived');
      setEditorInitialMarkdown(normalizeEditorMarkdown(deriveDocumentTextSource(activeDocument.contentHtml)));
      setTextEditorOpen(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to prepare the text editor.';
      setDocumentError(message);
    }
  }, [activeDocument]);

  const handleSaveText = useCallback(async (markdown: string) => {
    if (!activeDocument || activeDocument.type !== 'document') return;

    const normalizedMarkdown = normalizeEditorMarkdown(markdown);
    setDocumentError(null);
    setDocumentAction('save-text');

    try {
      const { renderDocumentTextEdits } = await import('@/services/ai/workflow/document');
      const result = renderDocumentTextEdits({
        existingHtml: activeDocument.contentHtml,
        text: normalizedMarkdown,
        titleHint: activeDocument.title,
        prompt: `${activeDocument.title}\n${activeDocument.description ?? ''}`.trim(),
      });

      updateDocument(activeDocument.id, {
        title: result.title || activeDocument.title,
        contentHtml: result.html,
        sourceMarkdown: result.markdown,
        chartSpecs: extractChartSpecsFromHtml(result.html),
      });
      setEditorInitialMarkdown(result.markdown);
      setTextEditorOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save text changes.';
      setDocumentError(message);
    } finally {
      setDocumentAction(null);
    }
  }, [activeDocument, updateDocument]);

  const handleTogglePages = useCallback(() => {
    if (!activeDocument || activeDocument.type !== 'document') return;
    updateDocument(activeDocument.id, {
      pagesEnabled: !activeDocument.pagesEnabled,
    });
  }, [activeDocument, updateDocument]);

  const handleNavigateToDocument = useCallback(
    (documentRef: string) => {
      const targetDoc = resolveProjectDocumentReference(project.documents, documentRef);
      if (targetDoc) {
        const { setActiveDocumentId } = useProjectStore.getState();
        setActiveDocumentId(targetDoc.id);
      }
    },
    [project.documents],
  );

  const handlePrint = useCallback(async () => {
    if (!activeDocument || activeDocument.type !== 'document' || !activeDocument.contentHtml) {
      setDocumentError('Document preview is not ready to print yet.');
      return;
    }

    setDocumentError(null);

    try {
      const { openDocumentPrintPreview } = await import('@/services/export/pdf');
      openDocumentPrintPreview({
        html: activeDocument.contentHtml,
        title: activeDocument.title,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to open print preview.';
      setDocumentError(message);
    }
  }, [activeDocument]);

  return (
    <div className="flex h-full flex-col bg-background">
      <Toolbar
        chatPanelOpen={chatPanelOpen}
        onToggleChatPanel={() => setChatPanelOpen((v) => !v)}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        historyPanelOpen={historyPanelOpen}
        onToggleHistoryPanel={() => setHistoryPanelOpen((v) => !v)}
      />
      <div className="flex min-h-0 flex-1">
        <ProjectSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onRequestAddDocument={handleAddDocument}
        />

        <main className="flex min-w-0 flex-1 flex-col">
          {!activeDocument && (
            <div className="flex flex-1 items-center justify-center">
              <EmptyProjectState onAdd={handleAddDocument} />
            </div>
          )}
          {showPresentation && <PresentationCanvas />}
          {showDocument && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="hidden shrink-0 items-center gap-1 border-b border-border px-3 py-1.5 sm:flex">
                {activeDocument.contentHtml && (
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1.5 rounded-md px-2 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => void handleOpenTextEditor('edit')}
                          disabled={isDocumentBusy}
                        >
                          {documentAction === 'save-text' ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <PenSquare className="size-3.5" />
                          )}
                          Edit text
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Edit the document wording without touching HTML</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1.5 rounded-md px-2 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => void handleOpenTextEditor('link')}
                          disabled={isDocumentBusy || !canLinkAnotherDocument}
                        >
                          <Link2 className="size-3.5" />
                          Link doc
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {canLinkAnotherDocument ? 'Insert a link to another document' : 'Create another document first to add an internal link'}
                      </TooltipContent>
                    </Tooltip>

                    {showDocumentPagesView && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant={activeDocument.pagesEnabled ? 'secondary' : 'ghost'}
                            size="sm"
                            className="h-7 gap-1.5 rounded-md px-2 text-xs text-muted-foreground hover:text-foreground"
                            onClick={handleTogglePages}
                          >
                            <BookOpen className="size-3.5" />
                            Pages
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{activeDocument.pagesEnabled ? 'Switch to scroll view' : 'Switch to A4 page view'}</TooltipContent>
                      </Tooltip>
                    )}

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-7 gap-1.5 rounded-md px-2 text-xs"
                          onClick={handlePreviewPdf}
                          disabled={isDocumentBusy}
                        >
                          {documentAction === 'preview-pdf' ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Eye className="size-3.5" />
                          )}
                          Preview PDF
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Open a print-accurate PDF preview</TooltipContent>
                    </Tooltip>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1.5 rounded-md px-2 text-xs text-muted-foreground hover:text-foreground"
                          disabled={isDocumentBusy}
                        >
                          {documentAction === 'export-pdf' || documentAction === 'export-word' ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <FileDown className="size-3.5" />
                          )}
                          Export
                          <ChevronDown className="size-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onSelect={(event) => {
                          event.preventDefault();
                          void handlePreviewPdf();
                        }}>
                          <Eye className="mr-2 size-3.5" />
                          Preview PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={(event) => {
                          event.preventDefault();
                          void handleExportPdf();
                        }}>
                          Export PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={(event) => {
                          event.preventDefault();
                          void handleExportWord();
                        }}>
                          Export Word (.docx)
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={(event) => {
                          event.preventDefault();
                          void handlePrint();
                        }}>
                          <Printer className="mr-2 size-3.5" />
                          Print preview…
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {documentError && (
                      <p className="ml-2 truncate text-xs text-destructive">
                        {documentError}
                      </p>
                    )}
                  </>
                )}
              </div>
              <DocumentCanvas
                html={activeDocument.contentHtml}
                pagesEnabled={activeDocument.pagesEnabled}
                onNavigate={handleNavigateToDocument}
              />
            </div>
          )}
          {showDocument && activeDocument?.contentHtml && (
            <div className="border-t border-border/80 bg-muted/20 px-3 py-2 sm:hidden">
              <div className="mx-auto flex max-w-3xl items-center gap-1.5 overflow-x-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 shrink-0 gap-1.5 rounded-md px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => void handleOpenTextEditor('edit')}
                  disabled={isDocumentBusy}
                >
                  {documentAction === 'save-text' ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <PenSquare className="size-3.5" />
                  )}
                  Edit
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 shrink-0 gap-1.5 rounded-md px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => void handleOpenTextEditor('link')}
                  disabled={isDocumentBusy || !canLinkAnotherDocument}
                >
                  <Link2 className="size-3.5" />
                  Link
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-7 shrink-0 gap-1.5 rounded-md px-2 text-xs"
                      disabled={isDocumentBusy}
                    >
                      {documentAction === 'preview-pdf' || documentAction === 'export-pdf' || documentAction === 'export-word' ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <FileDown className="size-3.5" />
                      )}
                      Export
                      <ChevronDown className="size-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onSelect={(event) => {
                      event.preventDefault();
                      void handlePreviewPdf();
                    }}>
                      <Eye className="mr-2 size-3.5" />
                      Preview PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={(event) => {
                      event.preventDefault();
                      void handleExportPdf();
                    }}>
                      Export PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={(event) => {
                      event.preventDefault();
                      void handleExportWord();
                    }}>
                      Export Word (.docx)
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={(event) => {
                      event.preventDefault();
                      void handlePrint();
                    }}>
                      <Printer className="mr-2 size-3.5" />
                      Print preview…
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {documentError && (
                <p className="mx-auto mt-1 max-w-3xl truncate text-xs text-destructive">{documentError}</p>
              )}
            </div>
          )}
          <ChatBar />
        </main>

        <VersionHistoryPanel
          open={historyPanelOpen}
          onClose={() => setHistoryPanelOpen(false)}
        />

        <ChatPanel open={chatPanelOpen} onClose={() => setChatPanelOpen(false)} />
      </div>
      <ProviderModal />
      <DocumentPdfPreview
        open={pdfPreviewOpen}
        onOpenChange={setPdfPreviewOpen}
        title={activeDocument?.title ?? 'Document'}
        pdfUrl={pdfPreviewUrl}
        isLoading={documentAction === 'preview-pdf'}
        error={documentError}
        onDownload={() => {
          void handleExportPdf();
        }}
      />
      <Suspense fallback={null}>
        <LazyDocumentTextEditor
          open={textEditorOpen}
          onOpenChange={setTextEditorOpen}
          title={activeDocument?.title ?? 'Document'}
          initialMarkdown={editorInitialMarkdown}
          onSave={handleSaveText}
          isSaving={documentAction === 'save-text'}
          availableDocuments={project.documents}
          currentDocumentId={activeDocument?.id}
          autoOpenLinkPicker={textEditorMode === 'link'}
          contentSource={editorContentSource}
        />
      </Suspense>
    </div>
  );
}

function EmptyProjectState({
  onAdd,
}: {
  onAdd: (type: 'document' | 'presentation') => void;
}) {
  return (
    <div className="max-w-lg px-6 text-center">
      <div className="mx-auto mb-6 flex size-24 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-600 text-white shadow-2xl">
        <span className="text-5xl">✨</span>
      </div>
      <h1 className="text-2xl font-bold text-foreground">Welcome to Aura</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Create beautiful documents and presentations. Everything runs in your
        browser — private, fast, and always saved.
      </p>
      <div className="mt-8 grid grid-cols-2 gap-3">
        <button
          onClick={() => onAdd('document')}
          className="group flex flex-col items-center gap-2.5 rounded-xl border border-border bg-card p-4 transition-all hover:border-blue-300 hover:shadow-md"
        >
          <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-sm transition-transform group-hover:scale-110">
            <span className="text-xl">📝</span>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">Document</p>
            <p className="text-xs text-muted-foreground">Rich article or report</p>
          </div>
        </button>
        <button
          onClick={() => onAdd('presentation')}
          className="group flex flex-col items-center gap-2.5 rounded-xl border border-border bg-card p-4 transition-all hover:border-violet-300 hover:shadow-md"
        >
          <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-sm transition-transform group-hover:scale-110">
            <span className="text-xl">🎯</span>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">Presentation</p>
            <p className="text-xs text-muted-foreground">Slide deck with AI</p>
          </div>
        </button>
      </div>
      <p className="mt-6 text-xs text-muted-foreground/60">
        Or describe what you want in the chat below
      </p>
    </div>
  );
}
