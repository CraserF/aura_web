import type { ProviderConfig } from '@/types';
import type { MemoryContextBuildResult } from '@/services/memory';

export const mockProviderConfig: ProviderConfig = {
  id: 'openai',
  name: 'OpenAI',
  apiKey: 'test-key',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o',
};

export async function mockBuildMemoryContext(): Promise<MemoryContextBuildResult> {
  return {
    text: '',
    tokenCount: 0,
    budgetExceeded: false,
    trimmedMemories: [],
    items: [],
  };
}
