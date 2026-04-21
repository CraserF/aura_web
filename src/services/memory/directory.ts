/**
 * Memory Directory Management
 *
 * Manages the hierarchical directory structure of memory files,
 * including L0/L1 summary generation and regeneration.
 *
 * Directory structure:
 *   memory/
 *     identity/
 *       .abstract.md (L0)
 *       .overview.md (L1)
 *       profile.md (L2)
 *       preferences/
 *         .abstract.md
 *         .overview.md
 *         communication.md
 *     skills/
 *       .abstract.md
 *       .overview.md
 *       {skill-id}.md
 *     entities/
 *       .abstract.md
 *       .overview.md
 *       {entity-id}.md
 *     ...
 */

import type {
  MemoryFile,
  MemoryDirectory,
  MemoryId,
  MemoryCategory,
} from './types';

const DIRECTORY_TO_CATEGORY = {
  identity: 'identity',
  skills: 'skill',
  entities: 'entity',
  events: 'event',
  cases: 'case',
  patterns: 'pattern',
  tools: 'tool',
  context: 'context',
} as const satisfies Record<string, MemoryCategory>;

export type MemoryDirectoryName = keyof typeof DIRECTORY_TO_CATEGORY;

/**
 * Main memory category directories (top-level)
 */
export const MAIN_DIRECTORIES: MemoryDirectoryName[] = [
  'identity',
  'skills',
  'entities',
  'events',
  'cases',
  'patterns',
  'tools',
  'context',
];

/**
 * Sub-directories under identity/
 */
export const IDENTITY_SUBDIRECTORIES = ['preferences'];

/**
 * Create an empty memory directory structure
 */
export function createEmptyDirectory(path: string): MemoryDirectory {
  return {
    path,
    files: [],
    subdirs: [],
  };
}

/**
 * Create the complete initial directory tree
 */
export function createInitialMemoryTree(): MemoryDirectory {
  const root = createEmptyDirectory('memory');

  // Create all main category directories
  for (const category of MAIN_DIRECTORIES) {
    root.subdirs.push(createEmptyDirectory(category));
  }

  // Create identity subdirectories
  const identityDir = root.subdirs.find((d) => d.path === 'identity');
  if (identityDir) {
    for (const subdir of IDENTITY_SUBDIRECTORIES) {
      identityDir.subdirs.push(
        createEmptyDirectory(`identity/${subdir}`)
      );
    }
  }

  return root;
}

export function findOrCreateDirectory(
  tree: MemoryDirectory,
  dirPath: string
): MemoryDirectory {
  const existing = findDirectory(tree, dirPath);
  if (existing) {
    return existing;
  }

  const segments = dirPath.split('/').filter(Boolean);
  let current = tree;
  let currentPath = '';

  for (const segment of segments) {
    currentPath = currentPath ? `${currentPath}/${segment}` : segment;

    let next = current.subdirs.find((subdir) => subdir.path === currentPath);
    if (!next) {
      next = createEmptyDirectory(currentPath);
      current.subdirs.push(next);
    }

    current = next;
  }

  return current;
}

/**
 * Find a directory by path
 */
export function findDirectory(
  tree: MemoryDirectory,
  path: string
): MemoryDirectory | null {
  if (tree.path === path) return tree;

  for (const subdir of tree.subdirs) {
    const found = findDirectory(subdir, path);
    if (found) return found;
  }

  return null;
}

/**
 * Add a memory file to a directory
 * Creates the directory if it doesn't exist
 */
export function addMemoryToDirectory(
  tree: MemoryDirectory,
  dirPath: string,
  file: MemoryFile
): void {
  const dir = findOrCreateDirectory(tree, dirPath);

  // Avoid duplicates
  const existingIndex = dir.files.findIndex(
    (f) => f.frontmatter.memoryId === file.frontmatter.memoryId
  );

  if (existingIndex >= 0) {
    dir.files[existingIndex] = file;
  } else {
    dir.files.push(file);
  }
}

/**
 * Remove a memory file from directory by ID
 */
export function removeMemoryFromDirectory(
  tree: MemoryDirectory,
  dirPath: string,
  memoryId: MemoryId
): boolean {
  const dir = findDirectory(tree, dirPath);
  if (!dir) return false;

  const index = dir.files.findIndex((f) => f.frontmatter.memoryId === memoryId);
  if (index < 0) return false;

  dir.files.splice(index, 1);
  return true;
}

