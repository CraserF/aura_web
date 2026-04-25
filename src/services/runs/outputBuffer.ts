const outputBuffers = new Map<string, { summary: string; payload: Record<string, unknown> }>();

export function writeRunOutputBuffer(
  bufferId: string,
  summary: string,
  payload: Record<string, unknown>,
): void {
  outputBuffers.set(bufferId, { summary, payload });
}

export function readRunOutputBuffer(
  bufferId: string,
): { summary: string; payload: Record<string, unknown> } | null {
  return outputBuffers.get(bufferId) ?? null;
}

export function clearRunOutputBuffers(): void {
  outputBuffers.clear();
}
