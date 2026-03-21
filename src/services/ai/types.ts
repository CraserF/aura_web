/**
 * Core AI types — message format and provider registry entry.
 *
 * ProviderEntry replaces the old AIProvider interface.
 * Instead of hand-rolled fetch/SSE adapters, each provider
 * creates a LanguageModelV1 instance via the Vercel AI SDK.
 */
import type { LanguageModelV1 } from 'ai';
import type { ProviderId } from '@/types';

/** Message format for AI conversations (compatible with AI SDK) */
export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
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
  /** Create a LanguageModelV1 instance from the given config */
  createModel: (config: ProviderModelConfig) => LanguageModelV1;
}
