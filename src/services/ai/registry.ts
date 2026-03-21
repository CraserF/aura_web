/**
 * AI Provider Registry — Maps ProviderId to AI SDK model factories.
 *
 * Each provider creates LanguageModelV1 instances on demand via
 * Vercel AI SDK factories. No more hand-rolled fetch/SSE parsing.
 */
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { ProviderId } from '@/types';
import type { ProviderEntry, ProviderModelConfig } from './types';

const providers: Record<ProviderId, ProviderEntry> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    defaultModel: 'gpt-4o',
    createModel: (config: ProviderModelConfig) =>
      createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl || 'https://api.openai.com/v1',
      })(config.model || 'gpt-4o'),
  },

  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    defaultModel: 'claude-sonnet-4-20250514',
    createModel: (config: ProviderModelConfig) =>
      createAnthropic({
        apiKey: config.apiKey,
        headers: {
          'anthropic-dangerous-direct-browser-access': 'true',
        },
      })(config.model || 'claude-sonnet-4-20250514'),
  },

  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    defaultModel: 'gemini-2.5-flash',
    createModel: (config: ProviderModelConfig) =>
      createGoogleGenerativeAI({
        apiKey: config.apiKey,
      })(config.model || 'gemini-2.5-flash'),
  },

  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    defaultModel: 'deepseek-chat',
    createModel: (config: ProviderModelConfig) =>
      createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl || 'https://api.deepseek.com/v1',
      })(config.model || 'deepseek-chat'),
  },

  ollama: {
    id: 'ollama',
    name: 'Ollama',
    defaultModel: 'llama3.1',
    createModel: (config: ProviderModelConfig) =>
      createOpenAI({
        apiKey: config.apiKey || 'ollama',
        baseURL: config.baseUrl || 'http://localhost:11434/v1',
      })(config.model || 'llama3.1'),
  },
};

/** Get a provider entry by ID */
export function getProviderEntry(id: ProviderId): ProviderEntry {
  return providers[id];
}
