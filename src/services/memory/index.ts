/**
 * Aura Memory System — Module Exports
 *
 * Re-exports all memory utilities for convenient access
 */

// Types
export type {
  MemoryId,
  MemoryCategory,
  MemoryScope,
  MemorySensitivity,
  UpdateStrategy,
  DetailLevel,
  MemoryFrontmatter,
  MemoryContent,
  MemoryFile,
  MemoryCandidate,
  DedupDecision,
  DedupResult,
  CrossReference,
  CrossReferenceIndex,
  SummaryMetadata,
  MemoryDirectory,
  MemoryRetrievalResult,
  MemoryContextAssembly,
} from './types';

// Constants
export { MEMORY_FORMAT_VERSION } from './types';

// Schema & Validation
export {
  MemoryIdSchema,
  MemoryCategorySchema,
  MemoryScopeSchema,
  MemorySensitivitySchema,
  UpdateStrategySchema,
  DetailLevelSchema,
  MemoryFrontmatterSchema,
  MemoryContentSchema,
  MemoryFileSchema,
  MemoryCandidateSchema,
  DedupDecisionSchema,
  DedupResultSchema,
  CrossReferenceSchema,
  validateMemoryFrontmatter,
  validateMemoryContent,
  validateMemoryFile,
  validateMemoryCandidate,
  validateDedupResult,
  tryValidateMemoryFile,
  generateMemoryId,
} from './schema';

// Storage
export {
  parseMemoryFile,
  stringifyMemoryFile,
  getMemoryFileName,
  getL0FileName,
  getL1FileName,
  buildMemoryPath,
  createMemoryFile,
  tryParseMemoryFile,
  validateUpdate,
} from './storage';

// Directory Management
export {
  MAIN_DIRECTORIES,
  IDENTITY_SUBDIRECTORIES,
  createEmptyDirectory,
  createInitialMemoryTree,
  findDirectory,
  findOrCreateDirectory,
  addMemoryToDirectory,
  removeMemoryFromDirectory,
  findMemoryById,
  getDirectoryMemories,
  getAllMemories,
  updateSummaryMetadata,
  setL0Summary,
  setL1Summary,
  getL0Summary,
  getL1Summary,
  getDirectoryStats,
  printDirectoryTree,
  getCategoryForDirectory,
} from './directory';

// Archive persistence
export {
  exportMemoryTree,
  importMemoryTree,
  hasArchivedMemory,
} from './archive';

// Retrieval
export {
  retrieveMemories,
  assembleMemoryContext,
  estimateTokenCount,
  formatMemoryContext,
  buildMemoryContext,
  buildMemoryContextResult,
  type BuildMemoryContextOptions,
  type BuildStructuredMemoryContextOptions,
  type MemoryContextBuildResult,
  type MemoryContextDetailMode,
  type MemoryContextItem,
} from './retrieval';

// Extraction
export {
  extractMemoriesFromConversation,
  persistMemoryCandidates,
} from './extraction';

// Summaries
export {
  regenerateDirectorySummaries,
  regenerateTreeSummaries,
} from './summarize';

// Update Policies
export {
  applyUpdatePolicy,
  validateUpdateConformance,
  getDefaultStrategy,
} from './policies';

// Cross-References & Links
export {
  parseLinks,
  extractLinksFromMemory,
  buildCrossReferenceIndex,
  normalizeTarget,
  findReferencers,
  findReferences,
  linksEqual,
  buildLinkGraph,
  validateLinks,
  replaceLinkTarget,
  formatLinkTarget,
} from './links';
