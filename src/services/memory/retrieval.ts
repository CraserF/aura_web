import type {
  DetailLevel,
  MemoryContextAssembly,
  MemoryDirectory,
  MemoryFile,
  MemoryRetrievalResult,
  MemoryScope,
} from './types';

interface ScoredDocument {
  dirPath: string;
  detailLevel: DetailLevel;
  memory: MemoryFile;
  text: string;
  score: number;
}

interface DirectoryCandidate {
  dir: MemoryDirectory;
  dirPath: string;
  score: number;
}

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'in', 'is', 'it', 'of', 'on',
  'or', 'that', 'the', 'this', 'to', 'with', 'your', 'their', 'our', 'about', 'into', 'when',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token));
}

function termFrequency(tokens: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const token of tokens) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return counts;
}

function inverseDocumentFrequency(documents: string[][]): Map<string, number> {
  const docCount = documents.length || 1;
  const documentHits = new Map<string, number>();

  for (const tokens of documents) {
    for (const token of new Set(tokens)) {
      documentHits.set(token, (documentHits.get(token) ?? 0) + 1);
    }
  }

  const idf = new Map<string, number>();
  for (const [token, hits] of documentHits) {
    idf.set(token, Math.log((1 + docCount) / (1 + hits)) + 1);
  }
  return idf;
}

function tfIdfScore(queryTokens: string[], documentTokens: string[], idf: Map<string, number>): number {
  if (queryTokens.length === 0 || documentTokens.length === 0) {
    return 0;
  }

  const queryTf = termFrequency(queryTokens);
  const docTf = termFrequency(documentTokens);
  let score = 0;

  for (const token of new Set(queryTokens)) {
    const queryWeight = queryTf.get(token) ?? 0;
    const docWeight = docTf.get(token) ?? 0;
    const inverseWeight = idf.get(token) ?? 0;
    score += queryWeight * docWeight * inverseWeight;
  }

  return score / Math.sqrt(documentTokens.length);
}

function isScopeMatch(memoryScope: MemoryScope, requestedScope?: MemoryScope): boolean {
  if (!requestedScope) {
    return true;
  }

  if (requestedScope === 'global') {
    return memoryScope === 'global';
  }

  return memoryScope === 'global' || memoryScope === requestedScope;
}

function getSearchableText(memory: MemoryFile): string {
  return [
    memory.content.summary,
    memory.content.details,
    memory.content.actionableUse,
    memory.frontmatter.tags.join(' '),
  ]
    .filter(Boolean)
    .join('\n');
}

function collectDirectories(root: MemoryDirectory): MemoryDirectory[] {
  const directories: MemoryDirectory[] = [];

  function walk(dir: MemoryDirectory): void {
    directories.push(dir);
    for (const subdir of dir.subdirs) {
      walk(subdir);
    }
  }

  walk(root);
  return directories;
}

function collectDirectoryDocument(dir: MemoryDirectory, requestedScope?: MemoryScope): ScoredDocument | null {
  const scopedFiles = dir.files.filter((file) => isScopeMatch(file.frontmatter.scope, requestedScope));

  if (dir.abstractSummary && isScopeMatch(dir.abstractSummary.frontmatter.scope, requestedScope)) {
    return {
      dirPath: dir.path,
      detailLevel: 'L0',
      memory: dir.abstractSummary,
      text: getSearchableText(dir.abstractSummary),
      score: 0,
    };
  }

  if (scopedFiles.length === 0) {
    return null;
  }

  const firstFile = scopedFiles[0];
  if (!firstFile) {
    return null;
  }

  const aggregate = scopedFiles.map(getSearchableText).join('\n');
  return {
    dirPath: dir.path,
    detailLevel: 'L0',
    memory: firstFile,
    text: aggregate,
    score: 0,
  };
}

function collectDetailDocuments(dir: MemoryDirectory, requestedScope?: MemoryScope): ScoredDocument[] {
  const documents: ScoredDocument[] = [];

  if (dir.overviewSummary && isScopeMatch(dir.overviewSummary.frontmatter.scope, requestedScope)) {
    documents.push({
      dirPath: dir.path,
      detailLevel: 'L1',
      memory: dir.overviewSummary,
      text: getSearchableText(dir.overviewSummary),
      score: 0,
    });
  }

  for (const file of dir.files) {
    if (!isScopeMatch(file.frontmatter.scope, requestedScope)) {
      continue;
    }

    documents.push({
      dirPath: dir.path,
      detailLevel: 'L2',
      memory: file,
      text: getSearchableText(file),
      score: 0,
    });
  }

  return documents;
}

