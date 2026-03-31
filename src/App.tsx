import { useEffect, useState, useCallback } from 'react';
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
import {
  autosaveProject,
  getProjectAutosave,
} from '@/services/storage/projectAutosave';
import type { ProjectDocument } from '@/types/project';

export default function App() {
  const project = useProjectStore((s) => s.project);
  const activeDocument = useProjectStore((s) => s.activeDocument());
  const setProject = useProjectStore((s) => s.setProject);
  const addDocument = useProjectStore((s) => s.addDocument);

  // Presentation store — still used for reveal.js UI state
  const setSlides = usePresentationStore((s) => s.setSlides);
  const setTitle = usePresentationStore((s) => s.setTitle);
  const setThemeCss = usePresentationStore((s) => s.setThemeCss);
  const isPresenting = usePresentationStore((s) => s.isPresenting);
  const setPresenting = usePresentationStore((s) => s.setPresenting);

  const messages = useChatStore((s) => s.messages);
  const setMessages = useChatStore((s) => s.setMessages);

  const [chatPanelOpen, setChatPanelOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [historyPanelOpen, setHistoryPanelOpen] = useState(false);

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

  // Auto-open chat panel when messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setChatPanelOpen(true);
    }
  }, [messages.length]);

  const handleAddDocument = useCallback(
    (type: 'document' | 'presentation') => {
      const doc: ProjectDocument = {
        id: crypto.randomUUID(),
        title: type === 'presentation' ? 'New Presentation' : 'New Document',
        type,
        contentHtml: '',
        themeCss: '',
        slideCount: 0,
        order: project.documents.length,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      addDocument(doc);
    },
    [addDocument, project.documents.length],
  );

  const showPresentation = activeDocument?.type === 'presentation';
  const showDocument = activeDocument?.type === 'document';

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
            <div className="flex flex-1 overflow-hidden">
              <DocumentCanvas html={activeDocument.contentHtml} />
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
