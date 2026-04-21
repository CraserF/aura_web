import { describe, it, expect } from 'vitest';
import {
  applyUpdatePolicy,
  validateUpdateConformance,
  getDefaultStrategy,
} from '@/services/memory/policies';
import { createMemoryFile } from '@/services/memory/storage';

describe('Memory Update Policies', () => {
  describe('applyUpdatePolicy — Immutable', () => {
    it('rejects any update to immutable memory', () => {
      const existing = createMemoryFile(
        'event',
        'global',
        'public',
        'user@example.com',
        {
          summary: 'Project milestone: launched v1.0 on 2026-04-21',
          details: 'Successfully launched to production',
        },
        { updateStrategy: 'immutable' }
      );

      const updated = {
        ...existing,
        content: {
          ...existing.content,
          details: 'Updated details',
        },
      };

      const result = applyUpdatePolicy(existing, updated, 'immutable');
      expect(result.success).toBe(false);
      expect(result.error).toContain('immutable');
    });
  });

  describe('applyUpdatePolicy — Append', () => {
    it('allows appending new evidence only', () => {
      const existing = createMemoryFile(
        'entity',
        'global',
        'public',
        'user@example.com',
        {
          summary: 'Sarah Chen is a product manager',
          details: 'Works at TechCorp',
          evidence: ['session:sess_123'],
        },
        { updateStrategy: 'append' }
      );

      const updated = {
        ...existing,
        content: {
          ...existing.content,
          evidence: [
            ...existing.content.evidence,
            'session:sess_456',
            'session:sess_789',
          ],
        },
      };

      const result = applyUpdatePolicy(existing, updated, 'append');
      expect(result.success).toBe(true);
      expect(result.result?.content.evidence).toHaveLength(3);
    });

    it('rejects changes to summary', () => {
      const existing = createMemoryFile(
        'entity',
        'global',
        'public',
        'user@example.com',
        { summary: 'Sarah Chen is a product manager' },
        { updateStrategy: 'append' }
      );

      const updated = {
        ...existing,
        content: {
          ...existing.content,
          summary: 'Sarah Chen is a senior product manager', // Changed
        },
      };

      const result = applyUpdatePolicy(existing, updated, 'append');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Append strategy');
    });

    it('rejects changes to details', () => {
      const existing = createMemoryFile(
        'entity',
        'global',
        'public',
        'user@example.com',
        {
          summary: 'Sarah Chen is a product manager',
          details: 'Works at TechCorp',
        },
        { updateStrategy: 'append' }
      );

      const updated = {
        ...existing,
        content: {
          ...existing.content,
          details: 'Works at StartupXYZ', // Changed
        },
      };

      const result = applyUpdatePolicy(existing, updated, 'append');
      expect(result.success).toBe(false);
    });

    it('increments version on successful append', () => {
      const existing = createMemoryFile(
        'entity',
        'global',
        'public',
        'user@example.com',
        {
          summary: 'Sarah Chen is a product manager',
          evidence: ['session:123'],
        },
        { updateStrategy: 'append' }
      );

      expect(existing.frontmatter.version).toBe(1);

      const updated = {
        ...existing,
        content: {
          ...existing.content,
          evidence: [...existing.content.evidence, 'session:456'],
        },
      };

      const result = applyUpdatePolicy(existing, updated, 'append');
      expect(result.result?.frontmatter.version).toBe(2);
    });
  });

  describe('applyUpdatePolicy — Merge', () => {
    it('merges different content intelligently', () => {
      const existing = createMemoryFile(
        'skill',
        'global',
        'public',
        'user@example.com',
        {
          summary: 'Skill for creating presentations',
          details: 'Use reveal.js for slides',
          evidence: ['session:sess_123'],
          actionableUse: 'When generating presentations',
        },
        { updateStrategy: 'merge', tags: ['presentation', 'design'] }
      );

      const updated = {
        ...existing,
        frontmatter: {
          ...existing.frontmatter,
          tags: ['presentation', 'frontend', 'react'],
        },
        content: {
          summary: 'Comprehensive skill for creating beautiful presentations with animations',
          details: 'Use reveal.js for slides with custom themes',
          evidence: [
            ...existing.content.evidence,
            'session:sess_456',
            'document:doc_789',
          ],
          actionableUse: 'Use when generating presentations or designing slides',
        },
      };

      const result = applyUpdatePolicy(existing, updated, 'merge');
      expect(result.success).toBe(true);

      const merged = result.result!;
      expect(merged.frontmatter.version).toBe(2);
      expect(merged.content.evidence).toHaveLength(3);
      // Tags should be unioned
      expect(new Set(merged.frontmatter.tags)).toContain('presentation');
      expect(new Set(merged.frontmatter.tags)).toContain('frontend');
    });

    it('prefers longer summary if updated is significantly longer', () => {
      const existing = createMemoryFile(
        'skill',
        'global',
        'public',
        'user@example.com',
        { summary: 'Create presentations' },
        { updateStrategy: 'merge' }
      );

      const updated = {
        ...existing,
        content: {
          ...existing.content,
          summary:
            'Create beautiful presentations with animations, transitions, and interactive elements using modern web technologies',
        },
      };

      const result = applyUpdatePolicy(existing, updated, 'merge');
      expect(result.result?.content.summary).toContain('beautiful');
      expect(result.result?.content.summary).toContain('interactive');
    });

    it('does not duplicate details when existing details is empty', () => {
      const existing = createMemoryFile(
        'skill',
        'global',
        'public',
        'user@example.com',
        { summary: 'Presentation skill for executive audiences.' },
        { updateStrategy: 'merge' }
      );

      const updated = {
        ...existing,
        content: {
          ...existing.content,
          details: 'Prefer compact sections and strong headings.',
        },
      };

      const result = applyUpdatePolicy(existing, updated, 'merge');
      expect(result.success).toBe(true);
      expect(result.result?.content.details).toBe('Prefer compact sections and strong headings.');
    });

    it('combines both details when both exist and differ', () => {
      const existing = createMemoryFile(
        'skill',
        'global',
        'public',
        'user@example.com',
        {
          summary: 'Presentation skill for executive audiences.',
          details: 'Use clear typographic hierarchy.',
        },
        { updateStrategy: 'merge' }
      );

      const updated = {
        ...existing,
        content: {
          ...existing.content,
          details: 'Prefer high-contrast color schemes.',
        },
      };

      const result = applyUpdatePolicy(existing, updated, 'merge');
      expect(result.success).toBe(true);
      expect(result.result?.content.details).toContain('clear typographic hierarchy');
      expect(result.result?.content.details).toContain('high-contrast color schemes');
    });

    it('does not duplicate details when both details are identical', () => {
      const existing = createMemoryFile(
        'skill',
        'global',
        'public',
        'user@example.com',
        {
          summary: 'Presentation skill for executive audiences.',
          details: 'Use clear typographic hierarchy.',
        },
        { updateStrategy: 'merge' }
      );

      const updated = {
        ...existing,
        content: { ...existing.content },
      };

      const result = applyUpdatePolicy(existing, updated, 'merge');
      expect(result.success).toBe(true);
      expect(result.result?.content.details).toBe('Use clear typographic hierarchy.');
    });

    it('combines evidence without duplicates', () => {
      const existing = createMemoryFile(
        'entity',
        'global',
        'public',
        'user@example.com',
        {
          summary: 'Sarah Chen is a product manager',
          evidence: ['session:sess_123', 'document:doc_456'],
        },
        { updateStrategy: 'merge' }
      );

      const updated = {
        ...existing,
        content: {
          ...existing.content,
          evidence: ['document:doc_456', 'session:sess_789', 'session:sess_123'],
        },
      };

      const result = applyUpdatePolicy(existing, updated, 'merge');
      expect(result.result?.content.evidence).toHaveLength(3);
      expect(result.result?.content.evidence).toEqual([
        'session:sess_123',
        'document:doc_456',
        'session:sess_789',
      ]);
    });

    it('updates timestamps and version', async () => {
      const existing = createMemoryFile(
        'skill',
        'global',
        'public',
        'user@example.com',
        { summary: 'Create presentations' },
        { updateStrategy: 'merge' }
      );

      const originalUpdatedAt = existing.frontmatter.updatedAt;

      // Wait a tiny bit to ensure timestamp is different
      await new Promise((resolve) => setTimeout(resolve, 1));

      const updated = {
        ...existing,
        content: {
          ...existing.content,
          summary: 'Create beautiful presentations with advanced styling',
        },
      };

      const result = applyUpdatePolicy(existing, updated, 'merge');
      expect(result.result?.frontmatter.version).toBe(2);
      // Timestamp should not move backwards even when resolution is coarse.
      expect(new Date(result.result?.frontmatter.updatedAt || '').getTime()).toBeGreaterThanOrEqual(
        new Date(originalUpdatedAt).getTime()
      );
    });
  });

  describe('validateUpdateConformance', () => {
    it('validates immutable policy conformance', () => {
      const file = createMemoryFile(
        'event',
        'global',
        'public',
        'user@example.com',
        { summary: 'Project launched on 2026-04-21' }
      );

      // Identical file passes
      const result1 = validateUpdateConformance('immutable', file, file);
      expect(result1.valid).toBe(true);

      // Changed content fails
      const changed = {
        ...file,
        content: {
          ...file.content,
          summary: 'Different summary',
        },
      };
      const result2 = validateUpdateConformance('immutable', file, changed);
      expect(result2.valid).toBe(false);
    });

    it('validates append policy conformance', () => {
      const file = createMemoryFile(
        'entity',
        'global',
        'public',
        'user@example.com',
        { summary: 'Sarah Chen', evidence: ['session:123'] }
      );

      // Adding evidence passes
      const withMoreEvidence = {
        ...file,
        content: {
          ...file.content,
          evidence: [...file.content.evidence, 'session:456'],
        },
      };
      const result1 = validateUpdateConformance('append', file, withMoreEvidence);
      expect(result1.valid).toBe(true);

      // Changing summary fails
      const changedSummary = {
        ...file,
        content: {
          ...file.content,
          summary: 'Different name',
        },
      };
      const result2 = validateUpdateConformance('append', file, changedSummary);
      expect(result2.valid).toBe(false);
    });

    it('validates merge policy always allows', () => {
      const file = createMemoryFile(
        'skill',
        'global',
        'public',
        'user@example.com',
        { summary: 'Original skill description' }
      );

      const drasticallyChanged = {
        ...file,
        frontmatter: { ...file.frontmatter, tags: ['new', 'tags'] },
        content: {
          summary: 'Completely new summary',
          details: 'New details',
          evidence: [],
          actionableUse: 'New use',
        },
      };

      const result = validateUpdateConformance('merge', file, drasticallyChanged);
      expect(result.valid).toBe(true);
    });
  });

  describe('getDefaultStrategy', () => {
    it('returns correct default strategies for each category', () => {
      expect(getDefaultStrategy('identity')).toBe('merge');
      expect(getDefaultStrategy('skill')).toBe('merge');
      expect(getDefaultStrategy('entity')).toBe('append');
      expect(getDefaultStrategy('event')).toBe('immutable');
      expect(getDefaultStrategy('case')).toBe('immutable');
      expect(getDefaultStrategy('pattern')).toBe('merge');
      expect(getDefaultStrategy('tool')).toBe('merge');
      expect(getDefaultStrategy('context')).toBe('merge');
    });

    it('returns merge for unknown category', () => {
      expect(getDefaultStrategy('unknown')).toBe('merge');
    });
  });
});
