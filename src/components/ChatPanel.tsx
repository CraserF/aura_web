import { useEffect, useMemo, useRef } from 'react';
import { X } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { useProjectStore } from '@/stores/projectStore';
import type { ChatMessage as ChatMessageType } from '@/types';
import { ChatMessage } from './ChatMessage';
import { AIWorkingIndicator } from './AIWorkingIndicator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

interface ChatPanelProps {
  open: boolean;
  onClose: () => void;
}

function isMessageVisible(
  message: ChatMessageType,
  activeDocumentId: string | null | undefined,
  showAllMessages: boolean,
): boolean {
  if (showAllMessages || !activeDocumentId) return true;
  return message.scope === 'project' || !message.documentId || message.documentId === activeDocumentId;
}

export function ChatPanel({ open, onClose }: ChatPanelProps) {
  const messages = useChatStore((s) => s.messages);
  const status = useChatStore((s) => s.status);
  const showAllMessages = useChatStore((s) => s.showAllMessages);
  const applyToAllDocuments = useChatStore((s) => s.applyToAllDocuments);
  const setShowAllMessages = useChatStore((s) => s.setShowAllMessages);
  const setApplyToAllDocuments = useChatStore((s) => s.setApplyToAllDocuments);
  const activeDocument = useProjectStore((s) => s.activeDocument());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isGenerating = status.state === 'generating';

  const visibleMessages = useMemo(
    () => messages.filter((message) => isMessageVisible(message, activeDocument?.id, showAllMessages)),
    [messages, activeDocument?.id, showAllMessages],
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visibleMessages, status]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close chat history"
        className="fixed inset-0 z-30 bg-background/70 backdrop-blur-sm lg:hidden"
        onClick={onClose}
      />

      <aside className="fixed inset-y-0 right-0 z-40 flex min-h-0 w-[min(24rem,calc(100vw-1rem))] flex-col overflow-hidden border-l border-border bg-background shadow-xl lg:static lg:z-auto lg:w-80 lg:shrink-0 lg:shadow-none xl:w-96">
        <div className="border-b border-border px-4 py-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-sm font-medium text-foreground">Chat History</h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {showAllMessages || !activeDocument
                  ? 'Showing all project context'
                  : `Scoped to ${activeDocument.title}`}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant={showAllMessages ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2 text-[11px]"
                onClick={() => setShowAllMessages(!showAllMessages)}
              >
                All chat
              </Button>
              <Button
                variant={applyToAllDocuments ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2 text-[11px]"
                onClick={() => setApplyToAllDocuments(!applyToAllDocuments)}
              >
                Multi-doc
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 rounded-md text-muted-foreground hover:text-foreground"
                onClick={onClose}
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          {visibleMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No messages in this scope yet. Start by typing a prompt below.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {visibleMessages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              {isGenerating && <AIWorkingIndicator />}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
      </aside>
    </>
  );
}
