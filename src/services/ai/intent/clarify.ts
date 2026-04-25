import { detectAmbiguity } from '@/services/ai/validation';
import type { IntentClarification } from '@/services/ai/intent/types';

export function buildIntentClarification(prompt: string): IntentClarification | null {
  const options = detectAmbiguity(prompt);
  if (!options) {
    return null;
  }

  return {
    required: true,
    question: 'Quick question — which layout style works best for this?',
    options,
  };
}
