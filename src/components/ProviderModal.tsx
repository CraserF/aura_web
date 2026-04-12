import { useState, useEffect, useRef } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import type { ProviderConfig } from '@/types';
import { PROVIDER_OPTIONS as OPTIONS } from '@/types';
import {
  fetchOllamaModels,
  normalizeOllamaHost,
  OLLAMA_DEFAULT_HOST,
  type OllamaModelOption,
} from '@/services/ai/ollama';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Check, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Fetch models from the Gemini ListModels API that support generateContent */
const GEMINI_LISTMODELS_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

/** Models that are deprecated / unavailable for new API keys */
const DEPRECATED_GEMINI_MODELS = new Set([
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-1.5-pro',
  'gemini-1.0-pro',
  'gemini-1.0-pro-001',
  'gemini-1.0-pro-latest',
  'gemini-1.0-pro-vision-latest',
  'gemini-pro',
  'gemini-pro-vision',
]);

async function fetchGeminiModels(
  apiKey: string,
): Promise<Array<{ id: string; name: string }>> {
  const url = `${GEMINI_LISTMODELS_URL}?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`ListModels failed: ${res.status}`);
  }
  const data = await res.json() as {
    models?: Array<{
      name: string;
      displayName?: string;
      supportedGenerationMethods?: string[];
    }>;
  };

  return (data.models ?? [])
    .filter((m) => m.supportedGenerationMethods?.includes('streamGenerateContent'))
    .filter((m) => /^models\/gemini-/.test(m.name))
    .map((m) => ({
      id: m.name.replace(/^models\//, ''),
      name: m.displayName ?? m.name.replace(/^models\//, ''),
    }))
    // Exclude deprecated models that return 404 for new API keys
    .filter((m) => !DEPRECATED_GEMINI_MODELS.has(m.id))
    .sort((a, b) => a.name.localeCompare(b.name));
}

const GEMINI_FALLBACK_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
];

export function ProviderModal() {
  const showSettings = useSettingsStore((s) => s.showSettings);
  const setShowSettings = useSettingsStore((s) => s.setShowSettings);
  const providerId = useSettingsStore((s) => s.providerId);
  const setProviderId = useSettingsStore((s) => s.setProviderId);
  const providers = useSettingsStore((s) => s.providers);
  const setApiKey = useSettingsStore((s) => s.setApiKey);
  const setBaseUrl = useSettingsStore((s) => s.setBaseUrl);
  const setModel = useSettingsStore((s) => s.setModel);
  const alwaysRunEvaluation = useSettingsStore((s) => s.alwaysRunEvaluation);
  const setAlwaysRunEvaluation = useSettingsStore((s) => s.setAlwaysRunEvaluation);

  return (
    <Dialog open={showSettings} onOpenChange={setShowSettings}>
      <DialogContent className="max-h-[calc(100vh-1rem)] w-[calc(100%-1rem)] overflow-hidden p-0 sm:max-h-[90vh] sm:max-w-lg">
        <div className="flex max-h-[calc(100vh-1rem)] flex-col sm:max-h-[90vh]">
          <DialogHeader className="pr-8 px-4 pt-4 sm:px-6 sm:pt-6">
            <DialogTitle>AI Provider</DialogTitle>
            <DialogDescription>
              Choose a provider and enter your API key. Keys are stored locally.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 space-y-5 overflow-y-auto px-4 pb-4 sm:px-6 sm:pb-6">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setProviderId(opt.id)}
                className={cn(
                  'relative flex items-start gap-3 rounded-lg border px-3.5 py-3 text-left transition-colors',
                  providerId === opt.id
                    ? 'border-foreground/30 bg-muted'
                    : 'border-border hover:border-foreground/15 hover:bg-muted/60',
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{opt.name}</p>
                  <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{opt.description}</p>
                </div>
                {providerId === opt.id && (
                  <Check className="mt-0.5 size-3.5 shrink-0 text-foreground" />
                )}
              </button>
            ))}
          </div>

          <ProviderConfigForm
            config={providers[providerId]}
            onApiKeyChange={(key) => setApiKey(providerId, key)}
            onBaseUrlChange={(url) => setBaseUrl(providerId, url)}
            onModelChange={(model) => setModel(providerId, model)}
          />

          <div className="rounded-lg border border-border px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">Always Run Evaluation</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Run an independent LLM quality check after every generation. When off, evaluation only runs if programmatic QA fails.
                </p>
              </div>
              <button
                type="button"
                aria-label={`Always run evaluation: ${alwaysRunEvaluation ? 'enabled' : 'disabled'}`}
                title={`Always run evaluation: ${alwaysRunEvaluation ? 'enabled' : 'disabled'}`}
                onClick={() => setAlwaysRunEvaluation(!alwaysRunEvaluation)}
                className={cn(
                  'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  alwaysRunEvaluation ? 'bg-foreground' : 'bg-input',
                )}
              >
                <span
                  className={cn(
                    'pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg transition-transform',
                    alwaysRunEvaluation ? 'translate-x-4' : 'translate-x-0',
                  )}
                />
              </button>
            </div>
          </div>
          </div>

          <DialogFooter className="border-t border-border px-4 py-3 sm:px-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(false)}
          >
            Done
          </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProviderConfigForm({
  config,
  onApiKeyChange,
  onBaseUrlChange,
  onModelChange,
}: {
  config: ProviderConfig;
  onApiKeyChange: (key: string) => void;
  onBaseUrlChange: (url: string) => void;
  onModelChange: (model: string) => void;
}) {
  const [showKey, setShowKey] = useState(false);
  const [geminiModels, setGeminiModels] = useState<Array<{ id: string; name: string }>>(GEMINI_FALLBACK_MODELS);
  const [ollamaModels, setOllamaModels] = useState<OllamaModelOption[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [modelFetchError, setModelFetchError] = useState<string | null>(null);
  const fetchedForKey = useRef<string | null>(null);
  const fetchedForOllamaHost = useRef<string | null>(null);

  const isOllama = config.id === 'ollama';
  const isGemini = config.id === 'gemini';

  const mergeCurrentOllamaModel = (models: OllamaModelOption[]): OllamaModelOption[] => {
    if (!config.model || models.some((model) => model.id === config.model)) {
      return models;
    }

    return [{ id: config.model, name: config.model, meta: 'Saved selection' }, ...models];
  };

  // Auto-fetch Gemini models whenever the user has a key
  useEffect(() => {
    if (!isGemini || !config.apiKey || fetchedForKey.current === config.apiKey) return;

    setIsFetchingModels(true);
    setModelFetchError(null);

    fetchGeminiModels(config.apiKey)
      .then((models) => {
        if (models.length > 0) {
          setGeminiModels(models);
          fetchedForKey.current = config.apiKey;
          // Auto-select first model if current selection isn't in the list
          if (!models.find((m) => m.id === config.model) && models[0]) {
            onModelChange(models[0].id);
          }
        }
      })
      .catch((err: Error) => {
        setModelFetchError(`Could not fetch models: ${err.message}. Showing defaults.`);
      })
      .finally(() => setIsFetchingModels(false));
  }, [isGemini, config.apiKey, config.baseUrl]);

  useEffect(() => {
    if (!isOllama) return;

    const normalizedHost = normalizeOllamaHost(config.baseUrl);
    if (fetchedForOllamaHost.current === normalizedHost) return;

    setIsFetchingModels(true);
    setModelFetchError(null);

    fetchOllamaModels(normalizedHost)
      .then((models) => {
        const nextModels = mergeCurrentOllamaModel(models);
        setOllamaModels(nextModels);
        fetchedForOllamaHost.current = normalizedHost;

        const firstNextModel = nextModels[0];
        if (!config.model && firstNextModel) {
          onModelChange(firstNextModel.id);
        }

        const firstModel = models[0];
        if (config.model && models.length > 0 && firstModel && !models.find((model) => model.id === config.model)) {
          onModelChange(firstModel.id);
        }
      })
      .catch((err: Error) => {
        setOllamaModels(mergeCurrentOllamaModel([]));
        setModelFetchError(`Could not load local Ollama models: ${err.message}`);
      })
      .finally(() => setIsFetchingModels(false));
  }, [isOllama, config.baseUrl, config.model]);

  const handleRefreshModels = () => {
    if (isOllama) {
      const normalizedHost = normalizeOllamaHost(config.baseUrl);
      fetchedForOllamaHost.current = null;
      setIsFetchingModels(true);
      setModelFetchError(null);

      fetchOllamaModels(normalizedHost)
        .then((models) => {
          const nextModels = mergeCurrentOllamaModel(models);
          setOllamaModels(nextModels);
          fetchedForOllamaHost.current = normalizedHost;

          const firstNextModel = nextModels[0];
          if (!config.model && firstNextModel) {
            onModelChange(firstNextModel.id);
          }

          const firstModel = models[0];
          if (config.model && models.length > 0 && firstModel && !models.find((model) => model.id === config.model)) {
            onModelChange(firstModel.id);
          }
        })
        .catch((err: Error) => {
          setOllamaModels(mergeCurrentOllamaModel([]));
          setModelFetchError(`Could not load local Ollama models: ${err.message}`);
        })
        .finally(() => setIsFetchingModels(false));
      return;
    }

    fetchedForKey.current = null;
    setIsFetchingModels(true);
    setModelFetchError(null);
    fetchGeminiModels(config.apiKey)
      .then((models) => {
        if (models.length > 0) {
          setGeminiModels(models);
          fetchedForKey.current = config.apiKey;
          if (!models.find((m) => m.id === config.model) && models[0]) {
            onModelChange(models[0].id);
          }
        }
      })
      .catch((err: Error) => setModelFetchError(`Could not fetch models: ${err.message}. Showing defaults.`))
      .finally(() => setIsFetchingModels(false));
  };

  return (
    <div className="space-y-4">
      {isOllama ? (
        <div className="rounded-lg bg-muted/60 px-4 py-3">
          <p className="text-sm text-foreground font-medium">Local model</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            No API key needed. Aura will connect to your Ollama host, list installed models, and use the one you select.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="api-key" className="text-sm">API Key</Label>
          <div className="relative">
            <Input
              id="api-key"
              type={showKey ? 'text' : 'password'}
              value={config.apiKey}
              onChange={(e) => onApiKeyChange(e.target.value)}
              placeholder={`Enter your ${config.name} API key`}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 size-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </Button>
          </div>
          {config.apiKey && (
            <p className="flex items-center gap-1.5 text-xs text-emerald-600">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Key configured
            </p>
          )}
        </div>
      )}

      {isOllama && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="ollama-model-select" className="text-sm">Model</Label>
            <button
              type="button"
              onClick={handleRefreshModels}
              disabled={isFetchingModels}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <RefreshCw className={cn('size-3', isFetchingModels && 'animate-spin')} />
              {isFetchingModels ? 'Checking…' : 'Refresh'}
            </button>
          </div>
          <select
            id="ollama-model-select"
            value={config.model ?? ''}
            onChange={(e) => onModelChange(e.target.value)}
            disabled={isFetchingModels || ollamaModels.length === 0}
            aria-label="Select Ollama model"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            {ollamaModels.length === 0 ? (
              <option value="" className="bg-background">
                No models found
              </option>
            ) : (
              ollamaModels.map((model) => (
                <option key={model.id} value={model.id} className="bg-background">
                  {model.meta ? `${model.name} (${model.meta})` : model.name}
                </option>
              ))
            )}
          </select>
          {modelFetchError && (
            <p className="text-xs text-amber-600">{modelFetchError}</p>
          )}
          {!modelFetchError && ollamaModels.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Connected to {normalizeOllamaHost(config.baseUrl) || OLLAMA_DEFAULT_HOST}.
            </p>
          )}
          {!modelFetchError && ollamaModels.length === 0 && !isFetchingModels && (
            <p className="text-xs text-muted-foreground">
              No local models were returned by Ollama. Pull a model first, then refresh.
            </p>
          )}
        </div>
      )}

      {isGemini && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="model-select" className="text-sm">Model</Label>
            {config.apiKey && (
              <button
                type="button"
                onClick={handleRefreshModels}
                disabled={isFetchingModels}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                <RefreshCw className={cn('size-3', isFetchingModels && 'animate-spin')} />
                {isFetchingModels ? 'Fetching…' : 'Refresh'}
              </button>
            )}
          </div>
          <select
            id="model-select"
            value={config.model ?? geminiModels[0]?.id ?? ''}
            onChange={(e) => onModelChange(e.target.value)}
            disabled={isFetchingModels}
            aria-label="Select Gemini model"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            {geminiModels.map((m) => (
              <option key={m.id} value={m.id} className="bg-background">
                {m.name}
              </option>
            ))}
          </select>
          {modelFetchError && (
            <p className="text-xs text-amber-600">{modelFetchError}</p>
          )}
          {!config.apiKey && (
            <p className="text-xs text-muted-foreground">Enter your API key to load available models.</p>
          )}
        </div>
      )}

      {/* Gemini doesn't expose baseUrl — the SDK manages all endpoint URLs internally */}
      {!isGemini && (
        <div className="space-y-2">
          <Label htmlFor="base-url" className="text-sm">
            Base URL
            <span className="ml-1 font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="base-url"
            type="url"
            value={config.baseUrl ?? ''}
            onChange={(e) => onBaseUrlChange(e.target.value)}
            placeholder={isOllama ? OLLAMA_DEFAULT_HOST : 'Custom base URL'}
          />
          {isOllama && (
            <p className="text-xs text-muted-foreground">
              Use the Ollama host only. Aura will automatically use the correct API path.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
