import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProviderId, ProviderConfig } from '@/types';

interface SettingsState {
  providerId: ProviderId;
  providers: Record<ProviderId, ProviderConfig>;
  showSettings: boolean;

  setProviderId: (id: ProviderId) => void;
  setApiKey: (providerId: ProviderId, apiKey: string) => void;
  setBaseUrl: (providerId: ProviderId, baseUrl: string) => void;
  setModel: (providerId: ProviderId, model: string) => void;
  setShowSettings: (show: boolean) => void;
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
    model: 'gemini-2.0-flash',
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
    baseUrl: 'http://localhost:11434/v1',
  },
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      providerId: 'openai',
      providers: defaultProviders,
      showSettings: false,

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
            [providerId]: { ...state.providers[providerId], baseUrl },
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

      getActiveProvider: () => {
        const state = get();
        return state.providers[state.providerId];
      },

      hasApiKey: () => {
        const state = get();
        // Ollama doesn't need an API key
        if (state.providerId === 'ollama') return true;
        return state.providers[state.providerId].apiKey.length > 0;
      },
    }),
    {
      name: 'aura-settings',
      partialize: (state) => ({
        providerId: state.providerId,
        providers: state.providers,
      }),
    },
  ),
);
