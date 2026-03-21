/**
 * AI SDK Provider Adapter — Maps Aura's ProviderConfig to AI SDK model instances.
 *
 * Used specifically for structured output calls (generateObject/generateText with output).
 * The existing raw fetch providers are kept for streaming HTML generation.
 */
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { LanguageModel } from 'ai';
import type { ProviderId } from '@/types';

/** Default models per provider when none is specified */
const DEFAULT_MODELS: Record<ProviderId, string> = {
  openai: 'gpt-4o',
  anthropic: 'claude-sonnet-4-20250514',
  gemini: 'gemini-2.5-flash',
  deepseek: 'deepseek-chat',
  ollama: 'llama3.1',
};

/**
 * Create an AI SDK LanguageModel instance from Aura's provider configuration.
 * This is used for structured output (Zod-validated JSON responses) only.
 */
export function getAiSdkModel(
  providerId: ProviderId,
  config: { apiKey: string; baseUrl?: string; model?: string },
): LanguageModel {
  const model = config.model || DEFAULT_MODELS[providerId];

  switch (providerId) {
    case 'openai':
      return createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl || 'https://api.openai.com/v1',
      })(model);

    case 'anthropic':
      return createAnthropic({
        apiKey: config.apiKey,
        headers: {
          'anthropic-dangerous-direct-browser-access': 'true',
        },
      })(model);

    case 'gemini':
      return createGoogleGenerativeAI({
        apiKey: config.apiKey,
      })(model);

    case 'deepseek':
      return createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl || 'https://api.deepseek.com/v1',
      })(model);

    case 'ollama':
      return createOpenAI({
        apiKey: config.apiKey || 'ollama',
        baseURL: config.baseUrl || 'http://localhost:11434/v1',
      })(model);
  }
}
