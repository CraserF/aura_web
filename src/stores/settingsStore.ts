import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProviderId, ProviderConfig } from '@/types';
import { normalizeOllamaHost, OLLAMA_DEFAULT_HOST } from '@/services/ai/ollama';

interface SettingsState {
  providerId: ProviderId;
  providers: Record<ProviderId, ProviderConfig>;
  showSettings: boolean;
  alwaysRunEvaluation: boolean;

  setProviderId: (id: ProviderId) => void;
  setApiKey: (providerId: ProviderId, apiKey: string) => void;
  setBaseUrl: (providerId: ProviderId, baseUrl: string) => void;
  setModel: (providerId: ProviderId, model: string) => void;
  setShowSettings: (show: boolean) => void;
  setAlwaysRunEvaluation: (enabled: boolean) => void;
  getActiveProvider: () => ProviderConfig;
  hasApiKey: () => boolean;
}

const defaultProviders: Record<ProviderId, ProviderConfig> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    apiKey: '',
    baseUrl: 'https://api.anthropic.com/v1',
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    apiKey: '',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    model: 'gemini-2.5-flash',
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    apiKey: '',
    baseUrl: 'https://api.deepseek.com/v1',
  },
  ollama: {
    id: 'ollama',
    name: 'Ollama',
    apiKey: 'ollama',
    baseUrl: OLLAMA_DEFAULT_HOST,
    model: '',
  },
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      providerId: 'openai',
      providers: defaultProviders,
      showSettings: false,
      alwaysRunEvaluation: true,

      setProviderId: (providerId) => set({ providerId }),

      setApiKey: (providerId, apiKey) =>
        set((state) => ({
          providers: {
            ...state.providers,
            [providerId]: { ...state.providers[providerId], apiKey },
          },
        })),

      setBaseUrl: (providerId, baseUrl) =>
        set((state) => ({
          providers: {
            ...state.providers,
            [providerId]: {
              ...state.providers[providerId],
              baseUrl: providerId === 'ollama' ? normalizeOllamaHost(baseUrl) : baseUrl,
            },
          },
        })),

      setModel: (providerId, model) =>
        set((state) => ({
          providers: {
            ...state.providers,
            [providerId]: { ...state.providers[providerId], model },
          },
        })),

      setShowSettings: (showSettings) => set({ showSettings }),

      setAlwaysRunEvaluation: (alwaysRunEvaluation) => set({ alwaysRunEvaluation }),

      getActiveProvider: () => {
        const state = get();
        return state.providers[state.providerId];
      },

      hasApiKey: () => {
        const state = get();
        // Ollama doesn't need an API key, but it does need a selected local model.
        if (state.providerId === 'ollama') {
          return !!state.providers.ollama.model?.trim();
        }
        return state.providers[state.providerId].apiKey.length > 0;
      },
    }),
    {
      name: 'aura-settings',
      version: 2,
      partialize: (state) => ({
        providerId: state.providerId,
        providers: state.providers,
        alwaysRunEvaluation: state.alwaysRunEvaluation,
      }),
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as Record<string, unknown>;
        const providers = {
          ...defaultProviders,
          ...(state.providers as Record<string, ProviderConfig> | undefined),
        } as Record<ProviderId, ProviderConfig>;

        if (version === 0) {
          // Migrate deprecated Gemini models to gemini-2.5-flash
          if (providers?.gemini) {
            const deprecated = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.0-pro'];
            if (!providers.gemini.model || deprecated.includes(providers.gemini.model)) {
              providers.gemini.model = 'gemini-2.5-flash';
            }
          }
        }

        providers.ollama = {
          ...defaultProviders.ollama,
          ...providers.ollama,
          apiKey: 'ollama',
          baseUrl: normalizeOllamaHost(providers.ollama.baseUrl),
          model: providers.ollama.model ?? '',
        };

        return {
          ...state,
          providers,
        };
      },
    },
  ),
);
