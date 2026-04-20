/**
 * Model factory — creates an AI SDK LanguageModel from provider config.
 * Also exports the AIMessage → ModelMessage converter used by agents.
 */

import type { LanguageModel, ModelMessage } from 'ai';
import type { AIMessage } from '../types';
import type { LLMConfig } from './types';
import { cleanMessages } from '../cleanMessage';

/**
 * Anthropic cache control marker — enables prompt caching on large, static
 * messages (system prompts, knowledge docs). Caching avoids re-processing
 * the same content on every request, reducing latency and API costs.
 *
 * Only takes effect when using an Anthropic model; silently ignored by
 * other providers.
 */
export const CACHE_CONTROL = {
  anthropic: { cacheControl: { type: 'ephemeral' } },
} as const;

/** Map our internal AIMessage format to AI SDK ModelMessage, preserving providerOptions.
 *  Messages that include image parts are converted to multi-part user messages.
 *  Output is sanitised via cleanMessages to strip API edge cases (orphaned reasoning
 *  parts, empty-string tool-call inputs) that cause hard errors. */
export function toModelMessages(messages: AIMessage[]): ModelMessage[] {
  const raw = messages.map((m): ModelMessage => {
    // Multi-modal message: user message with image attachments
    if (m.role === 'user' && m.images && m.images.length > 0) {
      const parts: NonNullable<ModelMessage & { role: 'user' }>['content'] = [
        { type: 'text' as const, text: m.content },
        ...m.images.map((img) => ({
          type: 'image' as const,
          image: img.image,
          mimeType: img.mimeType as `image/${string}`,
        })),
      ];
      return { role: 'user', content: parts } as ModelMessage;
    }

    return {
      role: m.role,
      content: m.content,
      ...(m.providerOptions && { providerOptions: m.providerOptions }),
    } as ModelMessage;
  });

  return cleanMessages(raw);
}

/** Create an AI SDK LanguageModel from provider config */
export async function createModel(config: LLMConfig): Promise<LanguageModel> {
  return config.providerEntry.createModel({
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    model: config.model,
  });
}
