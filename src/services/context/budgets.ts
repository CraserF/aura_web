import { estimateTextTokens } from '@/services/ai/debug';

export function estimateContextTokens(parts: Array<string | null | undefined>): number {
  return parts.reduce((total, part) => total + estimateTextTokens(part ?? ''), 0);
}
