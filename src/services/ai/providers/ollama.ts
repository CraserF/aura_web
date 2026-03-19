import type { AIProvider, AIMessage } from '../types';

/**
 * Ollama provider adapter.
 * Uses Ollama's OpenAI-compatible API endpoint.
 * Runs locally — no API key required.
 */
export class OllamaProvider implements AIProvider {
  id = 'ollama';
  name = 'Ollama';

  async generateStream(
    messages: AIMessage[],
    onChunk: (text: string) => void,
    _apiKey: string,
    baseUrl: string,
    modelId?: string,
  ): Promise<string> {
    const url = baseUrl || 'http://localhost:11434/v1';

    // Use selected model, otherwise auto-pick
    const model = modelId || (await this.pickModel(url));

    const response = await fetch(`${url}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama API error (${response.status}): ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter((line) => line.startsWith('data:'));

      for (const line of lines) {
        const data = line.slice(5).trim();
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data) as {
            choices: Array<{ delta: { content?: string } }>;
          };
          const content = parsed.choices[0]?.delta?.content;
          if (content) {
            fullText += content;
            onChunk(content);
          }
        } catch {
          // Skip malformed SSE chunks
        }
      }
    }

    return fullText;
  }

  /**
   * Auto-detect an available model from the Ollama instance.
   * Prefers larger/capable models for presentation generation.
   */
  private async pickModel(baseUrl: string): Promise<string> {
    try {
      // Ollama's native /api/tags endpoint (not the OpenAI compat one)
      const ollamaBase = baseUrl.replace(/\/v1\/?$/, '');
      const res = await fetch(`${ollamaBase}/api/tags`);
      if (!res.ok) return 'llama3.1';

      const data = (await res.json()) as {
        models?: Array<{ name: string }>;
      };
      const models = data.models?.map((m) => m.name) ?? [];

      if (models.length === 0) {
        throw new Error(
          'No models found in Ollama. Run `ollama pull llama3.1` to get started.',
        );
      }

      // Prefer capable models for HTML generation
      const preferred = [
        'qwen2.5-coder',
        'qwen2.5',
        'deepseek-coder-v2',
        'codellama',
        'llama3.1',
        'llama3',
        'mistral',
        'gemma2',
      ];

      for (const name of preferred) {
        const match = models.find((m) => m.startsWith(name));
        if (match) return match;
      }

      // Fall back to first available model
      return models[0] ?? 'llama3.1';
    } catch (err) {
      if (err instanceof Error && err.message.includes('No models found')) {
        throw err;
      }
      // Can't reach Ollama or /api/tags failed, try a common default
      return 'llama3.1';
    }
  }
}
