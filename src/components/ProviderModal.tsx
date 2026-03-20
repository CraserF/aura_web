import { useState, useEffect, useRef } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import type { ProviderConfig } from '@/types';
import { PROVIDER_OPTIONS as OPTIONS } from '@/types';
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

  return (
    <Dialog open={showSettings} onOpenChange={setShowSettings}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>AI Provider</DialogTitle>
          <DialogDescription>
            Choose a provider and enter your API key. Keys are stored locally.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
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
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(false)}
          >
            Done
          </Button>
        </DialogFooter>
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
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [modelFetchError, setModelFetchError] = useState<string | null>(null);
  const fetchedForKey = useRef<string | null>(null);

  const isOllama = config.id === 'ollama';
  const isGemini = config.id === 'gemini';

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

  const handleRefreshModels = () => {
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
            No API key needed. Make sure Ollama is running locally.
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
            placeholder={isOllama ? 'http://localhost:11434/v1' : 'Custom base URL'}
          />
        </div>
      )}
    </div>
  );
}
