/**
 * Aura Memory Format (AMF) — Types and Interfaces
 *
 * Defines the complete type system for semantic file-based memory with
 * hierarchical detail levels (L0/L1/L2) and privacy boundaries.
 *
 * References:
 *   - Implementation Plan: docs/roadmap/memory-markdown-plan.md
 *   - Format: Markdown + YAML frontmatter
 *   - Hierarchy: Abstract (L0), Overview (L1), Detail (L2)
 */

/**
 * Unique memory identifier (e.g., "mem_a1b2c3d4")
 */
export type MemoryId = string;

/**
 * Memory category — defines what kind of information is being stored
 */
export type MemoryCategory =
  | 'identity'     // User profile, name, role, communication style
  | 'skill'        // Learned workflows, tactics, best practices
  | 'entity'       // People, orgs, tools the user works with
  | 'event'        // Immutable event log (decisions, milestones)
  | 'case'         // Problem + solution pairs (agent learning)
  | 'pattern'      // Reusable patterns refined over time
  | 'tool'         // Tool usage knowledge and best practices
  | 'context';     // Project-specific or general context

/**
 * Memory scope — determines visibility and namespace
 */
export type MemoryScope = 'global' | `project:${string}`;

/**
 * Sensitivity level — determines encryption and access control
 */
export type MemorySensitivity = 'public' | 'private' | 'encrypted';

/**
 * Update strategy — governs how memory is modified over time
 *
 * - **merge**: New facts merged into existing content, old facts preserved
 * - **append**: New facts appended to entity file, never overwrite
 * - **immutable**: Never auto-updated after creation
 */
export type UpdateStrategy = 'merge' | 'append' | 'immutable';

/**
 * Detail level — hierarchical storage and retrieval
 *
 * - **L0 (Abstract)**: ~100 tokens, quick relevance check, semantic search index
 * - **L1 (Overview)**: ~2,000 tokens, navigation map, decision-making context
 * - **L2 (Detail)**: Unlimited, full content, loaded on-demand only
 */
export type DetailLevel = 'L0' | 'L1' | 'L2';

/**
 * Memory file format version
 */
export const MEMORY_FORMAT_VERSION = '1.0';

/**
 * YAML frontmatter metadata for every memory file
 */
export interface MemoryFrontmatter {
  /** Unique memory ID (e.g., "mem_a1b2c3d4") */
  memoryId: MemoryId;

  /** Category of memory (identity, skill, entity, etc.) */
  type: MemoryCategory;

  /** Scope: global or project-specific */
  scope: MemoryScope;

  /** Sensitivity level: public, private, or encrypted */
  sensitivity: MemorySensitivity;

  /** User ID (owner) */
  owner: string;

  /** Source references (sessions, documents, external refs) */
  sourceRefs: string[];

  /** How this memory should be updated over time */
  updateStrategy: UpdateStrategy;

  /** ISO 8601 timestamp */
  createdAt: string;

  /** ISO 8601 timestamp */
  updatedAt: string;

  /** Version counter for conflict detection */
  version: number;

  /** Tags for categorization and search */
  tags: string[];
}

/**
 * Content section of a memory file (after frontmatter)
 */
export interface MemoryContent {
  /** One-paragraph distillation (~100 tokens) for L0 and L1 */
  summary: string;

  /** Expanded context with specifics (~500-2000 tokens) for L1 and L2 */
  details: string;

  /** Links to source sessions, documents, or external references */
  evidence: string[];

  /** When and how this memory should influence agent behavior */
  actionableUse: string;
}

/**
 * A parsed memory file (frontmatter + content)
 */
export interface MemoryFile {
  frontmatter: MemoryFrontmatter;
  content: MemoryContent;
}

/**
 * Candidate memory created during extraction phase
 * (before dedup and write)
 */
export interface MemoryCandidate {
  /** Category of the memory */
  type: MemoryCategory;

  /** Scope: global or project-specific */
  scope: MemoryScope;

  /** Sensitivity level */
  sensitivity: MemorySensitivity;

  /** Short title/name */
  title: string;

  /** One-paragraph summary (~100 tokens) */
  summary: string;

  /** Expanded context (~500-2000 tokens) */
  details: string;

  /** Links to source references */
  evidence: string[];

  /** When to use this memory */
  actionableUse: string;

  /** Tags for categorization */
  tags: string[];
}

/**
 * Memory dedup decision — result of comparing candidate against existing memories
 */
export type DedupDecision = 'skip' | 'create' | 'merge' | 'delete';

/**
 * Result of a dedup operation
 */
export interface DedupResult {
  candidate: MemoryCandidate;
  decision: DedupDecision;
  existingMemoryId?: MemoryId;
  reason: string;
}

/**
 * Cross-reference link found in memory file content
 * e.g., [[entity-name]], [[Sarah Chen]], [[Q1 revenue report]]
 */
export interface CrossReference {
  /** Display text and target (e.g., "Sarah Chen") */
  text: string;

  /** Target entity/memory name */
  target: string;

  /** Start position in text */
  startPos: number;

  /** End position in text */
  endPos: number;
}

/**
 * Index of all cross-references in a memory tree
 * Maps link targets to source memory IDs
 */
export interface CrossReferenceIndex {
  [target: string]: MemoryId[];
}

/**
 * L0/L1 summary metadata (for regeneration tracking)
 */
export interface SummaryMetadata {
  /** When the summary was generated */
  generatedAt: string;

  /** Source L2 file paths that contributed to this summary */
  sourcePaths: string[];

  /** Version of source files used */
  sourceVersions: Record<string, number>;
}

/**
 * Directory structure node in the memory tree
 */
export interface MemoryDirectory {
  /** Path relative to memory root (e.g., "entities", "identity/preferences") */
  path: string;

  /** List of memory files in this directory */
  files: MemoryFile[];

  /** List of subdirectories */
  subdirs: MemoryDirectory[];

  /** L0 abstract summary (if generated) */
  abstractSummary?: MemoryFile;

  /** L1 overview summary (if generated) */
  overviewSummary?: MemoryFile;

  /** When summaries were last regenerated */
  summaryMetadata?: SummaryMetadata;
}

/**
 * Retrieval result from memory system
 */
export interface MemoryRetrievalResult {
  /** The retrieved memory file */
  memory: MemoryFile;

  /** Relevance score (0-1) */
  relevanceScore: number;

  /** Which detail level was retrieved */
  detailLevel: DetailLevel;

  /** Why this memory was retrieved */
  reason: string;

  /** Directory path used to surface this memory */
  directoryPath?: string;
}

/**
 * Context assembly result with token budgeting
 */
export interface MemoryContextAssembly {
  /** Retrieved memories, ranked by relevance */
  memories: MemoryRetrievalResult[];

  /** Total tokens allocated for these memories */
  tokenCount: number;

  /** Whether the token budget was exceeded */
  budgetExceeded: boolean;

  /** Memories that were trimmed due to budget constraints */
  trimmedMemories: MemoryId[];
}
