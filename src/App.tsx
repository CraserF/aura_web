import { useEffect, useState } from 'react';
import { Toolbar } from '@/components/Toolbar';
import { PresentationCanvas } from '@/components/PresentationCanvas';
import { ChatBar } from '@/components/ChatBar';
import { ChatPanel } from '@/components/ChatPanel';
import { ProviderModal } from '@/components/ProviderModal';
import { usePresentationStore } from '@/stores/presentationStore';
import { useChatStore } from '@/stores/chatStore';
import {
  autosave,
  getAutosave,
  buildPresentationData,
} from '@/services/storage/autosave';

export default function App() {
  const title = usePresentationStore((s) => s.title);
  const slidesHtml = usePresentationStore((s) => s.slidesHtml);
  const themeCss = usePresentationStore((s) => s.themeCss);
  const setTitle = usePresentationStore((s) => s.setTitle);
  const setSlides = usePresentationStore((s) => s.setSlides);
  const setThemeCss = usePresentationStore((s) => s.setThemeCss);
  const isPresenting = usePresentationStore((s) => s.isPresenting);
  const setPresenting = usePresentationStore((s) => s.setPresenting);

  const messages = useChatStore((s) => s.messages);
  const setMessages = useChatStore((s) => s.setMessages);

  const [chatPanelOpen, setChatPanelOpen] = useState(false);

  // Restore autosaved session on mount
  useEffect(() => {
    getAutosave().then((saved) => {
      if (!saved) return;
      const { presentation } = saved;
      setTitle(presentation.title);
      setSlides(presentation.slidesHtml);
      setThemeCss(presentation.themeCss);
      setMessages(presentation.chatHistory);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave on state changes
  useEffect(() => {
    if (!slidesHtml) return;
    const data = buildPresentationData(
      title,
      slidesHtml,
      themeCss,
      messages,
    );
    autosave(data);
  }, [title, slidesHtml, themeCss, messages]);

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

  return (
    <div className="flex h-full flex-col bg-background">
      <Toolbar
        chatPanelOpen={chatPanelOpen}
        onToggleChatPanel={() => setChatPanelOpen((v) => !v)}
      />
      <div className="flex min-h-0 flex-1">
        <main className="flex min-w-0 flex-1 flex-col">
          <PresentationCanvas />
          <ChatBar />
        </main>
        <ChatPanel open={chatPanelOpen} onClose={() => setChatPanelOpen(false)} />
      </div>
      <ProviderModal />
    </div>
  );
}
