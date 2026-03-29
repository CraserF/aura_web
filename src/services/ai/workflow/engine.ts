/**
 * Model factory — creates an AI SDK LanguageModel from provider config.
 * Also exports the AIMessage → ModelMessage converter used by agents.
 */

import type { LanguageModel, ModelMessage } from 'ai';
import type { AIMessage } from '../types';
import type { LLMConfig } from './types';

/** Map our internal AIMessage format to AI SDK ModelMessage, preserving providerOptions */
export function toModelMessages(messages: AIMessage[]): ModelMessage[] {
  return messages.map((m): ModelMessage => ({
    role: m.role,
    content: m.content,
    ...(m.providerOptions && { providerOptions: m.providerOptions }),
  }) as ModelMessage);
}

/** Create an AI SDK LanguageModel from provider config */
export function createModel(config: LLMConfig): LanguageModel {
  return config.providerEntry.createModel({
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    model: config.model,
  });
}
