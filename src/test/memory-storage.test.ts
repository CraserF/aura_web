import { describe, it, expect } from 'vitest';
import {
  parseMemoryFile,
  stringifyMemoryFile,
  createMemoryFile,
  tryParseMemoryFile,
  validateUpdate,
} from '@/services/memory/storage';
import type { MemoryFile } from '@/services/memory/types';

describe('Memory Storage — Parsing & Serialization', () => {
  const sampleMarkdown = `---
memoryId: "mem_test1234"
type: skill
scope: global
sensitivity: public
owner: "user@example.com"
sourceRefs: ["session:sess_123"]
updateStrategy: merge
createdAt: "2026-04-21T10:00:00Z"
updatedAt: "2026-04-21T10:00:00Z"
version: 1
tags: ["presentation", "design"]
---

## Summary
This is a skill about creating beautiful presentations with proper design principles.

## Details
Presentations should follow these principles:
- Clear hierarchy
- Consistent typography
- Proper color theory
- Effective visual balance

## Evidence
- session:sess_123
- document:doc_456

## Actionable Use
Use this skill when generating slides or presentations.
`;

  describe('parseMemoryFile', () => {
    it('parses valid markdown with frontmatter', () => {
      const file = parseMemoryFile(sampleMarkdown);

      expect(file.frontmatter.memoryId).toBe('mem_test1234');
      expect(file.frontmatter.type).toBe('skill');
      expect(file.frontmatter.version).toBe(1);
      expect(file.content.summary).toContain('beautiful presentations');
      expect(file.content.evidence).toContain('session:sess_123');
    });

    it('handles missing optional sections', () => {
      const minimal = `---
memoryId: "mem_a1b2c3d4"
type: entity
scope: global
sensitivity: public
owner: "user@example.com"
sourceRefs: []
updateStrategy: append
createdAt: "2026-04-21T10:00:00Z"
updatedAt: "2026-04-21T10:00:00Z"
version: 1
tags: []
---

## Summary
This is a minimal memory file with only summary.
`;

      const file = parseMemoryFile(minimal);
      expect(file.content.details).toBe('');
      expect(file.content.evidence).toEqual([]);
      expect(file.content.actionableUse).toBe('');
    });

    it('rejects file without frontmatter', () => {
      const noFrontmatter = `
## Summary
No frontmatter here.
`;

      expect(() => parseMemoryFile(noFrontmatter)).toThrow();
    });

    it('rejects file with invalid frontmatter', () => {
      const invalidFrontmatter = `---
memoryId: invalid_id
type: skill
scope: global
sensitivity: public
owner: "user@example.com"
sourceRefs: []
updateStrategy: merge
createdAt: "2026-04-21T10:00:00Z"
updatedAt: "2026-04-21T10:00:00Z"
version: 1
tags: []
---

## Summary
Invalid memory ID should cause validation error.
`;

      expect(() => parseMemoryFile(invalidFrontmatter)).toThrow();
    });
  });

  describe('stringifyMemoryFile', () => {
    it('serializes file correctly', () => {
      const file = parseMemoryFile(sampleMarkdown);
      const serialized = stringifyMemoryFile(file);

      expect(serialized).toContain('---');
      expect(serialized).toContain('memoryId: "mem_test1234"');
      expect(serialized).toContain('## Summary');
      expect(serialized).toContain('beautiful presentations');
    });

    it('round-trips successfully', () => {
      const original = parseMemoryFile(sampleMarkdown);
      const serialized = stringifyMemoryFile(original);
      const parsed = parseMemoryFile(serialized);

      expect(parsed.frontmatter.memoryId).toBe(original.frontmatter.memoryId);
      expect(parsed.frontmatter.type).toBe(original.frontmatter.type);
      expect(parsed.content.summary).toBe(original.content.summary);
      expect(parsed.content.evidence).toEqual(original.content.evidence);
    });
  });

  describe('createMemoryFile', () => {
    it('creates new memory file with auto-generated ID', () => {
      const file = createMemoryFile(
        'skill',
        'global',
        'public',
        'user@example.com',
        {
          summary: 'This is a skill for creating presentations',
          details: 'Details here',
          evidence: ['session:123'],
          actionableUse: 'Use when generating',
        },
        {
          tags: ['presentation'],
          sourceRefs: ['session:123'],
          updateStrategy: 'merge',
        }
      );

      expect(file.frontmatter.memoryId).toMatch(/^mem_[a-z0-9]{8}$/);
      expect(file.frontmatter.version).toBe(1);
      expect(file.frontmatter.updateStrategy).toBe('merge');
      expect(file.content.summary).toBe('This is a skill for creating presentations');
    });

    it('creates file with default values', () => {
      const file = createMemoryFile(
        'entity',
        'global',
        'private',
        'user@example.com',
        {
          summary: 'Sarah Chen is a product manager who loves data visualization',
        }
      );

      expect(file.frontmatter.tags).toEqual([]);
      expect(file.frontmatter.sourceRefs).toEqual([]);
      expect(file.frontmatter.updateStrategy).toBe('append');
      expect(file.content.details).toBe('');
    });
  });

  describe('tryParseMemoryFile', () => {
    it('returns null on parse error instead of throwing', () => {
      const invalid = 'Not a valid memory file';
      const result = tryParseMemoryFile(invalid);
      expect(result).toBeNull();
    });

    it('returns parsed file on success', () => {
      const result = tryParseMemoryFile(sampleMarkdown);
      expect(result).not.toBeNull();
      expect(result?.frontmatter.memoryId).toBe('mem_test1234');
    });
  });

  describe('validateUpdate', () => {
    const existing: MemoryFile = {
      frontmatter: {
        memoryId: 'mem_a1b2c3d4',
        type: 'entity',
        scope: 'global',
        sensitivity: 'public',
        owner: 'user@example.com',
        sourceRefs: ['session:123'],
        updateStrategy: 'append',
        createdAt: '2026-04-21T10:00:00Z',
        updatedAt: '2026-04-21T10:00:00Z',
        version: 1,
        tags: ['person'],
      },
      content: {
        summary: 'Sarah Chen is a product manager',
        details: 'Original details',
        evidence: ['session:123'],
        actionableUse: '',
      },
    };

    it('allows append strategy with new evidence only', () => {
      const updated = {
        ...existing,
        content: {
          ...existing.content,
          evidence: [...existing.content.evidence, 'session:456'], // Only added evidence
        },
      };

      const result = validateUpdate(existing, updated, 'append');
      expect(result.valid).toBe(true);
    });

    it('rejects append strategy when summary changes', () => {
      const updated = {
        ...existing,
        content: {
          ...existing.content,
          summary: 'Different summary', // Changed summary
        },
      };

      const result = validateUpdate(existing, updated, 'append');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Append strategy');
    });

    it('rejects immutable strategy on any change', () => {
      const updated = {
        ...existing,
        content: {
          ...existing.content,
          evidence: [...existing.content.evidence, 'session:456'],
        },
      };

      const result = validateUpdate(existing, updated, 'immutable');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('immutable');
    });

    it('allows merge strategy on any change', () => {
      const updated = {
        ...existing,
        content: {
          summary: 'New summary',
          details: 'Updated details',
          evidence: ['new:evidence'],
          actionableUse: 'Use this',
        },
      };

      const result = validateUpdate(existing, updated, 'merge');
      expect(result.valid).toBe(true);
    });
  });
});
