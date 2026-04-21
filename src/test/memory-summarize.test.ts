import { describe, expect, it, vi } from 'vitest';
import type { LanguageModel } from 'ai';
import type { ProviderEntry } from '@/services/ai/types';
import type { LLMConfig } from '@/services/ai/workflow/types';
import {
  addMemoryToDirectory,
  createInitialMemoryTree,
  createMemoryFile,
  findDirectory,
  regenerateTreeSummaries,
} from '@/services/memory';

function createLlmConfig(): LLMConfig {
  return {
    providerEntry: {
      id: 'anthropic',
      name: 'Anthropic',
      defaultModel: 'test-model',
      createModel: vi.fn(async () => ({}) as LanguageModel),
    } as ProviderEntry,
    apiKey: 'test-key',
    baseUrl: 'https://example.com',
    model: 'test-model',
  };
}

describe('memory summarize', () => {
  it('regenerates summaries bottom-up for populated directories', async () => {
    const tree = createInitialMemoryTree();

    addMemoryToDirectory(
      tree,
      'identity/preferences',
      createMemoryFile('identity', 'global', 'private', 'user@example.com', {
        summary: 'The user prefers concise executive summaries with direct recommendations.',
        details: 'Keep answers short, put the conclusion first, and avoid unnecessary filler.',
        actionableUse: 'Use for executive writing and dashboard updates.',
      }),
    );

    addMemoryToDirectory(
      tree,
      'skills',
      createMemoryFile('skill', 'global', 'public', 'user@example.com', {
        summary: 'Document workflows should use concise sectioning and clear KPI callouts.',
        details: 'Prefer compact sections, labeled metrics, and one strong conclusion per page.',
      }),
    );

    await regenerateTreeSummaries(
      tree,
      {
        llmConfig: createLlmConfig(),
        owner: 'local-user',
      },
      {
        createLanguageModel: vi.fn(async () => ({}) as LanguageModel),
        retry: async (fn) => fn(),
        generateStructuredObject: vi.fn(async () => ({
          object: {
            abstract: 'A compact summary of durable directory knowledge for quick relevance checks.',
            overview: 'This directory contains durable user or workflow knowledge with enough detail for prompt-time navigation and generation guidance.',
          },
        })),
      },
    );

    expect(findDirectory(tree, 'identity/preferences')?.abstractSummary?.content.summary).toContain('compact summary');
    expect(findDirectory(tree, 'identity')?.overviewSummary?.content.details).toContain('prompt-time navigation');
    expect(findDirectory(tree, 'skills')?.abstractSummary).toBeTruthy();
    expect(tree.overviewSummary).toBeTruthy();
  });
});