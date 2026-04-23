export function summarizeContextValue(value: string | null | undefined): string {
  return value?.trim() ?? '';
}
