import { describe, it, expect } from 'vitest';
import {
  createEmptyDirectory,
  createInitialMemoryTree,
  findDirectory,
  findMemoryById,
  addMemoryToDirectory,
  getAllMemories,
  getDirectoryStats,
} from '@/services/memory/directory';
import { createMemoryFile } from '@/services/memory/storage';

describe('Memory Directory Management', () => {
  describe('createEmptyDirectory', () => {
    it('creates empty directory with correct path', () => {
      const dir = createEmptyDirectory('entities');
      expect(dir.path).toBe('entities');
      expect(dir.files).toEqual([]);
      expect(dir.subdirs).toEqual([]);
    });
  });

  describe('createInitialMemoryTree', () => {
    it('creates full memory tree with all main categories', () => {
      const tree = createInitialMemoryTree();

      expect(tree.path).toBe('memory');
      expect(tree.subdirs.length).toBe(8); // 8 main categories

      const categories = tree.subdirs.map((d) => d.path);
      expect(categories).toContain('identity');
      expect(categories).toContain('skills');
      expect(categories).toContain('entities');
      expect(categories).toContain('events');
      expect(categories).toContain('cases');
      expect(categories).toContain('patterns');
      expect(categories).toContain('tools');
      expect(categories).toContain('context');
    });

    it('creates identity subdirectories', () => {
      const tree = createInitialMemoryTree();
      const identityDir = tree.subdirs.find((d) => d.path === 'identity');

      expect(identityDir).toBeDefined();
      expect(identityDir!.subdirs.map((d) => d.path)).toContain(
        'identity/preferences'
      );
    });
  });

  describe('findDirectory', () => {
    it('finds directory by path', () => {
      const tree = createInitialMemoryTree();
      const found = findDirectory(tree, 'entities');

      expect(found).toBeDefined();
      expect(found?.path).toBe('entities');
    });

    it('finds nested directory', () => {
      const tree = createInitialMemoryTree();
      const found = findDirectory(tree, 'identity/preferences');

      expect(found).toBeDefined();
      expect(found?.path).toBe('identity/preferences');
    });

    it('returns null for non-existent directory', () => {
      const tree = createInitialMemoryTree();
      const found = findDirectory(tree, 'nonexistent');

      expect(found).toBeNull();
    });
  });

  describe('addMemoryToDirectory', () => {
    it('adds memory to existing directory', () => {
      const tree = createInitialMemoryTree();
      const memory = createMemoryFile(
        'entity',
        'global',
        'public',
        'user@example.com',
        { summary: 'Sarah Chen is a product manager at TechCorp' }
      );

      addMemoryToDirectory(tree, 'entities', memory);

      const entitiesDir = findDirectory(tree, 'entities');
      expect(entitiesDir?.files).toHaveLength(1);
      expect(entitiesDir?.files[0]?.frontmatter.memoryId).toBe(memory.frontmatter.memoryId);
    });

    it('prevents duplicate memories', () => {
      const tree = createInitialMemoryTree();
      const memory = createMemoryFile(
        'entity',
        'global',
        'public',
        'user@example.com',
        { summary: 'Sarah Chen is a product manager' }
      );

      addMemoryToDirectory(tree, 'entities', memory);
      addMemoryToDirectory(tree, 'entities', memory);

      const entitiesDir = findDirectory(tree, 'entities');
      expect(entitiesDir?.files).toHaveLength(1);
    });

    it('updates existing memory if added with same ID', () => {
      const tree = createInitialMemoryTree();
      const memory1 = createMemoryFile(
        'entity',
        'global',
        'public',
        'user@example.com',
        { summary: 'Sarah Chen works at TechCorp' }
      );

      addMemoryToDirectory(tree, 'entities', memory1);

      const memory2 = {
        ...memory1,
        content: {
          ...memory1.content,
          summary: 'Sarah Chen is a senior PM at TechCorp',
        },
      };

      addMemoryToDirectory(tree, 'entities', memory2);

      const entitiesDir = findDirectory(tree, 'entities');
      expect(entitiesDir?.files).toHaveLength(1);
      expect(entitiesDir?.files[0]?.content.summary).toContain('senior PM');
    });
  });

  describe('findMemoryById', () => {
    it('finds memory by ID in directory tree', () => {
      const tree = createInitialMemoryTree();
      const memory = createMemoryFile(
        'skill',
        'global',
        'public',
        'user@example.com',
        { summary: 'This is a skill about presentations' }
      );

      addMemoryToDirectory(tree, 'skills', memory);

      const found = findMemoryById(tree, memory.frontmatter.memoryId);
      expect(found).toBeDefined();
      expect(found?.memory.frontmatter.memoryId).toBe(memory.frontmatter.memoryId);
      expect(found?.dirPath).toBe('skills');
    });

    it('returns null for non-existent memory', () => {
      const tree = createInitialMemoryTree();
      const found = findMemoryById(tree, 'mem_notfound');

      expect(found).toBeNull();
    });

    it('searches through nested directories', () => {
      const tree = createInitialMemoryTree();
      const memory = createMemoryFile(
        'identity',
        'global',
        'public',
        'user@example.com',
        { summary: 'This is a communication preference' }
      );

      addMemoryToDirectory(tree, 'identity/preferences', memory);

      const found = findMemoryById(tree, memory.frontmatter.memoryId);
      expect(found?.dirPath).toBe('identity/preferences');
    });
  });

  describe('getAllMemories', () => {
    it('returns empty array for empty tree', () => {
      const tree = createInitialMemoryTree();
      const memories = getAllMemories(tree);

      expect(memories).toEqual([]);
    });

    it('returns all memories from all directories recursively', () => {
      const tree = createInitialMemoryTree();

      const skill = createMemoryFile(
        'skill',
        'global',
        'public',
        'user@example.com',
        { summary: 'This is a skill about presentations' }
      );
      const entity = createMemoryFile(
        'entity',
        'global',
        'public',
        'user@example.com',
        { summary: 'Sarah Chen is a product manager' }
      );
      const preference = createMemoryFile(
        'identity',
        'global',
        'public',
        'user@example.com',
        { summary: 'Prefers concise communication' }
      );

      addMemoryToDirectory(tree, 'skills', skill);
      addMemoryToDirectory(tree, 'entities', entity);
      addMemoryToDirectory(tree, 'identity/preferences', preference);

      const all = getAllMemories(tree);
      expect(all).toHaveLength(3);

      const ids = all.map((m) => m.frontmatter.memoryId);
      expect(ids).toContain(skill.frontmatter.memoryId);
      expect(ids).toContain(entity.frontmatter.memoryId);
      expect(ids).toContain(preference.frontmatter.memoryId);
    });
  });

  describe('getDirectoryStats', () => {
    it('returns zero stats for empty tree', () => {
      const tree = createInitialMemoryTree();
      const stats = getDirectoryStats(tree);

      expect(stats.totalMemories).toBe(0);
      expect(stats.totalDirectories).toBeGreaterThan(0); // Has structure
    });

    it('counts memories by category', () => {
      const tree = createInitialMemoryTree();

      // Add 2 skills, 3 entities
      for (let i = 0; i < 2; i++) {
        const skill = createMemoryFile(
          'skill',
          'global',
          'public',
          'user@example.com',
          { summary: `Skill ${i + 1} about presentations and design` }
        );
        addMemoryToDirectory(tree, 'skills', skill);
      }

      for (let i = 0; i < 3; i++) {
        const entity = createMemoryFile(
          'entity',
          'global',
          'public',
          'user@example.com',
          { summary: `Entity ${i + 1} is a person we work with` }
        );
        addMemoryToDirectory(tree, 'entities', entity);
      }

      const stats = getDirectoryStats(tree);
      expect(stats.totalMemories).toBe(5);
      expect(stats.memoryCount.skill).toBe(2);
      expect(stats.memoryCount.entity).toBe(3);
      expect(stats.memoryCount.identity).toBe(0);
    });
  });
});
