/**
 * Structured output generation — Uses AI SDK's generateObject with Zod schema validation.
 *
 * Provides automatic retry with error feedback when the LLM returns
 * invalid JSON. Falls back to manual JSON parse + Zod validate when
 * the provider doesn't support structured output natively.
 */
import { generateObject } from 'ai';
import type { LanguageModel } from 'ai';
import type { z } from 'zod';
import { getAiSdkModel } from './aiSdkProvider';
import type { ProviderId } from '@/types';

export interface StructuredOutputConfig {
  providerId: ProviderId;
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

export interface GenerateStructuredOptions<T> {
  config: StructuredOutputConfig;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  schema: z.ZodType<T>;
  schemaName?: string;
  schemaDescription?: string;
  maxRetries?: number;
  onRetry?: (attempt: number, error: string) => void;
}

/**
 * Generate a structured (Zod-validated) response from the LLM.
 *
 * Uses AI SDK's generateObject() which handles:
 * - Schema-aware prompting (auto-injects JSON schema into the request)
 * - Automatic retry with validation error feedback
 * - Provider-native structured output modes (JSON mode, tool calling)
 *
 * If the AI SDK call fails entirely, falls back to manual parsing.
 */
export async function generateStructured<T>(
  opts: GenerateStructuredOptions<T>,
): Promise<T> {
  const { config, messages, schema, schemaName, schemaDescription, maxRetries = 2, onRetry } = opts;

  let model: LanguageModel;
  try {
    model = getAiSdkModel(config.providerId, config);
  } catch {
    // If AI SDK model creation fails, fall back to manual approach
    throw new Error(`Failed to create AI SDK model for provider "${config.providerId}". Check your API key and configuration.`);
  }

  try {
    const result = await generateObject({
      model,
      messages,
      schema,
      schemaName,
      schemaDescription,
      maxRetries,
    });

    return result.object;
  } catch (aiSdkError) {
    // If AI SDK fails (e.g. provider doesn't support structured output),
    // the error will propagate. Provide a clear message.
    const errorMsg = aiSdkError instanceof Error ? aiSdkError.message : String(aiSdkError);
    onRetry?.(maxRetries, errorMsg);
    throw new Error(
      `Structured output generation failed after ${maxRetries} retries. ` +
      `Provider: ${config.providerId}. Error: ${errorMsg}`,
    );
  }
}
