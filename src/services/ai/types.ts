/** Message format for AI conversations */
export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Abstract AI provider interface — all adapters implement this */
export interface AIProvider {
  id: string;
  name: string;

  /**
   * Generate a streaming response.
   * @param messages - Conversation history including system prompt
   * @param onChunk - Called with each text chunk as it streams in
   * @returns The full completed response text
   */
  generateStream(
    messages: AIMessage[],
    onChunk: (text: string) => void,
    apiKey: string,
    baseUrl: string,
    model?: string,
  ): Promise<string>;
}
