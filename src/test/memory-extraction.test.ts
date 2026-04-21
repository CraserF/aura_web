import { describe, expect, it, vi } from 'vitest';
import type { LanguageModel } from 'ai';
import type { AIMessage, ProviderEntry } from '@/services/ai/types';
import type { LLMConfig } from '@/services/ai/workflow/types';
import type { MemoryCandidate } from '@/services/memory/types';
import {
  createInitialMemoryTree,
  extractMemoriesFromConversation,
  findDirectory,
  persistMemoryCandidates,
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

describe('memory extraction', () => {
  it('returns structured candidates from the extraction model response', async () => {
    const conversation: AIMessage[] = [
      { role: 'user', content: 'Remember that Sarah Chen prefers concise finance updates.' },
      { role: 'assistant', content: 'Noted. I will keep finance updates concise.' },
    ];

    const candidates = await extractMemoriesFromConversation(
      {
        llmConfig: createLlmConfig(),
        conversation,
        projectId: '11111111-1111-4111-8111-111111111111',
        artifactSummary: 'Generated a finance document titled Q1 rollout update.',
      },
      {
        createLanguageModel: vi.fn(async () => ({}) as LanguageModel),
        retry: async (fn) => fn(),
        generateStructuredObject: vi.fn(async () => ({
          object: {
            memories: [
              {
                type: 'entity',
                scope: 'project:11111111-1111-4111-8111-111111111111',
                sensitivity: 'private',
                title: 'Sarah Chen',
                summary: 'Sarah Chen prefers concise finance updates with direct conclusions.',
                details: 'Use short executive summaries for Sarah Chen in rollout and finance work.',
                evidence: ['chat:latest'],
                actionableUse: 'Use when generating project finance updates.',
                tags: ['finance', 'stakeholder'],
              },
            ] satisfies MemoryCandidate[],
          },
        })),
      },
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.type).toBe('entity');
    expect(candidates[0]?.scope).toBe('project:11111111-1111-4111-8111-111111111111');
  });

  it('returns an empty list when structured extraction fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const candidates = await extractMemoriesFromConversation(
      {
        llmConfig: createLlmConfig(),
        conversation: [{ role: 'user', content: 'Hello' }],
        projectId: '11111111-1111-4111-8111-111111111111',
      },
      {
        createLanguageModel: vi.fn(async () => ({}) as LanguageModel),
        retry: async (fn) => fn(),
        generateStructuredObject: vi.fn(async () => {
          throw new Error('structured output unavailable');
        }),
      },
    );

    expect(candidates).toEqual([]);
    warnSpy.mockRestore();
  });

  it('persists extracted candidates into the matching memory directories', () => {
    const tree = createInitialMemoryTree();

    const result = persistMemoryCandidates(
      tree,
      [
        {
          type: 'skill',
          scope: 'global',
          sensitivity: 'public',
          title: 'Executive writing',
          summary: 'Executive writing should lead with the conclusion and compress supporting detail.',
          details: 'Prefer direct headings and concise narrative blocks for executive readers.',
          evidence: ['chat:latest'],
          actionableUse: 'Use when drafting executive briefs and board updates.',
          tags: ['writing', 'executive'],
        },
      ],
      {
        owner: 'local-user',
        sourceRefs: ['session:test'],
      },
    );

    const skillsDir = findDirectory(tree, 'skills');
    expect(result.createdMemoryIds).toHaveLength(1);
    expect(skillsDir?.files).toHaveLength(1);
    expect(skillsDir?.files[0]?.frontmatter.sourceRefs).toEqual(['session:test']);
    expect(skillsDir?.files[0]?.content.summary).toContain('Executive writing');
  });
});