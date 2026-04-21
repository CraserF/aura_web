import { describe, it, expect } from 'vitest';
import {
  MemoryIdSchema,
  MemoryCategorySchema,
  MemoryScopeSchema,
  MemoryFileSchema,
  MemoryCandidateSchema,
  generateMemoryId,
  validateMemoryFile,
  validateMemoryCandidate,
} from '@/services/memory/schema';
import type { MemoryFrontmatter, MemoryContent, MemoryFile } from '@/services/memory/types';

describe('Memory Schema Validation', () => {
  describe('MemoryId', () => {
    it('accepts valid memory IDs', () => {
      expect(MemoryIdSchema.parse('mem_a1b2c3d4')).toBe('mem_a1b2c3d4');
    });

    it('rejects invalid memory IDs', () => {
      expect(() => MemoryIdSchema.parse('invalid_id')).toThrow();
      expect(() => MemoryIdSchema.parse('mem_short')).toThrow();
      expect(() => MemoryIdSchema.parse('mem_')).toThrow();
    });

    it('generates valid memory IDs', () => {
      const id = generateMemoryId();
      expect(id).toMatch(/^mem_[a-z0-9]{8}$/);
      expect(() => MemoryIdSchema.parse(id)).not.toThrow();
    });
  });

  describe('MemoryCategory', () => {
    it('accepts valid categories', () => {
      const valid = [
        'identity',
        'skill',
        'entity',
        'event',
        'case',
        'pattern',
        'tool',
        'context',
      ];
      for (const cat of valid) {
        expect(MemoryCategorySchema.parse(cat)).toBe(cat);
      }
    });

    it('rejects invalid categories', () => {
      expect(() => MemoryCategorySchema.parse('invalid')).toThrow();
      expect(() => MemoryCategorySchema.parse('')).toThrow();
    });
  });

  describe('MemoryScope', () => {
    it('accepts global scope', () => {
      expect(MemoryScopeSchema.parse('global')).toBe('global');
    });

    it('accepts project scope with UUID', () => {
      const uuid = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';
      expect(MemoryScopeSchema.parse(`project:${uuid}`)).toBe(`project:${uuid}`);
    });

    it('rejects invalid project scope', () => {
      expect(() => MemoryScopeSchema.parse('project:invalid')).toThrow();
      expect(() => MemoryScopeSchema.parse('project:')).toThrow();
    });
  });

  describe('MemoryFile', () => {
    it('validates complete memory file', () => {
      const file: MemoryFile = {
        frontmatter: {
          memoryId: 'mem_a1b2c3d4',
          type: 'skill',
          scope: 'global',
          sensitivity: 'public',
          owner: 'user@example.com',
          sourceRefs: [],
          updateStrategy: 'merge',
          createdAt: '2026-04-21T10:00:00Z',
          updatedAt: '2026-04-21T10:00:00Z',
          version: 1,
          tags: ['presentation', 'design'],
        },
        content: {
          summary: 'This is a skill about presentations',
          details: 'Detailed information about the skill',
          evidence: ['session:sess_123'],
          actionableUse: 'When generating presentations',
        },
      };

      expect(() => validateMemoryFile(file)).not.toThrow();
      const parsed = validateMemoryFile(file);
      expect(parsed.frontmatter.memoryId).toBe('mem_a1b2c3d4');
    });

    it('rejects file with invalid summary', () => {
      const file: MemoryFile = {
        frontmatter: {
          memoryId: 'mem_a1b2c3d4',
          type: 'skill',
          scope: 'global',
          sensitivity: 'public',
          owner: 'user@example.com',
          sourceRefs: [],
          updateStrategy: 'merge',
          createdAt: '2026-04-21T10:00:00Z',
          updatedAt: '2026-04-21T10:00:00Z',
          version: 1,
          tags: [],
        },
        content: {
          summary: 'Too short', // Less than 10 chars
          details: '',
          evidence: [],
          actionableUse: '',
        },
      };

      expect(() => validateMemoryFile(file)).toThrow();
    });
  });

  describe('MemoryCandidate', () => {
    it('validates complete candidate', () => {
      const candidate = {
        type: 'skill' as const,
        scope: 'global' as const,
        sensitivity: 'public' as const,
        title: 'Presentation Skills',
        summary: 'This is a comprehensive summary of presentation skills',
        details: 'Detailed information',
        evidence: ['session:123'],
        actionableUse: 'When creating presentations',
        tags: ['skill'],
      };

      expect(() => validateMemoryCandidate(candidate)).not.toThrow();
    });

    it('rejects candidate with missing required fields', () => {
      const candidate = {
        type: 'skill' as const,
        scope: 'global' as const,
        sensitivity: 'public' as const,
        title: '', // Empty title not allowed
        summary: 'This is a comprehensive summary of presentation skills',
      };

      expect(() => validateMemoryCandidate(candidate)).toThrow();
    });
  });
});
