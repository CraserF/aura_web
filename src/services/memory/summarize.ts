import { generateObject } from 'ai';
import type { LanguageModel, ModelMessage } from 'ai';
import { z } from 'zod';
import { withRetry } from '@/services/ai/fallbackModel';
import { createModel } from '@/services/ai/workflow/engine';
import type { LLMConfig } from '@/services/ai/workflow/types';
import {
  getCategoryForDirectory,
  setL0Summary,
  setL1Summary,
  updateSummaryMetadata,
} from './directory';
import { createMemoryFile } from './storage';
import type {
  MemoryDirectory,
  MemoryFile,
  MemoryScope,
  MemorySensitivity,
} from './types';

const SummaryEnvelopeSchema = z.object({
  abstract: z.string().min(10).max(500),
  overview: z.string().min(10).max(4000),
});

interface GenerateSummaryInput {
  model: LanguageModel;
  schema: typeof SummaryEnvelopeSchema;
  messages: ModelMessage[];
  maxOutputTokens: number;
  abortSignal?: AbortSignal;
}

interface GenerateSummaryResult {
  object: {
    abstract: string;
    overview: string;
  };
}

interface SummaryDependencies {
  createLanguageModel?: (config: LLMConfig) => Promise<LanguageModel>;
  generateStructuredObject?: (input: GenerateSummaryInput) => Promise<GenerateSummaryResult>;
  retry?: <T>(fn: () => Promise<T>) => Promise<T>;
}

export interface RegenerateSummariesOptions {
  llmConfig: LLMConfig;
  owner?: string;
  signal?: AbortSignal;
}

function getDirectoryDisplayName(path: string): string {
  const segments = path.split('/').filter(Boolean);
  return segments[segments.length - 1] ?? 'memory';
}

function collectSourceFiles(dir: MemoryDirectory): MemoryFile[] {
  return [
    ...dir.files,
    ...dir.subdirs.flatMap((subdir) => [subdir.abstractSummary, subdir.overviewSummary].filter(Boolean) as MemoryFile[]),
  ];
}

function deriveScope(dir: MemoryDirectory): MemoryScope {
  const scopes = new Set(collectSourceFiles(dir).map((file) => file.frontmatter.scope));
  const projectScopes = [...scopes].filter((scope) => scope !== 'global');

  if (projectScopes.length === 1) {
    return projectScopes[0] as MemoryScope;
  }

  return 'global';
}

function deriveSensitivity(dir: MemoryDirectory): MemorySensitivity {
  const sensitivities = new Set(collectSourceFiles(dir).map((file) => file.frontmatter.sensitivity));
  if (sensitivities.has('encrypted')) {
    return 'encrypted';
  }
  if (sensitivities.has('private')) {
    return 'private';
  }
  return 'public';
}

function buildSummarySourceText(dir: MemoryDirectory): string {
  const fileSections = dir.files.map((file) => [
    `File type: ${file.frontmatter.type}`,
    `Scope: ${file.frontmatter.scope}`,
    `Summary: ${file.content.summary}`,
    file.content.details ? `Details: ${file.content.details}` : '',
    file.content.actionableUse ? `Use: ${file.content.actionableUse}` : '',
  ].filter(Boolean).join('\n'));

  const subdirSections = dir.subdirs
    .filter((subdir) => subdir.abstractSummary || subdir.overviewSummary)
    .map((subdir) => [
      `Subdirectory: ${subdir.path}`,
      subdir.abstractSummary ? `Abstract: ${subdir.abstractSummary.content.summary}` : '',
      subdir.overviewSummary ? `Overview: ${subdir.overviewSummary.content.details}` : '',
    ].filter(Boolean).join('\n'));

  return [
    `Directory: ${dir.path}`,
    fileSections.length > 0 ? `Local memories:\n${fileSections.join('\n\n---\n\n')}` : 'Local memories: none',
    subdirSections.length > 0 ? `Child summaries:\n${subdirSections.join('\n\n---\n\n')}` : 'Child summaries: none',
  ].join('\n\n');
}

