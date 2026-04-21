/**
 * M4.8 — fallbackModel / withRetry unit tests
 *
 * Tests the exponential backoff retry wrapper for retryable AI API errors
 * (429 rate-limit, 500-504 server errors, "overloaded" messages).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withRetry } from '@/services/ai/fallbackModel';

// Speed up tests by mocking setTimeout
vi.useFakeTimers();

async function tick() {
  await Promise.resolve();
  vi.runAllTimers();
  await Promise.resolve();
}

// ── helpers ───────────────────────────────────────────────────────────────────

function makeStatusError(status: number): Error & { status: number } {
  const err = new Error(`HTTP ${status}`) as Error & { status: number };
  err.status = status;
  return err;
}

function makeMessageError(msg: string): Error {
  return new Error(msg);
}

// ── success path ──────────────────────────────────────────────────────────────

describe('withRetry — success path', () => {
  it('returns the result immediately on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    await expect(withRetry(fn)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

// ── retryable errors ──────────────────────────────────────────────────────────

describe('withRetry — retryable errors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retries on 429 and succeeds on second attempt', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(makeStatusError(429))
      .mockResolvedValue('retried');

    const promise = withRetry(fn, { maxAttempts: 3, baseDelayMs: 10 });
    await tick();
    await expect(promise).resolves.toBe('retried');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries on 503 service unavailable', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(makeStatusError(503))
      .mockResolvedValue('ok');

    const promise = withRetry(fn, { maxAttempts: 3, baseDelayMs: 10 });
    await tick();
    await expect(promise).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries on "overloaded" message', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(makeMessageError('model is overloaded'))
      .mockResolvedValue('ok');

    const promise = withRetry(fn, { maxAttempts: 3, baseDelayMs: 10 });
    await tick();
    await expect(promise).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries on "rate limit" message', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(makeMessageError('rate limit exceeded'))
      .mockResolvedValue('ok');

    const promise = withRetry(fn, { maxAttempts: 3, baseDelayMs: 10 });
    await tick();
    await expect(promise).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws after exhausting maxAttempts', async () => {
    const err = makeStatusError(429);
    const fn = vi.fn().mockRejectedValue(err);

    const promise = withRetry(fn, { maxAttempts: 3, baseDelayMs: 10 });
    await tick();
    await tick();
    await expect(promise).rejects.toThrow('HTTP 429');
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

// ── non-retryable errors ──────────────────────────────────────────────────────

describe('withRetry — non-retryable errors', () => {
  it('does not retry on a 400 bad request error', async () => {
    const fn = vi.fn().mockRejectedValue(makeStatusError(400));
    await expect(withRetry(fn)).rejects.toThrow('HTTP 400');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does not retry on a 401 unauthorised error', async () => {
    const fn = vi.fn().mockRejectedValue(makeStatusError(401));
    await expect(withRetry(fn)).rejects.toThrow('HTTP 401');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does not retry on a 404 not found error', async () => {
    const fn = vi.fn().mockRejectedValue(makeStatusError(404));
    await expect(withRetry(fn)).rejects.toThrow('HTTP 404');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does not retry on an unrelated error message', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('context length exceeded'));
    await expect(withRetry(fn)).rejects.toThrow('context length exceeded');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
