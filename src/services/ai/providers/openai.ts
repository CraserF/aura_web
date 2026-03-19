import type { AIProvider, AIMessage } from '../types';

/**
 * OpenAI-compatible provider adapter.
 * Works with OpenAI, DeepSeek, and any OpenAI-compatible API.
 */
export class OpenAIProvider implements AIProvider {
  id: string;
  name: string;

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }

  async generateStream(
    messages: AIMessage[],
    onChunk: (text: string) => void,
    apiKey: string,
    baseUrl: string,
    modelId?: string,
  ): Promise<string> {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelId || (this.id === 'deepseek' ? 'deepseek-chat' : 'gpt-4o'),
        messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 8192,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`${this.name} API error (${response.status}): ${error}`);
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
}
