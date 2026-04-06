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
