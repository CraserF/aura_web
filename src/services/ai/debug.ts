import type { ModelMessage } from 'ai';

/**
 * Lightweight debug helpers for AI workflow diagnostics.
 *
 * Debug mode is enabled only in local dev builds (import.meta.env.DEV).
 */
export function isAIDebugEnabled(): boolean {
  return !!import.meta.env.DEV;
}

export function aiDebugLog(scope: string, message: string, data?: unknown): void {
  if (!isAIDebugEnabled()) return;
  if (data !== undefined) {
    console.debug(`[AI:${scope}] ${message}`, data);
    return;
  }
  console.debug(`[AI:${scope}] ${message}`);
}

function contentToText(content: ModelMessage['content']): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';

  return content
    .map((part) => {
      if (typeof part === 'string') return part;
      if (part && typeof part === 'object' && 'text' in part && typeof part.text === 'string') {
        return part.text;
      }
      try {
        return JSON.stringify(part);
      } catch {
        return '';
      }
    })
    .join('\n');
}

function estimateTokens(charCount: number): number {
  return Math.max(1, Math.round(charCount / 4));
}

export function logPromptMetrics(
  scope: string,
  messages: ModelMessage[],
  extra?: Record<string, unknown>,
): void {
  if (!isAIDebugEnabled()) return;

  const perMessage = messages.map((message, index) => {
    const text = contentToText(message.content);
    const charCount = text.length;
    return {
      index,
      role: message.role,
      chars: charCount,
      estTokens: estimateTokens(charCount),
    };
  });

  const totalChars = perMessage.reduce((sum, entry) => sum + entry.chars, 0);

  aiDebugLog(scope, 'prompt metrics', {
    messageCount: messages.length,
    totalChars,
    estTokens: estimateTokens(totalChars),
    perMessage,
    ...extra,
  });
}

export function toErrorInfo(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    const maybeCause = (error as Error & { cause?: unknown }).cause;
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: maybeCause,
    };
  }

  return {
    message: String(error),
  };
}
