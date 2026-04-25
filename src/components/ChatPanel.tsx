import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { RotateCcw, X } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { useProjectStore } from '@/stores/projectStore';
import ChatMessage from './ChatMessage';
import { AIWorkingIndicator } from './AIWorkingIndicator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { isMessageInChatScope } from '@/services/chat/routing';

interface ChatPanelProps {
  open: boolean;
  onClose: () => void;
}

export function ChatPanel({ open, onClose }: ChatPanelProps) {
  const messages = useChatStore((s) => s.messages);
  const status = useChatStore((s) => s.status);
  const showAllMessages = useChatStore((s) => s.showAllMessages);
  const applyToAllDocuments = useChatStore((s) => s.applyToAllDocuments);
  const setShowAllMessages = useChatStore((s) => s.setShowAllMessages);
  const setApplyToAllDocuments = useChatStore((s) => s.setApplyToAllDocuments);
  const isContextLong = useChatStore((s) => s.isContextLong);
  const setPendingRetryPrompt = useChatStore((s) => s.setPendingRetryPrompt);
  const setPendingAutoSubmitPrompt = useChatStore((s) => s.setPendingAutoSubmitPrompt);
  const activeDocument = useProjectStore((s) => s.activeDocument());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isGenerating = status.state === 'generating';

  // Track whether to show the post-generation action bar
  const [showRetryBar, setShowRetryBar] = useState(false);
  const prevGeneratingRef = useRef(false);

  const visibleMessages = useMemo(
    () => messages.filter((message) => isMessageInChatScope(message, activeDocument?.id, showAllMessages)),
    [messages, activeDocument?.id, showAllMessages],
  );

  // Detect transition from generating → idle to show retry bar
  useEffect(() => {
    if (prevGeneratingRef.current && !isGenerating) {
      setShowRetryBar(true);
    }
    prevGeneratingRef.current = isGenerating;
  }, [isGenerating]);

  // Hide retry bar when a new message arrives
  useEffect(() => {
    setShowRetryBar(false);
  }, [messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visibleMessages, status]);

  // Find the last user message prompt for retry
  const lastUserPrompt = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg?.role === 'user' && msg.content) return msg.content;
    }
    return null;
  }, [messages]);

  const handleRetry = () => {
    if (!lastUserPrompt) return;
    setShowRetryBar(false);
    setPendingRetryPrompt(lastUserPrompt);
  };

  // When the user clicks a clarifying option, enrich the last user prompt and auto-submit
  const handleClarifySelect = useCallback(
    (optionValue: string) => {
      let lastUser: (typeof messages)[number] | null = null;
      for (let index = messages.length - 1; index >= 0; index -= 1) {
        const message = messages[index];
        if (message?.role === 'user') {
          lastUser = message;
          break;
        }
      }
      const base = lastUser?.content ?? '';
      const enriched = optionValue ? `${base}\n\n${optionValue}` : base;
      setPendingAutoSubmitPrompt(enriched);
    },
    [messages, setPendingAutoSubmitPrompt],
  );

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close chat history"
        className="fixed inset-0 z-30 bg-background/70 backdrop-blur-sm lg:hidden"
        onClick={onClose}
      />

      <aside className="fixed inset-y-0 right-0 z-40 flex min-h-0 w-[min(24rem,calc(100vw-1rem))] flex-col overflow-hidden border-l border-border bg-background shadow-xl lg:static lg:inset-auto lg:z-auto lg:h-full lg:w-full lg:shadow-none">
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

        {isContextLong() && (
          <div className="px-3 py-1.5 text-xs text-muted-foreground bg-muted/50 border-b border-border flex items-center gap-1.5">
            <span>⚠</span>
            <span>Conversation is getting long — older context may be summarised.</span>
          </div>
        )}

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
                <ChatMessage key={msg.id} message={msg} onClarifySelect={handleClarifySelect} />
              ))}
              {isGenerating && <AIWorkingIndicator />}
              {showRetryBar && !isGenerating && lastUserPrompt && (
                <div className="flex items-center gap-2 px-4 py-2 sm:px-6 animate-message-in">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 rounded-md px-2 text-xs text-muted-foreground hover:text-foreground"
                    onClick={handleRetry}
                  >
                    <RotateCcw className="size-3" />
                    Retry
                  </Button>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
      </aside>
    </>
  );
}
