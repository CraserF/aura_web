/**
 * Model factory — creates an AI SDK LanguageModel from provider config.
 * Also exports the AIMessage → ModelMessage converter used by agents.
 */

import type { LanguageModel, ModelMessage } from 'ai';
import type { AIMessage } from '../types';
import type { LLMConfig } from './types';

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

/** Map our internal AIMessage format to AI SDK ModelMessage, preserving providerOptions */
export function toModelMessages(messages: AIMessage[]): ModelMessage[] {
  return messages.map((m): ModelMessage => ({
    role: m.role,
    content: m.content,
    ...(m.providerOptions && { providerOptions: m.providerOptions }),
  }) as ModelMessage);
}

/** Create an AI SDK LanguageModel from provider config */
export async function createModel(config: LLMConfig): Promise<LanguageModel> {
  return config.providerEntry.createModel({
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    model: config.model,
  });
}
