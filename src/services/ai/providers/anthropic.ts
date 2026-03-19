import type { AIProvider, AIMessage } from '../types';

/**
 * Anthropic Claude provider adapter.
 * NOTE: Anthropic's API does NOT support browser-direct calls (CORS).
 * This adapter will only work with a CORS proxy or server-side relay.
 */
export class AnthropicProvider implements AIProvider {
  id = 'anthropic';
  name = 'Anthropic';

  async generateStream(
    messages: AIMessage[],
    onChunk: (text: string) => void,
    apiKey: string,
    baseUrl: string,
    modelId?: string,
  ): Promise<string> {
    const systemMessage = messages.find((m) => m.role === 'system');
    const conversationMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }));

    const response = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: modelId || 'claude-3-5-sonnet-20241022',
        max_tokens: 8192,
        system: systemMessage?.content ?? '',
        messages: conversationMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `Anthropic API error (${response.status}): ${error}`,
      );
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
        if (!data) continue;

        try {
          const parsed = JSON.parse(data) as {
            type: string;
            delta?: { text?: string };
          };
          if (
            parsed.type === 'content_block_delta' &&
            parsed.delta?.text
          ) {
            fullText += parsed.delta.text;
            onChunk(parsed.delta.text);
          }
        } catch {
          // Skip malformed chunks
        }
      }
    }

    return fullText;
  }
}
