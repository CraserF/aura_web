/**
 * AI SDK middleware — model wrapper for cross-cutting concerns.
 * Settings (temperature, maxOutputTokens) are applied per-call in each agent.
 */

import type { LanguageModel } from 'ai';

/**
 * Identity wrapper — returns the model unchanged.
 * Temperature and token limits are specified per-call in each agent/generateText.
 */
export function withDefaults(model: LanguageModel): LanguageModel {
  return model;
}
