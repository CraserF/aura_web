import { cn } from '@/lib/utils';
import type { ChatMessage as ChatMessageType } from '@/types';

export function ChatMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === 'user';
  const isError = message.content.startsWith('Error:');

  return (
    <div className={cn('px-4 py-3 sm:px-6', !isUser && 'bg-muted/40')}>
      <div className="mx-auto max-w-3xl">
        <p className="mb-1 text-xs text-muted-foreground">
          {isUser ? 'You' : 'Aura'}
        </p>
        <p
          className={cn(
            'text-sm whitespace-pre-wrap break-words leading-relaxed',
            isError ? 'text-destructive' : 'text-foreground',
          )}
        >
          {message.content}
        </p>
      </div>
    </div>
  );
}
