import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIProvider, AIMessage } from '../types';

/**
 * Google Gemini provider adapter using the official @google/generative-ai SDK.
 */
export class GeminiProvider implements AIProvider {
  id = 'gemini';
  name = 'Google Gemini';

  async generateStream(
    messages: AIMessage[],
    onChunk: (text: string) => void,
    apiKey: string,
    _baseUrl: string,
    modelId?: string,
  ): Promise<string> {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Extract system message if present
    const systemMessage = messages.find((m) => m.role === 'system');
    
    // Initial configuration
    const model = genAI.getGenerativeModel({
      model: modelId || 'gemini-2.5-flash',
      systemInstruction: systemMessage?.content,
    });

    const conversationMessages = messages.filter((m) => m.role !== 'system');
    
    if (conversationMessages.length === 0) {
      throw new Error('No messages provided');
    }

    // Map messages to SDK format
    const chatHistory = conversationMessages
      .slice(0, -1)
      .map((msg) => ({
        role: msg.role === 'assistant' ? ('model' as const) : ('user' as const),
        parts: [{ text: msg.content }],
      }));

    const lastMessage = conversationMessages[conversationMessages.length - 1];

    if (!lastMessage) {
      throw new Error('No last message found');
    }

    const chat = model.startChat({
      history: chatHistory,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 16384,
      },
    });

    try {
      const result = await chat.sendMessageStream(lastMessage.content);

      let fullText = '';

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullText += chunkText;
        onChunk(chunkText);
      }

      return fullText;
    } catch (error: any) {
      throw new Error(`Gemini SDK error: ${error.message || error}`);
    }
  }
}

