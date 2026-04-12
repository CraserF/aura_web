/**
 * AI Provider Registry — Maps ProviderId to AI SDK model factories.
 *
 * Each provider adapter is imported only when that provider is actually used,
 * keeping the initial app payload much smaller.
 */
import type { ProviderId } from '@/types';
import type { ProviderEntry, ProviderModelConfig } from './types';
import { toOllamaOpenAIBaseUrl } from './ollama';

const providers: Record<ProviderId, ProviderEntry> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    defaultModel: 'gpt-4o',
    createModel: async (config: ProviderModelConfig) => {
      const { createOpenAI } = await import('@ai-sdk/openai');
      return createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl || 'https://api.openai.com/v1',
      })(config.model || 'gpt-4o');
    },
  },

  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    defaultModel: 'claude-sonnet-4-20250514',
    createModel: async (config: ProviderModelConfig) => {
      const { createAnthropic } = await import('@ai-sdk/anthropic');
      return createAnthropic({
        apiKey: config.apiKey,
        headers: {
          'anthropic-dangerous-direct-browser-access': 'true',
        },
      })(config.model || 'claude-sonnet-4-20250514');
    },
  },

  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    defaultModel: 'gemini-2.5-flash',
    createModel: async (config: ProviderModelConfig) => {
      const { createGoogleGenerativeAI } = await import('@ai-sdk/google');
      return createGoogleGenerativeAI({
        apiKey: config.apiKey,
      })(config.model || 'gemini-2.5-flash');
    },
  },

  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    defaultModel: 'deepseek-chat',
    createModel: async (config: ProviderModelConfig) => {
      const { createOpenAI } = await import('@ai-sdk/openai');
      return createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl || 'https://api.deepseek.com/v1',
      })(config.model || 'deepseek-chat');
    },
  },

  ollama: {
    id: 'ollama',
    name: 'Ollama',
    defaultModel: 'llama3.1',
    createModel: async (config: ProviderModelConfig) => {
      const { createOpenAI } = await import('@ai-sdk/openai');
      const provider = createOpenAI({
        apiKey: config.apiKey || 'ollama',
        baseURL: toOllamaOpenAIBaseUrl(config.baseUrl),
      });

      // Ollama's /v1/responses compatibility is incomplete for some input item
      // types (for example item_reference). Use chat/completions explicitly.
      return provider.chat(config.model || 'llama3.1');
    },
  },
};

/** Get a provider entry by ID */
export function getProviderEntry(id: ProviderId): ProviderEntry {
  return providers[id];
}
