import type { AIProvider } from './types';
import type { ProviderId } from '@/types';
import { OpenAIProvider } from './providers/openai';
import { GeminiProvider } from './providers/gemini';
import { AnthropicProvider } from './providers/anthropic';
import { OllamaProvider } from './providers/ollama';

const providers: Record<ProviderId, AIProvider> = {
  openai: new OpenAIProvider('openai', 'OpenAI'),
  deepseek: new OpenAIProvider('deepseek', 'DeepSeek'),
  gemini: new GeminiProvider(),
  anthropic: new AnthropicProvider(),
  ollama: new OllamaProvider(),
};

/** Get a provider adapter by ID */
export function getProvider(id: ProviderId): AIProvider {
  return providers[id];
}