function buildSummaryPrompt(dir: MemoryDirectory): ModelMessage[] {
  return [
    {
      role: 'system',
      content: `You maintain Aura memory directories.

Create two summary layers for this directory:
- abstract: around 100 tokens for fast relevance checks
- overview: a richer directory map for prompt-time navigation

Rules:
- Only summarize durable information in the provided memories.
- Mention major people, workflows, project context, and reusable patterns.
- Keep the abstract concise and indexable.
- Keep the overview factual and organized in prose.
- Do not invent facts that are not in the source.`,
    },
    {
      role: 'user',
      content: buildSummarySourceText(dir),
    },
  ] as ModelMessage[];
}

function createSummaryFiles(dir: MemoryDirectory, owner: string, abstract: string, overview: string): {
  abstractSummary: MemoryFile;
  overviewSummary: MemoryFile;
} {
  const type = getCategoryForDirectory(dir.path) ?? 'context';
  const scope = deriveScope(dir);
  const sensitivity = deriveSensitivity(dir);
  const sourceRefs = collectSourceFiles(dir)
    .flatMap((file) => file.frontmatter.sourceRefs)
    .slice(0, 20);
  const tags = Array.from(new Set(collectSourceFiles(dir).flatMap((file) => file.frontmatter.tags))).slice(0, 12);
  const displayName = getDirectoryDisplayName(dir.path);

  return {
    abstractSummary: createMemoryFile(type, scope, sensitivity, owner, {
      summary: abstract,
      details: abstract,
      actionableUse: `Use as the quick relevance summary for the ${displayName} directory.`,
    }, {
      sourceRefs,
      tags,
    }),
    overviewSummary: createMemoryFile(type, scope, sensitivity, owner, {
      summary: abstract,
      details: overview,
      actionableUse: `Use as the detailed overview for the ${displayName} directory.`,
    }, {
      sourceRefs,
      tags,
    }),
  };
}

export async function regenerateDirectorySummaries(
  dir: MemoryDirectory,
  options: RegenerateSummariesOptions,
  dependencies: SummaryDependencies = {},
): Promise<void> {
  const createLanguageModel = dependencies.createLanguageModel ?? createModel;
  const generateStructuredObject = dependencies.generateStructuredObject ?? generateObject;
  const retry = dependencies.retry ?? withRetry;
  const owner = options.owner ?? 'local-user';

  if (dir.files.length === 0 && dir.subdirs.every((subdir) => !subdir.abstractSummary && !subdir.overviewSummary)) {
    return;
  }

  const model = await createLanguageModel(options.llmConfig);
  const result = await retry(() =>
    generateStructuredObject({
      model,
      schema: SummaryEnvelopeSchema,
      messages: buildSummaryPrompt(dir),
      maxOutputTokens: 1600,
      abortSignal: options.signal,
    }),
  );

  const summaries = createSummaryFiles(dir, owner, result.object.abstract, result.object.overview);
  setL0Summary(dir, summaries.abstractSummary);
  setL1Summary(dir, summaries.overviewSummary);

  const sourcePaths = [
    ...dir.files.map((file) => `${dir.path}/${file.frontmatter.memoryId}.md`),
    ...dir.subdirs.flatMap((subdir) => {
      const paths: string[] = [];
      if (subdir.abstractSummary) {
        paths.push(`${subdir.path}/.abstract.md`);
      }
      if (subdir.overviewSummary) {
        paths.push(`${subdir.path}/.overview.md`);
      }
      return paths;
    }),
  ];
  const sourceVersions = Object.fromEntries([
    ...dir.files.map((file) => [`${dir.path}/${file.frontmatter.memoryId}.md`, file.frontmatter.version]),
    ...dir.subdirs.flatMap((subdir) => {
      const versions: Array<[string, number]> = [];
      if (subdir.abstractSummary) {
        versions.push([`${subdir.path}/.abstract.md`, subdir.abstractSummary.frontmatter.version]);
      }
      if (subdir.overviewSummary) {
        versions.push([`${subdir.path}/.overview.md`, subdir.overviewSummary.frontmatter.version]);
      }
      return versions;
    }),
  ]);

  updateSummaryMetadata(dir, sourcePaths, sourceVersions);
}

export async function regenerateTreeSummaries(
  dir: MemoryDirectory,
  options: RegenerateSummariesOptions,
  dependencies: SummaryDependencies = {},
): Promise<void> {
  for (const subdir of dir.subdirs) {
    await regenerateTreeSummaries(subdir, options, dependencies);
  }

  await regenerateDirectorySummaries(dir, options, dependencies);
}