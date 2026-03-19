// ============================================
// Aura — Shared TypeScript Types
// ============================================

/** Unique identifier type */
export type SlideId = string;

/** A single chat message */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

/** AI generation status */
export type GenerationStatus =
  | { state: 'idle' }
  | { state: 'generating'; startedAt: number }
  | { state: 'error'; message: string };

/** Supported AI providers */
export type ProviderId = 'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'ollama';

/** Per-provider configuration */
export interface ProviderConfig {
  id: ProviderId;
  name: string;
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

/** The full presentation state that gets persisted */
export interface PresentationData {
  title: string;
  slidesHtml: string;
  themeCss: string;
  chatHistory: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

/** Manifest inside .aura zip */
export interface AuraManifest {
  version: string;
  title: string;
  slideCount: number;
  createdAt: number;
  updatedAt: number;
}

/** Settings persisted to localStorage */
export interface AppSettings {
  providerId: ProviderId;
  providers: Record<ProviderId, ProviderConfig>;
}

/** Provider option for the settings UI */
export interface ProviderOption {
  id: ProviderId;
  name: string;
  description: string;
  defaultBaseUrl: string;
}

export const PROVIDER_OPTIONS: ProviderOption[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4o, GPT-4.1, o3-mini',
    defaultBaseUrl: 'https://api.openai.com/v1',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude Sonnet 4, Opus 4',
    defaultBaseUrl: 'https://api.anthropic.com/v1',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Gemini 2.5 Flash, Pro',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    description: 'DeepSeek-V3, R1',
    defaultBaseUrl: 'https://api.deepseek.com/v1',
  },
  {
    id: 'ollama',
    name: 'Ollama',
    description: 'Local models — no API key needed',
    defaultBaseUrl: 'http://localhost:11434/v1',
  },
];
