import { generateObject } from 'ai';
import type { LanguageModel, ModelMessage } from 'ai';
import { z } from 'zod';
import type { AIMessage } from '@/services/ai/types';
import { withRetry } from '@/services/ai/fallbackModel';
import { createModel, toModelMessages } from '@/services/ai/workflow/engine';
import type { LLMConfig } from '@/services/ai/workflow/types';
import {
  MemoryCandidateSchema,
} from './schema';
import {
  addMemoryToDirectory,
  createInitialMemoryTree,
} from './directory';
import { createMemoryFile } from './storage';
import type {
  MemoryCandidate,
  MemoryCategory,
  MemoryDirectory,
  MemoryId,
} from './types';

const ExtractionEnvelopeSchema = z.object({
  memories: z.array(MemoryCandidateSchema).max(6).default([]),
});

const CATEGORY_DIRECTORY_MAP: Record<MemoryCategory, string> = {
  identity: 'identity',
  skill: 'skills',
  entity: 'entities',
  event: 'events',
  case: 'cases',
  pattern: 'patterns',
  tool: 'tools',
  context: 'context',
};

interface GenerateExtractionInput {
  model: LanguageModel;
  schema: typeof ExtractionEnvelopeSchema;
  messages: ModelMessage[];
  maxOutputTokens: number;
  abortSignal?: AbortSignal;
}

interface GenerateExtractionResult {
  object: {
    memories: MemoryCandidate[];
  };
}

interface ExtractionDependencies {
  createLanguageModel?: (config: LLMConfig) => Promise<LanguageModel>;
  generateStructuredObject?: (input: GenerateExtractionInput) => Promise<GenerateExtractionResult>;
  retry?: <T>(fn: () => Promise<T>) => Promise<T>;
}

export interface ExtractMemoriesOptions {
  llmConfig: LLMConfig;
  conversation: AIMessage[];
  projectId: string;
  artifactSummary?: string;
  signal?: AbortSignal;
}

export interface PersistMemoryOptions {
  owner: string;
  sourceRefs?: string[];
}

export interface PersistMemoryResult {
  createdMemoryIds: MemoryId[];
}

function buildExtractionSystemPrompt(projectId: string): string {
  return `You extract durable memory candidates from Aura chat sessions and generation outcomes.

Return only information worth remembering across future tasks.

Rules:
- Extract at most 6 memories.
- Prefer durable facts, workflow preferences, reusable skills, project context, and important entities.
- Do not restate the user's one-off request unless it reveals stable context.
- Use scope \"global\" for reusable cross-project knowledge.
- Use scope \"project:${projectId}\" for project-specific context, decisions, or collaborators.
- Prefer sensitivity \"private\" for project-specific or personal information.
- Use sensitivity \"public\" for generic reusable skills or tools.
- Keep summaries concise and details factual.
- If nothing is worth storing, return an empty memories array.`;
}

function buildExtractionInstruction(projectId: string, artifactSummary?: string): string {
  const artifactBlock = artifactSummary
    ? `\n\nGeneration outcome:\n${artifactSummary}`
    : '';

  return `Review the conversation above and extract durable memory candidates.${artifactBlock}

Project ID: ${projectId}

Only return memories that would improve future generations.`;
}

function getExtractionConversation(
  conversation: AIMessage[],
  artifactSummary?: string,
): AIMessage[] {
  const recentConversation = conversation
    .filter((message) => message.role !== 'system')
    .slice(-8);

  if (!artifactSummary) {
    return recentConversation;
  }

  return [
    ...recentConversation,
    {
      role: 'assistant',
      content: `Generation outcome:\n${artifactSummary}`,
    },
  ];
}

export async function extractMemoriesFromConversation(
  options: ExtractMemoriesOptions,
  dependencies: ExtractionDependencies = {},
): Promise<MemoryCandidate[]> {
  const createLanguageModel = dependencies.createLanguageModel ?? createModel;
  const generateStructuredObject = dependencies.generateStructuredObject ?? generateObject;
  const retry = dependencies.retry ?? withRetry;
  const model = await createLanguageModel(options.llmConfig);
  const requestMessages: ModelMessage[] = [
    {
      role: 'system',
      content: buildExtractionSystemPrompt(options.projectId),
    } as ModelMessage,
    ...toModelMessages(getExtractionConversation(options.conversation, options.artifactSummary)),
    {
      role: 'user',
      content: buildExtractionInstruction(options.projectId, options.artifactSummary),
    },
  ];

  try {
    const result = await retry(() =>
      generateStructuredObject({
        model,
        schema: ExtractionEnvelopeSchema,
        messages: requestMessages,
        maxOutputTokens: 2048,
        abortSignal: options.signal,
      }),
    );

    return result.object.memories;
  } catch (error) {
    console.warn('[Memory] extraction failed, skipping memory capture:', error);
    return [];
  }
}

export function persistMemoryCandidates(
  tree: MemoryDirectory | undefined,
  candidates: MemoryCandidate[],
  options: PersistMemoryOptions,
): PersistMemoryResult {
  const targetTree = tree ?? createInitialMemoryTree();
  const createdMemoryIds: MemoryId[] = [];

  for (const candidate of candidates) {
    const file = createMemoryFile(
      candidate.type,
      candidate.scope,
      candidate.sensitivity,
      options.owner,
      {
        summary: candidate.summary,
        details: candidate.details,
        evidence: candidate.evidence,
        actionableUse: candidate.actionableUse,
      },
      {
        tags: candidate.tags,
        sourceRefs: options.sourceRefs,
      },
    );

    addMemoryToDirectory(targetTree, CATEGORY_DIRECTORY_MAP[candidate.type], file);
    createdMemoryIds.push(file.frontmatter.memoryId);
  }

  return { createdMemoryIds };
}