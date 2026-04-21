import React from 'react';
import { cn } from '@/lib/utils';
import type { ChatMessage as ChatMessageType } from '@/types';

function ChatMessage({
  message,
  onClarifySelect,
}: {
  message: ChatMessageType;
  onClarifySelect?: (optionValue: string) => void;
}) {
  const isUser = message.role === 'user';
  const isError = message.content.startsWith('Error:');

  return (
    <div
      className={cn('px-4 py-3 sm:px-6 animate-message-in', !isUser && 'bg-muted/40')}
    >
      <div className="mx-auto max-w-3xl">
        <p className="mb-1 text-xs text-muted-foreground">
          {isUser ? 'You' : 'Aura'}
        </p>

        {/* Attachment thumbnails */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {message.attachments.map((a) =>
              a.kind === 'image' ? (
                <img
                  key={a.id}
                  src={a.content}
                  alt={a.name}
                  className="max-h-32 max-w-[180px] rounded-lg border border-border/40 object-cover"
                />
              ) : (
                <span
                  key={a.id}
                  className="inline-flex items-center gap-1 rounded-md border border-border/40 bg-muted/60 px-2 py-1 text-[11px] text-muted-foreground"
                >
                  📄 {a.name}
                </span>
              ),
            )}
          </div>
        )}

        <p
          className={cn(
            'text-sm whitespace-pre-wrap break-words leading-relaxed',
            isError ? 'text-destructive' : 'text-foreground',
          )}
        >
          {message.content}
        </p>

        {/* Clarifying question options */}
        {message.clarifyOptions && message.clarifyOptions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.clarifyOptions.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => onClarifySelect?.(opt.value)}
                className="rounded-lg border border-border/60 bg-background px-3 py-1.5 text-xs text-foreground transition-colors hover:border-foreground/30 hover:bg-muted active:scale-[0.97]"
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(ChatMessage);