/**
 * Find a memory file by ID across the entire tree
 */
export function findMemoryById(
  tree: MemoryDirectory,
  memoryId: MemoryId
): { memory: MemoryFile; dirPath: string } | null {
  // Check current directory
  const memory = tree.files.find((f) => f.frontmatter.memoryId === memoryId);
  if (memory) {
    return { memory, dirPath: tree.path };
  }

  // Search subdirectories
  for (const subdir of tree.subdirs) {
    const result = findMemoryById(subdir, memoryId);
    if (result) return result;
  }

  return null;
}

/**
 * Get all memories from a directory (non-recursive)
 */
export function getDirectoryMemories(dir: MemoryDirectory): MemoryFile[] {
  return dir.files;
}

/**
 * Get all memory files recursively from a directory tree
 */
export function getAllMemories(dir: MemoryDirectory): MemoryFile[] {
  const memories: MemoryFile[] = [...getDirectoryMemories(dir)];

  for (const subdir of dir.subdirs) {
    memories.push(...getAllMemories(subdir));
  }

  return memories;
}

/**
 * Update L0/L1 summary metadata
 */
export function updateSummaryMetadata(
  dir: MemoryDirectory,
  sourcePaths: string[],
  sourceVersions: Record<string, number>
): void {
  if (!dir.summaryMetadata) {
    dir.summaryMetadata = {
      generatedAt: new Date().toISOString(),
      sourcePaths,
      sourceVersions,
    };
  } else {
    dir.summaryMetadata.generatedAt = new Date().toISOString();
    dir.summaryMetadata.sourcePaths = sourcePaths;
    dir.summaryMetadata.sourceVersions = sourceVersions;
  }
}

/**
 * Set L0 abstract summary for a directory
 */
export function setL0Summary(
  dir: MemoryDirectory,
  summary: MemoryFile
): void {
  dir.abstractSummary = summary;
}

/**
 * Set L1 overview summary for a directory
 */
export function setL1Summary(
  dir: MemoryDirectory,
  summary: MemoryFile
): void {
  dir.overviewSummary = summary;
}

/**
 * Get L0 summary or null
 */
export function getL0Summary(dir: MemoryDirectory): MemoryFile | null {
  return dir.abstractSummary || null;
}

/**
 * Get L1 summary or null
 */
export function getL1Summary(dir: MemoryDirectory): MemoryFile | null {
  return dir.overviewSummary || null;
}

/**
 * Calculate statistics for a directory tree
 */
export function getDirectoryStats(dir: MemoryDirectory): {
  totalMemories: number;
  memoryCount: Record<MemoryCategory, number>;
  totalDirectories: number;
} {
  const allMemories = getAllMemories(dir);
  const memoryCount: Record<MemoryCategory, number> = {
    identity: 0,
    skill: 0,
    entity: 0,
    event: 0,
    case: 0,
    pattern: 0,
    tool: 0,
    context: 0,
  };

  for (const memory of allMemories) {
    memoryCount[memory.frontmatter.type]++;
  }

  // Count total directories
  let dirCount = 1;
  const countDirs = (d: MemoryDirectory) => {
    dirCount += d.subdirs.length;
    d.subdirs.forEach(countDirs);
  };
  countDirs(dir);

  return {
    totalMemories: allMemories.length,
    memoryCount,
    totalDirectories: dirCount,
  };
}

export function getCategoryForDirectory(path: string): MemoryCategory | null {
  const topLevelDir = path.split('/')[0];
  return DIRECTORY_TO_CATEGORY[topLevelDir as MemoryDirectoryName] ?? null;
}

/**
 * Print directory tree for debugging
 */
export function printDirectoryTree(
  dir: MemoryDirectory,
  indent: string = ''
): string {
  let output = `${indent}${dir.path}\n`;

  // Print memories
  for (const memory of getDirectoryMemories(dir)) {
    const title = memory.content.summary.substring(0, 50);
    output += `${indent}  [${memory.frontmatter.memoryId}] ${title}...\n`;
  }

  // Print summaries
  if (dir.abstractSummary) {
    output += `${indent}  [L0] Abstract summary\n`;
  }
  if (dir.overviewSummary) {
    output += `${indent}  [L1] Overview summary\n`;
  }

  // Print subdirectories
  for (const subdir of dir.subdirs) {
    output += printDirectoryTree(subdir, indent + '  ');
  }

  return output;
}
