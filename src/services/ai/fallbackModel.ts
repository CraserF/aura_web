/**
 * Retry wrapper for AI SDK calls.
 * On retryable errors (429, 500-504, "overloaded"), waits with exponential
 * backoff and retries up to maxAttempts before re-throwing.
 */

const RETRYABLE_STATUS = new Set([408, 429, 500, 501, 502, 503, 504]);
const RETRYABLE_MESSAGES = ['overloaded', 'rate limit', 'too many requests', 'service unavailable'];

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (RETRYABLE_MESSAGES.some((m) => msg.includes(m))) return true;
  }
  // Check for HTTP status code on error object
  const err = error as Record<string, unknown>;
  const status =
    typeof err['status'] === 'number'
      ? err['status']
      : typeof err['statusCode'] === 'number'
        ? err['statusCode']
        : null;
  return status !== null && RETRYABLE_STATUS.has(status);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wrap an async AI call with exponential backoff retry on retryable errors.
 *
 * @example
 * const result = await withRetry(() => generateText({ model, ... }));
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 1000 } = options;

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isRetryableError(err) || attempt === maxAttempts) throw err;

      const backoffMs = baseDelayMs * Math.pow(2, attempt - 1);
      console.warn(`[AI] Attempt ${attempt} failed (retryable). Retrying in ${backoffMs}ms...`, err);
      await delay(backoffMs);
    }
  }
  throw lastError;
}
