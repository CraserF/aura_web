import type { MemoryDirectory, MemoryFile } from './types';
import {
  addMemoryToDirectory,
  createInitialMemoryTree,
  findOrCreateDirectory,
  setL0Summary,
  setL1Summary,
} from './directory';
import {
  getL0FileName,
  getL1FileName,
  getMemoryFileName,
  parseMemoryFile,
  stringifyMemoryFile,
} from './storage';

export interface MemoryArchiveEntry {
  path: string;
  content: string;
}

function stripArchivePrefix(path: string): string {
  return path.replace(/^memory\//, '');
}

function visitDirectory(
  dir: MemoryDirectory,
  visit: (dirPath: string, fileName: string, file: MemoryFile) => void
): void {
  const dirPath = dir.path === 'memory' ? '' : dir.path;

  if (dir.abstractSummary) {
    visit(dirPath, getL0FileName(), dir.abstractSummary);
  }
  if (dir.overviewSummary) {
    visit(dirPath, getL1FileName(), dir.overviewSummary);
  }

  for (const file of dir.files) {
    visit(dirPath, getMemoryFileName(file.frontmatter), file);
  }

  for (const subdir of dir.subdirs) {
    visitDirectory(subdir, visit);
  }
}

export function exportMemoryTree(tree: MemoryDirectory): MemoryArchiveEntry[] {
  const entries: MemoryArchiveEntry[] = [];

  visitDirectory(tree, (dirPath, fileName, file) => {
    const fullPath = dirPath ? `memory/${dirPath}/${fileName}` : `memory/${fileName}`;
    entries.push({
      path: fullPath,
      content: stringifyMemoryFile(file),
    });
  });

  return entries.sort((left, right) => left.path.localeCompare(right.path));
}

export function importMemoryTree(entries: MemoryArchiveEntry[]): MemoryDirectory {
  const tree = createInitialMemoryTree();

  for (const entry of entries) {
    const normalizedPath = stripArchivePrefix(entry.path);
    const segments = normalizedPath.split('/').filter(Boolean);
    if (segments.length === 0) {
      continue;
    }

    const fileName = segments.at(-1);
    const dirPath = segments.slice(0, -1).join('/');
    const directory = findOrCreateDirectory(tree, dirPath);
    const parsed = parseMemoryFile(entry.content);

    if (fileName === getL0FileName()) {
      setL0Summary(directory, parsed);
      continue;
    }

    if (fileName === getL1FileName()) {
      setL1Summary(directory, parsed);
      continue;
    }

    addMemoryToDirectory(tree, dirPath, parsed);
  }

  return tree;
}

export function hasArchivedMemory(entries: MemoryArchiveEntry[]): boolean {
  return entries.some((entry) => entry.path.startsWith('memory/') && entry.path.endsWith('.md'));
}