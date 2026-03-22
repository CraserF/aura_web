/**
 * Core AI types — message format and provider registry entry.
 *
 * ProviderEntry replaces the old AIProvider interface.
 * Instead of hand-rolled fetch/SSE adapters, each provider
 * creates a LanguageModel instance via the Vercel AI SDK.
 */
import type { LanguageModel } from 'ai';
import type { ProviderId } from '@/types';

/** Message format for AI conversations (compatible with AI SDK ModelMessage) */
export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  /** Provider-specific options (e.g., Anthropic prompt caching). Passed through to AI SDK. */
  providerOptions?: Record<string, Record<string, unknown>>;
}

/** Configuration needed to create an AI SDK model */
export interface ProviderModelConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

/** Registry entry for a provider — creates AI SDK model instances on demand */
export interface ProviderEntry {
  id: ProviderId;
  name: string;
  defaultModel: string;
  /** Create a LanguageModel instance from the given config */
  createModel: (config: ProviderModelConfig) => LanguageModel;
}
