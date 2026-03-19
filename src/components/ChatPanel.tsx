import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { ChatMessage } from './ChatMessage';
import { AIWorkingIndicator } from './AIWorkingIndicator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

interface ChatPanelProps {
  open: boolean;
  onClose: () => void;
}

export function ChatPanel({ open, onClose }: ChatPanelProps) {
  const messages = useChatStore((s) => s.messages);
  const status = useChatStore((s) => s.status);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isGenerating = status.state === 'generating';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);

  if (!open) return null;

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-border bg-background lg:w-96">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <h2 className="text-sm font-medium text-foreground">Chat History</h2>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 rounded-md text-muted-foreground hover:text-foreground"
          onClick={onClose}
        >
          <X className="size-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No messages yet. Start by typing a prompt below.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            {isGenerating && <AIWorkingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>
    </aside>
  );
}
