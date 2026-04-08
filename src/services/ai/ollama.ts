import type { Ollama } from 'ollama/browser';

export interface OllamaModelOption {
  id: string;
  name: string;
  meta?: string;
}

export const OLLAMA_DEFAULT_HOST = 'http://127.0.0.1:11434';

export function normalizeOllamaHost(baseUrl?: string): string {
  const raw = (baseUrl ?? '').trim();
  if (!raw) return OLLAMA_DEFAULT_HOST;

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;

  try {
    const url = new URL(withProtocol);
    // Ollama host must be origin-only; any path (for example /v1 or /v1/chat/completions)
    // causes browser client endpoints like /api/tags to be resolved incorrectly.
    return `${url.protocol}//${url.host}`;
  } catch {
    return OLLAMA_DEFAULT_HOST;
  }
}

export function toOllamaOpenAIBaseUrl(baseUrl?: string): string {
  return `${normalizeOllamaHost(baseUrl)}/v1`;
}

export async function createOllamaClient(baseUrl?: string): Promise<Ollama> {
  const { Ollama } = await import('ollama/browser');
  return new Ollama({ host: normalizeOllamaHost(baseUrl) });
}

export async function fetchOllamaModels(baseUrl?: string): Promise<OllamaModelOption[]> {
  const client = await createOllamaClient(baseUrl);
  const response = await client.list();

  return (response.models ?? [])
    .map((model) => {
      const family = model.details.family || model.details.families?.[0];
      const parameterSize = model.details.parameter_size;
      const quantization = model.details.quantization_level;
      const meta = [family, parameterSize, quantization].filter(Boolean).join(' · ');

      return {
        id: model.name,
        name: model.name,
        meta: meta || undefined,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}