function scoreDocuments<T extends ScoredDocument | DirectoryCandidate>(
  query: string,
  documents: T[],
  textSelector: (document: T) => string,
): T[] {
  const queryTokens = tokenize(query);
  const tokenizedDocuments = documents.map((document) => tokenize(textSelector(document)));
  const idf = inverseDocumentFrequency(tokenizedDocuments);

  return documents
    .map((document, index) => ({
      ...document,
      score: tfIdfScore(queryTokens, tokenizedDocuments[index] ?? [], idf),
    }))
    .filter((document) => document.score > 0)
    .sort((left, right) => right.score - left.score);
}

export interface RetrieveMemoryOptions {
  scope?: MemoryScope;
  topK?: number;
  maxDirectories?: number;
}

export interface BuildMemoryContextOptions extends RetrieveMemoryOptions {
  maxTokens?: number;
}

export function retrieveMemories(
  tree: MemoryDirectory,
  query: string,
  options: RetrieveMemoryOptions = {},
): MemoryRetrievalResult[] {
  const directories = collectDirectories(tree)
    .filter((dir) => dir.path !== 'memory');

  const directoryCandidates = directories
    .map((dir) => {
      const directoryDoc = collectDirectoryDocument(dir, options.scope);
      if (!directoryDoc) {
        return null;
      }

      return {
        dir,
        dirPath: dir.path,
        score: 0,
        text: directoryDoc.text,
      };
    })
    .filter((candidate): candidate is DirectoryCandidate & { text: string } => candidate !== null);

  const topDirectories = scoreDocuments(query, directoryCandidates, (document) => document.text)
    .slice(0, options.maxDirectories ?? 3);

  const detailDocuments = topDirectories.flatMap((candidate) => collectDetailDocuments(candidate.dir, options.scope));
  const scoredDetails = scoreDocuments(query, detailDocuments, (document) => document.text);

  if (scoredDetails.length === 0) {
    const fallbackDocuments = directories.flatMap((dir) => collectDetailDocuments(dir, options.scope));
    return scoreDocuments(query, fallbackDocuments, (document) => document.text)
      .slice(0, options.topK ?? 5)
      .map(toRetrievalResult);
  }

  return scoredDetails
    .slice(0, options.topK ?? 5)
    .map(toRetrievalResult);
}

function toRetrievalResult(document: ScoredDocument): MemoryRetrievalResult {
  return {
    memory: document.memory,
    relevanceScore: document.score,
    detailLevel: document.detailLevel,
    reason: `Matched ${document.dirPath} at ${document.detailLevel}`,
  };
}

export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

export function assembleMemoryContext(
  results: MemoryRetrievalResult[],
  maxTokens = 2000,
): MemoryContextAssembly {
  const memories: MemoryRetrievalResult[] = [];
  const trimmedMemories: string[] = [];
  let tokenCount = 0;

  for (const result of results) {
    const candidateText = [
      result.memory.content.summary,
      result.memory.content.details,
      result.memory.content.actionableUse,
    ]
      .filter(Boolean)
      .join('\n');
    const candidateTokens = estimateTokenCount(candidateText);

    if (tokenCount + candidateTokens > maxTokens) {
      trimmedMemories.push(result.memory.frontmatter.memoryId);
      continue;
    }

    memories.push(result);
    tokenCount += candidateTokens;
  }

  return {
    memories,
    tokenCount,
    budgetExceeded: trimmedMemories.length > 0,
    trimmedMemories,
  };
}

export function formatMemoryContext(assembly: MemoryContextAssembly): string {
  return assembly.memories
    .map((result, index) => {
      const tags = result.memory.frontmatter.tags.length
        ? `Tags: ${result.memory.frontmatter.tags.join(', ')}`
        : '';
      return [
        `Memory ${index + 1}: ${result.reason}`,
        `Summary: ${result.memory.content.summary}`,
        result.memory.content.details ? `Details: ${result.memory.content.details}` : '',
        result.memory.content.actionableUse ? `Use: ${result.memory.content.actionableUse}` : '',
        tags,
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');
}

export function buildMemoryContext(
  tree: MemoryDirectory,
  query: string,
  options: BuildMemoryContextOptions = {},
): string {
  const results = retrieveMemories(tree, query, options);
  if (results.length === 0) {
    return '';
  }

  const assembly = assembleMemoryContext(results, options.maxTokens ?? 2000);
  return formatMemoryContext(assembly);
}