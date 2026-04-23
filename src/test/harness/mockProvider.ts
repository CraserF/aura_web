import type { ProviderConfig } from '@/types';

export const mockProviderConfig: ProviderConfig = {
  id: 'openai',
  name: 'OpenAI',
  apiKey: 'test-key',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o',
};

export async function mockBuildMemoryContext(): Promise<string> {
  return '';
}
