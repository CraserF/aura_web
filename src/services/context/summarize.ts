export function summarizeContextValue(value: string | null | undefined): string {
  return value?.trim() ?? '';
}

export function summarizeForDetailLevel(
  value: string | null | undefined,
  detailLevel: 'full' | 'overview' | 'compact',
): string {
  const text = summarizeContextValue(value);
  if (!text) return '';

  if (detailLevel === 'compact') {
    return text.slice(0, 180);
  }
  if (detailLevel === 'overview') {
    return text.slice(0, 420);
  }
  return text;
}

export function stripHtmlToText(value: string | null | undefined): string {
  return summarizeContextValue(value)
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
